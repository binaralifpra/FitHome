import { useEffect, useState } from 'react'

/** Hitung mundur rest-lock. Berbasis waktu akhir, jadi tetap akurat walau tab berpindah. */
export function useRestTimer(seconds = 60, onDone) {
  const [until, setUntil] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!until) return
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= until) {
        clearInterval(t)
        setUntil(null)
        onDone?.()
      }
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until])

  const left = until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0
  return {
    locked: until !== null,
    left,
    start: () => {
      const n = Date.now()
      setNow(n)
      setUntil(n + seconds * 1000)
    },
  }
}
