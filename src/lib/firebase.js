// Konfigurasi web Firebase memang publik (bukan rahasia) — keamanan diatur lewat
// Firebase Auth + Security Rules, bukan dengan menyembunyikan nilai ini.
import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCfoQxqoqXj5leVakvDhDN6ei2FiGRmJuY',
  authDomain: 'fithub-c8e99.firebaseapp.com',
  projectId: 'fithub-c8e99',
  storageBucket: 'fithub-c8e99.firebasestorage.app',
  messagingSenderId: '836823983562',
  appId: '1:836823983562:web:75aab5252c0d2e8dfb9b33',
  measurementId: 'G-E1VK68KL39',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
auth.languageCode = 'id'
export const googleProvider = new GoogleAuthProvider()
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })

isSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {})
