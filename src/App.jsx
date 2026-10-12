import { useEffect, useRef } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/Auth'
import { AppStoreProvider, PROFILE_VERSION, useApp } from './store/AppStore'
import Layout, { Logo } from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Coach from './pages/Coach'
import Fun from './pages/Fun'
import Quiz from './pages/games/Quiz'
import Wordly from './pages/games/Wordly'
import Puzzle from './pages/games/Puzzle'
import Lagu from './pages/games/Lagu'
import WorkoutDetail from './pages/WorkoutDetail'
import Onboarding from './pages/Onboarding'
import Nutrition from './pages/Nutrition'
import Programs from './pages/Programs'
import Profile from './pages/Profile'

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="animate-pulse">
        <Logo className="pointer-events-none text-4xl" />
      </span>
    </div>
  )
}

// Pengguna baru wajib kenalan dulu dengan AI Coach
function RequireProfile({ children }) {
  const { profile, hydrated } = useApp()
  const location = useLocation()
  const valid = profile?.v === PROFILE_VERSION
  if (!valid && !hydrated) return <Splash /> // mungkin datanya ada di cloud
  if (!valid) return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  return children
}

// Setiap kali aplikasi dibuka / setelah login, mulai dari Home
function useStartAtHome() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    if (pathname !== '/' && !pathname.startsWith('/onboarding')) navigate('/', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function AppRoutes() {
  useStartAtHome()
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/profil"
        element={
          <RequireProfile>
            <Profile />
          </RequireProfile>
        }
      />
      <Route
        element={
          <RequireProfile>
            <Layout />
          </RequireProfile>
        }
      >
        <Route index element={<Home />} />
        <Route path="latihan" element={<WorkoutDetail />} />
        <Route path="latihan/:code" element={<WorkoutDetail />} />
        <Route path="program" element={<Programs />} />
        <Route path="nutrisi" element={<Nutrition />} />
        <Route path="coach" element={<Coach />} />
        <Route path="fun" element={<Fun />} />
        <Route path="fun/quiz" element={<Quiz />} />
        <Route path="fun/wordly" element={<Wordly />} />
        <Route path="fun/puzzle" element={<Puzzle />} />
        <Route path="fun/lagu" element={<Lagu />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Data aplikasi dipisah per akun; ganti akun = muat data akun itu
function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  const name = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Teman'
  return (
    <AppStoreProvider key={user.uid} uid={user.uid} defaultName={name}>
      <AppRoutes />
    </AppStoreProvider>
  )
}

function LoginGate() {
  const { loading } = useAuth()
  return loading ? <Splash /> : <Login />
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route path="/*" element={<Protected />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
