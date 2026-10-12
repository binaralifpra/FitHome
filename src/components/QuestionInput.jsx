import { Sparkles } from 'lucide-react'
import SuggestInput from './SuggestInput'
import { DAYS, FLEX, FREQ_NOTES } from '../data/questions'

const chip = (active) =>
  `rounded-full border px-4 py-2.5 text-[15px] transition ${active ? 'border-cta bg-cta text-on-cta' : 'border-line bg-panel text-ink hover:border-ink/40'}`


// Kolom teks bebas + saran ala papan ketik (lihat SuggestInput).
function SuggestField({ value, onChange, suggest = [], replace = false, multiline = false, placeholder, autoFocus, className = '' }) {
  return (
    <SuggestInput
      value={value}
      onChange={onChange}
      suggestions={suggest}
      mode={replace ? 'replace' : 'append'}
      multiline={multiline}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
    />
  )
}

/**
 * Input satu pertanyaan onboarding. `answers` = objek semua jawaban,
 * `onChange(patch)` menggabungkan perubahan (bisa lebih dari satu key).
 */
export default function QuestionInput({ q, answers, onChange, autoFocus = false }) {
  const v = answers[q.id]
  const otherKey = `${q.id}Other`

  if (q.kind === 'textarea' || q.kind === 'input') {
    return (
      <SuggestField
        value={v || ''}
        onChange={(t) => onChange({ [q.id]: t })}
        suggest={q.suggest}
        replace={q.replace}
        multiline={q.kind === 'textarea'}
        placeholder={q.placeholder}
        autoFocus={autoFocus}
      />
    )
  }

  if (q.kind === 'single') {
    const trigger = q.other?.when ?? 'Lainnya'
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => (
            <button key={o} type="button" onClick={() => onChange({ [q.id]: o })} className={chip(v === o)}>
              {o}
            </button>
          ))}
        </div>
        {q.other && v === trigger && (
          <SuggestField
            autoFocus
            value={answers[otherKey] || ''}
            onChange={(t) => onChange({ [otherKey]: t })}
            suggest={q.other.suggest}
            replace={q.other.replace}
            placeholder={q.other.placeholder}
            className="animate-rise mt-4"
          />
        )}
      </div>
    )
  }

  if (q.kind === 'multi') {
    const list = v || []
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => {
          const active = list.includes(o)
          return (
            <button key={o} type="button" onClick={() => onChange({ [q.id]: active ? list.filter((x) => x !== o) : [...list, o] })} className={chip(active)}>
              {o}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.kind === 'frequency')
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" onClick={() => onChange({ [q.id]: n })} className={`${chip(v === n)} min-w-14`}>
              {n}x
            </button>
          ))}
        </div>
        {v && (
          <p key={v} className="animate-rise mt-4 flex gap-2 text-[15px] leading-relaxed text-muted">
            <Sparkles size={16} className="mt-1 shrink-0 text-mark" />
            {FREQ_NOTES[v]}
          </p>
        )}
      </div>
    )

  if (q.kind === 'days') {
    const list = v || []
    const flex = list.includes(FLEX)
    return (
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => {
          const active = list.includes(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ [q.id]: active ? list.filter((x) => x !== d) : [...list.filter((x) => x !== FLEX), d] })}
              className={chip(active)}
            >
              {d}
            </button>
          )
        })}
        <button type="button" onClick={() => onChange({ [q.id]: flex ? [] : [FLEX] })} className={chip(flex)}>
          {FLEX}
        </button>
      </div>
    )
  }
  return null
}
