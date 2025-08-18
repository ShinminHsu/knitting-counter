import { StateCreator, StoreMutatorIdentifier } from 'zustand'
import { getUserData, setUserData, removeUserData } from './userStorage'

// 擴展用戶專屬持久化中間件的類型
type UserPersist<T, Mps extends [StoreMutatorIdentifier, unknown][] = [], Mcs extends [StoreMutatorIdentifier, unknown][] = []> = (
  config: StateCreator<T, Mps, Mcs>,
  options: {
    name: string
    getUserId: () => string | null
    partialize?: (state: T) => Partial<T>
    serialize?: (state: Partial<T>) => string
    deserialize?: (str: string) => Partial<T>
  }
) => StateCreator<T, Mps, Mcs>

// 日期序列化處理
const serializeWithDates = (obj: any): string => {
  return JSON.stringify(obj, (_key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() }
    }
    return value
  })
}

const deserializeWithDates = (str: string): any => {
  return JSON.parse(str, (_key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value)
    }
    return value
  })
}

export const userPersist: UserPersist<any> = (config, options) => (set, get, api) => {
  const {
    name,
    getUserId,
    partialize = (state) => state,
    serialize = serializeWithDates,
    deserialize = deserializeWithDates
  } = options

  // 從存儲中加載用戶數據
  const loadUserData = (userId: string) => {
    try {
      const data = getUserData(userId, name)
      if (data) {
        const deserializedData = typeof data === 'string' ? deserialize(data) : data
        api.setState(deserializedData, true)
      }
    } catch (error) {
      console.error(`Failed to load user data for ${userId}:`, error)
    }
  }

  // 保存用戶數據
  const saveUserData = () => {
    const userId = getUserId()
    if (!userId) return

    try {
      const state = partialize(api.getState())
      const serializedData = serialize(state)
      setUserData(userId, name, serializedData)
    } catch (error) {
      console.error(`Failed to save user data for ${userId}:`, error)
    }
  }

  // 清除用戶數據
  const clearUserData = () => {
    const userId = getUserId()
    if (!userId) return

    try {
      removeUserData(userId, name)
    } catch (error) {
      console.error(`Failed to clear user data for ${userId}:`, error)
    }
  }

  // 包裝 setState 來自動保存
  const wrappedSet = (partial: any, replace?: boolean) => {
    set(partial, replace)
    // 延遲保存以避免過於頻繁的寫入
    setTimeout(saveUserData, 0)
  }

  // 初始化時加載當前用戶數據
  const currentUserId = getUserId()
  if (currentUserId) {
    loadUserData(currentUserId)
  }

  // 創建增強的 API
  const enhancedApi = {
    ...api,
    setState: wrappedSet,
    loadUserData,
    saveUserData,
    clearUserData
  }

  return config(wrappedSet, get, enhancedApi)
}