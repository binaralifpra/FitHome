// Aturan AI Coach: memilih gerakan & split dari jawaban onboarding.
import { EXERCISES } from '../data/exercises'
import { diffDays } from './dates'

export const TYPE_LABEL = {
  full: 'Full Body',
  upper: 'Upper',
  lower: 'Lower',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
  mobility: 'Mobility',
}

// Jarak minimal (hari) sebelum tipe sesi yang sama boleh diulang.
// Otot besar (paha, bokong, hamstring) butuh pemulihan lebih lama.
export const GAP_DAYS = { full: 2, upper: 2, lower: 3, push: 2, pull: 2, legs: 3 }

export function rotationFor(freq) {
  if (!freq || freq <= 3) return ['full']
  if (freq === 4) return ['upper', 'lower']
  if (freq === 5) return ['push', 'pull', 'legs', 'upper', 'lower']
  return ['push', 'pull', 'legs']
}

export function programName(profile) {
  const freq = profile?.frequency || 3
  if (freq <= 3) return isBeginner(profile) ? 'Full Body Pemula' : 'Full Body'
  if (freq === 4) return 'Upper-Lower'
  if (freq === 5) return 'Push-Pull-Legs + Upper/Lower'
  return 'Push-Pull-Legs'
}

// ── Membaca jawaban onboarding ──────────────────────────────────────────
const num = (s) => {
  const m = String(s ?? '').match(/\d+([.,]\d+)?/)
  return m ? parseFloat(m[0].replace(',', '.')) : null
}
export const isBeginner = (p) => p?.experience === 'Belum pernah'
export const minutesOf = (p) => (p?.duration === 'Lainnya' ? num(p?.durationOther) : num(p?.duration)) || 15
export const sleepHours = (p) => num(p?.sleep)
export const goalKey = (p) =>
  p?.goal === 'Menurunkan berat badan' ? 'turun' : p?.goal === 'Membentuk otot' ? 'otot' : 'bugar'

// Alat dibaca dari kolom teks DAN pilihan alat tambahan, supaya apa pun yang diketik
// user (mis. "resistance band", "kursi", "pull-up bar") langsung dipakai menyusun latihan.
const noTools = (t) => !t.trim() || /^(tidak|nggak|gak|belum)\b|tidak ada alat/i.test(t)

export function equipmentSet(p) {
  const set = new Set(['none'])
  const text = [p?.equipment || '', ...(p?.extras || [])].join(' ').toLowerCase()
  if (noTools(p?.equipment || '') && !(p?.extras || []).length) return set
  if (/dumb|barbel|kettle|beban/.test(text)) set.add('dumbbell')
  if (/band|karet/.test(text)) set.add('band')
  if (/bangku|kursi|bench/.test(text)) set.add('bangku')
  if (/pull-?up|bergelantung|gantungan/.test(text)) set.add('pullup')
  return set
}

/** Berat dumbbell dalam kg (null kalau tidak disebut). */
export function dumbbellKg(p) {
  const m = (p?.equipment || '').match(/(\d+(?:[.,]\d+)?)\s*kg/i)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}

export function equipmentLabel(p) {
  const set = equipmentSet(p)
  const parts = []
  if (set.has('dumbbell')) parts.push(dumbbellKg(p) ? `dumbbell ${dumbbellKg(p)} kg` : 'dumbbell')
  if (set.has('band')) parts.push('resistance band')
  if (set.has('bangku')) parts.push('bangku')
  if (set.has('pullup')) parts.push('pull-up bar')
  return parts.length ? parts.slice(0, 2).join(' + ') : 'tanpa alat'
}

/** Label beban per gerakan, mis. "Dumbbell 3 kg" atau "Berat badan". */
export function loadFor(ex, p) {
  if (ex.needs === 'dumbbell') return dumbbellKg(p) ? `Dumbbell ${dumbbellKg(p)} kg` : 'Dumbbell'
  if (ex.needs === 'band') return 'Resistance band'
  if (ex.needs === 'bangku') return 'Bangku / kursi'
  if (ex.needs === 'pullup') return 'Pull-up bar'
  return 'Berat badan'
}

/** Repetisi menyesuaikan berat: dumbbell ringan → rep lebih banyak, berat → lebih sedikit. */
export function repsFor(ex, p) {
  const kg = dumbbellKg(p)
  if (ex.needs !== 'dumbbell' || !kg) return ex.reps
  const side = /per (sisi|kaki)/.exec(ex.reps)?.[0]
  const base = kg <= 4 ? '12–15' : kg >= 8 ? '8–10' : ex.reps.replace(/ per (sisi|kaki)/, '')
  return side ? `${base} ${side}` : base
}

// Target harian sederhana dari tujuan (tanpa data berat badan → kisaran umum dewasa muda)
export function dailyTargets(p) {
  const g = goalKey(p)
  if (g === 'turun') return { kcal: 1800, protein: 90 }
  if (g === 'otot') return { kcal: 2300, protein: 100 }
  return { kcal: 2000, protein: 75 }
}

// ── Menyusun sesi ──────────────────────────────────────────────────────
const POOL = {
  push: ['db-chest-press', 'push-up-knee', 'db-shoulder-press', 'bench-dip'],
  pull: ['db-row', 'band-row', 'pull-up-neg', 'db-curl', 'band-pull-apart'],
  core: ['crunch', 'plank', 'leg-raise', 'dead-bug'],
}
const inPool = (type, e) =>
  POOL[type] ? POOL[type].includes(e.id) : type === 'legs' ? e.type.includes('lower') : e.type.includes(type)

const SESSION_TITLE = {
  full: 'Full Body Kamar Kos',
  upper: 'Upper Body',
  lower: 'Lower Body',
  push: 'Push: Dada & Bahu',
  pull: 'Pull: Punggung & Lengan',
  legs: 'Legs: Kaki & Bokong',
  core: 'Core & Perut',
  mobility: 'Peregangan Pemulihan',
}

function seeded(seedStr) {
  let h = 2166136261
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const countFor = (min) => (min <= 6 ? 2 : min <= 10 ? 3 : min <= 15 ? 4 : min <= 20 ? 5 : min <= 30 ? 6 : 7)
const isCore = (e) => POOL.core.includes(e.id)

const FOCUS_NAME = { ...TYPE_LABEL, core: 'Abs' }

// Pola gerak tiap gerakan — dipakai untuk merotasi sesi & memvalidasi susunan AI
export const PATTERN = {
  'db-chest-press': 'hpush', 'push-up-knee': 'hpush', 'db-shoulder-press': 'vpush', 'bench-dip': 'arms', 'db-curl': 'arms',
  'db-row': 'hpull', 'band-row': 'hpull', 'band-pull-apart': 'hpull', 'pull-up-neg': 'vpull',
  'goblet-squat': 'squat', 'bw-squat': 'squat', 'band-squat': 'squat', 'db-rdl': 'hinge', 'glute-bridge': 'hinge',
  'reverse-lunge': 'lunge', 'step-up': 'lunge', 'calf-raise': 'calf',
  plank: 'core', 'dead-bug': 'core', crunch: 'core', 'leg-raise': 'core',
  'cat-cow': 'mobility', 'hip-flexor': 'mobility', 'worlds-greatest': 'mobility', 'childs-pose': 'mobility',
}
// Bagian tubuh yang DIBEBANI tiap gerakan — dipakai saat ada kondisi (cedera/sakit)
export const LOADS = {
  'db-chest-press': ['wrist', 'shoulder'], 'push-up-knee': ['wrist', 'shoulder'], 'db-shoulder-press': ['wrist', 'shoulder'],
  'bench-dip': ['wrist', 'shoulder'], 'db-curl': ['wrist'], 'db-row': ['wrist', 'lower_back'], 'band-row': ['wrist'],
  'band-pull-apart': ['wrist', 'shoulder'], 'pull-up-neg': ['wrist', 'shoulder'],
  'goblet-squat': ['wrist', 'knee'], 'bw-squat': ['knee'], 'band-squat': ['wrist', 'knee'], 'db-rdl': ['wrist', 'lower_back'],
  'glute-bridge': [], 'reverse-lunge': ['knee'], 'step-up': ['knee'], 'calf-raise': ['ankle'],
  plank: ['shoulder'], 'dead-bug': [], crunch: [], 'leg-raise': ['lower_back'],
  'cat-cow': ['wrist'], 'hip-flexor': ['knee'], 'worlds-greatest': ['wrist'], 'childs-pose': [],
}
export const BODY_PARTS = { wrist: 'pergelangan tangan', shoulder: 'bahu', knee: 'lutut', lower_back: 'punggung bawah', ankle: 'pergelangan kaki' }
const BLOCKED_FOCUS = { wrist: ['upper', 'push', 'pull'], shoulder: ['upper', 'push', 'pull'], knee: ['lower', 'legs'], ankle: ['lower', 'legs'] }
export const avoids = (id, avoid = []) => (LOADS[id] || []).some((p) => avoid.includes(p))

/** Alihkan fokus yang tidak aman untuk kondisi, mis. tangan sakit → upper jadi lower. */
export function safeFocus(focus, avoid = []) {
  if (!avoid.length) return focus
  const blocked = new Set(avoid.flatMap((p) => BLOCKED_FOCUS[p] || []))
  const kept = focus.filter((f) => !blocked.has(f))
  if (kept.length) return kept
  if (!blocked.has('lower')) return ['lower']
  if (!blocked.has('upper')) return ['upper']
  return ['mobility']
}

export const PATTERN_LABEL = {
  hpush: 'dorong horizontal', vpush: 'dorong ke atas', hpull: 'tarik horizontal', vpull: 'tarik vertikal', arms: 'lengan',
  squat: 'squat', hinge: 'hinge (pinggul)', lunge: 'lunge', calf: 'betis', core: 'perut/core', mobility: 'peregangan',
}
// Pola yang boleh muncul per fokus
export const FOCUS_PATTERNS = {
  full: ['squat', 'hinge', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull', 'arms', 'core', 'calf'],
  upper: ['hpush', 'vpush', 'hpull', 'vpull', 'arms', 'core'],
  lower: ['squat', 'hinge', 'lunge', 'calf', 'core'],
  legs: ['squat', 'hinge', 'lunge', 'calf', 'core'],
  push: ['hpush', 'vpush', 'arms', 'core'],
  pull: ['hpull', 'vpull', 'arms', 'core'],
  core: ['core'],
  mobility: ['mobility'],
}
// Rotasi sesi: FBW selalu melatih seluruh tubuh, tapi variasi & penekanannya bergantian A → B → C
const TEMPLATES = {
  full: [
    ['squat', 'hpush', 'hpull', 'hinge', 'core', 'arms', 'calf'],
    ['hinge', 'vpush', 'vpull|hpull', 'lunge', 'core', 'hpush', 'arms'],
    ['lunge', 'hpush', 'hpull', 'squat', 'core', 'vpush', 'hinge'],
  ],
  upper: [
    ['hpush', 'hpull', 'vpush', 'arms', 'core', 'vpull|hpull'],
    ['vpush', 'vpull|hpull', 'hpush', 'arms', 'core', 'hpull'],
  ],
  lower: [
    ['squat', 'hinge', 'lunge', 'calf', 'core'],
    ['hinge', 'lunge', 'squat', 'core', 'calf'],
  ],
  push: [['hpush', 'vpush', 'arms', 'hpush', 'core']],
  pull: [['hpull', 'vpull|hpull', 'arms', 'hpull', 'core']],
}
TEMPLATES.legs = TEMPLATES.lower

/** Pilih gerakan per "slot" pola; varian berbeda → gerakan berbeda di slot yang sama. */
function pickByTemplate(type, eq, variant, count, avoid = []) {
  const tpls = TEMPLATES[type]
  const tpl = tpls[variant % tpls.length]
  const picked = []
  for (let k = 0; picked.length < count && k < tpl.length * 2; k++) {
    const slot = tpl[k % tpl.length]
    for (const pat of slot.split('|')) {
      const cands = EXERCISES.filter((e) => PATTERN[e.id] === pat && eq.has(e.needs) && !picked.includes(e) && !avoids(e.id, avoid))
      if (!cands.length) continue
      cands.sort((a, b) => (b.needs !== 'none') - (a.needs !== 'none')) // utamakan gerakan beralat
      // gerakan terbaik dulu; setelah satu putaran template penuh, geser ke variasi berikutnya
      picked.push(cands[Math.floor(variant / tpls.length) % cands.length])
      break
    }
  }
  return picked
}

function pickFor(type, eq, rand, count, avoid = []) {
  const pool = EXERCISES.filter((e) => inPool(type, e) && eq.has(e.needs) && !avoids(e.id, avoid))
  if (type === 'mobility') return pool.slice(0, count)
  if (type === 'core') return [...pool].sort(() => rand() - 0.5).slice(0, count)
  const main = pool.filter((e) => !isCore(e)).sort(() => rand() - 0.5)
  main.sort((a, b) => (b.needs !== 'none') - (a.needs !== 'none')) // utamakan gerakan beralat
  return main.slice(0, count)
}

/**
 * Susun sesi latihan.
 * @param opts.focus     gabungan tipe, mis. ['upper','core'] (dari penyesuaian AI); default [type]
 * @param opts.intensity 'ringan' → set & jumlah gerakan dikurangi, untuk baru pulih/capek
 */
export function buildSession(profile, type, seed, { minutes, noEquipment = false, focus, intensity = 'normal', label, variant = 0, avoid = [] } = {}) {
  const eq = noEquipment ? new Set(['none']) : equipmentSet(profile)
  const duration = minutes ?? minutesOf(profile)
  const light = intensity === 'ringan'
  const focusList = focus?.length ? focus : [type]
  const rand = seeded(`${seed}-${focusList.join('+')}-${duration}-${noEquipment}-${intensity}`)
  const n = Math.max(2, countFor(duration) - (light ? 1 : 0))

  let picked
  if (focusList.length === 1) {
    const t = focusList[0]
    picked = TEMPLATES[t] ? pickByTemplate(t, eq, variant, n, avoid) : pickFor(t, eq, rand, n, avoid)
  } else {
    // Gabungan, mis. upper + abs: core/mobility dapat 2 gerakan, sisanya dibagi rata
    const small = focusList.filter((t) => t === 'core' || t === 'mobility')
    const big = focusList.filter((t) => !small.includes(t))
    const perSmall = 2
    const perBig = Math.max(1, Math.ceil((n - perSmall * small.length) / Math.max(1, big.length)))
    picked = [...big.flatMap((t) => pickFor(t, eq, rand, perBig, avoid)), ...small.flatMap((t) => pickFor(t, eq, rand, perSmall, avoid))]
  }
  picked = picked.filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)

  let sets = isBeginner(profile) ? 2 : 3
  if ((sleepHours(profile) ?? 7) < 6 && sets > 2) sets -= 1
  if (light) sets = 2
  const main = focusList[0]
  if (main === 'mobility') sets = 1

  const tools = noEquipment || equipmentLabel(profile) === 'tanpa alat'
  return {
    type: main,
    focus: focusList,
    intensity,
    title:
      label ||
      (focusList.length > 1 || light
        ? `${focusList.map((t) => FOCUS_NAME[t]).join(' + ')}${light ? ' (ringan)' : ''}`
        : noEquipment && main === 'full'
          ? 'Bodyweight Full Body'
          : SESSION_TITLE[main]),
    minutes: duration,
    variant,
    avoid,
    exercises: picked.map((e) => ({ id: e.id, sets, reps: noEquipment ? e.reps : repsFor(e, profile), load: loadFor(e, profile) })),
    noEquipment,
    equipment: noEquipment ? 'tanpa alat' : equipmentLabel(profile),
    reason: avoid.length
      ? `Disesuaikan karena ${avoid.map((p) => BODY_PARTS[p]).join(' & ')} sedang dipulihkan — gerakan yang membebaninya dilewati`
      : light
      ? 'Versi ringan: cukup 60–70% tenaga, jeda lebih panjang kalau perlu, berhenti kalau pusing atau nyeri'
      : main === 'mobility'
        ? 'Hari rest: cukup peregangan ringan biar badan tetap gerak'
        : tools
          ? `Karena kamu latihan tanpa alat dengan waktu ${duration} menit`
          : `Karena kamu punya ${equipmentLabel(profile)} dan waktu ${duration} menit`,
  }
}

export const sessionCode = (s) => `${s.type}-${s.minutes}${s.noEquipment ? '-ta' : ''}`
export function parseSessionCode(code) {
  const [type, min, flag] = (code || '').split('-')
  if (!TYPE_LABEL[type]) return null
  return { type, minutes: Number(min) || 15, noEquipment: flag === 'ta' }
}

// Alternatif tetap di Home (Prompt 1)
export const ALTERNATIVES = [
  { type: 'full', minutes: 12, noEquipment: true, meta: '12 menit · tanpa alat', photo: 'push-up-knee.jpg' },
  { type: 'core', minutes: 6, noEquipment: true, meta: '6 menit · matras', photo: 'plank.jpg' },
]

// ── Nutrisi ────────────────────────────────────────────────────────────
// Misi defisit bertahap: mulai maks 3 gorengan, pelan-pelan turun (minimal 2).
export function friedLimit(startedAt, today) {
  const weeks = startedAt ? Math.floor(diffDays(startedAt, today) / 7) : 0
  return Math.max(2, 3 - Math.floor(weeks / 4))
}
