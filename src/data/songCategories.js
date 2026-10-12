// Kategori Tebak Lagu. Tiap kategori diambil dari 1–3 playlist publik Deezer (angka = ID playlist,
// lihat di URL deezer.com/playlist/<ID>). Ganti/tambah ID untuk mengubah isi kategori.
export const SONG_CATEGORIES = [
  { id: 'sporty', name: 'Sporty', desc: 'Lagu workout yang bikin semangat', playlists: [2153050122, 1229994421, 12593959543] },
  { id: 'phonk', name: 'Brazilian Phonk', desc: 'Funk & phonk Brasil buat angkat beban', playlists: [10311353222] },
  { id: 'pop', name: 'Pop', desc: 'Hits pop internasional', playlists: [1386209585, 2228601362] },
  { id: 'kpop', name: 'K-Pop', desc: 'Dari BLACKPINK sampai KATSEYE', playlists: [4096400722, 9001527742] },
  { id: 'edm', name: 'EDM', desc: 'Dance & elektronik', playlists: [706093725, 8993448342] },
  { id: 'jpop', name: 'J-Pop', desc: 'YOASOBI, Kenshi Yonezu, dkk.', playlists: [6049895724, 3884381442] },
  { id: 'anime', name: 'Anime', desc: 'Opening & ending anime', playlists: [5206929684] },
  { id: 'indie', name: 'Indie', desc: 'Indie rock & alternatif', playlists: [8716319082, 735488796] },
  { id: 'indie-id', name: 'Indie Indonesia', desc: 'Pamungkas, Nadin Amizah, Hindia', playlists: [15611583383] },
  { id: 'pop-id', name: 'Pop Indonesia', desc: 'Lagu pop Indonesia yang akrab di telinga', playlists: [4476967264] },
  { id: '2010s', name: '2010s', desc: 'Hits 2010–2019', playlists: [715215865, 8282573142] },
  { id: '2020s', name: '2020s', desc: 'Hits terbaru 2020-an', playlists: [13650084141] },
  { id: '90s', name: '90s', desc: 'Lagu pesta era 90-an', playlists: [2322259622] },
  { id: 'hiphop', name: 'Hip Hop', desc: 'Rap & hip hop klasik sampai baru', playlists: [8291905122] },
  { id: 'rock', name: 'Rock', desc: 'Rock legendaris sepanjang masa', playlists: [1306931615] },
]
