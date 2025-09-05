import { db, auth } from '../config/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

import { logger } from './logger'
export async function testFirebaseConnection() {
  try {
    logger.debug('Testing Firebase connection...')
    
    // 測試基本連接
    const testDoc = doc(db, 'test', 'connection')
    
    // 嘗試寫入測試數據
    await setDoc(testDoc, {
      timestamp: new Date(),
      test: 'connection test'
    })
    
    logger.debug('✅ Firebase write test successful')
    
    // 嘗試讀取測試數據
    const snapshot = await getDoc(testDoc)
    if (snapshot.exists()) {
      logger.debug('✅ Firebase read test successful:', snapshot.data())
    } else {
      logger.debug('❌ Firebase read test failed: document does not exist')
    }
    
    return true
  } catch (error) {
    logger.error('❌ Firebase connection test failed:', error)
    return false
  }
}

export async function testAuthConnection() {
  try {
    logger.debug('Testing Auth connection...')
    logger.debug('Current user:', auth.currentUser?.uid || 'Not logged in')
    return true
  } catch (error) {
    logger.error('❌ Auth connection test failed:', error)
    return false
  }
}