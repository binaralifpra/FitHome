// Klien Groq (API kompatibel OpenAI), dipanggil langsung dari browser.
// Catatan: kunci VITE_* ikut masuk ke bundle. Untuk rilis publik, pindahkan ke server.
const KEY = import.meta.env.VITE_GROQ_API_KEY
const CHAT_MODEL = import.meta.env.VITE_GROQ_CHAT_MODEL || 'openai/gpt-oss-120b'
const VISION_MODEL = import.meta.env.VITE_GROQ_VISION_MODEL || 'qwen/qwen3.8-27b'
const URL = 'https://api.groq.com/openai/v1/chat/completions'

export const aiReady = Boolean(KEY)

// Kuota gratis Groq ±8.000 token/menit PER MODEL. Kalau satu model kena batas (429),
// permintaan dialihkan ke model berikutnya; kalau semua penuh, tunggu sebentar lalu coba lagi.
const FALLBACK_TEXT = [...new Set([CHAT_MODEL, 'openai/gpt-oss-20b'])]
const FALLBACK_JSON = [...new Set([VISION_MODEL, CHAT_MODEL, 'openai/gpt-oss-20b'])]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Detik tunggu dari header retry-after / x-ratelimit-reset-tokens ("41.04s", "577ms"). */
function waitSeconds(res) {
  const ra = Number(res.headers.get('retry-after'))
  if (ra > 0) return ra
  const reset = res.headers.get('x-ratelimit-reset-tokens') || ''
  const m = /([d.]+)(ms|s)/.exec(reset)
  return m ? (m[2] === 'ms' ? Number(m[1]) / 1000 : Number(m[1])) : 5
}

async function post(models, makeBody, signal) {
  if (!KEY) throw new Error('VITE_GROQ_API_KEY belum diisi')
  for (let round = 0; round < 2; round++) {
    let wait = Infinity
    for (const model of models) {
      const res = await fetch(URL, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody(model)),
      })
      if (res.ok) return res
      if (res.status !== 429) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message || `Groq error ${res.status}`)
      }
      wait = Math.min(wait, waitSeconds(res))
    }
    if (round === 0 && wait <= 8) await sleep(wait * 1000 + 250)
    else break
  }
  const err = new Error('Kuota AI per menit sedang penuh, coba lagi sebentar.')
  err.rateLimited = true
  throw err
}

// gpt-oss memakai penalaran; buat ringan supaya cepat
const extra = (model) => (model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})

/** Chat streaming. messages = [{ role: 'system' | 'user' | 'assistant', content }]. */
export async function chatStream({ messages, onText, signal }) {
  const res = await post(FALLBACK_TEXT, (model) => ({ model, messages, stream: true, temperature: 0.7, ...extra(model) }), signal)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '')
      if (!line.startsWith('data:') || data === '[DONE]') continue
      try {
        const piece = JSON.parse(data).choices?.[0]?.delta?.content
        if (piece) {
          text += piece
          onText(text)
        }
      } catch {
        /* potongan belum lengkap */
      }
    }
  }
  if (!text) throw new Error('Respons kosong')
  return text
}

/** Minta jawaban JSON. Bisa menyertakan gambar (data URL) untuk model vision. */
export async function askJSON({ system, user, image, signal, temperature = 0.2 }) {
  const content = image
    ? [
        { type: 'text', text: user },
        { type: 'image_url', image_url: { url: image } },
      ]
    : user
  // Foto hanya bisa dibaca model vision; teks boleh pindah model saat kuota penuh
  const models = image ? [VISION_MODEL] : FALLBACK_JSON
  const res = await post(
    models,
    (model) => ({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
      ...extra(model),
    }),
    signal,
  )
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return JSON.parse(text.replace(/^```(json)?|```$/g, '').trim())
}
