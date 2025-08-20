import { db, auth } from '../config/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...')
    
    // 測試基本連接
    const testDoc = doc(db, 'test', 'connection')
    
    // 嘗試寫入測試數據
    await setDoc(testDoc, {
      timestamp: new Date(),
      test: 'connection test'
    })
    
    console.log('✅ Firebase write test successful')
    
    // 嘗試讀取測試數據
    const snapshot = await getDoc(testDoc)
    if (snapshot.exists()) {
      console.log('✅ Firebase read test successful:', snapshot.data())
    } else {
      console.log('❌ Firebase read test failed: document does not exist')
    }
    
    return true
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error)
    return false
  }
}

export async function testAuthConnection() {
  try {
    console.log('Testing Auth connection...')
    console.log('Current user:', auth.currentUser?.uid || 'Not logged in')
    return true
  } catch (error) {
    console.error('❌ Auth connection test failed:', error)
    return false
  }
}