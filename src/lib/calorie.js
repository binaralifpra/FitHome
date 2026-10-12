// Estimasi kalori: utama lewat Groq, cadangan pakai kamus kata kunci sederhana.
import { aiReady, askJSON } from './groq'

// Kamus cadangan: [pola, kkal, gram protein] per porsi umum.
// Urutan penting: kata yang lebih spesifik di atas.
const KEYWORDS = [
  [/indomie|mie|mi\b/, 380, 8],
  [/gorengan|bakwan|tahu isi|cireng|risol/, 150, 3],
  [/nasi/, 200, 4],
  [/telur|telor/, 70, 6],
  [/ayam/, 200, 25],
  [/tempe/, 90, 10],
  [/tahu/, 80, 8],
  [/ikan|lele|pindang/, 150, 22],
  [/sayur|kangkung|bayam|sop|capcay/, 40, 2],
  [/roti/, 120, 4],
  [/susu/, 130, 7],
]
const NUM_WORDS = { setengah: 0.5, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5 }

export function estimateLocal(text) {
  const parts = text.toLowerCase().split(/\+|,|\bdan\b|\n/).map((p) => p.trim()).filter(Boolean)
  let kcal = 0
  let protein = 0
  for (const part of parts) {
    const n = part.match(/(\d+(?:[.,]\d+)?)/)
    const word = Object.keys(NUM_WORDS).find((w) => new RegExp(`\\b${w}\\b`).test(part))
    const qty = n ? parseFloat(n[1].replace(',', '.')) : word ? NUM_WORDS[word] : 1
    const hit = KEYWORDS.find(([re]) => re.test(part))
    kcal += (hit ? hit[1] : 150) * qty
    protein += (hit ? hit[2] : 5) * qty
  }
  const friedCount = (text.toLowerCase().match(/goreng|bakwan|gorengan/g) || []).length
  return { kcal: Math.round(kcal), protein: Math.round(protein), fried: friedCount > 0, friedCount, engine: 'lokal' }
}

const SYSTEM = `Kamu ahli gizi Indonesia untuk mahasiswa/anak kos.
Perkirakan total kalori makanan yang disebut, pakai porsi umum warung/rumahan (bukan gram).
Perhatikan jumlah ("4 telur", "nasi setengah"). Balas JSON:
{"kcal": total bilangan bulat, "protein": total gram protein (bilangan bulat), "friedCount": jumlah potong/porsi gorengan (0 jika tidak ada), "items": [{"name": string, "kcal": int}]}`

/** @returns {Promise<{kcal, fried, friedCount, items?, engine}>} */
export async function estimateCalories(text) {
  if (aiReady) {
    try {
      const r = await askJSON({ system: SYSTEM, user: text, temperature: 0, signal: AbortSignal.timeout(15000) })
      const kcal = Math.round(Number(r.kcal))
      if (kcal > 0) {
        const friedCount = Math.max(0, Math.round(Number(r.friedCount) || 0))
        const protein = Math.max(0, Math.min(300, Math.round(Number(r.protein) || 0)))
        return { kcal: Math.min(kcal, 5000), protein, fried: friedCount > 0, friedCount, items: r.items, engine: 'ai' }
      }
    } catch {
      /* jatuh ke kamus lokal */
    }
  }
  await new Promise((r) => setTimeout(r, 900))
  return estimateLocal(text)
}

const PHOTO_SYSTEM = `Kamu ahli gizi Indonesia. Lihat foto makanan, tebak menu yang paling mirip (nama Indonesia singkat, mis. "Nasi + Ayam Goreng"),
perkirakan kalori satu porsi di foto. Balas JSON: {"name": string, "kcal": int, "protein": int (gram), "friedCount": int, "isFood": boolean}`

/** Analisis foto makanan (model vision). */
export async function analyzePhoto(dataUrl) {
  const r = await askJSON({ system: PHOTO_SYSTEM, user: 'Makanan apa ini dan berapa kalorinya?', image: dataUrl, signal: AbortSignal.timeout(25000) })
  return {
    isFood: r.isFood !== false,
    name: String(r.name || 'Makanan').slice(0, 60),
    kcal: Math.max(0, Math.round(Number(r.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(r.protein) || 0)),
    friedCount: Math.max(0, Math.round(Number(r.friedCount) || 0)),
  }
}

/** Perkecil foto sebelum dikirim (hemat kuota & lebih cepat). */
export function shrinkImage(file, max = 768) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
