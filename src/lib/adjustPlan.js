// "Lapor ke AI": user menulis kondisinya (sibuk, skip, baru sembuh, mau fokus tertentu),
// AI menyusun ulang hari latihan/rest minggu ini — termasuk FOKUS dan INTENSITAS.
//
// Supaya tampilan selalu sinkron dengan data:
//  - AI menunjuk hari dengan NAMA (Senin–Minggu), bukan indeks, agar tidak meleset satu hari.
//  - Hasil AI divalidasi ulang dengan aturan jeda aplikasi.
//  - Ringkasan perubahan dihitung dari jadwal AKHIR (bukan dari teks AI); AI hanya memberi alasan.
import { askJSON } from './groq'
import { TYPE_LABEL } from './coach'
import { SESSION_TYPES } from './schedule'
import { DAYS } from '../data/questions'
import { BODY_PARTS } from './coach'
import { addDays } from './dates'

const SYSTEM = `Kamu AI Coach yang menyusun ulang jadwal latihan mingguan mahasiswa yang latihan di kamar kos.

Tipe fokus (pakai kode ini persis):
"full" = full body, "upper" = tubuh atas (dada, punggung, bahu, lengan), "lower" = kaki & bokong,
"push", "pull", "legs", "core" = perut/abs, "mobility" = peregangan/pemulihan.
Pemetaan kata user: abs/perut/core → "core"; kaki/paha/leg day → "lower"; tangan/dada/bahu/punggung → "upper"; peregangan/stretching → "mobility".
Kombinasi boleh, mis. "upper + abs" → ["upper","core"].
Intensitas: "ringan" kalau user baru sembuh/sakit/capek/kurang tidur/minta ringan; selain itu "normal".
Kalau user menyebut bagian tubuh yang SAKIT, jangan latih bagian itu (mis. tangan sakit → "lower" atau "mobility").

Aturan WAJIB:
- IKUTI fokus & intensitas yang diminta. Jangan ganti ke full body kalau user minta fokus lain.
- "hari ini" = hari bertanda (hari ini). "besok" = hari setelahnya.
- Jarak sesi berat dengan otot sama: Full/Upper/Push/Pull min 2 hari, Lower/Legs min 3 hari. Sesi ringan boleh lebih dekat.
- Hanya ubah hari bertanda "boleh diubah". Hari lewat/sudah dilakukan tidak bisa diubah.
- Utamakan pemulihan; target sesi boleh kurang.

Kalau user menyebut KELUHAN/SAKIT di bagian tubuh, isi "condition":
{"parts":[kode dari: "wrist"=pergelangan/tangan, "shoulder"=bahu, "knee"=lutut, "lower_back"=punggung bawah/pinggang, "ankle"=pergelangan kaki], "days": perkiraan lama pemulihan 2-7, "label": "mis. Pergelangan tangan sakit"}
Kalau tidak ada keluhan, "condition": null. Aplikasi akan otomatis menghindari gerakan yang membebani bagian itu selama masa pemulihan.

Balas JSON:
{"plan":[{"day":"Kamis","status":"workout"|"rest","focus":["upper","core"],"intensity":"ringan"|"normal","note":"batasan kondisi untuk penyusun gerakan, mis. \"pergelangan tangan sakit: hindari gerakan yang menahan beban/menumpu di tangan\" (kosongkan kalau tidak ada)"}],
 "condition": {...} | null,
 "reason":"1 kalimat alasan, Bahasa Indonesia santai & suportif, TANPA menyebut nama hari"}
"plan" berisi SEMUA hari yang boleh diubah (pakai nama hari persis seperti di daftar). Untuk "rest", focus/intensity kosongkan.`

const NAME = { ...TYPE_LABEL, core: 'Abs' }

/** Teks tampilan satu hari, mis. "Upper + Abs (ringan)" atau "Rest". */
export function describeDay(d) {
  if (d.status !== 'workout') return 'Rest'
  if (d.label) return d.label
  const f = (d.focus || [d.type]).map((t) => NAME[t]).join(' + ')
  return d.intensity === 'ringan' ? `${f} (ringan)` : f
}

/** Kunci pembanding (abaikan beda penulisan label). */
const keyOf = (d) => (d.status !== 'workout' ? 'rest' : `${[...(d.focus || [d.type])].sort().join('+')}|${d.intensity || 'normal'}`)

const dayIndex = (name) => {
  const n = String(name || '').trim().toLowerCase()
  return DAYS.findIndex((d) => d.toLowerCase() === n || n.startsWith(d.toLowerCase().slice(0, 3)))
}

/**
 * @param plan      hasil planWeek minggu ini
 * @param editable  (i) => boolean, hari yang boleh diubah
 * @param preview   (map indeksHari → override) => plan baru
 * @param current   override minggu ini sekarang (indeks → nilai)
 */
export async function adjustWeek({ plan, editable, preview, current = {}, message, freq, profileName, today }) {
  const lines = plan.days.map((d) => {
    const flags = [
      d.date === today && 'hari ini',
      d.done && 'sudah dilakukan',
      d.past && 'sudah lewat',
      editable(d.i) ? 'boleh diubah' : 'tidak bisa diubah',
    ].filter(Boolean)
    return `- ${DAYS[d.i]} (${d.date}): ${describeDay(d)} [${flags.join(', ')}]`
  })
  const user = `Nama: ${profileName}. Program ${freq}x/minggu, target minggu ini ${plan.target} sesi.
Jadwal minggu ini sekarang:
${lines.join('\n')}

Pesan user: "${message}"`

  const r = await askJSON({ system: SYSTEM, user, temperature: 0, signal: AbortSignal.timeout(25000) })
  if (!Array.isArray(r.plan)) throw new Error('Format jawaban AI tidak sesuai')

  // Kondisi tubuh (opsional) — divalidasi lalu ikut dipakai saat simulasi jadwal
  let condition = null
  const parts = (r.condition?.parts || []).filter((p) => BODY_PARTS[p])
  if (parts.length) {
    const days = Math.min(7, Math.max(1, Math.round(Number(r.condition.days) || 3)))
    condition = { avoid: [...new Set(parts)], label: String(r.condition.label || parts.map((p) => BODY_PARTS[p]).join(' & ') + ' sakit').slice(0, 60), from: today, until: addDays(today, days - 1) }
  }
  const sim = (map) => preview(map, condition ? [condition] : [])

  // Override baru: hari yang tidak bisa diubah tetap seperti sebelumnya
  let next = {}
  for (const [k, v] of Object.entries(current)) if (!editable(Number(k))) next[k] = v
  for (const item of r.plan) {
    const i = item.day != null ? dayIndex(item.day) : Number(item.i)
    if (!Number.isInteger(i) || i < 0 || i > 6 || !editable(i)) continue
    if (item.status === 'rest') next[i] = 'rest'
    else if (item.status === 'workout') {
      const focus = [...new Set((Array.isArray(item.focus) ? item.focus : [item.focus]).map((t) => String(t || '').toLowerCase()).filter((t) => SESSION_TYPES.includes(t)))]
      const intensity = item.intensity === 'ringan' ? 'ringan' : 'normal'
      // nama sesi TIDAK diambil dari AI — selalu dibentuk dari fokus + intensitas supaya sinkron
      const note = item.note ? String(item.note).slice(0, 160) : undefined
      next[i] = { status: 'workout', focus: focus.length ? focus : undefined, intensity, note }
    }
  }

  // Validasi jeda: sesi berat manual yang terlalu dekat dengan otot yang sama → jadikan rest
  const fixedByRules = []
  for (let guard = 0; guard < 7; guard++) {
    const bad = sim(next).days.find((d) => d.status === 'workout' && d.manual && d.tooClose)
    if (!bad) break
    next = { ...next, [bad.i]: 'rest' }
    fixedByRules.push(DAYS[bad.i])
  }

  // Ringkasan dari jadwal AKHIR
  const after = sim(next)
  const changes = plan.days
    .map((d, i) => {
      const a = after.days[i]
      if (keyOf(d) === keyOf(a)) return null
      const tag = d.date === today ? ' (hari ini)' : ''
      return { day: `${DAYS[i]}${tag}`, from: describeDay(d), to: describeDay(a) }
    })
    .filter(Boolean)

  let reason = String(r.reason || r.message || '').slice(0, 300)
  if (fixedByRules.length) reason += ` ${fixedByRules.join(', ')} dijadikan Rest supaya otot yang sama tetap dapat jeda.`
  return { overrides: next, reason: reason.trim(), changes, condition }
}
