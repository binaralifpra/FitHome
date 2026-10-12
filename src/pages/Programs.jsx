import { useState } from 'react'
import { ArrowRight, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { Button, Media, PhotoTag, Section, Shade } from '../components/ui'
import { GAP_DAYS, TYPE_LABEL, programName } from '../lib/coach'
import { WEEKS, readOverride, targetFor, weekOverrides } from '../lib/schedule'
import { DAYS } from '../data/questions'
import { adjustWeek, describeDay } from '../lib/adjustPlan'
import { aiReady } from '../lib/groq'
import { shortDate } from '../lib/dates'
import { getExercise, photoOf } from '../data/exercises'

export default function Programs() {
  const { profile, week, weekPlan, today } = useApp()
  const [selectedWeek, setSelectedWeek] = useState(week)
  const plan = weekPlan(selectedWeek)
  const todayIdx = plan.days.findIndex((d) => d.date === today)
  const [selected, setSelected] = useState(null)
  const sel = plan.days[selected ?? (todayIdx >= 0 ? todayIdx : 0)]
  const freq = profile?.frequency || 3
  const firstType = plan.days.find((d) => d.type && d.type !== 'core' && d.type !== 'mobility')?.type ?? 'full'
  const gapHours = (GAP_DAYS[firstType] ?? 2) * 24

  return (
    <>
      <Section className="pt-6">
        <Media src="workout-hero.jpg" alt="Latihan squat dengan dumbbell di rumah" className="h-[240px] rounded-[2rem]">
          <Shade opacity={0.5} />
          <div className="absolute inset-x-0 bottom-0 p-6 text-paper sm:p-9">
            <PhotoTag>Disusun dari jawaban onboardingmu</PhotoTag>
            <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">{programName(profile)}</h1>
            <p className="mt-2 text-paper/85">Program 4 minggu, jadwal menyesuaikan otomatis kalau harimu berubah</p>
          </div>
        </Media>
      </Section>

      {/* Pemilih minggu */}
      <Section className="mt-6">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {WEEKS.map((w) => {
            const active = w.n === selectedWeek
            return (
              <button
                key={w.n}
                onClick={() => {
                  setSelectedWeek(w.n)
                  setSelected(null)
                }}
                className={`min-w-44 shrink-0 rounded-[1.25rem] px-4 py-3 text-left transition ${active ? 'bg-cta text-on-cta' : 'bg-panel hover:bg-ink/8'}`}
              >
                <p className={`text-sm ${active ? 'opacity-80' : 'text-muted'}`}>
                  Minggu {w.n} · {targetFor(w.n, freq)}x{w.n === week ? ' · sekarang' : ''}
                </p>
                <p className="font-serif text-lg font-semibold">{w.focus}</p>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Grid 7 hari — klik untuk melihat & mengatur hari itu */}
      <Section className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {plan.days.map((d) => {
            const workout = d.status === 'workout'
            const isToday = d.date === today
            const isSel = sel?.i === d.i
            return (
              <button
                key={d.i}
                onClick={() => setSelected(d.i)}
                aria-pressed={isSel}
                className={`flex h-28 flex-col justify-between rounded-[1.25rem] p-3.5 text-left transition ${
                  workout ? 'bg-cta text-on-cta dark:bg-cta/14 dark:text-ink' : 'bg-panel'
                } ${isSel ? 'ring-2 ring-ink/60' : ''} ${isToday ? 'outline-2 outline-offset-2 outline-cta' : ''}`}
              >
                <span className={`text-sm ${workout ? 'opacity-80' : 'text-muted'}`}>
                  {DAYS[d.i]}
                  {isToday ? ' · hari ini' : ''}
                </span>
                <span>
                  <span className="block font-serif text-lg leading-tight font-semibold">{describeDay(d)}</span>
                  <span className={`block text-xs ${workout ? 'opacity-75' : 'text-muted'}`}>
                    {d.done ? 'selesai ✓' : d.manual ? 'diatur' : d.past ? d.reason : workout ? 'otomatis' : d.reason}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {sel && <DayDetail day={sel} />}
        <ReportToAI week={selectedWeek} plan={plan} />

        <div className="mt-6 max-w-3xl space-y-2 text-[15px]">
          <p className="flex gap-2">
            <Sparkles size={17} className="mt-0.5 shrink-0 text-mark" />
            <span>
              AI menjaga jarak istirahat minimal {gapHours} jam untuk otot yang sama
              {firstType === 'full' ? ' (idealnya sampai 72 jam)' : ''}. Kalau jadwalmu berubah, sesi berikutnya otomatis bergeser.
            </span>
          </p>
          {plan.scheduled < plan.target && (
            <p className="text-muted">
              Minggu ini baru kebagian {plan.scheduled} dari {plan.target} sesi. Nggak masalah, tetap konsisten dari yang bisa.
            </p>
          )}
          <p className="text-sm text-muted">Hari rest tetap dihitung untuk streak-mu. Istirahat itu bagian dari progres, bukan bolong.</p>
        </div>
      </Section>
    </>
  )
}

/** Detail satu hari: isi sesi (identik dengan halaman Workout di hari itu) + pengaturan. */
function DayDetail({ day }) {
  const { today, dayOverrides = {}, setDayOverride, sessionFor, aiStatus, requestAiSession } = useApp()
  const workout = day.status === 'workout'
  const isToday = day.date === today
  const editable = day.date >= today && !day.done
  const ov = readOverride(dayOverrides[day.date])
  const mode = !ov ? 'auto' : ov.status === 'rest' ? 'rest' : 'workout'
  // Sumber yang sama dengan Home & Workout → isi sesi selalu identik di semua halaman
  const session = workout ? sessionFor(day) : null
  const loading = aiStatus[day.date] === 'loading'

  return (
    <div className="animate-rise mt-4 rounded-[1.75rem] bg-panel p-5 sm:p-6" key={day.date}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {DAYS[day.i]}, {shortDate(day.date)}
            {isToday ? ' · hari ini' : ''}
          </p>
          <h2 className="font-serif text-2xl font-semibold">{workout ? session.title : 'Rest'}</h2>
          <p className="mt-1 text-sm text-muted">
            {day.done
              ? 'Sesi ini sudah selesai.'
              : workout
                ? `${session.exercises.length} gerakan · ±${session.minutes} menit · ${TYPE_LABEL[day.type]}${day.intensity === 'ringan' ? ' · intensitas ringan' : ''}${
                    ov?.focus ? ' · jadwal disesuaikan AI' : ''
                  }${session.byAI ? ' · gerakan disusun AI' : ''}`
                : `Alasan: ${day.reason || 'pemulihan'}`}
          </p>
          {day.tooClose && <p className="mt-1 text-sm text-nutri">Jarak dengan sesi sebelumnya kurang dari {(GAP_DAYS[day.type] ?? 2) * 24} jam.</p>}
        </div>
        {editable ? (
          <div className="flex rounded-full bg-ink/8 p-1 text-sm" role="group" aria-label="Atur hari ini">
            {[
              ['auto', 'Otomatis', undefined],
              ['workout', 'Latihan', 'workout'],
              ['rest', 'Rest', 'rest'],
            ].map(([key, label, value]) => (
              <button
                key={key}
                onClick={() => setDayOverride(day.date, value)}
                className={`rounded-full px-3.5 py-1.5 transition ${mode === key ? 'bg-bg font-medium text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span className="rounded-full bg-ink/8 px-3 py-1.5 text-sm text-muted">{day.done ? 'Selesai' : 'Sudah lewat'}</span>
        )}
      </div>

      {workout && (
        <>
          <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {session.exercises.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-t border-line py-2.5">
                <Media src={photoOf(e.id)} alt="" className="h-10 w-10 shrink-0 rounded-xl" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{getExercise(e.id).name}</span>
                  <span className="block text-sm text-muted">
                    {e.sets}×{e.reps} · {e.load}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {session.byAI && session.reason && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-muted">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-mark" /> {session.reason}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {isToday && !day.done && (
              <Button to="/latihan" disabled={loading}>
                Mulai sesi ini <ArrowRight size={17} />
              </Button>
            )}
            {editable && (
              <Button variant="ghost" onClick={() => requestAiSession(day, { force: session.byAI })} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {loading ? 'AI menyusun…' : session.byAI ? 'Susun ulang dengan AI' : 'Susun dengan AI'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** "Lapor ke AI" — sesuaikan jadwal minggu ini dengan perintah ketik. */
function ReportToAI({ week, plan }) {
  const { profile, name, today, dayOverrides = {}, previewWeek, setWeekOverrides, addCondition, removeCondition, conditions = [] } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { reason, changes, before }
  const [error, setError] = useState('')
  const current = weekOverrides(dayOverrides, plan.monday)
  const editable = (i) => plan.days[i].date >= today && !plan.days[i].done
  const anyEditable = plan.days.some((d) => editable(d.i))

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await adjustWeek({
        plan,
        editable,
        preview: (map, extra) => previewWeek(week, plan.monday, map, extra),
        current,
        message: text.trim(),
        freq: profile?.frequency || 3,
        profileName: name,
        today,
      })
      const known = new Set(conditions.map((c) => c.id))
      if (r.condition) addCondition(r.condition)
      setResult({ ...r, before: current, knownConditions: known })
      setWeekOverrides(plan.monday, r.overrides)
      setText('')
    } catch {
      setError(aiReady ? 'AI lagi susah dihubungi. Coba lagi sebentar, atau atur hari secara manual lewat kartu hari.' : 'AI belum tersambung (VITE_GROQ_API_KEY kosong).')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-[1.75rem] bg-panel p-5 sm:p-6">
      <p className="flex items-center gap-2 font-medium">
        <Sparkles size={17} className="text-mark" /> Lapor ke AI
      </p>
      <p className="mt-1 text-sm text-muted">
        Kalau kamu sibuk, kamu bisa menyesuaikan latihanmu di sini. Contoh ketik: “saya baru ada acara makanya saya skip latihan kemarin, sekarang
        saya sudah kosong, sesuaikan lagi latihan dan rest saya”
      </p>
      {anyEditable ? (
        <form onSubmit={submit} className="mt-4 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e)
            }}
            rows={2}
            placeholder="Ceritakan kondisimu minggu ini…"
            className="flex-1 resize-none rounded-2xl border border-line bg-bg px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:border-cta focus:outline-none"
          />
          <Button type="submit" disabled={busy || !text.trim()} className="shrink-0">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
            {busy ? 'Menyesuaikan…' : 'Sesuaikan'}
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">Minggu ini sudah lewat, jadi jadwalnya tidak bisa diubah lagi.</p>
      )}
      {error && <p className="mt-3 text-sm text-nutri">{error}</p>}
      {result && (
        <div className="animate-rise mt-4 border-t border-line pt-4">
          {result.changes.length > 0 ? (
            <>
              <p className="text-sm font-medium">Jadwal sudah diperbarui:</p>
              <ul className="mt-2 space-y-1.5">
                {result.changes.map((c) => (
                  <li key={c.day} className="flex flex-wrap items-center gap-x-2 text-[15px]">
                    <span className="w-36 shrink-0 text-muted">{c.day}</span>
                    <span className="text-muted line-through">{c.from}</span>
                    <ArrowRight size={14} className="text-muted" />
                    <span className="font-medium">{c.to}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm">Jadwalmu sudah sesuai, tidak ada hari yang perlu diubah.</p>
          )}
          {result.condition && (
            <p className="mt-3 rounded-2xl bg-nutri/12 px-4 py-2.5 text-sm">
              Kondisi dicatat: <span className="font-medium">{result.condition.label}</span> sampai {shortDate(result.condition.until)} — gerakan yang membebaninya otomatis dilewati.
            </p>
          )}
          {result.reason && <p className="mt-3 text-sm text-muted">{result.reason}</p>}
          <button
            onClick={() => {
              setWeekOverrides(plan.monday, result.before)
              // hapus kondisi yang ditambahkan oleh perubahan ini
              conditions.filter((c) => !result.knownConditions?.has(c.id)).forEach((c) => removeCondition(c.id))
              setResult(null)
            }}
            className="mt-3 flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <RotateCcw size={14} /> Batalkan perubahan AI
          </button>
        </div>
      )}
    </div>
  )
}
