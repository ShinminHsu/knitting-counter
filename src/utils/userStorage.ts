/**
 * 用戶專屬的 localStorage 管理工具
 * 確保不同用戶的數據完全隔離
 */

// 生成用戶專屬的存儲鍵
export const getUserStorageKey = (userId: string, key: string): string => {
  return `user_${userId}_${key}`
}

// 獲取當前用戶的數據
export const getUserData = <T>(userId: string, key: string): T | null => {
  try {
    const storageKey = getUserStorageKey(userId, key)
    const data = localStorage.getItem(storageKey)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error(`Error getting user data for ${userId}:${key}`, error)
    return null
  }
}

// 保存用戶數據
export const setUserData = <T>(userId: string, key: string, data: T): void => {
  try {
    const storageKey = getUserStorageKey(userId, key)
    localStorage.setItem(storageKey, JSON.stringify(data))
  } catch (error) {
    console.error(`Error setting user data for ${userId}:${key}`, error)
  }
}

// 移除用戶數據
export const removeUserData = (userId: string, key: string): void => {
  try {
    const storageKey = getUserStorageKey(userId, key)
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error(`Error removing user data for ${userId}:${key}`, error)
  }
}

// 清除特定用戶的所有數據
export const clearUserData = (userId: string): void => {
  try {
    const prefix = `user_${userId}_`
    const keysToRemove: string[] = []
    
    // 找到所有該用戶的存儲鍵
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    
    // 移除所有該用戶的數據
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log(`Cleared ${keysToRemove.length} items for user ${userId}`)
  } catch (error) {
    console.error(`Error clearing user data for ${userId}`, error)
  }
}

// 清除所有用戶數據（僅在必要時使用）
export const clearAllUserData = (): void => {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('user_')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log(`Cleared all user data (${keysToRemove.length} items)`)
  } catch (error) {
    console.error('Error clearing all user data', error)
  }
}

// 獲取所有用戶 ID 列表
export const getAllUserIds = (): string[] => {
  try {
    const userIds = new Set<string>()
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('user_')) {
        const parts = key.split('_')
        if (parts.length >= 3) {
          userIds.add(parts[1]) // user_[userId]_key 中的 userId
        }
      }
    }
    
    return Array.from(userIds)
  } catch (error) {
    console.error('Error getting all user IDs', error)
    return []
  }
}