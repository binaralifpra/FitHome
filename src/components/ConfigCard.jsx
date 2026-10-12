import { useState } from 'react'
import { QUESTIONS, formatAnswer, isAnswered } from '../data/questions'
import QuestionInput from './QuestionInput'
import { Button } from './ui'

/** Daftar konfigurasi AI Coach: tiap baris bisa diubah sendiri. */
export default function ConfigCard({ answers, onSave, ids }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(answers)
  const list = ids ? QUESTIONS.filter((q) => ids.includes(q.id)) : QUESTIONS

  return (
    <ul className="divide-y divide-line border-y border-line">
      {list.map((q) => (
        <li key={q.id} className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted">{q.label}</p>
              <p className="mt-0.5 font-serif text-lg">{formatAnswer(q, answers)}</p>
            </div>
            {editing !== q.id && (
              <button
                onClick={() => {
                  setDraft(answers)
                  setEditing(q.id)
                }}
                className="shrink-0 text-sm font-medium text-mark hover:underline"
              >
                Ubah
              </button>
            )}
          </div>
          {editing === q.id && (
            <div className="animate-rise mt-4">
              <p className="mb-3 font-medium">{q.title}</p>
              <QuestionInput q={q} answers={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} autoFocus />
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  disabled={!isAnswered(q, draft)}
                  onClick={() => {
                    const patch = { [q.id]: draft[q.id] }
                    if (`${q.id}Other` in draft) patch[`${q.id}Other`] = draft[`${q.id}Other`]
                    onSave(patch)
                    setEditing(null)
                  }}
                >
                  Simpan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
