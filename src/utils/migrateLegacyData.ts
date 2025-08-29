/**
 * 遷移和清理舊的 localStorage 數據
 */

import { useAuthStore } from '../stores/useAuthStore'

// 清理舊的共享 localStorage 數據
export const cleanupLegacyData = (): void => {
  try {
    // 移除舊的共享存儲
    const legacyKeys = [
      'knitting-counter-storage',
      'auth-storage'
    ]
    
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`清理舊的共享數據: ${key}`)
        localStorage.removeItem(key)
      }
    })
    
    // 清理任何不符合新格式的舊數據
    const keysToCheck: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !key.startsWith('user_') && 
          (key.includes('knitting') || key.includes('auth'))) {
        keysToCheck.push(key)
      }
    }
    
    keysToCheck.forEach(key => {
      console.log(`清理舊格式數據: ${key}`)
      localStorage.removeItem(key)
    })
    
    if (legacyKeys.length > 0 || keysToCheck.length > 0) {
      console.log('已清理舊的 localStorage 數據')
    }
  } catch (error) {
    console.error('清理舊數據時發生錯誤:', error)
  }
}

// 遷移現有用戶數據到新格式（如果需要）
export const migrateLegacyUserData = (userId: string): void => {
  try {
    const legacyData = localStorage.getItem('knitting-counter-storage')
    if (legacyData && userId) {
      console.log(`為用戶 ${userId} 遷移舊數據`)
      
      // 將舊數據遷移到新的用戶專屬格式
      const newKey = `user_${userId}_knitting-counter-storage`
      localStorage.setItem(newKey, legacyData)
      
      // 移除舊數據
      localStorage.removeItem('knitting-counter-storage')
      console.log('數據遷移完成')
    }
  } catch (error) {
    console.error('遷移用戶數據時發生錯誤:', error)
  }
}

// 開發環境下的調試工具
export const debugStorageInfo = (): void => {
  if (!import.meta.env.DEV) return
  
  console.group('🔍 LocalStorage 調試信息')
  
  const { user } = useAuthStore.getState()
  console.log('當前用戶:', user?.uid || '無')
  
  const allKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) allKeys.push(key)
  }
  
  const userKeys = allKeys.filter(key => key.startsWith('user_'))
  const otherKeys = allKeys.filter(key => !key.startsWith('user_'))
  
  console.log('用戶專屬數據:', userKeys)
  console.log('其他數據:', otherKeys)
  console.log('總計:', allKeys.length, '項目')
  
  // 分析用戶數據分佈
  const userDataByUser: Record<string, string[]> = {}
  userKeys.forEach(key => {
    const parts = key.split('_')
    if (parts.length >= 3) {
      const userId = parts[1]
      if (!userDataByUser[userId]) {
        userDataByUser[userId] = []
      }
      userDataByUser[userId].push(key)
    }
  })
  
  console.log('按用戶分組的數據:', userDataByUser)
  console.groupEnd()
}