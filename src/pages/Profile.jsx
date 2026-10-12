import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Sparkles } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { useAuth } from '../store/Auth'
import ConfigCard from '../components/ConfigCard'
import { ThemeToggle, Toggle } from '../components/ui'
import { Logo } from '../components/Layout'
import { addDays } from '../lib/dates'
import { buildSession, equipmentLabel } from '../lib/coach'
import { getExercise } from '../data/exercises'
import CREDITS from '../data/credits.json'

const CONFIG_IDS = ['equipment', 'extras', 'duration', 'goal', 'frequency', 'days', 'budget', 'cook', 'sleep']

const FAQ = [
  ['Kenapa ada rest-lock timer 60 detik?', 'Supaya otot sempat mengisi ulang energi sebelum set berikutnya. Gerakan jadi lebih berkualitas dan risiko cedera turun.'],
  ['Kenapa AI menggeser jadwalku?', 'Otot butuh jeda 48–72 jam sebelum dilatih lagi. Kalau kamu latihan di luar rencana atau melewatkan hari, sesi berikutnya digeser supaya jaraknya tetap aman.'],
  ['Seberapa akurat hitungan kalori?', 'Perkiraan dari porsi umum, bukan timbangan. Cukup untuk melihat pola makan tanpa ribet.'],
  ['Saya merasa nyeri saat latihan.', 'Pegal itu wajar, nyeri tajam di sendi bukan. Berhenti dan konsultasikan ke tenaga medis.'],
]

export default function Profile() {
  const app = useApp()
  const { name, setName, profile, updateAnswer, history, restCheckins, foodLog, settings, updateSettings, today, sync } = app
  const { user, logout } = useAuth()
  const [editName, setEditName] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [open, setOpen] = useState(null)
  const [equipNote, setEquipNote] = useState('')

  // 14 hari terakhir — status kualitatif saja
  const trained = new Set(history.map((h) => h.date))
  const rested = new Set([...restCheckins, ...Object.keys(foodLog).filter((k) => foodLog[k]?.length)])
  const days = Array.from({ length: 14 }, (_, i) => {
    const k = addDays(today, i - 13)
    return { k, status: trained.has(k) ? 'latihan' : rested.has(k) ? 'rest' : 'terlewat' }
  })
  const nTrain = days.filter((d) => d.status === 'latihan').length
  // Baris nutrisi setara: lapor makan atau tidak (tanpa angka kalori)
  const food = days.map(({ k }) => ({ k, status: foodLog[k]?.length ? 'lapor' : 'kosong' }))
  const nFood = food.filter((d) => d.status === 'lapor').length
  const nRest = days.filter((d) => d.status === 'rest').length

  return (
    <div className="min-h-screen pb-20">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={15} /> Kembali ke Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {/* Akun */}
        <section className="mt-6 flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cta font-serif text-2xl font-semibold text-on-cta">
            {name?.[0]?.toUpperCase() || 'F'}
          </span>
          <div className="min-w-0 flex-1">
            {editName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (draftName.trim()) setName(draftName.trim())
                  setEditName(false)
                }}
              >
                <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onBlur={() => { if (draftName.trim()) setName(draftName.trim()); setEditName(false) }} className="w-full border-b-2 border-cta bg-transparent font-serif text-3xl focus:outline-none" />
              </form>
            ) : (
              <p className="truncate font-serif text-3xl font-semibold">{name}</p>
            )}
            <p className="truncate text-muted">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              setDraftName(name)
              setEditName(true)
            }}
            className="self-start text-sm font-medium text-mark hover:underline"
          >
            Ubah
          </button>
        </section>

        {/* Konfigurasi */}
        <section className="mt-12">
          <h2 className="font-serif text-3xl font-semibold">Kartu Konfigurasi AI Coach</h2>
          <p className="mt-1 mb-5 text-muted">Ubah satu per satu, tanpa perlu isi ulang semuanya.</p>
          <ConfigCard
            answers={profile}
            ids={CONFIG_IDS}
            onSave={(patch) => {
              Object.entries(patch).forEach(([k, v]) => updateAnswer(k, v))
              // Alat berubah → latihan langsung disusun ulang; tunjukkan hasilnya
              if ('equipment' in patch || 'extras' in patch) {
                const next = { ...profile, ...patch }
                const s = buildSession(next, 'full', app.today)
                setEquipNote(`Latihan sudah disesuaikan dengan ${equipmentLabel(next)}: ${s.exercises.slice(0, 3).map((e) => getExercise(e.id).name).join(', ')}, …`)
              }
            }}
          />
          {equipNote && (
            <p className="animate-rise mt-3 flex gap-2 rounded-2xl bg-mark/12 px-4 py-3 text-sm">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-mark" />
              <span>
                {equipNote}{' '}
                <Link to="/latihan" className="font-medium underline underline-offset-4">
                  Lihat latihan
                </Link>
              </span>
            </p>
          )}
        </section>

        {/* Progres */}
        <section className="mt-12">
          <h2 className="font-serif text-3xl font-semibold">Progres</h2>
          <p className="mt-1 text-muted">
            {nTrain} hari latihan dan {nRest} hari rest dalam 2 minggu terakhir · lapor makan {nFood} hari
          </p>
          <p className="mt-5 mb-2 text-sm font-medium">Latihan</p>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <span
                key={d.k}
                title={`${d.k}: ${d.status}`}
                className={`h-8 w-8 rounded-lg ${
                  d.status === 'latihan' ? 'bg-cta' : d.status === 'rest' ? 'bg-panel ring-1 ring-line' : 'border-2 border-dashed border-line'
                } ${d.k === today ? 'outline-2 outline-offset-2 outline-ink/30' : ''}`}
              />
            ))}
          </div>
          <p className="mt-4 mb-2 text-sm font-medium">Nutrisi</p>
          <div className="flex flex-wrap gap-2">
            {food.map((d) => (
              <span
                key={d.k}
                title={`${d.k}: ${d.status === 'lapor' ? 'lapor makan' : 'tidak lapor'}`}
                className={`h-8 w-8 rounded-lg ${d.status === 'lapor' ? 'bg-nutri' : 'border-2 border-dashed border-line'} ${d.k === today ? 'outline-2 outline-offset-2 outline-ink/30' : ''}`}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-cta" /> Latihan
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-panel ring-1 ring-line" /> Rest
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-nutri" /> Lapor makan
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border-2 border-dashed border-line" /> Terlewat / belum lapor
            </span>
          </div>
        </section>

        {/* Notifikasi */}
        <section className="mt-12">
          <h2 className="font-serif text-3xl font-semibold">Notifikasi</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {[
              ['notifWorkout', 'Pengingat latihan harian', 'Setiap hari, 07:00'],
              ['notifFood', 'Pengingat lapor makanan', 'Setiap hari, 12:00'],
            ].map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p>{label}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
                <Toggle checked={settings[key]} onChange={(v) => updateSettings({ [key]: v })} label={label} />
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 flex gap-2 text-[15px] text-muted">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-mark" />
          Bingung kenapa ada rest-lock timer atau kenapa AI menggeser jadwalmu? Cek bantuan di bawah.
        </p>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {[
            ['faq', 'Bantuan & FAQ'],
            ['privasi', 'Syarat & Privasi'],
            ['kredit', 'Kredit foto'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setOpen(open === id ? null : id)} className="flex items-center gap-1 text-ink underline-offset-4 hover:underline">
              {label} <ChevronDown size={14} className={`transition ${open === id ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>

        {open === 'faq' && (
          <div className="animate-rise mt-4 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-3">
                <p className="font-medium">{q}</p>
                <p className="mt-1 text-muted">{a}</p>
              </div>
            ))}
          </div>
        )}
        {open === 'privasi' && (
          <p className="animate-rise mt-4 text-muted">
            Data latihan dan makananmu hanya dipakai untuk menyusun program di akunmu{sync === 'cloud' ? ' dan disimpan di cloud akunmu' : ' dan saat ini tersimpan di perangkat ini'}. Pertanyaan ke AI Coach dan foto makanan dikirim ke penyedia AI (Groq) untuk diproses. FitHome bukan pengganti saran tenaga medis.
          </p>
        )}
        {open === 'kredit' && (
          <ul className="animate-rise mt-4 space-y-1.5 text-sm text-muted">
            {CREDITS.map((c) => (
              <li key={c.file} className="truncate">
                <a href={c.source} target="_blank" rel="noreferrer" className="text-ink hover:underline">
                  {c.title}
                </a>{' '}
                · {c.author} · {c.license}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <button onClick={logout} className="hover:text-ink hover:underline">
            Keluar akun
          </button>
          <Link to="/onboarding" className="hover:text-ink hover:underline">
            Ulangi onboarding
          </Link>
          <button onClick={app.seedDemo} className="hover:text-ink hover:underline">
            Isi data demo
          </button>
        </div>
      </main>
    </div>
  )
}
