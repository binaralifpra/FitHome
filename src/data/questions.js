// 11 pertanyaan onboarding AI Coach (Prompt 3). Satu key per pertanyaan.
export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
export const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
export const FLEX = 'Fleksibel (tidak tentu)'

export const FREQ_NOTES = {
  1: 'Latihan 1x seminggu memang belum optimal untuk pertumbuhan otot, tapi tetap jauh lebih baik daripada tidak sama sekali. AI akan susun satu sesi full body yang padat.',
  2: 'AI akan menyusun program Full Body Split, 2 hari per minggu.',
  3: 'AI akan menyusun program Full Body Split, 3 hari per minggu.',
  4: 'AI akan menyusun program Upper-Lower Split, 4 hari per minggu.',
  5: 'AI akan menyusun program Push-Pull-Legs + Upper/Lower, 5 hari per minggu.',
  6: 'AI akan menyusun program Push-Pull-Legs, diulang 2 siklus dalam 6 hari.',
}

export const QUESTIONS = [
  {
    id: 'experience',
    label: 'Pengalaman workout',
    title: 'Apakah kamu pernah workout sebelumnya?',
    kind: 'single',
    options: ['Belum pernah', 'Pernah, tapi berhenti lama', 'Rutin latihan sebelumnya'],
  },
  {
    id: 'equipment',
    label: 'Alat yang dimiliki',
    title: 'Alat apa saja yang kamu punya?',
    kind: 'textarea',
    placeholder: 'cth: 2 buah dumbbell 3 kg, resistance band, dll',
    suggest: ['Dumbbell 3 kg sepasang', 'Resistance band', 'Matras yoga', 'Botol air 1,5 L', { text: 'Tidak ada alat', replace: true }],
  },
  {
    id: 'extras',
    label: 'Alat tambahan',
    title: 'Apakah kamu punya alat tambahan ini?',
    note: 'Boleh pilih lebih dari satu, atau lewati kalau tidak ada',
    kind: 'multi',
    optional: true,
    options: ['Bangku panjang', 'Tempat bergelantung (pull-up bar)'],
  },
  {
    id: 'duration',
    label: 'Waktu latihan',
    title: 'Berapa lama waktu latihanmu biasanya?',
    note: '45 menit adalah durasi paling ideal',
    kind: 'single',
    options: ['10 menit', '20 menit', '30 menit', '45 menit (disarankan)', '60 menit', 'Lainnya'],
    other: { placeholder: 'cth: 25 menit', suggest: ['15 menit', '25 menit', '40 menit'], replace: true },
  },
  {
    id: 'goal',
    label: 'Tujuan olahraga',
    title: 'Apa tujuanmu berolahraga?',
    kind: 'single',
    options: ['Membentuk otot', 'Membangun stamina', 'Menurunkan berat badan', 'Lainnya'],
    other: { placeholder: 'cth: biar nggak gampang capek', suggest: ['Biar nggak gampang capek', 'Postur lebih tegap', 'Kurangi stres'] },
  },
  {
    id: 'frequency',
    label: 'Frekuensi mingguan',
    title: 'Dalam satu minggu, kamu bisa latihan berapa kali?',
    kind: 'frequency',
  },
  {
    id: 'days',
    label: 'Hari latihan',
    title: 'Hari apa saja kamu bisa latihan?',
    note: 'Opsional — biar AI bisa jadwalkan otomatis',
    kind: 'days',
    optional: true,
  },
  {
    id: 'budget',
    label: 'Budget makan harian',
    title: 'Berapa budget makanan harianmu?',
    kind: 'input',
    placeholder: 'cth: 20.000 per hari',
    suggest: ['15.000 per hari', '20.000 per hari', '30.000 per hari', '50.000 per hari'],
    replace: true,
  },
  {
    id: 'habit',
    label: 'Makanan sehari-hari',
    title: 'Apa yang biasanya kamu makan sehari-hari?',
    kind: 'textarea',
    placeholder: 'cth: nasi, ayam goreng, indomie, tempe',
    suggest: ['Nasi', 'Ayam goreng', 'Indomie', 'Tempe / tahu', 'Telur', 'Sayur warteg', 'Gorengan'],
  },
  {
    id: 'cook',
    label: 'Waktu masak',
    title: 'Apakah kamu ada waktu untuk memasak?',
    note: 'Kalau iya, masakan apa yang sanggup kamu masak?',
    kind: 'single',
    options: ['Ya', 'Tidak'],
    other: { when: 'Ya', placeholder: 'cth: tumis kangkung, telur dadar, oseng tempe', suggest: ['Telur dadar', 'Tumis kangkung', 'Oseng tempe', 'Nasi goreng', 'Sop sayur'] },
  },
  {
    id: 'sleep',
    label: 'Jam tidur',
    title: 'Berapa jam tidurmu dalam satu hari?',
    note: 'Ototmu tumbuh saat tidur, bukan cuma saat latihan',
    kind: 'input',
    placeholder: 'cth: 6 jam',
    suggest: ['5 jam', '6 jam', '7 jam', '8 jam'],
    replace: true,
  },
]

// Nilai jawaban: string | string[] | number. Pilihan dengan isian tambahan
// disimpan di key `<id>Other` (mis. durationOther, goalOther, cookOther).
export const DEFAULT_ANSWERS = {
  experience: '',
  equipment: '',
  extras: [],
  duration: '',
  durationOther: '',
  goal: '',
  goalOther: '',
  frequency: null,
  days: [],
  budget: '',
  habit: '',
  cook: '',
  cookOther: '',
  sleep: '',
}

const otherTrigger = (q) => q.other?.when ?? 'Lainnya'

export function isAnswered(q, a) {
  const v = a[q.id]
  if (q.optional) return true
  if (q.kind === 'frequency') return Boolean(v)
  if (q.kind === 'multi' || q.kind === 'days') return v?.length > 0
  if (!String(v ?? '').trim()) return false
  if (q.other && v === otherTrigger(q) && q.other.when === undefined) return Boolean(a[`${q.id}Other`]?.trim())
  return true
}

export function formatAnswer(q, a) {
  const v = a?.[q.id]
  if (q.kind === 'frequency') return v ? `${v}x per minggu — ${splitLabel(v)}` : '—'
  if (q.kind === 'multi') return v?.length ? v.join(', ') : 'Tidak ada'
  if (q.kind === 'days') return v?.length ? v.join(', ') : 'Fleksibel'
  if (q.other && v === otherTrigger(q) && a[`${q.id}Other`]) {
    return q.other.when ? `${v} — ${a[`${q.id}Other`]}` : a[`${q.id}Other`]
  }
  return String(v ?? '').trim() || '—'
}

export function splitLabel(freq) {
  if (freq <= 3) return 'Full body split'
  if (freq === 4) return 'Upper-lower split'
  if (freq === 5) return 'Push-pull-legs + upper/lower'
  return 'Push-pull-legs ×2'
}
