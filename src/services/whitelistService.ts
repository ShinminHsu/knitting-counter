/**
 * 白名單服務 - 從 Firestore 檢查用戶權限
 */

import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * 從 Firestore 檢查用戶是否在白名單中
 * @param email 用戶 email
 * @returns Promise<boolean> 是否在白名單中
 */
export const checkWhitelistStatus = async (email: string | null | undefined): Promise<boolean> => {
  if (!email) {
    console.log('[WHITELIST] No email provided')
    return false
  }

  try {
    const whitelistDoc = doc(db, 'whitelists', email)
    const docSnap = await getDoc(whitelistDoc)
    const isWhitelisted = docSnap.exists()
    
    console.log(`[WHITELIST] Firestore check for ${email}: ${isWhitelisted ? 'ALLOWED' : 'DENIED'}`)
    return isWhitelisted
  } catch (error) {
    console.error('[WHITELIST] Error checking whitelist status:', error)
    // 發生錯誤時，為了安全起見返回 false
    return false
  }
}

/**
 * 獲取用戶的同步模式（基於 Firestore 白名單）
 * @param email 用戶 email
 * @returns Promise<'firebase' | 'local'> 同步模式
 */
export const getUserSyncModeFromFirestore = async (email: string | null | undefined): Promise<'firebase' | 'local'> => {
  const isWhitelisted = await checkWhitelistStatus(email)
  return isWhitelisted ? 'firebase' : 'local'
}

/**
 * 開發環境繞過檢查（如果需要）
 */
export const isDevelopmentMode = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

/**
 * 開發環境下是否啟用白名單檢查
 */
const ENABLE_WHITELIST_IN_DEV = true

/**
 * 綜合檢查用戶是否可以使用 Firebase 同步
 * @param email 用戶 email
 * @returns Promise<boolean> 是否允許使用 Firebase 同步
 */
export const canUseFirebaseSync = async (email: string | null | undefined): Promise<boolean> => {
  // 開發環境下是否繞過白名單檢查
  if (isDevelopmentMode() && !ENABLE_WHITELIST_IN_DEV) {
    console.log('[WHITELIST] Development mode: bypassing whitelist check')
    return true
  }
  
  // 從 Firestore 檢查白名單
  return await checkWhitelistStatus(email)
}