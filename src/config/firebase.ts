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
    experimentalForceLongPolling: false, // 先嘗試標準連接
    experimentalAutoDetectLongPolling: true, // 自動檢測最佳連接方式
    ignoreUndefinedProperties: true, // 忽略 undefined 屬性
    cacheSizeBytes: 40 * 1024 * 1024, // 40MB 緩存
    localCache: {
      kind: 'persistent'
    }
  })
} catch (error) {
  // 如果已經初始化，使用現有實例
  console.log('Firestore already initialized, using existing instance')
  db = getFirestore(app)
}
export { db }

export const googleProvider = new GoogleAuthProvider()

// 離線/在線網絡狀態管理
export const enableFirestoreNetwork = async () => {
  try {
    await enableNetwork(db)
    console.log('Firestore network enabled')
  } catch (error) {
    console.log('Failed to enable Firestore network:', error)
  }
}

export const disableFirestoreNetwork = async () => {
  try {
    await disableNetwork(db)
    console.log('Firestore network disabled')
  } catch (error) {
    console.log('Failed to disable Firestore network:', error)
  }
}

export default app