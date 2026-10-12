import { useRef, useState } from 'react'
import { ArrowRight, Camera, Loader2, X } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { Button, Media, PhotoTag, Section, Shade } from '../components/ui'
import { friedMessage } from '../data/content'
import FoodReport from '../components/FoodReport'
import { analyzePhoto, estimateCalories, shrinkImage } from '../lib/calorie'

const field =
  'w-full rounded-2xl border border-line bg-panel px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:border-nutri focus:ring-2 focus:ring-nutri/25 focus:outline-none'

// Bobot visual disamakan dengan halaman Workout: hero 520px, lapisan gelap penuh 0.5,
// judul & CTA berukuran sama, konten langsung di latar halaman (tanpa panel terang).
export default function Nutrition() {
  const { friedToday, friedMax, kcalToday, proteinToday, targets } = useApp()
  return (
    <>
      <Section className="pt-6">
        <Media src="food-ayam-bakar.jpg" alt="Nasi dan ayam bakar" className="h-[320px] rounded-[2rem]">
          <Shade opacity={0.5} />
          <div className="absolute inset-x-0 bottom-0 p-6 text-paper sm:p-9">
            <PhotoTag nutri>Misi dari AI Coach hari ini</PhotoTag>
            <h1 className="mt-3 max-w-3xl font-serif text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.08] font-semibold">
              Maks {friedMax} gorengan, sisanya direbus atau dikukus.
            </h1>
            <FriedBars count={friedToday} max={friedMax} className="mt-3" />
            <Button variant="nutri" className="mt-5" onClick={() => document.getElementById('lapor')?.scrollIntoView({ behavior: 'smooth' })}>
              Lapor makanan <ArrowRight size={17} />
            </Button>
          </div>
        </Media>
      </Section>

      {/* Pantauan harian: kalori & protein */}
      <Section className="mt-6">
        <div className="grid gap-4 rounded-[1.75rem] bg-panel p-5 sm:grid-cols-2 sm:p-6">
          <DailyMeter label="Kalori hari ini" value={kcalToday} target={targets.kcal} unit="kkal" />
          <DailyMeter label="Protein hari ini" value={proteinToday} target={targets.protein} unit="g" />
          <p className="text-sm text-muted sm:col-span-2">
            Target harian ini perkiraan umum dari tujuanmu, bukan angka mati. Yang penting polanya, bukan sempurna tiap hari.
          </p>
        </div>
      </Section>

      <Section className="mt-10">
        <div id="lapor" className="scroll-mt-24">
          <h2 className="font-serif text-3xl font-semibold">Lapor makanan dalam hitungan detik</h2>
          <p className="mt-2 text-muted">Nggak perlu timbang gram. Ketik makananmu, pilih saran yang muncul, sesuaikan porsinya — AI yang hitung.</p>
          <div className="mt-5">
            <FoodReport />
          </div>
          <PhotoReport />
          <TodayLog />
        </div>
      </Section>
    </>
  )
}

function DailyMeter({ label, value, target, unit }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const left = target - value
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm">
          <span className="font-serif text-2xl font-semibold">{value.toLocaleString('id-ID')}</span>
          <span className="text-muted">
            {' '}
            / {target.toLocaleString('id-ID')} {unit}
          </span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-nutri transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">{left > 0 ? `Sisa ±${left.toLocaleString('id-ID')} ${unit}` : 'Target hari ini sudah tercapai'}</p>
    </div>
  )
}

function FriedBars({ count, max, className = '' }) {
  const widths = ['w-10', 'w-16', 'w-24', 'w-12', 'w-20']
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Array.from({ length: Math.max(max, count) }).map((_, i) => (
        <span key={i} className={`h-2.5 rounded-full transition ${widths[i % widths.length]} ${i < count ? 'bg-nutri' : 'bg-paper/25'}`} />
      ))}
      <span className="ml-2 text-sm text-paper/85">
        {count}/{max} gorengan
      </span>
    </div>
  )
}



function PhotoReport() {
  const { addFoods } = useApp()
  const inputRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [state, setState] = useState('idle') // idle | loading | result | manual | error
  const [guess, setGuess] = useState(null)
  const [manual, setManual] = useState('')

  const onFile = async (file) => {
    if (!file) return
    setState('loading')
    try {
      const dataUrl = await shrinkImage(file)
      setPhoto(dataUrl)
      const g = await analyzePhoto(dataUrl)
      setGuess(g)
      setState(g.isFood ? 'result' : 'error')
    } catch {
      setState('error')
    }
  }
  const close = () => {
    setState('idle')
    setPhoto(null)
    setGuess(null)
    setManual('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mt-8">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {state === 'idle' ? (
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Camera size={17} /> Atau foto makananmu
        </Button>
      ) : (
        <div className="animate-rise flex flex-col gap-5 rounded-[1.75rem] bg-panel p-4 sm:flex-row sm:items-center">
          {photo ? (
            <img src={photo} alt="Foto makananmu" className="h-40 w-full rounded-[1.25rem] object-cover sm:w-56" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-[1.25rem] bg-ink/8 sm:w-56">
              <Loader2 className="animate-spin text-muted" />
            </div>
          )}
          <div className="flex-1">
            {state === 'loading' && <p className="text-muted">AI sedang melihat fotomu...</p>}
            {state === 'error' && (
              <>
                <p>AI belum bisa mengenali makanan di foto ini.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="nutri" onClick={() => setState('manual')}>
                    Ketik manual
                  </Button>
                  <Button size="sm" variant="ghost" onClick={close}>
                    Batal
                  </Button>
                </div>
              </>
            )}
            {state === 'result' && guess && (
              <>
                <p className="text-lg">
                  AI mendeteksi: mirip <span className="font-semibold">{guess.name}</span>, ~{guess.kcal} kkal · {guess.protein} g protein
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="nutri"
                    onClick={() => {
                      addFoods([{ name: guess.name, kcal: guess.kcal, protein: guess.protein, fried: guess.friedCount > 0, friedCount: guess.friedCount }], 'photo')
                      close()
                    }}
                  >
                    Sesuai, tambahkan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setState('manual')}>
                    Bukan, ketik manual
                  </Button>
                </div>
              </>
            )}
            {state === 'manual' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!manual.trim()) return
                  const r = await estimateCalories(manual)
                  addFoods([{ name: manual.trim(), kcal: r.kcal, protein: r.protein, fried: r.fried, friedCount: r.friedCount }], 'photo')
                  close()
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input autoFocus value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Nama makanannya apa?" className={field} />
                <Button size="sm" variant="nutri" type="submit" disabled={!manual.trim()} className="shrink-0">
                  Tambahkan ke log
                </Button>
              </form>
            )}
          </div>
          {state !== 'loading' && (
            <button onClick={close} className="self-start rounded-full p-2 text-muted hover:bg-ink/8" aria-label="Tutup">
              <X size={17} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function TodayLog() {
  const { foodsToday, kcalToday, proteinToday, friedToday, friedMax, removeFood } = useApp()
  return (
    <div className="mt-10 border-t border-line pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-2xl font-semibold">Log makan hari ini</h3>
        <p className="font-medium">
          Total: {kcalToday.toLocaleString('id-ID')} kkal · {proteinToday} g protein
        </p>
      </div>
      <p className="mt-2 text-muted">{friedMessage(friedToday, friedMax)}</p>
      {foodsToday.length === 0 ? (
        <p className="mt-5 text-muted">Belum ada yang dilaporkan. Yuk mulai dari makan barusan.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {foodsToday.map((f) => (
            <li key={f.uid} className="flex items-center gap-3 py-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${f.friedCount > 0 ? 'bg-nutri' : 'bg-herb'}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate">{f.name}</p>
                <p className="text-sm text-muted">
                  ~{f.kcal} kkal{f.protein != null ? ` · ${f.protein} g protein` : ''}
                </p>
              </div>
              <button onClick={() => removeFood(f.uid)} className="rounded-full p-1.5 text-muted hover:bg-ink/8 hover:text-ink" aria-label={`Hapus ${f.name}`}>
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
