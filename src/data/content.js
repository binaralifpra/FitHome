// Chip makanan cepat (Prompt 4). fried = gorengan (border oranye), lainnya border hijau.
export const FOOD_CHIPS = [
  { name: 'Nasi + Ayam Goreng', kcal: 550, protein: 26, fried: true, photo: 'food-ayam-goreng.jpg' },
  { name: 'Nasi + Tempe Orek', kcal: 420, protein: 16, fried: false, photo: 'food-tempe-goreng.jpg' },
  { name: 'Nasi + Telur Dadar', kcal: 380, protein: 13, fried: false, photo: 'food-nasi.jpg' },
  { name: 'Indomie Goreng', kcal: 380, protein: 8, fried: true, photo: 'food-mie-instan.jpg' },
  { name: 'Nasi + Ikan Bakar', kcal: 400, protein: 27, fried: false, photo: 'food-ayam-bakar.jpg' },
  { name: 'Bakwan / Gorengan', kcal: 150, protein: 3, fried: true, photo: 'food-bakwan.jpg' },
]
// Tiga chip di Home
export const HOME_CHIPS = [FOOD_CHIPS[0], FOOD_CHIPS[1], FOOD_CHIPS[3]]

/** Pesan log gorengan — selalu suportif, tidak pernah menyalahkan. */
export function friedMessage(n, max) {
  if (n === 0) return 'Belum ada gorengan hari ini, aman.'
  if (n < max) return `Gorengan hari ini ${n} dari ${max}, masih sesuai misi.`
  if (n === max) return 'Pas sama misi hari ini. Sisanya coba direbus atau dikukus, ya.'
  return `Sudah ${n} gorengan hari ini. Nggak apa-apa, besok pelan-pelan dikurangi lagi.`
}

// Daily Fun di Home (Prompt 1)
export const DAILY_PROMPTS = [
  'Tebak lagu: lanjutin liriknya dalam hati sambil squat 10x.',
  'Wordle gym: tebak nama gerakan dari 3 huruf pertama.',
  'Tebak stiker WA favorit temanmu hari ini.',
]

// Wordly — bank kata bertema olahraga & kesehatan per panjang huruf
const WORDS = {
  4: ['OTOT', 'LARI', 'YOGA', 'DADA', 'BAHU', 'PAHA', 'SUSU', 'NASI', 'IKAN', 'TAHU', 'JAHE', 'APEL', 'GIZI'],
  5: ['SEHAT', 'SENAM', 'BETIS', 'TIDUR', 'PLANK', 'SQUAT', 'LUNGE', 'SAYUR', 'TEMPE', 'LEMAK', 'BEBAN', 'NAPAS', 'TELUR', 'BAYAM'],
  6: ['RENANG', 'KALORI', 'BURPEE', 'KARDIO', 'SEPEDA', 'JOGING', 'PISANG', 'PUSHUP', 'PULLUP', 'TRISEP', 'BISEPS', 'KEDELE'],
  7: ['PROTEIN', 'VITAMIN', 'STAMINA', 'MINERAL', 'KENTANG', 'LATIHAN', 'SARAPAN', 'HIDRASI', 'NUTRISI', 'PILATES'],
  8: ['DEADLIFT', 'KANGKUNG', 'OLAHRAGA', 'DUMBBELL', 'GLIKOGEN', 'SEMANGKA', 'CROSSFIT', 'JUMPROPE'],
  9: ['PEMANASAN', 'KEBUGARAN', 'KONSISTEN', 'ISTIRAHAT', 'TREADMILL', 'HAMSTRING', 'METABOLIS', 'KESEHATAN'],
}
export const WORD_BANK = Object.fromEntries(Object.entries(WORDS).map(([n, list]) => [n, list.filter((w) => w.length === Number(n))]))

// Edukasi singkat yang muncul selama rest-lock timer
export const REST_FACTS = [
  'Otot tidak tumbuh saat kamu mengangkat beban — otot tumbuh saat kamu istirahat. Latihan hanya memberi "sinyal".',
  'Jeda 60 detik memberi waktu tubuh mengisi ulang ATP, bahan bakar cepat ototmu. Set berikutnya jadi lebih berkualitas.',
  'Detak jantung yang turun pelan di sela set itu normal. Tarik napas lewat hidung 4 detik, buang lewat mulut 6 detik.',
  'Overtraining sering terjadi justru pada pemula yang terlalu semangat. Istirahat adalah bagian dari program, bukan jeda dari program.',
  'Minum seteguk air sekarang. Kehilangan cairan 2% saja sudah bisa menurunkan performa latihan.',
  'Rasa pegal 1–2 hari setelah latihan (DOMS) itu wajar. Yang tidak wajar adalah nyeri tajam — kalau terasa, berhenti.',
]

// Daily Fun — pertanyaan iseng di Home
export const TRIVIA = [
  { q: 'Otot paling besar di tubuh manusia adalah…', options: ['Bisep', 'Gluteus maximus (bokong)', 'Otot dada'], answer: 1, note: 'Makanya squat & glute bridge itu "investasi" yang efisien.' },
  { q: 'Berapa lama idealnya jeda sebelum melatih otot yang sama lagi?', options: ['12 jam', '24 jam', '48–72 jam'], answer: 2, note: 'Ini alasan AI Coach tidak menjadwalkan latihan sama dua hari berturut-turut.' },
  { q: '1 tempe goreng kira-kira setara berapa kalori?', options: ['± 20 kkal', '± 80 kkal', '± 300 kkal'], answer: 1, note: 'Tempe tetap sumber protein bagus — yang bikin kalorinya naik itu minyaknya.' },
  { q: 'Tebak gerakan: "turun seperti mau duduk di kursi, lalu berdiri lagi"', options: ['Lunge', 'Squat', 'Deadlift'], answer: 1, note: 'Squat — gerakan dasar yang kamu lakukan tiap hari tanpa sadar.' },
  { q: 'Tidur kurang dari 6 jam bisa membuat…', options: ['Nafsu makan naik', 'Otot tumbuh lebih cepat', 'Tidak ada efek'], answer: 0, note: 'Hormon lapar (ghrelin) naik saat kurang tidur. Tidur juga bagian dari program diet.' },
  { q: 'Mana yang lebih "hemat kalori" untuk lauk?', options: ['Ayam goreng tepung', 'Ayam bakar', 'Sama saja'], answer: 1, note: 'Selisihnya bisa 60–100 kkal per potong, cuma karena cara masak.' },
  { q: 'Push-up dengan lutut di lantai itu…', options: ['Curang', 'Variasi yang sah untuk membangun kekuatan', 'Tidak melatih dada'], answer: 1, note: 'Semua orang mulai dari suatu tempat. Bentuk gerakan yang benar > gaya.' },
  { q: 'Tebak gerakan: "berbaring, angkat pinggul sampai badan lurus"', options: ['Glute bridge', 'Plank', 'Sit-up'], answer: 0, note: 'Glute bridge — bagus juga buat yang kebanyakan duduk kuliah.' },
]


// Pemanasan & pendinginan — perintah langkah demi langkah (seconds = ada hitung mundur)
export const WARMUP = [
  { text: 'Lakukan jumping jack', seconds: 30, photo: 'type-full.jpg' },
  { text: 'Putar bahu ke depan dan ke belakang', detail: '10x tiap arah', photo: 'db-shoulder-press.jpg' },
  { text: 'Putar pinggul pelan-pelan', detail: '10x tiap arah', photo: 'hip-flexor.jpg' },
  { text: 'Squat tanpa beban, gerak pelan', detail: '10x', photo: 'bw-squat.jpg' },
  { text: 'Arm circle besar', seconds: 20, photo: 'db-curl.jpg' },
]

export const COOLDOWN = [
  { text: 'Tarik napas dalam lewat hidung, buang lewat mulut', detail: '5x', photo: 'type-mobility.jpg' },
  { text: 'Peregangan paha depan sambil berpegangan dinding', seconds: 30, detail: '15 detik tiap kaki', photo: 'hip-flexor.jpg' },
  { text: 'Peregangan dada: tangan di kusen pintu, condongkan badan', seconds: 20, photo: 'worlds-greatest.jpg' },
  { text: "Child's pose, biarkan punggung rileks", seconds: 30, photo: 'childs-pose.jpg' },
]

// Soal cadangan Quiz (dipakai kalau AI tidak bisa dihubungi)
export const QUIZ_FALLBACK = [
  { q: 'Berapa lama jeda ideal sebelum melatih otot yang sama lagi?', options: ['6 jam', '12 jam', '48–72 jam', '1 minggu'], answer: 2, explain: 'Otot butuh 48–72 jam untuk pulih dan tumbuh setelah dilatih.' },
  { q: 'Otot terbesar di tubuh manusia adalah…', options: ['Bisep', 'Gluteus maximus', 'Dada', 'Betis'], answer: 1, explain: 'Gluteus maximus (bokong) adalah otot terbesar — squat dan glute bridge melatihnya.' },
  { q: 'Fungsi utama pemanasan sebelum latihan adalah…', options: ['Membakar lemak', 'Menaikkan suhu otot & mengurangi risiko cedera', 'Menambah massa otot', 'Mengganti latihan inti'], answer: 1, explain: 'Pemanasan membuat otot dan sendi lebih siap bergerak.' },
  { q: 'Zat gizi yang paling berperan untuk perbaikan otot adalah…', options: ['Protein', 'Gula', 'Garam', 'Kafein'], answer: 0, explain: 'Protein menyediakan bahan untuk memperbaiki serat otot.' },
  { q: 'Lauk mana yang umumnya lebih rendah kalori?', options: ['Ayam goreng tepung', 'Ayam bakar', 'Ayam geprek', 'Ayam krispi'], answer: 1, explain: 'Dibakar tidak menyerap minyak sebanyak digoreng.' },
  { q: 'Kurang tidur cenderung membuat…', options: ['Nafsu makan naik', 'Otot tumbuh lebih cepat', 'Stamina naik', 'Tidak ada efek'], answer: 0, explain: 'Hormon lapar meningkat saat kurang tidur.' },
  { q: 'Push-up dengan lutut di lantai adalah…', options: ['Gerakan curang', 'Variasi sah untuk pemula', 'Tidak melatih dada', 'Berbahaya'], answer: 1, explain: 'Variasi lutut melatih otot yang sama dengan beban lebih ringan.' },
  { q: 'Saat plank, posisi badan yang benar adalah…', options: ['Pinggul tinggi', 'Pinggul turun', 'Lurus dari kepala ke tumit', 'Punggung melengkung'], answer: 2, explain: 'Badan lurus menjaga core bekerja dan punggung bawah aman.' },
  { q: 'Minum air saat latihan sebaiknya…', options: ['Tidak sama sekali', 'Sedikit-sedikit di sela set', 'Sekaligus 2 liter', 'Hanya setelah selesai'], answer: 1, explain: 'Teguk kecil di sela set menjaga hidrasi tanpa membuat perut begah.' },
  { q: 'Rasa pegal 1–2 hari setelah latihan disebut…', options: ['DOMS', 'Kram', 'Cedera', 'Dehidrasi'], answer: 0, explain: 'DOMS (delayed onset muscle soreness) wajar dan akan hilang sendiri.' },
  { q: 'Gerakan yang melatih paha belakang (hamstring) adalah…', options: ['Bicep curl', 'Romanian deadlift', 'Shoulder press', 'Push-up'], answer: 1, explain: 'RDL mendorong pinggul ke belakang sehingga hamstring teregang dan bekerja.' },
  { q: 'Cara aman menurunkan berat badan adalah…', options: ['Tidak makan malam sama sekali', 'Defisit kalori kecil & konsisten', 'Puasa 3 hari', 'Minum obat pelangsing'], answer: 1, explain: 'Defisit kecil lebih mudah dijalani dan tidak bikin stres.' },
]

// Saran ketik untuk lapor makanan (muncul di baris saran kolom). Porsi bisa diedit sesudahnya.
export const FOOD_SUGGEST = [
  { text: 'nasi putih', hint: '~200' },
  { text: 'nasi setengah', hint: '~100' },
  { text: 'ayam goreng', hint: '~260' },
  { text: 'ayam bakar', hint: '~200' },
  { text: 'ikan bakar', hint: '~150' },
  { text: 'telur rebus', hint: '~70' },
  { text: 'telur dadar', hint: '~150' },
  { text: 'tempe goreng', hint: '~90' },
  { text: 'tempe orek', hint: '~120' },
  { text: 'tahu bacem', hint: '~80' },
  { text: 'tumis kangkung', hint: '~60' },
  { text: 'sayur bayam', hint: '~40' },
  { text: 'pecel', hint: '~300' },
  { text: 'indomie goreng', hint: '~380' },
  { text: 'bakwan', hint: '~150' },
  { text: 'pisang', hint: '~90' },
  { text: 'es teh manis', hint: '~120' },
  { text: 'susu', hint: '~130' },
  { text: 'nasi padang', hint: '~650' },
]
