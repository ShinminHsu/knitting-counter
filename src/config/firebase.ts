import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableNetwork, disableNetwork, initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig)

// 初始化服務
export const auth = getAuth(app)

// 初始化 Firestore 並啟用離線持久化
let db: any
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // 為移動設備優化
  })
} catch (error) {
  // 如果已經初始化，使用現有實例
  db = getFirestore(app)
}
export { db }

export const googleProvider = new GoogleAuthProvider()

// 離線/在線網絡狀態管理
export const enableFirestoreNetwork = () => enableNetwork(db)
export const disableFirestoreNetwork = () => disableNetwork(db)

export default app