import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authMessage, useAuth } from '../store/Auth'
import { Button, Media, ThemeToggle } from '../components/ui'
import { Logo } from '../components/Layout'

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const inputCls =
  'mt-2 w-full border-b-2 border-ink/15 bg-transparent pb-3 text-xl text-ink placeholder:text-muted focus:border-cta focus:outline-none'

export default function Login() {
  const { user, loginEmail, registerEmail, loginGoogle, resetPassword } = useAuth()
  const [mode, setMode] = useState('masuk') // 'masuk' | 'daftar'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(null) // 'email' | 'google' | 'reset'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (user) return <Navigate to="/" replace />

  const run = async (kind, fn) => {
    setBusy(kind)
    setError('')
    setInfo('')
    try {
      await fn()
    } catch (e) {
      setError(authMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'daftar' && !name.trim()) return setError('Nama panggilan belum diisi.')
    run('email', () => (mode === 'masuk' ? loginEmail(email, password) : registerEmail(name, email, password)))
  }

  const forgot = () => {
    if (!email.trim()) return setError('Isi email dulu, nanti link reset password kami kirim ke sana.')
    run('reset', async () => {
      await resetPassword(email)
      setInfo(`Link reset password sudah dikirim ke ${email.trim()}. Cek juga folder spam.`)
    })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-12">
      <Media src="login.jpg" alt="Latihan ringan di kamar kos" className="hidden lg:col-span-6 lg:block">
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-x-14 bottom-14 text-paper">
          <p className="font-serif text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.98] font-bold">
            Konsisten
            <br />
            15 menit sehari.
          </p>
        </div>
      </Media>

      <div className="flex flex-col px-5 py-8 sm:px-10 lg:col-span-6 lg:px-20 lg:py-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="w-full max-w-md">
            <h1 className="font-serif text-4xl leading-tight font-semibold sm:text-5xl">
              {mode === 'masuk' ? 'Selamat datang kembali.' : 'Mulai dari kamarmu.'}
            </h1>
            <p className="mt-3 text-lg text-muted">
              {mode === 'masuk' ? 'Lanjutkan programmu.' : 'Gratis, cukup 1 menit.'}
            </p>

            <button
              type="button"
              onClick={() => run('google', loginGoogle)}
              disabled={!!busy}
              className="mt-10 flex w-full items-center justify-center gap-3 rounded-full bg-ink px-6 py-4 font-medium text-bg transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'google' ? <Loader2 size={20} className="animate-spin" /> : <GoogleMark />}
              {mode === 'masuk' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
            </button>

            <div className="my-8 flex items-center gap-4 text-sm text-muted">
              <span className="h-px flex-1 bg-ink/10" /> atau pakai email <span className="h-px flex-1 bg-ink/10" />
            </div>

            <form onSubmit={submit} className="space-y-7" noValidate>
              {mode === 'daftar' && (
                <label className="block">
                  <span className="text-sm text-muted">Nama panggilan</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" placeholder="Binar" className={inputCls} />
                </label>
              )}
              <label className="block">
                <span className="text-sm text-muted">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="kamu@email.com" className={inputCls} />
              </label>
              <label className="block">
                <span className="flex justify-between text-sm text-muted">
                  Password
                  {mode === 'masuk' && (
                    <button type="button" onClick={forgot} className="text-muted hover:text-ink" disabled={!!busy}>
                      {busy === 'reset' ? 'Mengirim…' : 'Lupa password?'}
                    </button>
                  )}
                </span>
                <span className="relative block">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'daftar' ? 'Minimal 6 karakter' : '••••••••'}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-0 bottom-3 p-1 text-muted hover:text-ink"
                    aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              {error && <p className="animate-rise text-[15px] text-nutri" role="alert">{error}</p>}
              {info && <p className="animate-rise text-[15px] text-mark">{info}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
                {busy === 'email' ? <Loader2 size={18} className="animate-spin" /> : null}
                {mode === 'masuk' ? 'Masuk' : 'Buat Akun'} {busy !== 'email' && <ArrowRight size={18} />}
              </Button>
            </form>

            <p className="mt-8 text-center text-muted">
              {mode === 'masuk' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === 'masuk' ? 'daftar' : 'masuk'))
                  setError('')
                  setInfo('')
                }}
                className="text-ink underline underline-offset-4 hover:text-mark"
              >
                {mode === 'masuk' ? 'Daftar gratis' : 'Masuk'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
