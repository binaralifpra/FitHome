import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { addDays, diffDays, todayKey } from '../lib/dates'
import { currentWeek, planWeek } from '../lib/schedule'
import { buildSession, dailyTargets, friedLimit } from '../lib/coach'
import { planSessionAI, sessionKey } from '../lib/aiSession'
import { aiReady } from '../lib/groq'

const LEGACY_KEY = 'fithome-v1' // data dari versi sebelum ada login
const storageKey = (uid) => `fithome-v1-${uid}`

const INITIAL = {
  name: 'Teman',
  profile: null, // jawaban onboarding
  startedAt: null,
  history: [], // [{ date, type, title, minutes }]
  aiSessions: {}, // { 'YYYY-MM-DD': { [kunciData]: sesi } } — sesi harian susunan AI (per kombinasi data)
  conditions: [], // [{ id, avoid: ['wrist'], label, from, until }] — kondisi tubuh aktif (cedera/sakit)
  dayOverrides: {}, // { 'YYYY-MM-DD': 'workout' | 'rest' | { status, focus, intensity, label } } — ubahan manual/AI
  restCheckins: [], // tanggal check-in hari istirahat
  foodLog: {}, // { 'YYYY-MM-DD': [{ uid, name, portion, kcal, fried, friedCount, source }] }
  settings: { notifWorkout: true, notifFood: true, notifRest: false, reminderTime: '19:00' },
  chat: [], // [{ role: 'user' | 'model', text }]
}

function load(uid, defaultName) {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (raw) return { ...INITIAL, ...JSON.parse(raw) }
    // Akun pertama yang login mewarisi data lama (sebelum ada login)
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      localStorage.removeItem(LEGACY_KEY)
      return { ...INITIAL, ...JSON.parse(legacy) }
    }
  } catch {
    /* penyimpanan tidak tersedia */
  }
  return { ...INITIAL, name: defaultName || INITIAL.name }
}

// Naikkan kalau format jawaban onboarding berubah → pengguna diminta onboarding ulang
export const PROFILE_VERSION = 2

const Ctx = createContext(null)
let uidCounter = 0
const newId = () => `${Date.now().toString(36)}-${uidCounter++}`

export function AppStoreProvider({ uid, defaultName, children }) {
  const [state, setRaw] = useState(() => load(uid, defaultName))
  const [hydrated, setHydrated] = useState(false) // data cloud sudah dicek
  const [sync, setSync] = useState('loading') // 'loading' | 'cloud' | 'local'
  const lastPushed = useRef(null)
  const today = todayKey()

  // Setiap perubahan diberi cap waktu supaya versi terbaru (lokal vs cloud) yang menang
  const setState = useCallback(
    (fn) =>
      setRaw((s) => {
        const next = typeof fn === 'function' ? fn(s) : fn
        return next === s ? s : { ...next, updatedAt: Date.now() }
      }),
    [],
  )

  // Ambil data akun dari Firestore (users/{uid}). Gagal = tetap jalan dengan data lokal.
  useEffect(() => {
    let alive = true
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 7000))
    Promise.race([getDoc(doc(db, 'users', uid)), timeout])
      .then((snap) => {
        if (!alive) return
        const remote = snap.exists() ? snap.data() : null
        setRaw((local) => {
          if (remote && (remote.updatedAt || 0) > (local.updatedAt || 0)) {
            lastPushed.current = remote.updatedAt
            return { ...INITIAL, ...remote }
          }
          return local
        })
        setSync('cloud')
      })
      .catch(() => alive && setSync('local'))
      .finally(() => alive && setHydrated(true))
    return () => {
      alive = false
    }
  }, [uid])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(uid), JSON.stringify(state))
    } catch {
      /* penyimpanan tidak tersedia — aplikasi tetap jalan tanpa persistensi */
    }
    if (!hydrated || sync !== 'cloud' || lastPushed.current === state.updatedAt) return
    const t = setTimeout(() => {
      setDoc(doc(db, 'users', uid), state)
        .then(() => (lastPushed.current = state.updatedAt))
        .catch(() => setSync('local'))
    }, 1200)
    return () => clearTimeout(t)
  }, [state, uid, hydrated, sync])

  const actions = useMemo(
    () => ({
      saveProfile: (profile) =>
        setState((s) => ({ ...s, profile: { ...profile, v: PROFILE_VERSION }, startedAt: s.startedAt ?? todayKey() })),
      updateAnswer: (id, value) =>
        setState((s) => ({ ...s, profile: { ...s.profile, [id]: value } })),
      setName: (name) => setState((s) => ({ ...s, name })),
      completeSession: (session) =>
        setState((s) => ({
          ...s,
          history: [
            ...s.history.filter((h) => !(h.date === todayKey() && h.type === session.type)),
            { date: todayKey(), type: session.type, title: session.title, minutes: session.minutes, exercises: session.exercises.map((e) => e.id) },
          ],
        })),
      // Kondisi tubuh (mis. pergelangan tangan sakit 3 hari) — dihormati jadwal & penyusun gerakan
      addCondition: (c) =>
        setState((s) => ({
          ...s,
          conditions: [...(s.conditions || []).filter((x) => x.until >= todayKey()), { id: newId(), ...c }],
        })),
      removeCondition: (id) => setState((s) => ({ ...s, conditions: (s.conditions || []).filter((c) => c.id !== id) })),
      endCondition: (id) =>
        setState((s) => ({
          ...s,
          conditions: (s.conditions || []).map((c) => (c.id === id ? { ...c, until: addDays(todayKey(), -1) } : c)),
        })),
      // Atur satu hari: undefined = otomatis, 'workout' | 'rest' | { status, focus, intensity, label }
      setDayOverride: (date, value) =>
        setState((s) => {
          const next = { ...(s.dayOverrides || {}) }
          if (value) next[date] = value
          else delete next[date]
          return { ...s, dayOverrides: next }
        }),
      // Ganti seluruh override satu minggu (dipakai "Lapor ke AI"); map = { indeksHari: nilai }
      setWeekOverrides: (monday, map) =>
        setState((s) => {
          const next = { ...(s.dayOverrides || {}) }
          for (let i = 0; i < 7; i++) {
            const d = addDays(monday, i)
            if (map[i]) next[d] = map[i]
            else delete next[d]
          }
          return { ...s, dayOverrides: next }
        }),
      checkInRest: () =>
        setState((s) => ({ ...s, restCheckins: [...new Set([...s.restCheckins, todayKey()])] })),
      addFoods: (items, source = 'chip') =>
        setState((s) => {
          const k = todayKey()
          const entries = items.map((it) => ({
            uid: newId(),
            source,
            friedCount: it.friedCount ?? (it.fried ? 1 : 0),
            ...it,
          }))
          return { ...s, foodLog: { ...s.foodLog, [k]: [...(s.foodLog[k] || []), ...entries] } }
        }),
      removeFood: (id) =>
        setState((s) => {
          const k = todayKey()
          return { ...s, foodLog: { ...s.foodLog, [k]: (s.foodLog[k] || []).filter((f) => f.uid !== id) } }
        }),
      removeLastFried: () =>
        setState((s) => {
          const k = todayKey()
          const list = [...(s.foodLog[k] || [])]
          const idx = list.findLastIndex((f) => f.friedCount > 0)
          if (idx === -1) return s
          if (list[idx].friedCount > 1) list[idx] = { ...list[idx], friedCount: list[idx].friedCount - 1 }
          else list.splice(idx, 1)
          return { ...s, foodLog: { ...s.foodLog, [k]: list } }
        }),
      pushChat: (msg) => setState((s) => ({ ...s, chat: [...(s.chat || []), msg].slice(-40) })),
      setLastChat: (text) =>
        setState((s) => {
          const chat = [...(s.chat || [])]
          chat[chat.length - 1] = { ...chat[chat.length - 1], text }
          return { ...s, chat }
        }),
      clearChat: () => setState((s) => ({ ...s, chat: [] })),
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      resetAll: () => setState((s) => ({ ...INITIAL, name: s.name })),
      // Isi data contoh 3 minggu terakhir untuk demo/presentasi
      seedDemo: () =>
        setState((s) => {
          const t = todayKey()
          const history = []
          const restCheckins = []
          const foodLog = { ...s.foodLog }
          for (let i = 20; i >= 1; i--) {
            const d = addDays(t, -i)
            if (i % 7 === 3) continue // beberapa hari kosong, biar realistis
            if (i % 2 === 0) history.push({ date: d, type: 'full', title: 'Full Body Kamar Kos', minutes: 15 })
            else restCheckins.push(d)
            foodLog[d] = [{ uid: newId(), name: 'Nasi + lauk', portion: '1 piring', kcal: 1800, friedCount: i % 3 }]
          }
          return { ...s, history, restCheckins, foodLog, startedAt: addDays(t, -20) }
        }),
    }),
    [setState],
  )

  const derived = useMemo(() => {
    const { profile, history, restCheckins, foodLog, startedAt, dayOverrides = {}, conditions = [] } = state
    const doneByDate = Object.fromEntries(history.filter((h) => h.type !== 'mobility' && h.type !== 'core').map((h) => [h.date, h.type]))
    const { week } = currentWeek(startedAt, today)
    // Jadwal minggu program ke-n (dipakai Programs & Home)
    const weekPlan = (n) => planWeek({ n, profile, startedAt, today, dayOverrides, done: doneByDate, conditions })
    // Simulasi jadwal dengan override minggu ke-n diganti (untuk validasi hasil AI)
    const previewWeek = (n, monday, map, extraConditions = []) => {
      const merged = { ...dayOverrides }
      for (let i = 0; i < 7; i++) {
        const d = addDays(monday, i)
        if (map[i]) merged[d] = map[i]
        else delete merged[d]
      }
      return planWeek({ n, profile, startedAt, today, dayOverrides: merged, done: doneByDate, conditions: [...conditions, ...extraConditions] })
    }
    const thisWeek = weekPlan(week)
    const todayPlan = thisWeek.days.find((d) => d.date === today)
    const doneToday = history.filter((h) => h.date === today)

    // Sesi untuk satu hari jadwal: pakai susunan AI kalau ada & datanya masih sama, kalau tidak pakai template rotasi
    const sessionFor = (day) => {
      if (!profile) return null
      const type = day?.status === 'workout' ? day.type : 'mobility'
      if (type === 'mobility') return buildSession(profile, 'mobility', day?.date || today, { minutes: 10 })
      const base = buildSession(profile, type, day.date, { focus: day.focus, intensity: day.intensity, label: day.label, variant: day.variant, avoid: day.avoid })
      return state.aiSessions?.[day.date]?.[sessionKey(profile, day)] || base
    }
    const todaySession = sessionFor(todayPlan)

    // Streak: hari berturut-turut dengan aktivitas (latihan, check-in istirahat, atau lapor makan)
    const active = new Set([
      ...history.map((h) => h.date),
      ...restCheckins,
      ...Object.entries(foodLog).filter(([, v]) => v.length).map(([k]) => k),
    ])
    let streak = 0
    let cursor = active.has(today) ? today : addDays(today, -1)
    while (active.has(cursor)) {
      streak++
      cursor = addDays(cursor, -1)
    }

    const foodsToday = foodLog[today] || []
    const kcalToday = foodsToday.reduce((a, f) => a + f.kcal, 0)
    const friedToday = foodsToday.reduce((a, f) => a + (f.friedCount || 0), 0)
    const proteinToday = Math.round(foodsToday.reduce((a, f) => a + (Number(f.protein) || 0), 0))

    return {
      today,
      week,
      weekPlan,
      previewWeek,
      sessionFor,
      activeConditions: conditions.filter((c) => c.from <= today && today <= c.until),
      thisWeek,
      todayPlan,
      todaySession,
      doneToday,
      isRestDay: todayPlan?.status === 'rest' && doneToday.length === 0,
      restCheckedIn: restCheckins.includes(today),
      streak,
      activeToday: active.has(today),
      foodsToday,
      kcalToday,
      friedToday,
      proteinToday,
      targets: dailyTargets(profile),
      friedMax: friedLimit(startedAt, today),
    }
  }, [state, today])

  // ── Sesi harian susunan AI ───────────────────────────────────────────
  const [aiStatus, setAiStatus] = useState({}) // { tanggal: 'loading' | 'ok' | 'error' }
  const stateRef = useRef(state)
  const inflight = useRef(new Set())
  useEffect(() => {
    stateRef.current = state
  })

  const requestAiSession = useCallback(
    async (day, { force = false } = {}) => {
      const st = stateRef.current
      const profile = st.profile
      if (!aiReady || !profile || day?.status !== 'workout') return
      const key = sessionKey(profile, day)
      if (!force && st.aiSessions?.[day.date]?.[key]) return
      const id = `${day.date}|${key}|${force}`
      if (inflight.current.has(id)) return
      inflight.current.add(id)
      setAiStatus((a) => ({ ...a, [day.date]: 'loading' }))
      try {
        const base = buildSession(profile, day.type, day.date, { focus: day.focus, intensity: day.intensity, variant: day.variant, avoid: day.avoid })
        const recent = (st.history || []).filter((h) => h.date < day.date).slice(-3)
        // sesi lain yang sudah disusun dalam ±6 hari (supaya hari FBW berikutnya tidak kembar)
        const others = Object.entries(st.aiSessions || {})
          .filter(([d]) => d !== day.date && Math.abs(diffDays(d, day.date)) <= 6)
          .flatMap(([d, byKey]) => Object.values(byKey || {}).filter((v) => Array.isArray(v?.exercises)).slice(-1).map((v) => ({ date: d, exercises: v.exercises.map((e) => e.id) })))
        const session = await planSessionAI({ profile, day, recent, others, base })
        const cutoff = addDays(todayKey(), -14)
        setState((s) => ({
          ...s,
          aiSessions: {
            ...Object.fromEntries(Object.entries(s.aiSessions || {}).filter(([d]) => d >= cutoff)),
            // simpan per kunci data → jawaban yang datang belakangan tidak menimpa kombinasi lain
            [day.date]: Object.fromEntries([...Object.entries(s.aiSessions?.[day.date] || {}).filter(([k]) => k !== key).slice(-3), [key, session]]),
          },
        }))
        setAiStatus((a) => ({ ...a, [day.date]: 'ok' }))
      } catch {
        setAiStatus((a) => ({ ...a, [day.date]: 'error' })) // tetap pakai template rotasi
      } finally {
        inflight.current.delete(id)
      }
    },
    [setState],
  )

  // Otomatis: hari latihan yang belum punya susunan AI (atau datanya berubah) → minta AI menyusun
  const todayPlan = derived.todayPlan
  const todayKeyStr = state.profile && todayPlan?.status === 'workout' ? sessionKey(state.profile, todayPlan) : null
  const todayDone = derived.doneToday.length > 0
  useEffect(() => {
    if (hydrated && todayKeyStr && !todayDone) requestAiSession(todayPlan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, todayKeyStr, todayDone])

  return (
    <Ctx.Provider value={{ ...state, ...derived, ...actions, hydrated, sync, aiStatus, requestAiSession }}>{children}</Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
