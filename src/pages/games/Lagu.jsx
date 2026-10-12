import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Loader2, Music, Pause, Play, RotateCcw, Search, SkipForward, Sparkles, Trophy, X } from 'lucide-react'
import { GameShell } from '../Fun'
import { Button } from '../../components/ui'
import { shuffle } from '../../lib/shuffle'
import { categoryTracks, isMatch, normalize, searchTracks } from '../../lib/deezer'
import { SONG_CATEGORIES } from '../../data/songCategories'
import { customCategory } from '../../lib/songAI'
import { aiReady } from '../../lib/groq'

const ROUNDS = 10
const STEPS = [1, 2, 3, 5, 10, 20, 30] // durasi potongan lagu per tahap (detik)
const FULL = 30 // panjang preview Deezer
const POINTS = [100, 80, 60, 50, 30, 20, 10] // poin bila tertebak di tahap itu
const WRONG_PENALTY = 10 // tiap tebakan salah mengurangi poin lagu itu
const played = new Set() // lagu yang sudah keluar selama app dibuka, supaya tidak cepat berulang
const REQUEST_EXAMPLES = ['Dangdut koplo', 'Lagu galau 2000an', 'Soundtrack Disney', 'Lagu viral TikTok', 'City pop Jepang']

const pointsFor = (stage, wrong) => Math.max(5, POINTS[stage] - wrong * WRONG_PENALTY)

function rating(score, max) {
  const r = score / max
  if (r >= 0.8) return 'Telinga emas. Hafal semua!'
  if (r >= 0.55) return 'Pendengar setia. Mantap!'
  if (r >= 0.3) return 'Lumayan, tinggal pemanasan sedikit lagi.'
  return 'Masih pemanasan. Coba genre lain?'
}

const bestKey = (id) => `fithome-lagu-best-${id}`
function readBest(id) {
  try {
    return Number(localStorage.getItem(bestKey(id))) || 0
  } catch {
    return 0
  }
}
function saveBest(id, score) {
  try {
    localStorage.setItem(bestKey(id), String(score))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

/** Tebak Lagu: dengarkan potongan lagu dari playlist Deezer, tebak judulnya. */
export default function Lagu() {
  const [category, setCategory] = useState(null)
  const [state, setState] = useState({ phase: 'pick' }) // pick | loading | error | play | done
  const [rounds, setRounds] = useState([])
  const [results, setResults] = useState([])
  const [pool, setPool] = useState([])

  const start = async (cat) => {
    setCategory(cat)
    setState({ phase: 'loading', message: `Menyiapkan playlist ${cat.name}...` })
    try {
      const tracks = await categoryTracks(cat)
      if (tracks.length < 5) throw new Error(`Lagu untuk ${cat.name} terlalu sedikit. Coba genre lain.`)
      const fresh = tracks.filter((t) => !played.has(t.id))
      const picks = shuffle(fresh.length >= ROUNDS ? fresh : tracks).slice(0, ROUNDS)
      picks.forEach((t) => played.add(t.id))
      setPool(tracks)
      setRounds(picks)
      setResults([])
      setState({ phase: 'play' })
    } catch (e) {
      setState({ phase: 'error', message: e.message })
    }
  }

  const request = async (text) => {
    setCategory(null)
    setState({ phase: 'loading', message: aiReady ? `AI sedang menyusun playlist "${text}"...` : `Mencari playlist "${text}"...` })
    let cat
    try {
      cat = await customCategory(text)
    } catch (e) {
      setState({ phase: 'error', message: e.message, retry: () => request(text) })
      return
    }
    start(cat)
  }

  const score = results.reduce((t, r) => t + r.points, 0)

  const header = category && state.phase === 'play' && (
    <span className="text-sm text-muted">
      {category.name} · lagu {Math.min(results.length + 1, rounds.length)} dari {rounds.length} · {score} poin
    </span>
  )

  return (
    <GameShell title="Tebak Lagu" right={header}>
      {state.phase === 'pick' && <CategoryPicker onPick={start} onRequest={request} />}

      {state.phase === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-20 text-muted">
          <Loader2 className="animate-spin" size={28} />
          {state.message}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="mx-auto max-w-md py-16 text-center">
          <p className="font-medium">{state.message}</p>
          <p className="mt-1 text-sm text-muted">Cek koneksi internet, lalu coba lagi.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => (state.retry ? state.retry() : start(category))}>Coba lagi</Button>
            <Button variant="ghost" onClick={() => setState({ phase: 'pick' })}>Pilih kategori lain</Button>
          </div>
        </div>
      )}

      {state.phase === 'play' && (
        <Round
          key={results.length}
          track={rounds[results.length]}
          pool={pool}
          last={results.length === rounds.length - 1}
          onNext={(r) => {
            const next = [...results, r]
            setResults(next)
            if (next.length >= rounds.length) setState({ phase: 'done' })
          }}
        />
      )}

      {state.phase === 'done' && (
        <Summary
          category={category}
          results={results}
          onAgain={() => start(category)}
          onPick={() => setState({ phase: 'pick' })}
        />
      )}

      <p className="mt-10 text-center text-xs text-muted">
        Cuplikan lagu dari{' '}
        <a href="https://www.deezer.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Deezer
        </a>
      </p>
    </GameShell>
  )
}

function CategoryPicker({ onPick, onRequest }) {
  const [text, setText] = useState('')
  const submit = (value) => value.trim().length >= 2 && onRequest(value.trim())
  return (
    <div>
      <p className="max-w-xl text-muted">
        Pilih genre. Kamu dapat {ROUNDS} lagu acak, mulai dari potongan 1 detik. Belum kebayang? Lewati untuk dengar lebih panjang: 1, 2, 3, 5, 10, 20, sampai 30 detik.
        Makin cepat ketebak, makin besar poinnya.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
        className="mt-6 rounded-[1.75rem] bg-panel p-5 sm:p-6"
      >
        <p className="flex items-center gap-2 font-serif text-xl font-semibold">
          <Sparkles size={18} className="text-cta" /> Request genre ke AI
        </p>
        <p className="mt-1 text-sm text-muted">Ketik genre, era, atau suasana apa saja. AI yang carikan playlist-nya.</p>
        <div className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={80}
            placeholder="mis. dangdut koplo, lagu galau 2000an..."
            aria-label="Request genre"
            className="min-w-0 flex-1 rounded-full bg-ink/5 px-5 py-3 outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-cta"
          />
          <Button type="submit" disabled={text.trim().length < 2}>
            Main
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REQUEST_EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => submit(ex)} className="rounded-full bg-ink/8 px-3 py-1.5 text-sm transition hover:bg-ink/14">
              {ex}
            </button>
          ))}
        </div>
      </form>

      <p className="mt-8 text-sm font-medium text-muted">Atau pilih genre siap main</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SONG_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="group flex items-center gap-4 rounded-[1.5rem] bg-panel p-4 text-left transition hover:ring-2 hover:ring-cta"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink/8 transition group-hover:bg-cta group-hover:text-on-cta">
              <Music size={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-xl font-semibold">{c.name}</span>
              <span className="block truncate text-sm text-muted">{c.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Satu lagu: putar potongan, lewati untuk memperpanjang, tebak lewat ketikan. */
function Round({ track, pool, last, onNext }) {
  const [stage, setStage] = useState(0)
  const [status, setStatus] = useState('guess') // guess | won | lost
  const [wrong, setWrong] = useState([])
  const [flash, setFlash] = useState(null)
  const player = usePreview(track.preview)
  const over = status !== 'guess'
  const limit = over ? FULL : STEPS[stage]

  // putar otomatis potongan pertama begitu lagu siap
  useEffect(() => {
    if (player.ready && stage === 0 && status === 'guess') player.play(STEPS[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.ready])

  const skip = () => {
    if (stage >= STEPS.length - 1) {
      setStatus('lost')
      player.play(FULL)
      return
    }
    const next = stage + 1
    setStage(next)
    player.play(STEPS[next])
  }

  const guess = (text) => {
    if (isMatch(text, track.title)) {
      setStatus('won')
      player.play(FULL)
    } else {
      setWrong((w) => [text, ...w])
      setFlash(Date.now())
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="animate-rise rounded-[2rem] bg-panel p-6 sm:p-8">
        {over ? (
          <Reveal track={track} won={status === 'won'} stage={stage} points={status === 'won' ? pointsFor(stage, wrong.length) : 0} />
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-ink/8 text-muted">
              <Music size={30} />
            </span>
            <div>
              <p className="text-sm text-muted">Lagu apa ini?</p>
              <p className="font-serif text-2xl font-semibold">
                Potongan {STEPS[stage]} detik
              </p>
              {stage < STEPS.length - 1 && (
                <p className="text-sm text-muted">Lewati untuk dengar {STEPS[stage + 1]} detik</p>
              )}
            </div>
          </div>
        )}

        <Timeline pos={player.pos} limit={limit} over={over} />

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => (player.playing ? player.stop() : player.play(limit))}
            disabled={!player.ready}
            aria-label={player.playing ? 'Berhenti' : 'Putar'}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-cta text-on-cta transition hover:brightness-105 active:scale-95 disabled:opacity-40"
          >
            {!player.ready ? <Loader2 className="animate-spin" size={24} /> : player.playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
          </button>
        </div>
        {player.error && <p className="mt-3 text-center text-sm text-nutri">Cuplikan gagal dimuat. Lewati saja lagu ini.</p>}
      </div>

      {!over && (
        <>
          <GuessInput pool={pool} onGuess={guess} />
          {flash && (
            <p key={flash} className="animate-rise mt-3 flex items-center gap-2 text-sm font-medium text-nutri">
              <X size={16} /> Belum tepat. Coba lagi atau lewati untuk dengar lebih panjang.
            </p>
          )}
          {wrong.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {wrong.map((w, i) => (
                <li key={i} className="flex items-center gap-2 rounded-full bg-ink/5 px-4 py-2 text-sm text-muted line-through decoration-nutri/60">
                  {w}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex justify-center">
            <Button variant="ghost" onClick={skip}>
              <SkipForward size={17} />
              {stage < STEPS.length - 1 ? `Lewati (+${STEPS[stage + 1] - STEPS[stage]} detik)` : 'Menyerah, lihat jawaban'}
            </Button>
          </div>
        </>
      )}

      {over && (
        <div className="animate-rise mt-6 flex justify-center">
          <Button
            onClick={() => {
              player.stop()
              const won = status === 'won'
              onNext({ track, won, seconds: won ? STEPS[stage] : null, points: won ? pointsFor(stage, wrong.length) : 0 })
            }}
          >
            {last ? 'Lihat hasil' : 'Lagu berikutnya'} <ArrowRight size={17} />
          </Button>
        </div>
      )}
    </div>
  )
}

function Reveal({ track, won, stage, points }) {
  return (
    <div className="flex items-center gap-4">
      <img src={track.cover} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-ink/8 object-cover" />
      <div className="min-w-0">
        <p className={`flex items-center gap-1.5 text-sm font-medium ${won ? 'text-mark' : 'text-nutri'}`}>
          {won ? <Check size={16} /> : <X size={16} />}
          {won ? `Betul! Ketebak di ${STEPS[stage]} detik · +${points} poin` : 'Jawabannya:'}
        </p>
        <p className="truncate font-serif text-2xl font-semibold">{track.title}</p>
        <p className="truncate text-muted">{track.artist}</p>
      </div>
    </div>
  )
}

/** Bar waktu 30 detik dengan penanda 1, 2, 3, 5, 10, 20, 30 detik. Bagian yang sudah terbuka diberi warna. */
function Timeline({ pos, limit, over }) {
  const pct = (s) => `${(s / FULL) * 100}%`
  return (
    <div className="mt-6">
      <div className="relative h-3 overflow-hidden rounded-full bg-ink/10">
        <div className="absolute inset-y-0 left-0 bg-ink/15" style={{ width: pct(limit) }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-cta" style={{ width: pct(Math.min(pos, limit)) }} />
        {!over && STEPS.slice(0, -1).map((s) => <span key={s} className="absolute inset-y-0 w-px bg-paper/70" style={{ left: pct(s) }} />)}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
        <span>{Math.min(pos, limit).toFixed(1).replace('.', ',')} dtk</span>
        <span>{limit} dtk</span>
      </div>
    </div>
  )
}

/** Kolom jawaban dengan saran judul: lagu dari playlist kategori + hasil pencarian Deezer. */
function GuessInput({ pool, onGuess }) {
  const [text, setText] = useState('')
  const [remote, setRemote] = useState([])
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const q = normalize(text)

  useEffect(() => {
    if (q.length < 2) return setRemote([])
    let alive = true
    const t = setTimeout(() => {
      searchTracks(text, 8)
        .then((r) => alive && setRemote(r))
        .catch(() => {})
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const suggestions = useMemo(() => {
    if (q.length < 2) return []
    const local = pool.filter((t) => normalize(t.title).includes(q) || normalize(t.artist).includes(q))
    const seen = new Set()
    return [...local, ...remote]
      .filter((t) => {
        const k = normalize(t.title) + '|' + normalize(t.artist)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .slice(0, 8)
  }, [q, pool, remote])

  const submit = (value) => {
    if (!normalize(value)) return
    onGuess(value)
    setText('')
    setOpen(false)
    setActive(-1)
    inputRef.current?.focus()
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit(active >= 0 && suggestions[active] ? suggestions[active].title : text)
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative mt-5">
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-full bg-panel px-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-cta">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setOpen(true)
              setActive(-1)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKey}
            placeholder="Ketik judul lagu..."
            aria-label="Tebakan judul lagu"
            autoComplete="off"
            className="w-full bg-transparent py-3 outline-none placeholder:text-muted"
          />
        </label>
        <Button onClick={() => submit(text)} disabled={!q}>
          Tebak
        </Button>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-[1.25rem] bg-panel p-1.5 shadow-xl ring-1 ring-line">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submit(s.title)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === active ? 'bg-ink/8' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-sm text-muted">{s.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Summary({ category, results, onAgain, onPick }) {
  const correct = results.filter((r) => r.won).length
  const score = results.reduce((t, r) => t + r.points, 0)
  const max = results.length * POINTS[0]
  const times = results.filter((r) => r.won).map((r) => r.seconds)
  const fastest = times.length ? Math.min(...times) : null
  // rekor lama dibaca sekali saat babak selesai, lalu diganti bila terlampaui
  const [best] = useState(() => readBest(category.id))
  const isRecord = score > best
  useEffect(() => {
    if (isRecord) saveBest(category.id, score)
  }, [isRecord, category.id, score])

  return (
    <div className="mx-auto max-w-xl">
      <div className="animate-rise rounded-[2rem] bg-panel p-6 text-center sm:p-8">
        <p className="text-muted">Skor akhir · {category.name}</p>
        <p className="mt-1 font-serif text-7xl font-semibold tabular-nums">{score}</p>
        <p className="text-sm text-muted">dari {max} poin</p>
        {isRecord ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mark px-3 py-1 text-sm font-medium text-on-mark">
            <Trophy size={14} /> Rekor baru{best ? ` (sebelumnya ${best})` : ''}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Rekor kamu: {best} poin</p>
        )}
        <p className="mt-3 font-medium">{rating(score, max)}</p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            ['Benar', `${correct}/${results.length}`],
            ['Tercepat', fastest ? `${fastest} dtk` : '-'],
            ['Lewat', String(results.length - correct)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-ink/5 py-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="font-serif text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <ol className="mt-8 divide-y divide-line rounded-[1.75rem] bg-panel px-4">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <img src={r.track.cover} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-ink/8 object-cover" />
            <span className="min-w-0 flex-1">
              <a href={r.track.link} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:underline">
                {r.track.title}
              </a>
              <span className="block truncate text-sm text-muted">{r.track.artist}</span>
            </span>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${r.won ? 'bg-mark text-on-mark' : 'bg-ink/8 text-muted'}`}>
              {r.won ? `+${r.points} · ${r.seconds} dtk` : 'Lewat'}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onAgain}>
          <RotateCcw size={17} /> Main lagi
        </Button>
        <Button size="lg" variant="ghost" onClick={onPick}>
          Ganti kategori
        </Button>
      </div>
    </div>
  )
}

/** Pemutar preview: play(n) memutar dari detik 0 dan berhenti otomatis di detik ke-n. */
function usePreview(src) {
  const audio = useRef(null)
  const raf = useRef(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)

  useEffect(() => {
    const a = new Audio()
    a.preload = 'auto'
    a.volume = 0.8
    a.src = src
    const onReady = () => setReady(true)
    const onError = () => setError(true)
    a.addEventListener('canplaythrough', onReady)
    a.addEventListener('error', onError)
    a.load()
    audio.current = a
    return () => {
      cancelAnimationFrame(raf.current)
      a.pause()
      a.removeEventListener('canplaythrough', onReady)
      a.removeEventListener('error', onError)
      a.src = ''
    }
  }, [src])

  const stop = () => {
    cancelAnimationFrame(raf.current)
    audio.current?.pause()
    setPlaying(false)
  }

  const play = (limit) => {
    const a = audio.current
    if (!a) return
    cancelAnimationFrame(raf.current)
    a.currentTime = 0
    setPos(0)
    a.play()
      .then(() => {
        setPlaying(true)
        const tick = () => {
          const t = a.currentTime
          setPos(t)
          if (t >= limit || a.ended) {
            a.pause()
            setPos(Math.min(t, limit))
            setPlaying(false)
            return
          }
          raf.current = requestAnimationFrame(tick)
        }
        raf.current = requestAnimationFrame(tick)
      })
      .catch(() => setPlaying(false)) // diblokir autoplay: pengguna tinggal tekan Putar
  }

  return { ready: ready || error, error, playing, pos, play, stop }
}
