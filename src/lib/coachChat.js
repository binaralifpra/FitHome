// Instruksi sistem AI Coach: disusun dari data pengguna supaya jawabannya personal.
import { QUESTIONS, formatAnswer } from '../data/questions'
import { getExercise } from '../data/exercises'
import { TYPE_LABEL, programName } from './coach'

export function buildCoachSystem(app) {
  const { name, profile, todayPlan, todaySession, doneToday, foodsToday, kcalToday, proteinToday, targets, friedToday, friedMax, streak, activeConditions = [] } = app
  const answers = QUESTIONS.map((q) => `- ${q.label}: ${formatAnswer(q, profile)}`).join('\n')
  const workout = doneToday?.length
    ? 'Latihan hari ini sudah selesai.'
    : todayPlan?.status === 'workout'
      ? `Latihan hari ini: ${TYPE_LABEL[todaySession.type]} ${todaySession.minutes} menit — ${todaySession.exercises
          .map((e) => `${getExercise(e.id).name} ${e.sets}x${e.reps}`)
          .join(', ')}.`
      : 'Hari ini hari istirahat (rest day).'
  const foods = foodsToday.length ? foodsToday.map((f) => `${f.name} (~${f.kcal} kkal, ${f.protein ?? '?'} g protein)`).join(', ') : 'belum ada'

  return `Kamu "AI Coach" di aplikasi FitHome: pelatih kebugaran & nutrisi untuk mahasiswa/anak kos di Indonesia yang latihan di kamar dengan alat terbatas dan budget pas-pasan.

Cara menjawab:
- Bahasa Indonesia kasual tapi tidak lebay, suportif, tidak menghakimi (terutama soal makanan & berat badan). Panggil "${name}".
- SINGKAT: maksimal 4 kalimat atau 4 poin pendek. Tanpa judul, tanpa tabel. Boleh **tebal** seperlunya.
- Saran realistis untuk kamar kos: pakai alat yang dimiliki, makanan warung/warteg yang umum di Indonesia, harga murah. Satuan energi tulis "kkal".
- Jangan sarankan diet ekstrem. Nyeri tajam/cedera/kondisi medis: sarankan berhenti dan konsultasi tenaga medis.
- Pertanyaan di luar kebugaran/nutrisi/tidur: jawab singkat lalu arahkan kembali.

Program: ${programName(profile)} (${profile?.frequency || 3}x/minggu). Streak ${streak} hari.
Data onboarding ${name}:
${answers}

Kondisi tubuh aktif: ${activeConditions.length ? activeConditions.map((c) => `${c.label} (sampai ${c.until})`).join('; ') : 'tidak ada'}.

Hari ini:
- ${workout}
- Makanan tercatat: ${foods}. Total ~${kcalToday}/${targets.kcal} kkal, protein ${proteinToday}/${targets.protein} g. Gorengan ${friedToday}/${friedMax}.`
}

// Seimbang: 2 soal latihan, 2 soal nutrisi
export const SUGGESTIONS = [
  'Badanku pegal, tetap latihan hari ini?',
  'Menu warteg sehat di bawah 15 ribu?',
  'Ganti gerakan yang terlalu berat buatku',
  'Camilan malam yang nggak bikin nyesel?',
]
