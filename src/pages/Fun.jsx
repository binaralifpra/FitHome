import { Link } from 'react-router-dom'
import { ArrowLeft, Brain, Clock, Music, Puzzle, Type } from 'lucide-react'
import { Section } from '../components/ui'

export const GAMES = [
  { id: 'quiz', name: 'Quiz', desc: '10 soal kebugaran, dibuat AI tiap main', time: '± 5 menit', icon: Brain, photo: 'coach.jpg' },
  { id: 'wordly', name: 'Wordly', desc: 'Tebak kata olahraga, 4–9 huruf', time: '± 3 menit', icon: Type, photo: 'type-upper.jpg' },
  { id: 'puzzle', name: 'Puzzle', desc: 'Geser 8 potongan jadi gambar utuh', time: '± 2 menit', icon: Puzzle, photo: 'hero-home.jpg' },
  { id: 'lagu', name: 'Tebak Lagu', desc: 'Tebak lagu dari potongan 1 detik, pilih genremu', time: '± 5 menit', icon: Music, photo: 'type-mobility.jpg' },
]

/** Halaman pemilihan game. */
export default function Fun() {
  return (
    <Section className="pt-8">
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">Fun Games</h1>
      <p className="mt-2 text-muted">Main sebentar di rest day, biar nggak tegang.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => (
          <Link key={g.id} to={`/fun/${g.id}`} className="group flex items-center gap-5 rounded-[1.75rem] bg-panel p-4 pr-6 transition hover:ring-2 hover:ring-cta">
            <span className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.25rem]">
              <img src={`images/${g.photo}`} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-paper">
                <g.icon size={34} strokeWidth={1.6} />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-2xl font-semibold">{g.name}</span>
              <span className="mt-1 block text-[15px] text-muted">{g.desc}</span>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink/8 px-2.5 py-1 text-xs">
                <Clock size={12} /> {g.time}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Section>
  )
}

export function GameShell({ title, right, children }) {
  return (
    <Section className="pt-6">
      <Link to="/fun" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Semua game
      </Link>
      <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl font-semibold">{title}</h1>
        {right}
      </div>
      {children}
    </Section>
  )
}
