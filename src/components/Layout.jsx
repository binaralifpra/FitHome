import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Flame, MessageCircle } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { ThemeToggle } from './ui'
import ChatPanel from './ChatPanel'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/latihan', label: 'Workouts' },
  { to: '/program', label: 'Programs' },
  { to: '/nutrisi', label: 'Nutrition', nutri: true },
  { to: '/coach', label: 'AI Coach' },
  { to: '/fun', label: 'Fun Games' },
]

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`font-serif text-2xl font-semibold tracking-tight text-ink ${className}`}>
      FitHome<span className="text-cta">.</span>
    </Link>
  )
}

// Pill aktif memakai warna domainnya: nutrisi = coral, lainnya = aksen latihan
const linkCls = (nutri) => ({ isActive }) =>
  `whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] transition ${
    isActive ? (nutri ? 'bg-nutri text-on-nutri' : 'bg-mark text-on-mark') : 'text-muted hover:text-ink'
  }`

export function StreakBadge() {
  const { streak } = useApp()
  return (
    <Link to="/profil" className="flex h-9 items-center gap-1 rounded-full bg-mark px-3 text-sm font-semibold text-on-mark" title="Streak · buka profil">
      <Flame size={15} /> {streak}
    </Link>
  )
}

function Navbar() {
  const { name } = useApp()
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu utama">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkCls(l.nutri)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/profil" className="hidden text-[15px] text-muted hover:text-ink sm:block">
            Hi, <span className="text-ink">{name}</span>
          </Link>
          <StreakBadge />
          <ThemeToggle />
        </div>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="Menu utama">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkCls(l.nutri)}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

/** Tombol mengambang "Tanya AI Coach" + jendela chat kecil. */
function FloatingCoach() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  if (pathname === '/coach') return null
  const nutri = pathname.startsWith('/nutrisi') // warna mengikuti domain halaman
  return (
    <>
      {open && (
        <div className="animate-rise fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]">
          <ChatPanel onClose={() => setOpen(false)} className="h-[min(600px,80vh)] rounded-[2rem] border border-line shadow-2xl" />
        </div>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 font-medium shadow-lg transition hover:brightness-105 sm:right-6 sm:bottom-6 ${nutri ? 'bg-nutri text-on-nutri' : 'bg-cta text-on-cta'}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <MessageCircle size={19} /> Tanya AI Coach
        </button>
      )}
    </>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <FloatingCoach />
    </div>
  )
}
