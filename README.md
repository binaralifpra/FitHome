# FitHome.

Platform fitness & nutrisi berbasis AI untuk anak kos — latihan dari kamar, lapor makan tanpa timbang gram.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil statis di dist/
```

## Pengaturan (sekali saja)

1. **Groq (AI)** — salin `.env.example` jadi `.env.local`, isi `VITE_GROQ_API_KEY` (https://console.groq.com/keys).
   - `VITE_GROQ_CHAT_MODEL` (default `openai/gpt-oss-120b`) — chat AI Coach
   - `VITE_GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`) — hitung kalori & baca foto makanan
   Tanpa kunci, hitung kalori memakai kamus lokal dan chat menampilkan pesan belum tersambung.
2. **Firebase Auth** — Console → Authentication → Sign-in method: aktifkan **Email/Password** dan **Google**.
3. **Firestore rules** — tempel isi `firestore.rules` di Console → Firestore → Rules → Publish. Tanpa ini data hanya tersimpan di perangkat.
4. **Deploy** — tambahkan domain situs di Authentication → Settings → Authorized domains.

> Kunci `VITE_*` ikut masuk ke JavaScript publik. Untuk rilis sungguhan, pindahkan panggilan Groq ke server (mis. Cloud Functions).

## Halaman

| Rute | Isi |
|---|---|
| `#/login` | Masuk/daftar email atau Google |
| `#/onboarding` | 11 pertanyaan, satu per layar, diakhiri kartu konfigurasi |
| `#/` (Home) | Halaman awal: hero latihan hari ini + dua panel setara (latihan: gerakan & beban · nutrisi: kalori, protein, gorengan) + Daily Fun |
| `#/latihan` (Workouts) | Alur sesi: Awal → Persiapan → Pemanasan → Latihan ⇄ Rest (Skip/Back/Pause) → Pendinginan → Selesai |
| `#/program` (Programs) | 4 minggu + grid 7 hari dengan jarak istirahat per tipe; klik hari untuk override; **Lapor ke AI** menyusun ulang minggu ini dari perintah ketik (divalidasi ulang aturan jeda) |
| `#/nutrisi` (Nutrition) | Pantauan kalori & protein harian, chip makanan, hitung AI, foto makanan (AI vision), log harian |
| `#/coach` (AI Coach) | Chat dengan AI Coach (juga lewat tombol mengambang di semua halaman) |
| `#/fun` (Fun Games) | Pilih game: Quiz (10 soal dari AI), Wordly (4–9 huruf), Puzzle geser 3×3, Tebak Lagu |
| `#/profil` | Kartu konfigurasi, progres 14 hari, notifikasi, bantuan, keluar |

## Tema

Sand (terang) dan Charcoal (gelap) lewat token warna di `src/index.css` — toggle di navbar. Di tema gelap, panel lapor makanan memakai panel terang `.food-panel`.

## Struktur

- `src/lib/groq.js` — klien Groq (chat streaming, JSON, vision)
- `src/lib/coach.js` — aturan AI Coach: split, gerakan sesuai alat (dumbbell/band/bangku/pull-up), repetisi sesuai berat, target kalori & protein
- `src/lib/adjustPlan.js` — fitur "Lapor ke AI" di Programs
- `src/lib/schedule.js` — algoritma jadwal mingguan (jarak istirahat per split + override)
- `src/lib/calorie.js` — estimasi kalori (AI + kamus cadangan), analisis foto
- `src/store/` — login Firebase & state per akun (localStorage + Firestore)

## Foto

Foto di `public/images/` dari Wikimedia Commons (Creative Commons). Kredit lengkap di `src/data/credits.json` dan Profil → Kredit foto.
