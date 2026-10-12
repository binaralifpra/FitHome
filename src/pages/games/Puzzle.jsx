import { useEffect, useState } from 'react'
import { Check, Clock, Footprints, RefreshCw } from 'lucide-react'
import { GameShell } from '../Fun'
import { Button } from '../../components/ui'

const N = 3
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0] // 0 = slot kosong
const IMAGES = ['hero-home.jpg', 'workout-hero.jpg', 'plank.jpg', 'food-pecel.jpg', 'type-upper.jpg']

const neighbors = (i) => {
  const r = Math.floor(i / N)
  const c = i % N
  return [r > 0 && i - N, r < N - 1 && i + N, c > 0 && i - 1, c < N - 1 && i + 1].filter((x) => x !== false)
}

/** Acak dengan langkah geser acak dari kondisi selesai → selalu bisa dipecahkan. */
function shuffled() {
  let b = [...SOLVED]
  let empty = 8
  let prev = -1
  for (let k = 0; k < 120; k++) {
    const opts = neighbors(empty).filter((x) => x !== prev)
    const pick = opts[Math.floor(Math.random() * opts.length)]
    ;[b[empty], b[pick]] = [b[pick], b[empty]]
    prev = empty
    empty = pick
  }
  if (b.every((v, i) => v === SOLVED[i])) return shuffled()
  return b
}

export default function Puzzle() {
  const [img, setImg] = useState(() => IMAGES[Math.floor(Math.random() * IMAGES.length)])
  const [board, setBoard] = useState(shuffled)
  const [moves, setMoves] = useState(0)
  const [start, setStart] = useState(null)
  const [now, setNow] = useState(Date.now())
  const solved = board.every((v, i) => v === SOLVED[i])

  useEffect(() => {
    if (!start || solved) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [start, solved])

  const seconds = start ? Math.floor(((solved ? now : Date.now()) - start) / 1000) : 0
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  const slide = (i) => {
    if (solved) return
    const empty = board.indexOf(0)
    if (!neighbors(empty).includes(i)) return
    const b = [...board]
    ;[b[empty], b[i]] = [b[i], b[empty]]
    setBoard(b)
    setMoves((m) => m + 1)
    if (!start) setStart(Date.now())
    setNow(Date.now())
  }

  const restart = () => {
    setImg((cur) => IMAGES.filter((x) => x !== cur)[Math.floor(Math.random() * (IMAGES.length - 1))])
    setBoard(shuffled())
    setMoves(0)
    setStart(null)
  }

  return (
    <GameShell
      title="Puzzle"
      right={
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1.5 rounded-full bg-panel px-3 py-1.5">
            <Footprints size={14} /> {moves} langkah
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-panel px-3 py-1.5">
            <Clock size={14} /> {mmss}
          </span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <p className="mb-4 text-center text-muted">Geser potongan yang bersebelahan dengan slot kosong sampai gambarnya utuh.</p>
        <div className="grid aspect-square w-full grid-cols-3 gap-1.5 rounded-[1.75rem] bg-panel p-1.5">
          {board.map((v, i) => {
            if (v === 0)
              return (
                <div
                  key="empty"
                  className={`rounded-[1rem] ${solved ? 'animate-pop' : 'bg-ink/5'}`}
                  style={solved ? { backgroundImage: `url(images/${img})`, backgroundSize: '300% 300%', backgroundPosition: '100% 100%' } : undefined}
                />
              )
            const r = Math.floor((v - 1) / N)
            const c = (v - 1) % N
            const movable = neighbors(board.indexOf(0)).includes(i)
            return (
              <button
                key={v}
                onClick={() => slide(i)}
                aria-label={`Potongan ${v}`}
                className={`relative overflow-hidden rounded-[1rem] transition ${movable && !solved ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
                style={{
                  backgroundImage: `url(images/${img})`,
                  backgroundSize: `${N * 100}% ${N * 100}%`,
                  backgroundPosition: `${(c / (N - 1)) * 100}% ${(r / (N - 1)) * 100}%`,
                }}
              >
                {!solved && <span className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs font-semibold text-paper">{v}</span>}
              </button>
            )
          })}
        </div>
        {solved ? (
          <div className="animate-rise mt-6 text-center">
            <p className="flex items-center justify-center gap-2 font-serif text-2xl font-semibold">
              <Check className="text-mark" /> Selesai dalam {moves} langkah · {mmss}
            </p>
            <Button className="mt-4" onClick={restart}>
              <RefreshCw size={16} /> Main lagi
            </Button>
          </div>
        ) : (
          <button onClick={restart} className="mt-5 text-sm text-muted underline underline-offset-4 hover:text-ink">
            Acak ulang
          </button>
        )}
      </div>
    </GameShell>
  )
}
