import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { Button } from './ui'
import SuggestInput from './SuggestInput'
import { estimateCalories } from '../lib/calorie'
import { FOOD_SUGGEST } from '../data/content'

/**
 * Lapor makanan lewat ketikan: saran muncul di baris papan ketik, porsinya bisa
 * diedit, lalu AI menghitung kalori & protein sebelum masuk log.
 */
export default function FoodReport({ compact = false, onAdded }) {
  const { addFoods } = useApp()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const run = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    setResult(await estimateCalories(text))
    setLoading(false)
  }
  const add = () => {
    const name = text.trim().replace(/^\w/, (c) => c.toUpperCase())
    addFoods([{ name, kcal: result.kcal, protein: result.protein, fried: result.fried, friedCount: result.friedCount }], 'ai')
    onAdded?.(name)
    setResult(null)
    setText('')
  }

  return (
    <div>
      <SuggestInput
        value={text}
        onChange={(t) => {
          setText(t)
          setResult(null)
        }}
        suggestions={FOOD_SUGGEST}
        sep=" + "
        accent="nutri"
        multiline={!compact}
        onEnter={run}
        placeholder={compact ? 'Tadi makan apa?' : 'cth: nasi setengah + 2 telur rebus + tumis kangkung'}
        right={
          compact && (
            <Button variant="nutri" size="sm" onClick={run} disabled={!text.trim() || loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Hitung'}
            </Button>
          )
        }
      />
      {!compact && !result && (
        <Button variant="nutri" className="mt-3" disabled={!text.trim() || loading} onClick={run}>
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" /> AI sedang menghitung...
            </>
          ) : (
            <>
              <Sparkles size={17} /> Hitung Kalori
            </>
          )}
        </Button>
      )}
      {result && (
        <div className="animate-rise mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className={compact ? 'text-sm' : 'text-lg'}>
            ~<span className="font-semibold">{result.kcal}</span> kkal · <span className="font-semibold">{result.protein}</span> g protein
            {result.fried && <span className="text-nutri"> · ada gorengan</span>}
          </p>
          <Button variant="nutri" size="sm" onClick={add}>
            Tambahkan ke log
          </Button>
          <button onClick={() => setResult(null)} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
            Ubah porsi
          </button>
        </div>
      )}
    </div>
  )
}
