// Alur sesi latihan multi-langkah (semua transisi lewat state React, tanpa reload):
// Awal → Persiapan → Pemanasan → [On Workout → Rest]×n → Pendinginan → Awal (Selesai)
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Flame, Loader2, Pause, Play, RefreshCw, RotateCcw, SkipForward, Sparkles, X } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { Button, Media, PhotoTag, Section, Shade } from '../components/ui'
import { buildSession, equipmentLabel, parseSessionCode, TYPE_LABEL } from '../lib/coach'
import { useCountdown } from '../lib/useCountdown'
import { getExercise, photoOf } from '../data/exercises'
import { COOLDOWN, REST_FACTS, WARMUP } from '../data/content'

const STAGES = [
  { id: 'prep', label: 'Persiapan' },
  { id: 'warmup', label: 'Pemanasan' },
  { id: 'work', label: 'Latihan' },
  { id: 'cooldown', label: 'Pendinginan' },
]

export default function WorkoutDetail() {
  const { code } = useParams()
  const { profile, today, todaySession, todayPlan, doneToday, completeSession, streak, aiStatus, requestAiSession } = useApp()
  const parsed = code ? parseSessionCode(code) : null
  const liveSession = useMemo(
    () => (parsed ? buildSession(profile, parsed.type, today, parsed) : todaySession),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, profile, today, todaySession],
  )

  const [phase, setPhase] = useState('start') // start | prep | warmup | work | rest | cooldown
  const [step, setStep] = useState(0) // langkah pemanasan / pendinginan
  const [pos, setPos] = useState({ ex: 0, set: 1 }) // gerakan & set yang sedang dikerjakan
  const [nextPos, setNextPos] = useState(null) // tujuan setelah rest
  const [restNo, setRestNo] = useState(0)
  // Sesi dikunci saat mulai, supaya susunan AI yang baru datang tidak mengubah latihan yang sedang berjalan
  const [locked, setLocked] = useState(null)
  const session = phase !== 'start' && locked ? locked : liveSession
  const aiState = code ? null : aiStatus[today]

  if (code && !parsed) return <Navigate to="/latihan" replace />

  const isDone = doneToday.some((h) => h.type === session.type)
  const restSeconds = session.type === 'mobility' ? 20 : 60
  const go = (p) => {
    setPhase(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const finishSet = () => {
    const ex = session.exercises[pos.ex]
    let next = null
    if (pos.set < ex.sets) next = { ex: pos.ex, set: pos.set + 1 }
    else if (pos.ex < session.exercises.length - 1) next = { ex: pos.ex + 1, set: 1 }
    if (!next) {
      setStep(0)
      return go('cooldown')
    }
    setNextPos(next)
    setRestNo((n) => n + 1)
    go('rest')
  }

  const startSession = () => {
    setLocked(liveSession)
    setPos({ ex: 0, set: 1 })
    setStep(0)
    go('prep')
  }

  return (
    <Section className="pt-5">
      {phase === 'start' ? (
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Kembali ke Home
        </Link>
      ) : (
        <Stepper phase={phase} onExit={() => go('start')} />
      )}

      <div key={`${phase}-${step}-${pos.ex}-${pos.set}`} className="animate-rise mt-5">
        {phase === 'start' && (
          <StartScreen
            session={session}
            profile={profile}
            done={isDone}
            streak={streak}
            onStart={startSession}
            aiState={aiState}
            onRegenerate={!code && todayPlan?.status === 'workout' && !isDone ? () => requestAiSession(todayPlan, { force: true }) : null}
          />
        )}
        {phase === 'prep' && <PrepScreen session={session} onNext={() => go('warmup')} />}
        {phase === 'warmup' && (
          <GuideScreen
            title="Pemanasan"
            steps={WARMUP}
            step={step}
            onStep={setStep}
            onFinish={() => {
              setStep(0)
              go('work')
            }}
            finishLabel="Mulai gerakan pertama"
          />
        )}
        {phase === 'work' && <WorkScreen session={session} pos={pos} onDone={finishSet} />}
        {phase === 'rest' && (
          <RestScreen
            key={restNo}
            seconds={restSeconds}
            session={session}
            next={nextPos}
            fact={REST_FACTS[restNo % REST_FACTS.length]}
            onSkip={() => {
              setPos(nextPos)
              go('work')
            }}
            onBack={() => go('work')}
          />
        )}
        {phase === 'cooldown' && (
          <GuideScreen
            title="Pendinginan"
            steps={COOLDOWN}
            step={step}
            onStep={setStep}
            onFinish={() => {
              completeSession(session)
              go('start')
            }}
            finishLabel="Selesai latihan hari ini"
          />
        )}
      </div>
    </Section>
  )
}

function Stepper({ phase, onExit }) {
  const current = phase === 'rest' ? 'work' : phase
  const idx = STAGES.findIndex((s) => s.id === current)
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div className={`h-1.5 rounded-full transition ${i <= idx ? 'bg-cta' : 'bg-ink/12'}`} />
            <p className={`mt-1.5 hidden text-xs sm:block ${i === idx ? 'font-medium text-ink' : 'text-muted'}`}>{s.label}</p>
          </div>
        ))}
      </div>
      <button onClick={onExit} className="flex items-center gap-1 self-start rounded-full px-3 py-1 text-sm text-muted hover:bg-ink/8 hover:text-ink">
        <X size={15} /> Keluar
      </button>
    </div>
  )
}

/* 1 — Halaman Awal */
function StartScreen({ session, profile, done, streak, onStart, aiState, onRegenerate }) {
  const loading = aiState === 'loading'
  const first = session.exercises[0].id
  return (
    <>
    <Media src={photoOf(first)} alt={session.title} className="h-[320px] rounded-[2rem]">
      <Shade opacity={0.5} />
      <div className="absolute inset-x-0 bottom-0 p-6 text-paper sm:p-9">
        <PhotoTag icon={!done}>
          {done ? (
            <>
              <Check size={13} /> Selesai hari ini
            </>
          ) : (
            `${session.byAI ? 'Disusun AI' : 'Dipilih AI Coach'} · ${session.noEquipment || session.type === 'mobility' ? 'tanpa alat' : equipmentLabel(profile)}`
          )}
        </PhotoTag>
        <h1 className="mt-3 font-serif text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.08] font-semibold">{session.title}</h1>
        <p className="mt-1 text-paper/85">
          {TYPE_LABEL[session.type]} · {session.exercises.length} gerakan · ±{session.minutes} menit
        </p>
        {done && (
          <p className="mt-3 flex items-center gap-2 text-paper/90">
            <Flame size={18} /> Streak kamu sekarang {streak} hari
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {done ? (
            <>
              <Button to="/nutrisi" variant="nutri">
                Lapor makanan <ArrowRight size={18} />
              </Button>
              <Button variant="light" onClick={onStart}>
                <RotateCcw size={17} /> Ulangi sesi
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onStart} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> AI menyusun sesi…
                  </>
                ) : (
                  <>
                    Mulai <ArrowRight size={17} />
                  </>
                )}
              </Button>
              {onRegenerate && !loading && (
                <Button variant="light" onClick={onRegenerate}>
                  <RefreshCw size={15} /> Susun ulang dengan AI
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Media>

    {/* Detail sesi — sepadan dengan chip & log di halaman Nutrisi */}
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Gerakan hari ini</h2>
          {session.byAI && session.reason && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-mark" /> {session.reason}
            </p>
          )}
          {aiState === 'error' && <p className="mt-1 text-sm text-muted">AI sedang tidak bisa dihubungi, jadi dipakai susunan rotasi otomatis.</p>}
        </div>
        <p className="text-sm text-muted">
          Disesuaikan dengan alatmu: <span className="text-ink">{session.equipment}</span> ·{' '}
          <Link to="/profil" className="underline underline-offset-4 hover:text-ink">
            ubah alat
          </Link>
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {session.exercises.map((e, i) => {
          const ex = getExercise(e.id)
          return (
            <Media key={e.id} src={photoOf(e.id)} alt={ex.name} className="h-36 rounded-[1.25rem]">
              <Shade height="55%" opacity={0.5} />
              <span className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-xs font-semibold text-paper">{i + 1}</span>
              <div className="absolute inset-x-0 bottom-0 p-4 text-paper">
                <p className="leading-tight font-medium">{ex.name}</p>
                <p className="text-xs text-paper/80">
                  {e.sets}×{e.reps} · {e.load}
                </p>
              </div>
            </Media>
          )
        })}
      </div>
    </div>
    </>
  )
}

/* 2 — Persiapan: daftar urutan gerakan */
function PrepScreen({ session, onNext }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-4xl font-semibold">Urutan gerakan hari ini</h1>
      <p className="mt-2 text-muted">Lihat dulu sekilas. Ada pemanasan sebelum mulai dan pendinginan di akhir.</p>
      <ol className="mt-7 divide-y divide-line border-y border-line">
        {session.exercises.map((e, i) => {
          const ex = getExercise(e.id)
          return (
            <li key={e.id} className="flex items-center gap-4 py-3">
              <span className="w-6 font-serif text-xl text-mark">{i + 1}</span>
              <Media src={photoOf(e.id)} alt="" className="h-14 w-14 shrink-0 rounded-[1rem]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{ex.name}</p>
                <p className="text-sm text-muted">
                  {e.sets} set × {e.reps} · {e.load}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      <Button size="lg" className="mt-8" onClick={onNext}>
        Lanjut ke pemanasan <ArrowRight size={18} />
      </Button>
    </div>
  )
}

/* 3 & 7 — Pemanasan / Pendinginan: satu perintah per layar */
function GuideScreen({ title, steps, step, onStep, onFinish, finishLabel }) {
  const s = steps[step]
  const last = step === steps.length - 1
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <Media src={s.photo} alt={s.text} className="h-[260px] rounded-[2rem] lg:h-[340px]" imgClassName="gif-a" />
      <div>
        <p className="text-sm text-muted">
          {title} · langkah {step + 1} dari {steps.length}
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight font-semibold sm:text-4xl">{s.text}</h1>
        {s.detail && <p className="mt-2 text-lg text-muted">{s.detail}</p>}
        {s.seconds ? <StepTimer key={`${title}-${step}`} seconds={s.seconds} /> : null}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={() => onStep(step - 1)}>
              <ArrowLeft size={17} /> Sebelumnya
            </Button>
          )}
          <Button size="lg" onClick={() => (last ? onFinish() : onStep(step + 1))}>
            {last ? finishLabel : 'Lanjut'} <ArrowRight size={18} />
          </Button>
          {!last && (
            <button onClick={onFinish} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              Lewati {title.toLowerCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepTimer({ seconds }) {
  const t = useCountdown(seconds)
  return (
    <div className="mt-5 flex items-center gap-4">
      <Ring left={t.left} total={seconds} size={88} />
      <button onClick={t.toggle} disabled={t.left === 0} className="flex items-center gap-1.5 rounded-full bg-ink/8 px-4 py-2 text-sm disabled:opacity-40">
        {t.running ? <Pause size={15} /> : <Play size={15} />} {t.left === 0 ? 'Selesai' : t.running ? 'Jeda' : 'Lanjutkan'}
      </button>
    </div>
  )
}

/* 4 — On Workout */
function WorkScreen({ session, pos, onDone }) {
  const [playing, setPlaying] = useState(true)
  const e = session.exercises[pos.ex]
  const ex = getExercise(e.id)
  const numeric = /^[\d–-]+$/.test(e.reps)
  return (
    <div className="grid gap-8 lg:grid-cols-5 lg:items-center">
      <Media src={photoOf(e.id)} alt={ex.name} className="h-[300px] rounded-[2rem] lg:col-span-3 lg:h-[380px]" imgClassName={playing ? 'gif-a' : ''}>
        <span className="absolute top-5 left-5 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-paper">GIF · {ex.muscle}</span>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="absolute right-5 bottom-5 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-[#20241C] shadow-lg"
          aria-label={playing ? 'Jeda gerakan' : 'Putar gerakan'}
        >
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}
        </button>
      </Media>
      <div className="lg:col-span-2">
        <p className="text-sm text-muted">
          Gerakan {pos.ex + 1} dari {session.exercises.length}
        </p>
        <h1 className="mt-1 font-serif text-3xl leading-tight font-semibold sm:text-4xl">{ex.name}</h1>
        <p className="mt-2 inline-flex rounded-full bg-mark/15 px-3 py-1 text-sm">{e.load}</p>
        <p className="mt-3 font-serif text-2xl">
          Set {pos.set} <span className="text-muted">/ {e.sets}</span>
        </p>
        <p className="text-lg text-muted">
          {e.reps}
          {numeric ? ' repetisi' : ''}
        </p>
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: e.sets }).map((_, i) => (
            <span key={i} className={`h-2 w-10 rounded-full ${i < pos.set - 1 ? 'bg-cta' : i === pos.set - 1 ? 'bg-cta/50' : 'bg-ink/12'}`} />
          ))}
        </div>
        <p className="mt-6 flex gap-2 text-[15px] text-muted">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-mark" />
          <span>
            <span className="font-medium text-ink">Kata AI Coach:</span> {ex.tips}
          </span>
        </p>
        <Button size="lg" className="mt-7 w-full sm:w-auto" onClick={onDone}>
          <Check size={18} /> Set selesai
        </Button>
      </div>
    </div>
  )
}

/* 5 — Rest: hitung mundur + Skip / Back / Pause */
function RestScreen({ seconds, session, next, fact, onSkip, onBack }) {
  const t = useCountdown(seconds, { onDone: onSkip })
  const nextEx = getExercise(session.exercises[next.ex].id)
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <p className="text-sm text-muted">Istirahat</p>
      <div className="mt-4">
        <Ring left={t.left} total={seconds} size={200} />
      </div>
      <p className="mt-6 text-muted">Berikutnya</p>
      <p className="font-serif text-2xl font-semibold">
        {nextEx.name} · set {next.set}
      </p>
      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">{fact}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="ghost" onClick={onBack} title="Kembali ke gerakan sebelumnya">
          <ArrowLeft size={17} /> Back
        </Button>
        <Button variant="outline" onClick={t.toggle}>
          {t.running ? <Pause size={17} /> : <Play size={17} />} {t.running ? 'Pause' : 'Resume'}
        </Button>
        <Button onClick={onSkip}>
          Skip <SkipForward size={17} />
        </Button>
      </div>
      {!t.running && t.left > 0 && <p className="animate-rise mt-4 text-sm text-muted">Hitung mundur dijeda.</p>}
    </div>
  )
}

function Ring({ left, total, size }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--cta)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - left / total)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-serif font-semibold" style={{ fontSize: size / 3.6 }}>
        {left}
      </span>
    </div>
  )
}
