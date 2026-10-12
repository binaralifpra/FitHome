// "Request genre": permintaan bebas pengguna diubah AI menjadi kategori Tebak Lagu
// (kata kunci playlist + artis perwakilan), lalu dicarikan playlist-nya di Deezer.
import { aiReady, askJSON } from './groq'
import { normalize, searchPlaylists } from './deezer'

const SYSTEM = `Kamu kurator musik untuk game tebak lagu. Pengguna mengetik genre, era, suasana, atau tema lagu yang ingin dimainkan.
Ubah permintaannya menjadi kategori. Balas HANYA JSON:
{"name": string, "desc": string, "queries": string[], "artists": string[]}
- name: nama kategori singkat, maksimal 3 kata, Title Case.
- desc: satu kalimat pendek bahasa Indonesia santai, tanpa emoji.
- queries: 2-3 kata kunci untuk mencari playlist di Deezer. Pakai istilah yang lazim muncul di judul playlist (mis. "dangdut koplo", "lagu galau indonesia", "disney hits").
- artists: 6-10 artis paling terkenal yang mewakili permintaan itu, ejaan resmi.
Jika permintaan bukan tentang musik atau tidak pantas, balas {"name": "", "desc": "", "queries": [], "artists": []}.`

class RequestError extends Error {}

/** Kembalikan objek kategori yang siap dipakai categoryTracks(). */
export async function customCategory(text) {
  const request = text.trim().slice(0, 80)
  let spec = { name: request, desc: 'Genre pilihanmu sendiri', queries: [request], artists: [] }

  if (aiReady) {
    try {
      const r = await askJSON({ system: SYSTEM, user: request, temperature: 0.3, signal: AbortSignal.timeout(15000) })
      if (!r?.name) throw new RequestError('Permintaan itu sepertinya bukan genre musik. Coba yang lain, ya.')
      spec = {
        name: String(r.name).slice(0, 40),
        desc: String(r.desc || spec.desc).slice(0, 120),
        queries: [...(Array.isArray(r.queries) ? r.queries : []), request].map(String).slice(0, 3),
        artists: (Array.isArray(r.artists) ? r.artists : []).map(String).slice(0, 10),
      }
    } catch (e) {
      if (e instanceof RequestError) throw e
      // AI gagal/kuota habis → tetap jalan dengan pencarian Deezer biasa
    }
  }

  const found = await Promise.allSettled(spec.queries.map((q) => searchPlaylists(q, 6)))
  const playlists = []
  for (const res of found) {
    if (res.status !== 'fulfilled') continue
    res.value
      .filter((p) => p.size >= 15 && !playlists.includes(p.id))
      .slice(0, 2)
      .forEach((p) => playlists.push(p.id))
  }
  if (!playlists.length && !spec.artists.length) throw new RequestError(`Belum ketemu lagu untuk "${request}". Coba kata lain.`)

  return { id: `req:${normalize(request)}`, name: spec.name, desc: spec.desc, playlists: playlists.slice(0, 4), artists: spec.artists, custom: true }
}
