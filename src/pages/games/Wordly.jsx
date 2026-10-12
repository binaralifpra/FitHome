import { useEffect, useState } from 'react'
import { Delete, RefreshCw } from 'lucide-react'
import { GameShell } from '../Fun'
import { Button } from '../../components/ui'
import { WORD_BANK } from '../../data/content'

const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const MAX_TRIES = 6
const CELL = {
  hit: 'bg-mark text-on-mark border-mark', // huruf & posisi benar
  near: 'bg-nutri text-on-nutri border-nutri', // huruf ada, posisi salah
  miss: 'bg-ink/15 text-ink border-transparent', // huruf tidak ada
}
const pickWord = (n, except) => {
  const list = WORD_BANK[n].filter((w) => w !== except)
  return list[Math.floor(Math.random() * list.length)]
}

/** Hasil per huruf, menangani huruf ganda dengan benar. */
function score(guess, word) {
  const res = Array(word.length).fill('miss')
  const left = word.split('')
  ;[...guess].forEach((c, i) => {
    if (c === word[i]) {
      res[i] = 'hit'
      left[i] = null
    }
  })
  ;[...guess].forEach((c, i) => {
    if (res[i] === 'hit') return
    const j = left.indexOf(c)
    if (j !== -1) {
      res[i] = 'near'
      left[j] = null
    }
  })
  return res
}

export default function Wordly() {
  const [len, setLen] = useState(null)
  return (
    <GameShell title="Wordly" right={len && <Button size="sm" variant="ghost" onClick={() => setLen(null)}>Ganti panjang kata</Button>}>
      {len ? (
        <Board key={len} len={len} />
      ) : (
        <div className="mx-auto max-w-xl">
          <p className="text-lg">Mau main kata berapa huruf?</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => setLen(n)} className="rounded-[1.25rem] border border-line bg-panel py-6 transition hover:border-cta hover:ring-2 hover:ring-cta/30">
                <span className="block font-serif text-4xl font-semibold">{n}</span>
                <span className="text-sm text-muted">huruf · {WORD_BANK[n].length} kata</span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            <span className="mr-1 inline-block h-3 w-3 rounded bg-mark align-middle" /> huruf & posisi benar
            <span className="mr-1 ml-4 inline-block h-3 w-3 rounded bg-nutri align-middle" /> huruf ada, posisi salah
            <span className="mr-1 ml-4 inline-block h-3 w-3 rounded bg-ink/15 align-middle" /> tidak ada
          </p>
        </div>
      )}
    </GameShell>
  )
}

function Board({ len }) {
  const [word, setWord] = useState(() => pickWord(len))
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const won = guesses.includes(word)
  const over = won || guesses.length >= MAX_TRIES
  const size = len <= 5 ? 'h-14 w-14 text-2xl' : len <= 7 ? 'h-12 w-12 text-xl' : 'h-10 w-10 text-lg sm:h-12 sm:w-12'

  const press = (k) => {
    if (over) return
    if (k === 'ENTER') {
      if (current.length === len) {
        setGuesses((g) => [...g, current])
        setCurrent('')
      }
    } else if (k === 'DEL') setCurrent((c) => c.slice(0, -1))
    else if (/^[A-Z]$/.test(k) && current.length < len) setCurrent((c) => c + k)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey) return
      if (e.key === 'Enter') press('ENTER')
      else if (e.key === 'Backspace') press('DEL')
      else press(e.key.toUpperCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rank = { miss: 1, near: 2, hit: 3 }
  const used = {}
  guesses.forEach((g) =>
    score(g, word).forEach((s, i) => {
      if (!used[g[i]] || rank[s] > rank[used[g[i]]]) used[g[i]] = s
    }),
  )
  const rows = [...guesses, ...(over ? [] : [current])]

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-4 text-center text-muted">
        Tebak kata olahraga/kesehatan {len} huruf · {MAX_TRIES - guesses.length} kesempatan lagi
      </p>
      <div className="mx-auto grid w-fit gap-1.5">
        {Array.from({ length: MAX_TRIES }).map((_, r) => {
          const g = rows[r] || ''
          const res = r < guesses.length ? score(g, word) : null
          return (
            <div key={r} className="flex gap-1.5">
              {Array.from({ length: len }).map((_, c) => (
                <span key={c} className={`flex items-center justify-center rounded-xl border-2 font-serif font-semibold ${size} ${res ? CELL[res[c]] : g[c] ? 'border-ink/40' : 'border-line'}`}>
                  {g[c]}
                </span>
              ))}
            </div>
          )
        })}
      </div>

      {over ? (
        <div className="animate-rise mt-6 text-center">
          <p className="font-serif text-2xl font-semibold">{won ? `Ketebak dalam ${guesses.length} percobaan!` : `Jawabannya: ${word}`}</p>
          <Button
            className="mt-4"
            onClick={() => {
              setWord((w) => pickWord(len, w))
              setGuesses([])
              setCurrent('')
            }}
          >
            <RefreshCw size={16} /> Kata berikutnya
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-1.5">
          {KEYS.map((row, ri) => (
            <div key={row} className="flex justify-center gap-1">
              {ri === 2 && (
                <button onClick={() => press('ENTER')} className="h-12 rounded-lg bg-ink/10 px-3 text-xs font-semibold">
                  ENTER
                </button>
              )}
              {row.split('').map((k) => (
                <button key={k} onClick={() => press(k)} className={`h-12 w-8 rounded-lg text-sm font-semibold sm:w-10 ${used[k] ? CELL[used[k]] : 'bg-ink/10'}`}>
                  {k}
                </button>
              ))}
              {ri === 2 && (
                <button onClick={() => press('DEL')} className="flex h-12 items-center rounded-lg bg-ink/10 px-3" aria-label="Hapus huruf">
                  <Delete size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
