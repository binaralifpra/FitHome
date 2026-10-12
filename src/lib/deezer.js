// Klien Deezer untuk Tebak Lagu.
// API Deezer tidak mengirim header CORS, jadi dipanggil lewat JSONP (tag <script>).
// Tidak perlu API key: playlist publik & preview 30 detik bisa diakses siapa saja.

const API = 'https://api.deezer.com/'
let seq = 0

export function jsonp(path, params = {}, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const cb = `__dz_${Date.now().toString(36)}_${seq++}`
    const script = document.createElement('script')
    const timer = setTimeout(() => finish(new Error('Deezer tidak merespons')), timeout)
    function finish(err, data) {
      clearTimeout(timer)
      window[cb] = () => {} // respons yang telat datang tidak bikin error
      script.remove()
      if (err) reject(err)
      else resolve(data)
    }
    window[cb] = (data) => (data?.error ? finish(new Error(data.error.message || 'Deezer error')) : finish(null, data))
    script.onerror = () => finish(new Error('Gagal terhubung ke Deezer'))
    script.src = `${API}${path}?${new URLSearchParams({ ...params, output: 'jsonp', callback: cb })}`
    document.head.appendChild(script)
  })
}

const toTrack = (t) => ({
  id: t.id,
  title: t.title_short || t.title,
  artist: t.artist?.name || '',
  cover: t.album?.cover_medium || t.album?.cover || '',
  preview: t.preview,
  link: t.link,
})

const poolCache = new Map()

/** Semua lagu (yang punya preview) dari playlist sebuah kategori, plus lagu populer dari artis-artisnya. */
export async function categoryTracks(category) {
  if (poolCache.has(category.id)) return poolCache.get(category.id)
  const lists = await Promise.allSettled([
    ...(category.playlists || []).map((id) => jsonp(`playlist/${id}/tracks`, { limit: 100 })),
    ...(category.artists || []).map((name) => jsonp('search/track', { q: `artist:"${name}"`, limit: 15 })),
  ])
  const seen = new Set()
  const tracks = []
  for (const res of lists) {
    if (res.status !== 'fulfilled') continue
    for (const t of res.value.data || []) {
      if (!t.preview || t.readable === false) continue
      const key = normalize(t.title_short || t.title) + '|' + normalize(t.artist?.name || '')
      if (seen.has(t.id) || seen.has(key)) continue
      seen.add(t.id)
      seen.add(key)
      tracks.push(toTrack(t))
    }
  }
  if (!tracks.length) throw new Error('Playlist kategori ini sedang tidak bisa dimuat')
  poolCache.set(category.id, tracks)
  return tracks
}

/** Cari playlist publik berdasarkan kata kunci. */
export async function searchPlaylists(q, limit = 8) {
  const res = await jsonp('search/playlist', { q, limit })
  return (res.data || []).map((p) => ({ id: p.id, title: p.title, size: p.nb_tracks || 0 }))
}

/** Cari lagu di seluruh katalog Deezer (untuk saran jawaban). */
export async function searchTracks(q, limit = 8) {
  const res = await jsonp('search/track', { q, limit })
  return (res.data || []).map(toTrack)
}

/** Ratakan judul supaya "Sunflower (Spider-Man...)" = "sunflower", "Señorita" = "senorita". */
export function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // buang tanda aksen (é → e)
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*\b(remix|remaster\w*|version|ver|edit|live|mix|from|radio|acoustic|sped|slowed|instrumental)\b.*$/, ' ')
    .replace(/\s(feat|ft)\.?\s.*$/, ' ')
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Tebakan dianggap benar bila sama dengan judul. Judul dua bahasa ("으르렁 Growl") cukup ditebak salah satunya. */
export function isMatch(guess, title) {
  const g = normalize(guess)
  if (!g) return false
  const t = normalize(title)
  const latin = t.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const other = t.replace(/[a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
  return [t, latin, other].some((v) => v && v === g)
}
