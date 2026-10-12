import { useEffect, useRef, useState } from 'react'

/**
 * Hitung mundur yang bisa dijeda/dilanjutkan. Mulai otomatis saat `seconds` di-set
 * (pakai `key` berbeda di komponen pemanggil untuk memulai ulang).
 */
export function useCountdown(seconds, { onDone, autoStart = true } = {}) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(autoStart && seconds > 0)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(t)
          setRunning(false)
          setTimeout(() => doneRef.current?.(), 0)
          return 0
        }
        return l - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running])

  return {
    left,
    running,
    pause: () => setRunning(false),
    resume: () => left > 0 && setRunning(true),
    toggle: () => setRunning((r) => (left > 0 ? !r : false)),
  }
}
