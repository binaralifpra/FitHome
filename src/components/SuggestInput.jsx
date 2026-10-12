import { useRef, useState } from 'react'
import { Keyboard } from 'lucide-react'

// Jumlah/porsi di depan kata, mis. "4", "2 porsi", "setengah", "½ piring"
const QTY = /^\s*((?:\d+(?:[.,]\d+)?|½|¼|setengah|separuh|satu|dua|tiga|empat|lima)(?:\s*(?:x|porsi|buah|butir|potong|piring|mangkuk|gelas|bungkus|sdm))?)(?=\s|$)/i
const QTY_NUM = { '½': 0.5, '¼': 0.25, setengah: 0.5, separuh: 0.5, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5 }

/** Pisahkan "4 tel" → { qty: '4', query: 'tel' }. */
function splitQty(raw) {
  const m = raw.match(QTY)
  if (!m) return { qty: '', query: raw.trim() }
  return { qty: m[1].trim(), query: raw.slice(m[0].length).trim() }
}

/** Kalikan petunjuk "~70" dengan jumlah, mis. 4 → "~280". */
function scaleHint(hint, qty) {
  if (!hint || !qty) return hint
  const n = parseFloat(qty.replace(',', '.')) || QTY_NUM[qty.split(/\s/)[0].toLowerCase()]
  const base = Number(/(\d+)/.exec(hint)?.[1])
  return n && base ? `~${Math.round(base * n)}` : hint
}

/**
 * Kolom teks dengan baris saran ala papan ketik. Baris saran SELALU muncul lagi
 * selama mengetik: angka/porsi di depan tetap dipakai ("4 tel" → "4 telur rebus"),
 * dan setelah memilih, saran berikutnya langsung tersedia untuk item selanjutnya.
 *
 * @param suggestions [{ text, hint?, replace? }] atau string
 * @param mode        'append' (daftar, dipisah `sep`) | 'replace' (satu jawaban)
 */
export default function SuggestInput({
  value = '',
  onChange,
  suggestions = [],
  mode = 'append',
  sep = ', ',
  multiline = false,
  placeholder,
  autoFocus,
  onEnter,
  accent = 'cta',
  className = '',
  right,
}) {
  const ref = useRef(null)
  const blurTimer = useRef(null)
  const [focused, setFocused] = useState(false)
  const list = suggestions.map((s) => (typeof s === 'string' ? { text: s } : s))
  const sepChars = [...new Set(((sep.trim() || ',') + ',+').split(''))].map((c) => '\\' + c).join('')
  const splitter = new RegExp(`\\s*[${sepChars}]\\s*`)

  // Bagian yang sedang diketik = setelah pemisah terakhir
  const segs = mode === 'append' ? value.split(splitter) : [value]
  const raw = segs[segs.length - 1] || ''
  const { qty, query } = mode === 'append' ? splitQty(raw) : { qty: '', query: raw.trim() }
  const q = query.toLowerCase()
  // Kata sudah lengkap (persis salah satu saran) → tawarkan item berikutnya
  const complete = Boolean(q) && list.some((s) => s.text.toLowerCase() === q)

  const shown = (
    complete || !q
      ? list
      : list.filter((s) => {
          const t = s.text.toLowerCase()
          return t.includes(q) || q.split(/\s+/).every((w) => t.split(/\s+/).some((x) => x.startsWith(w)))
        })
  ).slice(0, 14)

  const pick = (s) => {
    let next
    if (mode === 'replace' || s.replace) next = s.text
    else if (complete) next = `${value.trimEnd()}${sep}${s.text}` // tambah item baru
    else {
      const head = value.slice(0, value.length - raw.length) // teks sebelum bagian yang diketik
      next = `${head}${qty ? `${qty} ` : ''}${s.text}`
    }
    onChange(next)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.length, next.length)
    })
  }

  const label = (s) => (!complete && qty && mode === 'append' && !s.replace ? `${qty} ${s.text}` : s.text)
  const Tag = multiline ? 'textarea' : 'input'
  const ring = accent === 'nutri' ? 'focus-within:border-nutri focus-within:ring-nutri/25' : 'focus-within:border-cta focus-within:ring-cta/25'

  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-panel transition focus-within:ring-2 ${ring} ${className}`}>
      <div className="flex items-end gap-2">
        <Tag
          ref={ref}
          autoFocus={autoFocus}
          rows={multiline ? 2 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            clearTimeout(blurTimer.current)
            setFocused(true)
          }}
          // Tutup baris saran sedikit terlambat: kalau langsung menutup, tombol di bawahnya
          // bergeser di tengah klik dan kliknya meleset.
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 250)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && onEnter) {
              e.preventDefault()
              onEnter()
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 resize-none bg-transparent px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:outline-none"
        />
        {right && <div className="shrink-0 p-1.5">{right}</div>}
      </div>
      {focused && shown.length > 0 && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-line bg-ink/4 px-2 py-2">
          <Keyboard size={15} className="ml-1 shrink-0 text-muted" aria-hidden="true" />
          {complete && mode === 'append' && <span className="shrink-0 text-xs text-muted">tambah:</span>}
          {shown.map((s) => (
            <button
              key={s.text}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // jaga fokus di kolom (keyboard tetap terbuka)
              onClick={() => pick(s)}
              className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-sm whitespace-nowrap text-ink shadow-sm transition hover:bg-ink/8"
            >
              {label(s)}
              {s.hint && <span className="ml-1.5 text-muted">{complete ? s.hint : scaleHint(s.hint, qty)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
