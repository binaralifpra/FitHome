import { useEffect, useRef, useState } from 'react'
import { ArrowUp, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { useApp } from '../store/AppStore'
import RichText from './RichText'
import { buildCoachSystem, SUGGESTIONS } from '../lib/coachChat'
import { aiReady, chatStream } from '../lib/groq'

// Cegah pertanyaan awal terkirim dua kali (StrictMode memasang komponen dua kali saat dev)
let lastInitial = { q: null, t: 0 }

/** Percakapan dengan AI Coach (Groq, streaming). Riwayat disimpan per akun. */
export default function ChatPanel({ onClose, initialQuestion, className = '' }) {
  const app = useApp()
  const { chat = [], pushChat, setLastChat, clearChat, name } = app
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

  const send = async (text) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    const history = [...chat.filter((m) => m.text), { role: 'user', text: q }].slice(-12)
    pushChat({ role: 'user', text: q })
    pushChat({ role: 'assistant', text: '' })
    setBusy(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    let got = ''
    try {
      await chatStream({
        messages: [
          { role: 'system', content: buildCoachSystem(app) },
          ...history.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        ],
        onText: (t) => {
          got = t
          setLastChat(t)
        },
        signal: ctrl.signal,
      })
    } catch (e) {
      if (e.name === 'AbortError') {
        if (!got) setLastChat('Dihentikan.')
      } else {
        setLastChat(aiReady ? 'Maaf, AI Coach lagi susah dihubungi. Coba lagi sebentar, ya.' : 'AI Coach belum tersambung: isi VITE_GROQ_API_KEY di .env.local.')
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  useEffect(() => {
    if (initialQuestion && !sentInitial.current) {
      sentInitial.current = true
      if (lastInitial.q === initialQuestion && Date.now() - lastInitial.t < 3000) return
      lastInitial = { q: initialQuestion, t: Date.now() }
      send(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion])

  return (
    <div className={`flex flex-col overflow-hidden bg-panel ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="flex items-center gap-2 font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cta text-on-cta">
            <Sparkles size={15} />
          </span>
          AI Coach
        </p>
        <div className="flex items-center gap-1">
          {chat.length > 0 && (
            <button onClick={clearChat} disabled={busy} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-ink/8 hover:text-ink disabled:opacity-40">
              <RotateCcw size={14} /> Baru
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-ink/8 hover:text-ink" aria-label="Tutup">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {chat.length === 0 ? (
          <div className="flex h-full flex-col justify-end">
            <p className="font-serif text-3xl font-semibold">Halo, {name}.</p>
            <p className="mt-1 text-muted">Mau ngobrolin latihan, makan, atau istirahat?</p>
            <div className="mt-5 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line px-4 py-2.5 text-left text-[15px] transition hover:bg-ink/6">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-cta px-4 py-2.5 text-on-cta">{m.text}</p>
              </div>
            ) : (
              <div key={i} className="max-w-[92%] text-[15px]">
                {m.text ? (
                  <RichText text={m.text} />
                ) : busy ? (
                  <span className="flex gap-1.5 pt-1">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                    ))}
                  </span>
                ) : (
                  <span className="text-muted">Tidak ada jawaban.</span>
                )}
              </div>
            ),
          )
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-end gap-2 border-t border-line p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          placeholder="Tulis pertanyaanmu…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl bg-bg px-4 py-2.5 text-[15px] text-ink placeholder:text-muted focus:ring-2 focus:ring-cta focus:outline-none"
          style={{ fieldSizing: 'content' }}
        />
        {busy ? (
          <button type="button" onClick={() => abortRef.current?.abort()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/12" aria-label="Hentikan">
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cta text-on-cta disabled:opacity-40" aria-label="Kirim">
            <ArrowUp size={19} />
          </button>
        )}
      </form>
    </div>
  )
}
