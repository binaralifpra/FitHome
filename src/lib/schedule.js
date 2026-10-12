// Algoritma penjadwalan mingguan (Prompt 5 + aturan jeda).
//
// Aturan inti, berlaku juga saat hari latihan "Fleksibel":
//  - Sesi bertipe sama TIDAK boleh berurutan. Jarak minimal per tipe = GAP_DAYS
//    (Full Body & Upper 2 hari = 48 jam, Lower/Legs 3 hari = 72 jam), jadi selalu ada
//    minimal satu hari Rest di antaranya.
//  - Target sesi per minggu tidak boleh terlampaui; jadwal tidak dipadatkan asal penuh.
//  - Kalau user memilih hari tertentu di onboarding, sesi otomatis hanya diletakkan di hari itu.
//    Kalau "Fleksibel", AI bebas memilih hari — tetap taat jarak di atas.
//  - Jarak dihitung lintas minggu (sesi hari Minggu memengaruhi Senin berikutnya).
//  - Override manual ("workout"/"rest") dan sesi yang sudah dilakukan ikut menggeser jadwal.
import { GAP_DAYS, rotationFor, safeFocus } from './coach'
import { addDays, diffDays, weekStart } from './dates'
import { DAYS, FLEX } from '../data/questions'

export const WEEKS = [
  { n: 1, focus: 'Adaptasi gerakan' },
  { n: 2, focus: 'Naikkan repetisi' },
  { n: 3, focus: 'Tambah beban' },
  { n: 4, focus: 'Deload & evaluasi' },
]

export const targetFor = (week, freq = 3) => (week === 4 ? Math.max(1, freq - 1) : freq)
const prevWeekNo = (n) => (n === 1 ? 4 : n - 1)

/** Minggu program (1–4, berulang) dan tanggal Senin minggu ini. */
export function currentWeek(startedAt, today) {
  const start = weekStart(startedAt || today)
  const idx = Math.max(0, Math.floor(diffDays(start, weekStart(today)) / 7))
  return { week: (idx % 4) + 1, monday: weekStart(today) }
}

/** Senin dari minggu program ke-n dalam siklus 4 minggu yang sedang berjalan. */
export function mondayOf(week, startedAt, today) {
  const { week: now, monday } = currentWeek(startedAt, today)
  return addDays(monday, (week - now) * 7)
}

/** Indeks hari (0=Senin) yang dipilih user; null = fleksibel (semua hari boleh). */
export function allowedDaysOf(profile) {
  const days = profile?.days || []
  if (!days.length || days.includes(FLEX)) return null
  return new Set(days.map((d) => DAYS.indexOf(d)).filter((i) => i >= 0))
}

// Kelompok otot per tipe sesi. Jeda dihitung per kelompok, jadi mis. Full Body sehari
// setelah Upper juga tertahan (sama-sama melatih otot atas). Core & mobility bebas jeda.
const GROUPS = {
  full: ['push', 'pull', 'lower'],
  upper: ['push', 'pull'],
  lower: ['lower'],
  push: ['push'],
  pull: ['pull'],
  legs: ['lower'],
  core: [],
  mobility: [],
}
export const SESSION_TYPES = Object.keys(GROUPS)
const groupsOf = (focus) => [...new Set(focus.flatMap((t) => GROUPS[t] || []))]
const gapOf = (focus) => Math.max(0, ...focus.filter((t) => GROUPS[t]?.length).map((t) => GAP_DAYS[t] ?? 2))

/** Normalisasi override: 'workout' | 'rest' | { status, focus, intensity, label }. */
export function readOverride(ov) {
  if (!ov) return null
  if (typeof ov === 'string') return { status: ov }
  const focus = (ov.focus || []).filter((t) => GROUPS[t])
  return { status: ov.status, focus: focus.length ? focus : undefined, intensity: ov.intensity === 'ringan' ? 'ringan' : 'normal', label: ov.label, note: ov.note }
}

/**
 * @param overrides { [dayIndex]: 'workout' | 'rest' | {status:'workout', focus:[tipe], intensity, label} }
 * @param done      { [date]: type } sesi yang benar-benar sudah dilakukan
 * @param carry     { [kelompok otot]: index relatif minggu ini } dari minggu lalu (negatif)
 * @param allowed   Set indeks hari yang boleh dipakai, atau null (fleksibel)
 * @param today     hari lewat yang tidak dikerjakan tidak memakan jatah
 */
export function scheduleWeek({ freq, week, monday, overrides = {}, done = {}, carry = {}, allowed = null, today = null, avoidFor = () => [] }) {
  const rotation = rotationFor(freq)
  const target = targetFor(week, freq)
  const last = { ...carry } // kelompok otot → indeks hari terakhir dilatih
  let scheduled = 0
  const days = []
  const since = (groups, i) => Math.min(Infinity, ...groups.map((g) => i - (last[g] ?? -Infinity)))
  const mark = (groups, i) => groups.forEach((g) => (last[g] = i))

  // Fokus sesi yang sudah "terkunci" di hari j (manual/selesai) — dipakai untuk lihat ke depan
  const fixedFocus = (j, nextCount) => {
    const ov = readOverride(overrides[j])
    const d = done[addDays(monday, j)]
    if (today && addDays(monday, j) < today && !d) return null
    if (ov?.status === 'rest') return null
    if (d) return [d]
    if (ov?.status === 'workout') return ov.focus || [rotation[nextCount % rotation.length]]
    return null
  }

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    const ov = readOverride(overrides[i])
    const next = rotation[scheduled % rotation.length]

    // Hari lewat yang tidak dikerjakan = terlewat, apa pun rencananya dulu
    if (today && date < today && !done[date]) {
      days.push({ i, date, status: 'rest', past: true, reason: ov?.status === 'workout' ? 'terlewat' : 'sudah lewat' })
      continue
    }
    if (ov?.status === 'rest' && !done[date]) {
      days.push({ i, date, status: 'rest', manual: true, reason: 'diatur manual' })
      continue
    }
    if (ov?.status === 'workout' || done[date]) {
      const avoid = avoidFor(date)
      const focus = done[date] ? [done[date]] : safeFocus(ov.focus || [next], avoid)
      const groups = groupsOf(focus)
      // sesi ringan = pemulihan aktif, tidak dianggap melanggar jeda (tapi tetap dicatat)
      const tooClose = ov?.intensity !== 'ringan' && groups.length > 0 && since(groups, i) < gapOf(focus)
      mark(groups, i)
      scheduled++
      days.push({
        i,
        date,
        status: 'workout',
        type: focus[0],
        focus,
        intensity: ov?.intensity || 'normal',
        label: ov?.label,
        note: ov?.note,
        avoid,
        custom: Boolean(ov?.focus || ov?.intensity === 'ringan'),
        manual: ov?.status === 'workout',
        done: Boolean(done[date]),
        tooClose,
      })
      continue
    }
    if (scheduled >= target) {
      days.push({ i, date, status: 'rest', reason: 'target minggu ini tercapai' })
      continue
    }
    if (allowed && !allowed.has(i)) {
      days.push({ i, date, status: 'rest', reason: 'bukan hari pilihanmu' })
      continue
    }
    const avoid = avoidFor(date)
    const autoFocus = safeFocus([next], avoid)
    const groups = groupsOf(autoFocus)
    const gap = gapOf(autoFocus)
    const s = since(groups, i)
    // Lihat ke depan: jangan terlalu dekat dengan sesi manual/selesai yang sudah terpasang
    let j = i + 1
    let ahead = null
    while (j < 7 && !(ahead = fixedFocus(j, scheduled + 1))) j++
    if (ahead && groupsOf(ahead).some((g) => groups.includes(g)) && j - i < Math.max(gap, gapOf(ahead))) {
      days.push({ i, date, status: 'rest', reason: `memberi jeda untuk sesi ${DAYS[j]}` })
      continue
    }
    if (s >= gap) {
      mark(groups, i)
      scheduled++
      days.push({ i, date, status: 'workout', type: autoFocus[0], focus: autoFocus, intensity: 'normal', avoid })
    } else {
      days.push({ i, date, status: 'rest', reason: `pemulihan ${s * 24}/${gap * 24} jam` })
    }
  }
  // Varian sesi: sesi bertipe sama dalam program diberi nomor urut (A, B, C, …) supaya isinya berganti
  const count = {}
  for (const d of days) {
    if (d.status !== 'workout') continue
    const key = (d.focus || [d.type]).join('+')
    d.variant = (count[key] = (count[key] ?? -1) + 1) + (week - 1) * 3
  }
  return { days, scheduled, target, last }
}

/** Jadwal minggu program ke-n, lengkap dengan jeda yang terbawa dari minggu sebelumnya. */
/** Ambil override 7 hari mulai `monday` dari peta per tanggal → { indeksHari: nilai }. */
export function weekOverrides(dayOverrides = {}, monday) {
  const out = {}
  for (let i = 0; i < 7; i++) {
    const v = dayOverrides[addDays(monday, i)]
    if (v) out[i] = v
  }
  return out
}

/**
 * Jadwal minggu program ke-n, lengkap dengan jeda yang terbawa dari minggu sebelumnya.
 * Override disimpan PER TANGGAL (bukan per "minggu ke-n"), jadi tidak muncul lagi
 * di siklus 4 minggu berikutnya.
 */
export function planWeek({ n, profile, startedAt, today, dayOverrides = {}, done = {}, conditions = [] }) {
  const avoidFor = (date) => [...new Set(conditions.filter((c) => c.from <= date && date <= c.until).flatMap((c) => c.avoid))]
  const freq = profile?.frequency || 3
  const allowed = allowedDaysOf(profile)
  const monday = mondayOf(n, startedAt, today)
  const prevMonday = addDays(monday, -7)
  const prev = scheduleWeek({ freq, week: prevWeekNo(n), monday: prevMonday, overrides: weekOverrides(dayOverrides, prevMonday), done, allowed, today, avoidFor })
  const carry = Object.fromEntries(Object.entries(prev.last).map(([t, i]) => [t, i - 7]))
  return { ...scheduleWeek({ freq, week: n, monday, overrides: weekOverrides(dayOverrides, monday), done, carry, allowed, today, avoidFor }), flexible: !allowed, monday }
}
