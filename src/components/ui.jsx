import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Image as ImageIcon, Moon, Sparkles, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

/** Foto dari public/images. Gagal dimuat → bidang polos + ikon. */
export function Media({ src, alt = '', className = '', imgClassName = '', children }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = !src || failedSrc === src
  return (
    <div className={`relative overflow-hidden bg-panel ${className}`}>
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted" role="img" aria-label={alt}>
          <ImageIcon size={28} strokeWidth={1.4} />
        </div>
      ) : (
        <img
          src={`images/${src}`}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        />
      )}
      {children}
    </div>
  )
}

/** Lapisan gelap SOLID (bukan gradient) di bagian bawah foto. */
export function Shade({ height = '100%', opacity = 0.5 }) {
  return <div className="absolute inset-x-0 bottom-0" style={{ height, background: `rgba(0,0,0,${opacity})` }} />
}

export function Button({ as, to, variant = 'cta', size = 'md', className = '', children, ...rest }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-[15px]', lg: 'px-7 py-3.5 text-base' }
  const variants = {
    cta: 'bg-cta text-on-cta hover:brightness-105',
    nutri: 'bg-nutri text-on-nutri hover:brightness-110',
    ghost: 'bg-ink/8 text-ink hover:bg-ink/14',
    outline: 'ring-1 ring-line text-ink hover:ring-ink/40',
    light: 'bg-paper text-[#20241C] hover:bg-white',
  }
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`
  if (to)
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  const Tag = as || 'button'
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  )
}

/** Tag kecil di atas foto. Latihan & nutrisi memakai gaya yang sama (latar aksen penuh)
 *  supaya bobot visual kedua domain setara. */
export function PhotoTag({ children, nutri = false, icon = true }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        nutri ? 'bg-nutri text-on-nutri' : 'bg-mark text-on-mark'
      }`}
    >
      {icon && <Sparkles size={13} />} {children}
    </span>
  )
}

/** Tag di atas latar halaman. */
export function Tag({ children, icon = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-mark/12 px-3 py-1.5 text-xs font-semibold text-mark ${className}`}>
      {icon && <Sparkles size={13} />} {children}
    </span>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-mark' : 'bg-ink/15'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow-sm transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

export function ThemeToggle({ className = '' }) {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-ink/8 hover:text-ink ${className}`}
      aria-label={dark ? 'Ganti ke tema terang (Sand)' : 'Ganti ke tema gelap (Charcoal)'}
      title={dark ? 'Tema Sand' : 'Tema Charcoal'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export function Section({ children, className = '' }) {
  return <section className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>
}

export function SectionHead({ title, right }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {right}
    </div>
  )
}
