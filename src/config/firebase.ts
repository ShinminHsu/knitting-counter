import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableNetwork, disableNetwork, initializeFirestore, Firestore } from 'firebase/firestore'

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

// 檢測是否為移動設備
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 初始化 Firestore 並啟用離線持久化
let db: Firestore
try {
  const firestoreSettings = {
    ignoreUndefinedProperties: true, // 忽略 undefined 屬性
    cacheSizeBytes: 40 * 1024 * 1024, // 40MB 緩存
    localCache: {
      kind: 'persistent' as const
    }
  }

  // 針對移動設備的特殊設置
  if (isMobileDevice()) {
    console.log('[FIREBASE] Mobile device detected, using optimized settings')
    Object.assign(firestoreSettings, {
      experimentalForceLongPolling: true, // 移動設備使用長輪詢
      experimentalAutoDetectLongPolling: false, // 不使用自動檢測
    })
  } else {
    console.log('[FIREBASE] Desktop device detected, using standard settings')
    Object.assign(firestoreSettings, {
      experimentalForceLongPolling: false, // 桌面設備使用標準連接
      experimentalAutoDetectLongPolling: true, // 自動檢測最佳連接方式
    })
  }

  db = initializeFirestore(app, firestoreSettings)
} catch (error) {
  // 如果已經初始化，使用現有實例
  console.log('[FIREBASE] Firestore already initialized, using existing instance')
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