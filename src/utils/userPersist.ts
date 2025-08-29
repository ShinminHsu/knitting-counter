import { StateCreator } from 'zustand'
import { getUserData, setUserData, removeUserData } from './userStorage'
import { SerializedDate, SerializableValue } from '../types'


// 日期序列化處理
const serializeWithDates = <T>(obj: T): string => {
  return JSON.stringify(obj, (_key, value: unknown): SerializableValue => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() } as SerializedDate
    }
    return value as SerializableValue
  })
}

const deserializeWithDates = <T>(str: string): T => {
  return JSON.parse(str, (_key, value: unknown): unknown => {
    if (value && typeof value === 'object' && value !== null) {
      const typedValue = value as Record<string, unknown>
      if (typedValue.__type === 'Date' && typeof typedValue.value === 'string') {
        return new Date(typedValue.value)
      }
    }
    return value
  }) as T
}

export const userPersist = <T>(config: StateCreator<T, [], []>, options: {
  name: string
  getUserId: () => string | null
  partialize?: (state: T) => Partial<T>
  serialize?: <S>(state: S) => string
  deserialize?: <S>(str: string) => S
}): StateCreator<T, [], []> => (set, get, api) => {
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
        api.setState(deserializedData as Partial<T>, true)
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
  const wrappedSet = (
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: boolean
  ) => {
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