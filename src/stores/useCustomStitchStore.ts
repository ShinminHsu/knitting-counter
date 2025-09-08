import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CustomStitchPattern } from '../types'
import { generateId } from '../utils'
import { handleAsyncError } from './useBaseStore'
import { useAuthStore } from './useAuthStore'
import { logger } from '../utils/logger'

interface CustomStitchStoreState {
  customStitches: CustomStitchPattern[]
  isLoading: boolean
}

interface CustomStitchStoreActions {
  // 自定義針法管理
  createCustomStitch: (name: string, symbol: string, englishName: string, description?: string) => Promise<CustomStitchPattern | null>
  updateCustomStitch: (stitchId: string, updates: Partial<CustomStitchPattern>) => Promise<void>
  deleteCustomStitch: (stitchId: string) => Promise<void>
  duplicateCustomStitch: (stitchId: string) => Promise<CustomStitchPattern | null>
  
  // 使用和統計
  useCustomStitch: (stitchId: string) => Promise<CustomStitchPattern | null>
  incrementUseCount: (stitchId: string) => Promise<void>
  updateLastUsed: (stitchId: string) => Promise<void>
  
  // 查詢功能
  getCustomStitchById: (stitchId: string) => CustomStitchPattern | null
  getRecentlyUsedCustomStitches: (limit?: number) => CustomStitchPattern[]
  getPopularCustomStitches: (limit?: number) => CustomStitchPattern[]
  searchCustomStitches: (query: string) => CustomStitchPattern[]
  
  // 批量操作
  importCustomStitches: (stitches: CustomStitchPattern[]) => Promise<void>
  exportCustomStitches: () => CustomStitchPattern[]
  clearAllCustomStitches: () => Promise<void>
  
  // 載入狀態
  setLoading: (loading: boolean) => void
}

interface CustomStitchStore extends CustomStitchStoreState, CustomStitchStoreActions {}

// 動態獲取存儲 key，根據用戶身份
const getStorageKey = () => {
  const authState = useAuthStore.getState()
  
  if (authState.userType === 'guest') {
    return 'custom-stitch-store-guest'
  }
  
  if (authState.user?.uid) {
    return `custom-stitch-store-${authState.user.uid}`
  }
  
  // 未初始化時的臨時 key
  return 'custom-stitch-store-temp'
}

export const useCustomStitchStore = create<CustomStitchStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      customStitches: [],
      isLoading: false,

      // 自定義針法管理
      createCustomStitch: async (name, symbol, englishName, description = '') => {
        try {
          set({ isLoading: true })
          
          // 檢查是否已存在相同名稱和符號的針法
          const existingStitch = get().customStitches.find(
            stitch => stitch.name.trim() === name.trim() && stitch.symbol.trim() === symbol.trim()
          )
          
          if (existingStitch) {
            set({ isLoading: false })
            throw new Error('已存在相同名稱和符號的自定義針法')
          }

          const newCustomStitch: CustomStitchPattern = {
            id: generateId(),
            name: name.trim(),
            symbol: symbol.trim(),
            englishName: englishName.trim(),
            description: description.trim(),
            createdDate: new Date(),
            useCount: 0
          }

          set(state => ({
            customStitches: [...state.customStitches, newCustomStitch],
            isLoading: false
          }))

          logger.debug('Created custom stitch:', newCustomStitch.name)
          return newCustomStitch
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to create custom stitch')
          return null
        }
      },

      updateCustomStitch: async (stitchId, updates) => {
        try {
          set({ isLoading: true })
          
          set(state => ({
            customStitches: state.customStitches.map(stitch =>
              stitch.id === stitchId
                ? { ...stitch, ...updates }
                : stitch
            ),
            isLoading: false
          }))

          logger.debug('Updated custom stitch:', stitchId)
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to update custom stitch')
        }
      },

      deleteCustomStitch: async (stitchId) => {
        try {
          set({ isLoading: true })
          
          set(state => ({
            customStitches: state.customStitches.filter(stitch => stitch.id !== stitchId),
            isLoading: false
          }))

          logger.debug('Deleted custom stitch:', stitchId)
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to delete custom stitch')
        }
      },

      duplicateCustomStitch: async (stitchId) => {
        try {
          set({ isLoading: true })
          
          const sourceStitch = get().customStitches.find(s => s.id === stitchId)
          if (!sourceStitch) {
            logger.error('duplicateCustomStitch: Source stitch not found:', stitchId)
            set({ isLoading: false })
            return null
          }

          const duplicatedStitch: CustomStitchPattern = {
            ...sourceStitch,
            id: generateId(),
            name: `${sourceStitch.name} (複製)`,
            createdDate: new Date(),
            useCount: 0,
            lastUsed: undefined
          }

          set(state => ({
            customStitches: [...state.customStitches, duplicatedStitch],
            isLoading: false
          }))

          logger.debug('Duplicated custom stitch:', sourceStitch.name)
          return duplicatedStitch
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to duplicate custom stitch')
          return null
        }
      },

      // 使用和統計
      useCustomStitch: async (stitchId) => {
        try {
          const stitch = get().customStitches.find(s => s.id === stitchId)
          if (!stitch) {
            logger.error('useCustomStitch: Custom stitch not found:', stitchId)
            return null
          }

          // 增加使用次數和更新最後使用時間
          await get().incrementUseCount(stitchId)
          await get().updateLastUsed(stitchId)

          logger.debug('Used custom stitch:', stitch.name)
          return stitch
        } catch (error) {
          handleAsyncError(error, 'Failed to use custom stitch')
          return null
        }
      },

      incrementUseCount: async (stitchId) => {
        try {
          set(state => ({
            customStitches: state.customStitches.map(stitch =>
              stitch.id === stitchId
                ? { ...stitch, useCount: stitch.useCount + 1 }
                : stitch
            )
          }))
        } catch (error) {
          handleAsyncError(error, 'Failed to increment use count')
        }
      },

      updateLastUsed: async (stitchId) => {
        try {
          set(state => ({
            customStitches: state.customStitches.map(stitch =>
              stitch.id === stitchId
                ? { ...stitch, lastUsed: new Date() }
                : stitch
            )
          }))
        } catch (error) {
          handleAsyncError(error, 'Failed to update last used')
        }
      },

      // 查詢功能
      getCustomStitchById: (stitchId) => {
        return get().customStitches.find(stitch => stitch.id === stitchId) || null
      },


      getRecentlyUsedCustomStitches: (limit = 10) => {
        return get().customStitches
          .filter(stitch => stitch.lastUsed)
          .sort((a, b) => {
            const aDate = a.lastUsed ? a.lastUsed.getTime() : 0
            const bDate = b.lastUsed ? b.lastUsed.getTime() : 0
            return bDate - aDate
          })
          .slice(0, limit)
      },

      getPopularCustomStitches: (limit = 10) => {
        return get().customStitches
          .filter(stitch => stitch.useCount > 0)
          .sort((a, b) => b.useCount - a.useCount)
          .slice(0, limit)
      },

      searchCustomStitches: (query) => {
        const lowercaseQuery = query.toLowerCase().trim()
        if (!lowercaseQuery) return get().customStitches

        return get().customStitches.filter(stitch =>
          stitch.name.toLowerCase().includes(lowercaseQuery) ||
          stitch.symbol.toLowerCase().includes(lowercaseQuery) ||
          stitch.englishName.toLowerCase().includes(lowercaseQuery) ||
          stitch.description?.toLowerCase().includes(lowercaseQuery)
        )
      },

      // 批量操作
      importCustomStitches: async (stitches) => {
        try {
          set({ isLoading: true })
          
          // 為匯入的針法生成新 ID 以避免衝突
          const importedStitches = stitches.map(stitch => ({
            ...stitch,
            id: generateId(),
            createdDate: new Date(),
            useCount: 0,
            lastUsed: undefined
          }))

          set(state => ({
            customStitches: [...state.customStitches, ...importedStitches],
            isLoading: false
          }))

          logger.debug('Imported', importedStitches.length, 'custom stitches')
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to import custom stitches')
        }
      },

      exportCustomStitches: () => {
        // 回傳深拷貝以防止修改原始資料
        return get().customStitches.map(stitch => ({ ...stitch }))
      },

      clearAllCustomStitches: async () => {
        try {
          set({ isLoading: true })
          
          set({
            customStitches: [],
            isLoading: false
          })

          logger.debug('Cleared all custom stitches')
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to clear custom stitches')
        }
      },

      // 載入狀態
      setLoading: (loading) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: getStorageKey(),
      version: 1,
      // 自定義序列化處理 Date 物件
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          state: {
            ...state.state,
            customStitches: state.state.customStitches.map(stitch => ({
              ...stitch,
              createdDate: stitch.createdDate.toISOString(),
              lastUsed: stitch.lastUsed?.toISOString()
            }))
          }
        })
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str)
        return {
          ...parsed,
          state: {
            ...parsed.state,
            customStitches: parsed.state.customStitches.map((stitch: {
              id: string
              name: string
              symbol: string
              englishName: string
              description?: string
              createdDate: string
              lastUsed?: string
              useCount: number
            }) => ({
              ...stitch,
              createdDate: new Date(stitch.createdDate),
              lastUsed: stitch.lastUsed ? new Date(stitch.lastUsed) : undefined
            }))
          }
        }
      }
    }
  )
)

// 工具函數：驗證自定義針法
export const validateCustomStitch = (stitch: CustomStitchPattern): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!stitch.name.trim()) {
    errors.push('針法名稱不能為空')
  }

  if (!stitch.symbol.trim()) {
    errors.push('針法符號不能為空')
  }

  if (stitch.name.length > 20) {
    errors.push('針法名稱不能超過20個字符')
  }

  if (stitch.symbol.length > 3) {
    errors.push('針法符號不能超過3個字符')
  }

  if (!stitch.englishName.trim()) {
    errors.push('英文縮寫不能為空')
  }

  if (stitch.englishName.length > 10) {
    errors.push('英文縮寫不能超過10個字符')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 工具函數：獲取針法預覽
export const getCustomStitchPreview = (stitch: CustomStitchPattern): string => {
  return `${stitch.symbol} ${stitch.name} (${stitch.englishName})`
}