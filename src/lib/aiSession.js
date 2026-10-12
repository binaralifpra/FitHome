// AI menyusun isi sesi latihan harian dari pustaka gerakan aplikasi.
// Aplikasi tetap memegang kendali: gerakan harus ada di pustaka, alatnya dimiliki user,
// dan polanya sesuai fokus hari itu. Kalau AI gagal/tidak valid → pakai template rotasi.
import { askJSON } from './groq'
import { EXERCISES, getExercise } from '../data/exercises'
import {
  FOCUS_PATTERNS,
  PATTERN,
  PATTERN_LABEL,
  TYPE_LABEL,
  BODY_PARTS,
  avoids,
  dumbbellKg,
  equipmentLabel,
  equipmentSet,
  isBeginner,
  loadFor,
  minutesOf,
  sleepHours,
} from './coach'

/** Kunci cache: kalau salah satu berubah (alat, durasi, fokus, …), sesi disusun ulang. */
export function sessionKey(profile, day) {
  return JSON.stringify([
    day.date,
    (day.focus || [day.type]).join('+'),
    day.intensity || 'normal',
    day.note || '',
    (day.avoid || []).join(','),
    day.variant ?? 0,
    [...equipmentSet(profile)].sort().join(','),
    dumbbellKg(profile),
    minutesOf(profile),
    profile?.experience,
    profile?.sleep,
  ])
}

const SYSTEM = `Kamu pelatih kebugaran yang menyusun SATU sesi latihan di kamar kos untuk mahasiswa Indonesia.
Pilih gerakan HANYA dari pustaka (pakai id persis). Prinsip:
- Full Body: setiap sesi tetap melatih seluruh tubuh — minimal 1 gerakan kaki (squat/hinge/lunge), 1 dorong, 1 tarik, 1 core —
  tapi VARIASIKAN dari sesi sebelumnya (ganti pola: squat↔hinge↔lunge, dorong horizontal↔ke atas, dll.).
- Split (upper/lower/push/pull/legs): hanya pola yang sesuai fokus.
- Hindari mengulang gerakan yang sama persis dengan sesi terakhir & sesi lain minggu ini bila ada alternatif — susunannya harus berbeda.
- Kalau ada CATATAN KONDISI (mis. bagian tubuh sakit), WAJIB patuhi: jangan pilih gerakan yang membebani bagian itu (mis. tangan sakit → hindari gerakan memegang dumbbell, push-up, plank; pilih versi berat badan/tanpa tumpuan tangan).
- Urutan: gerakan besar/beralat dulu, core di akhir.
- Jumlah gerakan sesuai durasi. Pemula/ringan: 2 set; biasa: 3 set. Repetisi realistis untuk beban yang dimiliki (dumbbell ringan → rep lebih banyak).
Balas JSON: {"title":"nama sesi singkat (maks 30 huruf)","exercises":[{"id":"...","sets":2-4,"reps":"10–12"}],"reason":"1 kalimat kenapa susunan ini cocok hari ini"}`

/**
 * @param day     { date, type, focus, intensity, variant }
 * @param recent  [{ date, title, exercises: [id] }] sesi terakhir yang sudah dilakukan
 * @param base    sesi template (fallback & panduan jumlah gerakan)
 */
export async function planSessionAI({ profile, day, recent = [], others = [], base }) {
  const eq = equipmentSet(profile)
  const focus = day.focus || [day.type]
  const allowed = new Set(focus.flatMap((f) => FOCUS_PATTERNS[f] || []))
  const avoid = day.avoid || []
  const library = EXERCISES.filter((e) => eq.has(e.needs) && allowed.has(PATTERN[e.id]) && !avoids(e.id, avoid))
  const lines = library.map((e) => `- ${e.id} | ${e.name} | ${PATTERN_LABEL[PATTERN[e.id]]} | ${loadFor(e, profile)} | default ${e.reps}`)
  const history = recent.length
    ? recent.map((h) => `- ${h.date}: ${h.title}${h.exercises?.length ? ` (${h.exercises.map((id) => getExercise(id)?.name).filter(Boolean).join(', ')})` : ''}`).join('\n')
    : '- belum ada'

  const otherLines = others.length
    ? others.map((o) => `- ${o.date}: ${o.exercises.map((id) => getExercise(id)?.name).join(', ')}`).join('\n')
    : '- belum ada'
  const condition = [day.note, avoid.length && `${avoid.map((p) => BODY_PARTS[p]).join(' & ')} sedang dipulihkan (gerakan yang membebaninya sudah dikeluarkan dari pustaka)`].filter(Boolean)
  const conditionLine = condition.length ? `CATATAN KONDISI: ${condition.join('; ')}\n` : ''
  const user = `Sesi hari ini (${day.date}): fokus ${focus.map((f) => TYPE_LABEL[f]).join(' + ')}, intensitas ${day.intensity || 'normal'}, sesi ke-${(day.variant ?? 0) + 1} untuk fokus ini.
Durasi ${minutesOf(profile)} menit → sekitar ${base.exercises.length} gerakan. Alat: ${equipmentLabel(profile)}.
Pengalaman: ${profile?.experience || '-'}. Tidur: ${sleepHours(profile) ?? '?'} jam.
${conditionLine}Sesi terakhir yang sudah dilakukan:
${history}
Sesi lain yang sudah direncanakan minggu ini (jangan disamakan):
${otherLines}

Pustaka gerakan yang boleh dipakai (id | nama | pola | beban | rep default):
${lines.join('\n')}`

  const r = await askJSON({ system: SYSTEM, user, temperature: 0.6, signal: AbortSignal.timeout(20000) })

  // Validasi ketat
  const valid = new Set(library.map((e) => e.id))
  const seen = new Set()
  const light = day.intensity === 'ringan'
  const maxSets = light || isBeginner(profile) ? 2 : 4
  const exercises = (Array.isArray(r.exercises) ? r.exercises : [])
    .filter((x) => valid.has(x?.id) && !seen.has(x.id) && seen.add(x.id))
    .slice(0, base.exercises.length + 1)
    .map((x) => {
      const ex = getExercise(x.id)
      const sets = Math.min(maxSets, Math.max(1, Math.round(Number(x.sets) || 2)))
      const reps = typeof x.reps === 'string' && x.reps.length <= 20 ? x.reps : String(x.reps || ex.reps)
      return { id: x.id, sets, reps, load: loadFor(ex, profile) }
    })

  // FBW wajib lengkap: kaki + dorong + tarik
  const pats = new Set(exercises.map((e) => PATTERN[e.id]))
  const fullOk = !focus.includes('full') || avoid.length > 0 || (['squat', 'hinge', 'lunge'].some((p) => pats.has(p)) && ['hpush', 'vpush'].some((p) => pats.has(p)) && ['hpull', 'vpull'].some((p) => pats.has(p)))
  if (exercises.length < Math.min(3, base.exercises.length) || !fullOk) throw new Error('Susunan AI tidak valid')
  // Tolak susunan yang kembar dengan sesi lain minggu ini
  const sig = exercises.map((e) => e.id).sort().join(',')
  if (others.some((o) => [...o.exercises].sort().join(',') === sig)) throw new Error('Susunan AI kembar dengan sesi lain')

  return {
    ...base,
    title: String(r.title || base.title).slice(0, 34),
    exercises,
    reason: String(r.reason || base.reason).slice(0, 200),
    byAI: true,
  }
}
