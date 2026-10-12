import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PROFILE_VERSION, useApp } from '../store/AppStore'
import { DEFAULT_ANSWERS, QUESTIONS, formatAnswer, isAnswered } from '../data/questions'
import QuestionInput from '../components/QuestionInput'
import { Button, Tag, ThemeToggle } from '../components/ui'
import { Logo } from '../components/Layout'

const TOTAL = QUESTIONS.length

export default function Onboarding() {
  const { profile, saveProfile } = useApp()
  // jawaban lama (format sebelumnya) tidak dipakai untuk mengisi awal
  const navigate = useNavigate()
  const [answers, setAnswers] = useState(() => ({ ...DEFAULT_ANSWERS, ...(profile?.v === PROFILE_VERSION ? profile : {}) }))
  const [index, setIndex] = useState(0)
  const [summary, setSummary] = useState(false)
  const q = QUESTIONS[index]
  const update = (patch) => setAnswers((a) => ({ ...a, ...patch }))

  const finish = () => {
    saveProfile({ ...answers, frequency: answers.frequency || 3 })
    navigate('/')
  }
  const skip = () => {
    saveProfile({ ...answers, frequency: answers.frequency || 3, duration: answers.duration || '20 menit' })
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          {!summary && (
            <button onClick={skip} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              Lewati untuk sekarang
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          {summary ? (
            <div className="animate-rise">
              <Tag>Tersimpan sebagai kartu konfigurasi</Tag>
              <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Kartu konfigurasimu siap</h1>
              <p className="mt-3 text-muted">Tiap bagian bisa kamu ubah sendiri nanti, tanpa perlu isi ulang semuanya.</p>
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {QUESTIONS.map((item, i) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm text-muted">{item.title}</p>
                      <p className="mt-1 font-serif text-lg">{formatAnswer(item, answers)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIndex(i)
                        setSummary(false)
                      }}
                      className="shrink-0 text-sm font-medium text-mark hover:underline"
                    >
                      Ubah
                    </button>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="mt-8 w-full" onClick={finish}>
                Mulai Latihan Pertama <ArrowRight size={18} />
              </Button>
            </div>
          ) : (
            <div key={q.id} className="animate-rise">
              <p className="text-sm text-muted">
                Pertanyaan {index + 1} dari {TOTAL}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-cta transition-all duration-500" style={{ width: `${((index + 1) / TOTAL) * 100}%` }} />
              </div>
              <Tag className="mt-7">AI Coach mau kenalan dulu</Tag>
              <h1 className="mt-4 font-serif text-3xl leading-tight font-semibold sm:text-[2.6rem]">{q.title}</h1>
              {q.note && <p className="mt-2 text-muted">{q.note}</p>}
              <div className="mt-7">
                <QuestionInput q={q} answers={answers} onChange={update} autoFocus />
              </div>
              <div className="mt-10 flex items-center justify-between">
                {index > 0 ? (
                  <button onClick={() => setIndex((i) => i - 1)} className="text-muted hover:text-ink">
                    Kembali
                  </button>
                ) : (
                  <span />
                )}
                <Button
                  disabled={!isAnswered(q, answers)}
                  onClick={() => (index === TOTAL - 1 ? setSummary(true) : setIndex((i) => i + 1))}
                  className="disabled:bg-ink/15 disabled:text-muted disabled:opacity-100"
                >
                  {index === TOTAL - 1 ? 'Buat Kartu Konfigurasi' : 'Lanjut'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
