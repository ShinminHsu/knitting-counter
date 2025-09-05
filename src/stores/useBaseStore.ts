import { create } from 'zustand'

import { logger } from '../utils/logger'
// Base store interface for common state and actions
export interface BaseStoreState {
  isLoading: boolean
  error: string | null
  isLocallyUpdating: boolean
  lastLocalUpdateTime: Date | null
  recentLocalChanges: Set<string>
}

export interface BaseStoreActions {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLocallyUpdating: (updating: boolean) => void
  setLastLocalUpdateTime: (time: Date | null) => void
  addRecentLocalChange: (id: string) => void
  removeRecentLocalChange: (id: string) => void
  clearRecentLocalChanges: () => void
  hasRecentLocalChange: (id: string) => boolean
}

export interface BaseStore extends BaseStoreState, BaseStoreActions {}

// Create the base store
export const useBaseStore = create<BaseStore>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  isLocallyUpdating: false,
  lastLocalUpdateTime: null,
  recentLocalChanges: new Set<string>(),

  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setLocallyUpdating: (updating) => set({ isLocallyUpdating: updating }),
  
  setLastLocalUpdateTime: (time) => set({ lastLocalUpdateTime: time }),
  
  addRecentLocalChange: (id) => set(state => ({
    recentLocalChanges: new Set(state.recentLocalChanges).add(id)
  })),
  
  removeRecentLocalChange: (id) => set(state => {
    const newSet = new Set(state.recentLocalChanges)
    newSet.delete(id)
    return { recentLocalChanges: newSet }
  }),
  
  clearRecentLocalChanges: () => set({ recentLocalChanges: new Set<string>() }),
  
  hasRecentLocalChange: (id) => {
    const { recentLocalChanges } = get()
    return recentLocalChanges.has(id)
  }
}))

// Common error handling utilities
export const handleAsyncError = (error: unknown, context: string) => {
  logger.error('[${context}] Error:', error)
  const errorMessage = error instanceof Error ? error.message : '未知錯誤'
  useBaseStore.getState().setError(`${context}: ${errorMessage}`)
}

// Common loading wrapper
export const withLoading = async <T>(
  operation: () => Promise<T>,
  context: string = 'Operation'
): Promise<T | null> => {
  const baseStore = useBaseStore.getState()
  
  try {
    baseStore.setLoading(true)
    baseStore.setError(null)
    
    const result = await operation()
    return result
  } catch (error) {
    handleAsyncError(error, context)
    return null
  } finally {
    baseStore.setLoading(false)
  }
}

// Common local update wrapper with retry mechanism
export const withLocalUpdate = async <T>(
  operation: () => Promise<T>,
  entityId: string,
  context: string = 'Local Update'
): Promise<T | null> => {
  const baseStore = useBaseStore.getState()
  
  try {
    baseStore.setLocallyUpdating(true)
    baseStore.setLastLocalUpdateTime(new Date())
    baseStore.addRecentLocalChange(entityId)
    baseStore.setError(null)
    
    const result = await operation()
    
    // Schedule cleanup of recent change flag
    setTimeout(() => {
      baseStore.removeRecentLocalChange(entityId)
    }, 5000) // 5 seconds protection window
    
    return result
  } catch (error) {
    handleAsyncError(error, context)
    return null
  } finally {
    baseStore.setLocallyUpdating(false)
  }
}

// Utility to check if system is busy
export const isSystemBusy = (): boolean => {
  const { isLoading, isLocallyUpdating } = useBaseStore.getState()
  return isLoading || isLocallyUpdating
}

// Utility to clear all errors
export const clearErrors = (): void => {
  useBaseStore.getState().setError(null)
}