import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

const ERRORS = {
  'auth/invalid-email': 'Format email belum benar.',
  'auth/missing-password': 'Password belum diisi.',
  'auth/weak-password': 'Password minimal 6 karakter.',
  'auth/email-already-in-use': 'Email ini sudah terdaftar. Coba masuk saja.',
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/wrong-password': 'Email atau password salah.',
  'auth/user-not-found': 'Akun dengan email ini belum ada. Daftar dulu, yuk.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  'auth/network-request-failed': 'Koneksi internet bermasalah. Coba lagi.',
  'auth/popup-closed-by-user': 'Jendela login Google ditutup sebelum selesai.',
  'auth/cancelled-popup-request': 'Jendela login Google ditutup sebelum selesai.',
  'auth/operation-not-allowed': 'Metode login ini belum diaktifkan di Firebase Console (Authentication → Sign-in method).',
  'auth/unauthorized-domain': 'Domain ini belum diizinkan di Firebase Console (Authentication → Settings → Authorized domains).',
}

export const authMessage = (e) => ERRORS[e?.code] || 'Terjadi kesalahan. Coba lagi sebentar lagi.'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = masih memeriksa sesi
  // Saat mendaftar, tahan update user sampai nama tersimpan supaya sapaan langsung benar
  const registering = useRef(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!registering.current) setUser(u ?? null)
      }),
    [],
  )

  const actions = useMemo(
    () => ({
      loginEmail: (email, password) => signInWithEmailAndPassword(auth, email.trim(), password),
      registerEmail: async (name, email, password) => {
        registering.current = true
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
          await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {})
          return cred
        } finally {
          registering.current = false
          setUser(auth.currentUser)
        }
      },
      loginGoogle: async () => {
        try {
          return await signInWithPopup(auth, googleProvider)
        } catch (e) {
          if (e.code === 'auth/popup-blocked') return signInWithRedirect(auth, googleProvider)
          throw e
        }
      },
      resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
      logout: () => signOut(auth),
    }),
    [],
  )

  return <Ctx.Provider value={{ user, loading: user === undefined, ...actions }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
