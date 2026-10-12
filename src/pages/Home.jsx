// Home: satu foto (hero latihan) lalu dua panel polos yang setara — latihan & nutrisi —
// supaya tenang dibaca, bukan tumpukan kolase foto.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, HeartPulse, Lock, Moon, Shuffle } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { Button, Media, PhotoTag, Section, Shade } from '../components/ui'
import { ALTERNATIVES, buildSession, equipmentLabel, minutesOf, sessionCode, TYPE_LABEL } from '../lib/coach'
import { useRestTimer } from '../lib/useRestTimer'
import { getExercise, photoOf } from '../data/exercises'
import { DAILY_PROMPTS } from '../data/content'
import FoodReport from '../components/FoodReport'
import { DAY_SHORT } from '../data/questions'
import { greetingByHour, shortDate } from '../lib/dates'

export default function Home() {
  return (
    <>
      <Greeting />
      <Conditions />
      <Hero />
      <Section className="mt-6 grid gap-4 md:grid-cols-2">
        <WorkoutPanel />
        <NutritionPanel />
      </Section>
      <DailyFun />
    </>
  )
}

/** Pita kondisi aktif (cedera/sakit) — latihan otomatis menghindari bagian tubuh ini. */
function Conditions() {
  const { activeConditions = [], endCondition } = useApp()
  if (!activeConditions.length) return null
  return (
    <Section className="mb-4 space-y-2">
      {activeConditions.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[1.25rem] bg-nutri/12 px-5 py-3 text-[15px]">
          <HeartPulse size={18} className="shrink-0 text-nutri" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Mode pemulihan: {c.label}</span>
            <span className="text-muted"> · sampai {shortDate(c.until)} — gerakan yang membebaninya otomatis dilewati.</span>
          </span>
          <button onClick={() => endCondition(c.id)} className="rounded-full border border-line px-3 py-1 text-sm hover:bg-ink/6">
            Sudah pulih
          </button>
        </div>
      ))}
    </Section>
  )
}

function Greeting() {
  const { name, thisWeek, today } = useApp()
  const date = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <Section className="flex flex-col gap-4 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-muted">{date}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold sm:text-4xl">
          {greetingByHour()}, {name}.
        </h1>
      </div>
      <Link to="/program" className="flex items-end gap-1.5" title="Lihat jadwal minggu ini">
        {thisWeek.days.map((d) => {
          const isToday = d.date === today
          const cls = d.done ? 'bg-mark text-on-mark' : d.status === 'workout' ? 'ring-2 ring-inset ring-mark text-ink' : 'bg-ink/8 text-muted'
          return (
            <span key={d.i} className="flex flex-col items-center gap-1">
              <span className={`text-[11px] ${isToday ? 'font-semibold text-ink' : 'text-muted'}`}>{DAY_SHORT[d.i]}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${cls}`}>
                {d.done ? <Check size={14} /> : d.status === 'rest' ? <Moon size={12} /> : null}
              </span>
            </span>
          )
        })}
      </Link>
    </Section>
  )
}

function Hero() {
  const { profile, isRestDay, doneToday, restCheckedIn, checkInRest, todaySession } = useApp()
  const done = doneToday.length > 0
  return (
    <Section>
      <Media src="hero-home.jpg" alt="Latihan dumbbell di dalam kamar" className="h-[320px] rounded-[2rem]" imgClassName="object-[center_30%]">
        <Shade opacity={0.5} />
        <div className="absolute inset-x-0 bottom-0 p-6 text-paper sm:p-9">
          <PhotoTag>{done ? 'Sesi hari ini selesai' : isRestDay ? 'Rest day dari AI Coach' : 'Dipilih AI Coach untukmu hari ini'}</PhotoTag>
          <h2 className="mt-3 max-w-2xl font-serif text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.08] font-semibold">
            {done
              ? 'Latihan hari ini beres. Sekarang ototmu yang kerja.'
              : isRestDay
                ? 'Hari ini istirahat. Ototmu tumbuh saat rehat.'
                : `${minutesOf(profile)} menit, ${equipmentLabel(profile)}, di kamar sendiri.`}
          </h2>
          {!done && !isRestDay && (
            <p className="mt-1 text-paper/85">
              {todaySession.title} · {TYPE_LABEL[todaySession.type]} · {todaySession.exercises.length} gerakan
            </p>
          )}
          <div className="mt-5">
            {done ? (
              <Button to="/nutrisi" variant="nutri">
                Lapor makanan <ArrowRight size={17} />
              </Button>
            ) : isRestDay ? (
              <Button onClick={checkInRest} disabled={restCheckedIn}>
                {restCheckedIn ? (
                  <>
                    <Check size={17} /> Rest day tercatat
                  </>
                ) : (
                  'Check-in rest day'
                )}
              </Button>
            ) : (
              <Button to="/latihan">
                Mulai Latihan <ArrowRight size={17} />
              </Button>
            )}
          </div>
        </div>
      </Media>
    </Section>
  )
}

const panel = 'flex flex-col rounded-[1.75rem] bg-panel p-5 sm:p-6'

function PanelHead({ title, to, label, nutri }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="font-serif text-2xl font-semibold">{title}</h3>
      <Link to={to} className={`text-sm font-medium hover:underline ${nutri ? 'text-nutri' : 'text-mark'}`}>
        {label} →
      </Link>
    </div>
  )
}

function Meter({ label, value, target, unit, nutri }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span>
          <span className="font-semibold">{value.toLocaleString('id-ID')}</span>
          <span className="text-muted">
            {' '}
            / {target.toLocaleString('id-ID')} {unit}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full transition-all duration-500 ${nutri ? 'bg-nutri' : 'bg-mark'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function WorkoutPanel() {
  const { todaySession, thisWeek, profile, today } = useApp()
  const rest = useRestTimer(60)
  const sessionsDone = thisWeek.days.filter((d) => d.done).length
  return (
    <div className={panel}>
      <PanelHead title="Latihan hari ini" to="/latihan" label="Detail" />
      <div className="mt-4">
        <Meter label="Sesi minggu ini" value={sessionsDone} target={thisWeek.target} unit="sesi" />
      </div>
      <ul className="mt-4 divide-y divide-line">
        {todaySession.exercises.slice(0, 4).map((e) => {
          const ex = getExercise(e.id)
          return (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <Media src={photoOf(e.id)} alt="" className="h-10 w-10 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{ex.name}</span>
                <span className="block text-sm text-muted">
                  {e.sets}×{e.reps} · {e.load}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button size="sm" onClick={rest.start} disabled={rest.locked} className="disabled:opacity-90">
          {rest.locked ? (
            <>
              <Lock size={14} /> Tahan dulu · {rest.left}s
            </>
          ) : (
            'Set selesai, istirahat 60s'
          )}
        </Button>
        {ALTERNATIVES.map((a) => {
          const s = buildSession(profile, a.type, today, { minutes: a.minutes, noEquipment: a.noEquipment })
          return (
            <Link key={a.type} to={`/latihan/${sessionCode(s)}`} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-mark hover:text-ink">
              {s.title} · {a.minutes} mnt
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function NutritionPanel() {
  const { kcalToday, proteinToday, targets, friedToday, friedMax, foodsToday } = useApp()
  const recent = foodsToday.slice(-3).reverse()
  const [last, setLast] = useState('')
  return (
    <div className={panel}>
      <PanelHead title="Nutrisi hari ini" to="/nutrisi" label="Log" nutri />
      <div className="mt-4 space-y-3">
        <Meter label="Kalori" value={kcalToday} target={targets.kcal} unit="kkal" nutri />
        <Meter label="Protein" value={proteinToday} target={targets.protein} unit="g" nutri />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <span className="text-sm text-muted">Gorengan</span>
        <span className="flex gap-1.5">
          {Array.from({ length: Math.max(friedMax, friedToday) }).map((_, i) => (
            <span key={i} className={`h-2.5 w-7 rounded-full ${i < friedToday ? 'bg-nutri' : 'bg-ink/12'}`} />
          ))}
        </span>
        <span className="ml-auto text-sm">
          {friedToday}/{friedMax}
        </span>
      </div>
      {/* Daftar makanan terakhir — sepadan dengan daftar gerakan di panel latihan */}
      {recent.length ? (
        <ul className="mt-2 divide-y divide-line">
          {recent.map((f) => (
            <li key={f.uid} className="flex items-center gap-3 py-2.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${f.friedCount > 0 ? 'bg-nutri' : 'bg-herb'}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{f.name}</span>
                <span className="block text-sm text-muted">
                  ~{f.kcal} kkal{f.protein != null ? ` · ${f.protein} g protein` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Belum ada makanan tercatat hari ini.</p>
      )}
      <div className="mt-auto pt-4">
        <FoodReport compact onAdded={setLast} />
        {last && <p className="mt-2 text-sm text-muted">Barusan dicatat: {last}</p>}
      </div>
    </div>
  )
}

function DailyFun() {
  const [i, setI] = useState(0)
  return (
    <Section className="mt-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[1.75rem] bg-panel px-5 py-4 sm:px-6">
        <span className="text-sm font-medium text-mark">Daily Fun</span>
        <p key={i} className="animate-rise min-w-0 flex-1 font-serif text-lg">
          {DAILY_PROMPTS[i]}
        </p>
        <button onClick={() => setI((x) => (x + 1) % DAILY_PROMPTS.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/8 hover:bg-ink/14" aria-label="Ganti tantangan">
          <Shuffle size={16} />
        </button>
        <Link to="/fun" className="text-sm font-medium hover:underline">
          Main Fun Games →
        </Link>
      </div>
    </Section>
  )
}
