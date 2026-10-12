import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { Media, PhotoTag, Section, Shade } from '../components/ui'
import ChatPanel from '../components/ChatPanel'
import { formatAnswer, QUESTIONS } from '../data/questions'
import { programName } from '../lib/coach'

// Data latihan & nutrisi ditampilkan seimbang
const SHOW = ['goal', 'duration', 'equipment', 'budget', 'cook']

export default function Coach() {
  const { profile } = useApp()
  const location = useLocation()
  // Pertanyaan yang dibawa dari halaman lain (mis. "Kenapa gerakan ini?") — sekali kirim
  const [initial] = useState(() => {
    const q = location.state?.q
    if (q) window.history.replaceState({ ...window.history.state, usr: null }, '')
    return q
  })

  return (
    <Section className="grid gap-6 pt-6 lg:grid-cols-12">
      <Media src="coach.jpg" alt="Latihan di rumah sambil membuka laptop" className="hidden min-h-[460px] rounded-[2rem] lg:col-span-4 lg:block">
        <Shade height="45%" opacity={0.55} />
        <div className="absolute inset-x-0 bottom-0 p-8 text-paper">
          <PhotoTag>Tahu programmu</PhotoTag>
          <h1 className="mt-4 font-serif text-4xl font-semibold">AI Coach</h1>
          <p className="mt-1 text-paper/85">{programName(profile)} · {profile?.frequency || 3}x seminggu</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUESTIONS.filter((q) => SHOW.includes(q.id))
              .map((q) => ({ id: q.id, text: formatAnswer(q, profile) }))
              .filter((a) => a.text !== '—')
              .map((a) => (
                <span key={a.id} className="rounded-full bg-paper/15 px-3 py-1 text-sm backdrop-blur-sm">
                  {a.text}
                </span>
              ))}
          </div>
          <Link to="/profil" className="mt-4 inline-block text-sm underline underline-offset-4">
            Ubah data AI Coach
          </Link>
        </div>
      </Media>
      <ChatPanel initialQuestion={initial} className="h-[calc(100vh-10rem)] min-h-[480px] rounded-[2rem] lg:col-span-8 lg:h-[calc(100vh-8rem)]" />
    </Section>
  )
}
