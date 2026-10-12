import { useEffect, useState } from 'react'
import { ArrowRight, Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react'
import { shuffle } from '../../lib/shuffle'
import { GameShell } from '../Fun'
import { Button, Tag } from '../../components/ui'
import { aiReady, askJSON } from '../../lib/groq'
import { QUIZ_FALLBACK } from '../../data/content'

const TOPICS = ['pemanasan', 'jeda istirahat & pemulihan otot', 'protein & makanan warung', 'hidrasi', 'tidur', 'teknik squat', 'teknik push-up', 'plank & core', 'kardio di kamar', 'mitos diet', 'cedera ringan', 'latihan dumbbell', 'peregangan', 'kalori makanan Indonesia', 'konsistensi & kebiasaan']

const SYSTEM = `Kamu pembuat kuis kebugaran untuk mahasiswa Indonesia yang latihan di kamar kos.
Buat tepat 10 soal pilihan ganda berbahasa Indonesia, faktual dan aman, tingkat pemula–menengah, tidak saling mirip.
Tiap soal punya 4 opsi singkat, satu jawaban benar (acak posisinya), dan pembahasan 1 kalimat.
Balas JSON: {"questions":[{"q":string,"options":[string,string,string,string],"answer":0-3,"explain":string}]}`

// Model AI cenderung menaruh jawaban benar di posisi yang sama → acak ulang di sini
function shuffleOptions(q) {
  const order = shuffle([0, 1, 2, 3])
  return { ...q, options: order.map((k) => q.options[k]), answer: order.indexOf(q.answer) }
}

function valid(q) {
  return q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4
}

async function loadQuestions() {
  if (aiReady) {
    try {
      const topics = shuffle(TOPICS).slice(0, 5).join(', ')
      const r = await askJSON({
        system: SYSTEM,
        user: `Fokus topik kali ini: ${topics}. Variasi #${Math.floor(Math.random() * 10000)}.`,
        temperature: 0.9,
        signal: AbortSignal.timeout(25000),
      })
      const qs = (r.questions || []).filter(valid).slice(0, 10)
      if (qs.length >= 8) return { qs: qs.map(shuffleOptions), ai: true }
    } catch {
      /* pakai bank cadangan */
    }
  }
  return { qs: shuffle(QUIZ_FALLBACK).slice(0, 10).map(shuffleOptions), ai: false }
}

export default function Quiz() {
  const [data, setData] = useState(null)
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState([])
  const [round, setRound] = useState(0)

  useEffect(() => {
    let alive = true
    loadQuestions().then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [round])

  const restart = () => {
    setData(null)
    setI(0)
    setPicks([])
    setRound((r) => r + 1)
  }

  if (!data)
    return (
      <GameShell title="Quiz">
        <div className="flex flex-col items-center py-24 text-muted">
          <Loader2 className="animate-spin" size={28} />
          <p className="mt-3">AI sedang menyiapkan 10 soal baru…</p>
        </div>
      </GameShell>
    )

  const { qs, ai } = data
  const finished = i >= qs.length
  const score = picks.filter((p, k) => p === qs[k].answer).length

  if (finished)
    return (
      <GameShell title="Quiz" right={<Tag>{ai ? 'Soal dari AI' : 'Bank soal'}</Tag>}>
        <div className="mx-auto max-w-2xl">
          <p className="text-muted">Skor kamu</p>
          <p className="font-serif text-6xl font-semibold">
            {score}
            <span className="text-3xl text-muted">/{qs.length}</span>
          </p>
          <p className="mt-2 text-muted">{score >= 8 ? 'Mantap, kamu paham dasarnya!' : score >= 5 ? 'Lumayan! Cek pembahasan di bawah.' : 'Nggak apa-apa, ini justru cara belajar paling cepat.'}</p>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {qs.map((q, k) => {
              const right = picks[k] === q.answer
              return (
                <li key={k} className="flex gap-3 py-4">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${right ? 'bg-mark text-on-mark' : 'bg-nutri text-on-nutri'}`}>
                    {right ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <div>
                    <p className="font-medium">{q.q}</p>
                    <p className="mt-1 text-sm">
                      Jawaban: <span className="font-medium">{q.options[q.answer]}</span>
                      {!right && <span className="text-muted"> · kamu pilih {q.options[picks[k]]}</span>}
                    </p>
                    <p className="mt-1 text-sm text-muted">{q.explain}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <Button size="lg" className="mt-8" onClick={restart}>
            <RotateCcw size={17} /> Main lagi, soal baru
          </Button>
        </div>
      </GameShell>
    )

  const q = qs[i]
  const picked = picks[i]
  const answered = picked !== undefined
  return (
    <GameShell title="Quiz" right={<Tag>{ai ? 'Soal dari AI' : 'Bank soal'}</Tag>}>
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          Soal {i + 1} dari {qs.length}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-cta transition-all" style={{ width: `${((i + 1) / qs.length) * 100}%` }} />
        </div>
        <h2 key={i} className="animate-rise mt-6 font-serif text-3xl leading-snug font-semibold">
          {q.q}
        </h2>
        <div className="mt-6 space-y-2">
          {q.options.map((o, k) => {
            const state = !answered ? 'idle' : k === q.answer ? 'right' : picked === k ? 'wrong' : 'dim'
            const cls = { idle: 'border-line hover:bg-ink/5', right: 'border-mark bg-mark text-on-mark', wrong: 'border-nutri bg-nutri text-on-nutri', dim: 'border-line text-muted' }[state]
            return (
              <button key={k} disabled={answered} onClick={() => setPicks((p) => Object.assign([...p], { [i]: k }))} className={`w-full rounded-2xl border px-5 py-3.5 text-left transition ${cls}`}>
                {o}
              </button>
            )
          })}
        </div>
        {answered && (
          <div className="animate-rise mt-5">
            <p className="flex gap-2 text-muted">
              <Sparkles size={16} className="mt-1 shrink-0 text-mark" />
              {q.explain}
            </p>
            <Button className="mt-5" onClick={() => setI((x) => x + 1)}>
              {i === qs.length - 1 ? 'Lihat skor' : 'Soal berikutnya'} <ArrowRight size={17} />
            </Button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
