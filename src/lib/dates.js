// Semua tanggal disimpan sebagai key "YYYY-MM-DD" (waktu lokal).
const pad = (n) => String(n).padStart(2, '0')

export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => keyOf(new Date())

export const addDays = (k, n) => {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return keyOf(d)
}

export const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000)

// 0 = Senin … 6 = Minggu
export const weekdayOf = (k) => (parseKey(k).getDay() + 6) % 7

export const weekStart = (k) => addDays(k, -weekdayOf(k))

const DAYS_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const dayLong = (k) => DAYS_LONG[weekdayOf(k)]
export const shortDate = (k) => {
  const d = parseKey(k)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export const greetingByHour = () => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
}
