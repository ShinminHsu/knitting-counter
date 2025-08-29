import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBaseStore, handleAsyncError, withLoading, withLocalUpdate, isSystemBusy, clearErrors } from './useBaseStore'

describe('useBaseStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBaseStore.setState({
      isLoading: false,
      error: null,
      isLocallyUpdating: false,
      lastLocalUpdateTime: null,
      recentLocalChanges: new Set<string>()
    })
  })

  describe('Basic State Management', () => {
    it('should have correct initial state', () => {
      const state = useBaseStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
      expect(state.isLocallyUpdating).toBe(false)
      expect(state.lastLocalUpdateTime).toBe(null)
      expect(state.recentLocalChanges).toEqual(new Set())
    })

    it('should set loading state', () => {
      const { setLoading } = useBaseStore.getState()
      
      setLoading(true)
      expect(useBaseStore.getState().isLoading).toBe(true)
      
      setLoading(false)
      expect(useBaseStore.getState().isLoading).toBe(false)
    })

    it('should set error state', () => {
      const { setError } = useBaseStore.getState()
      
      setError('Test error')
      expect(useBaseStore.getState().error).toBe('Test error')
      
      setError(null)
      expect(useBaseStore.getState().error).toBe(null)
    })

    it('should set locally updating state', () => {
      const { setLocallyUpdating } = useBaseStore.getState()
      
      setLocallyUpdating(true)
      expect(useBaseStore.getState().isLocallyUpdating).toBe(true)
      
      setLocallyUpdating(false)
      expect(useBaseStore.getState().isLocallyUpdating).toBe(false)
    })

    it('should set last local update time', () => {
      const { setLastLocalUpdateTime } = useBaseStore.getState()
      const testDate = new Date('2024-01-01')
      
      setLastLocalUpdateTime(testDate)
      expect(useBaseStore.getState().lastLocalUpdateTime).toBe(testDate)
      
      setLastLocalUpdateTime(null)
      expect(useBaseStore.getState().lastLocalUpdateTime).toBe(null)
    })
  })

  describe('Recent Local Changes Management', () => {
    it('should add recent local change', () => {
      const { addRecentLocalChange, hasRecentLocalChange } = useBaseStore.getState()
      
      addRecentLocalChange('test-id')
      expect(hasRecentLocalChange('test-id')).toBe(true)
      expect(hasRecentLocalChange('other-id')).toBe(false)
    })

    it('should remove recent local change', () => {
      const { addRecentLocalChange, removeRecentLocalChange, hasRecentLocalChange } = useBaseStore.getState()
      
      addRecentLocalChange('test-id')
      expect(hasRecentLocalChange('test-id')).toBe(true)
      
      removeRecentLocalChange('test-id')
      expect(hasRecentLocalChange('test-id')).toBe(false)
    })

    it('should clear all recent local changes', () => {
      const { addRecentLocalChange, clearRecentLocalChanges, hasRecentLocalChange } = useBaseStore.getState()
      
      addRecentLocalChange('test-id-1')
      addRecentLocalChange('test-id-2')
      expect(hasRecentLocalChange('test-id-1')).toBe(true)
      expect(hasRecentLocalChange('test-id-2')).toBe(true)
      
      clearRecentLocalChanges()
      expect(hasRecentLocalChange('test-id-1')).toBe(false)
      expect(hasRecentLocalChange('test-id-2')).toBe(false)
    })

    it('should handle multiple changes to same ID', () => {
      const { addRecentLocalChange, hasRecentLocalChange } = useBaseStore.getState()
      
      addRecentLocalChange('test-id')
      addRecentLocalChange('test-id') // Adding same ID again
      
      expect(hasRecentLocalChange('test-id')).toBe(true)
      expect(useBaseStore.getState().recentLocalChanges.size).toBe(1)
    })
  })

  describe('Error Handling Utilities', () => {
    it('should handle async error with Error object', () => {
      const testError = new Error('Test error message')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      handleAsyncError(testError, 'Test Context')
      
      expect(consoleSpy).toHaveBeenCalledWith('[Test Context] Error:', testError)
      expect(useBaseStore.getState().error).toBe('Test Context: Test error message')
      
      consoleSpy.mockRestore()
    })

    it('should handle async error with unknown error type', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      handleAsyncError('string error', 'Test Context')
      
      expect(consoleSpy).toHaveBeenCalledWith('[Test Context] Error:', 'string error')
      expect(useBaseStore.getState().error).toBe('Test Context: 未知錯誤')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Loading Wrapper', () => {
    it('should handle successful operation with loading states', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success result')
      
      const result = await withLoading(mockOperation, 'Test Operation')
      
      expect(mockOperation).toHaveBeenCalled()
      expect(result).toBe('success result')
      expect(useBaseStore.getState().isLoading).toBe(false)
      expect(useBaseStore.getState().error).toBe(null)
    })

    it('should handle failed operation with error handling', async () => {
      const testError = new Error('Operation failed')
      const mockOperation = vi.fn().mockRejectedValue(testError)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await withLoading(mockOperation, 'Test Operation')
      
      expect(mockOperation).toHaveBeenCalled()
      expect(result).toBe(null)
      expect(useBaseStore.getState().isLoading).toBe(false)
      expect(useBaseStore.getState().error).toBe('Test Operation: Operation failed')
      
      consoleSpy.mockRestore()
    })

    it('should set loading state during operation', async () => {
      let loadingDuringOperation = false
      const mockOperation = vi.fn().mockImplementation(async () => {
        loadingDuringOperation = useBaseStore.getState().isLoading
        return 'result'
      })
      
      await withLoading(mockOperation)
      
      expect(loadingDuringOperation).toBe(true)
      expect(useBaseStore.getState().isLoading).toBe(false)
    })
  })

  describe('Local Update Wrapper', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle successful local update with state tracking', async () => {
      const mockOperation = vi.fn().mockResolvedValue('update result')
      const entityId = 'test-entity'
      
      const result = await withLocalUpdate(mockOperation, entityId, 'Test Update')
      
      expect(mockOperation).toHaveBeenCalled()
      expect(result).toBe('update result')
      expect(useBaseStore.getState().isLocallyUpdating).toBe(false)
      expect(useBaseStore.getState().hasRecentLocalChange(entityId)).toBe(true)
      expect(useBaseStore.getState().lastLocalUpdateTime).toBeInstanceOf(Date)
      expect(useBaseStore.getState().error).toBe(null)
    })

    it('should handle failed local update with error handling', async () => {
      const testError = new Error('Update failed')
      const mockOperation = vi.fn().mockRejectedValue(testError)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const entityId = 'test-entity'
      
      const result = await withLocalUpdate(mockOperation, entityId, 'Test Update')
      
      expect(mockOperation).toHaveBeenCalled()
      expect(result).toBe(null)
      expect(useBaseStore.getState().isLocallyUpdating).toBe(false)
      expect(useBaseStore.getState().error).toBe('Test Update: Update failed')
      
      consoleSpy.mockRestore()
    })

    it('should clean up recent change after timeout', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')
      const entityId = 'test-entity'
      
      await withLocalUpdate(mockOperation, entityId)
      
      expect(useBaseStore.getState().hasRecentLocalChange(entityId)).toBe(true)
      
      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000)
      
      expect(useBaseStore.getState().hasRecentLocalChange(entityId)).toBe(false)
    })

    it('should set locally updating state during operation', async () => {
      let updatingDuringOperation = false
      const mockOperation = vi.fn().mockImplementation(async () => {
        updatingDuringOperation = useBaseStore.getState().isLocallyUpdating
        return 'result'
      })
      
      await withLocalUpdate(mockOperation, 'test-id')
      
      expect(updatingDuringOperation).toBe(true)
      expect(useBaseStore.getState().isLocallyUpdating).toBe(false)
    })
  })

  describe('System State Utilities', () => {
    it('should correctly identify system busy state', () => {
      expect(isSystemBusy()).toBe(false)
      
      useBaseStore.getState().setLoading(true)
      expect(isSystemBusy()).toBe(true)
      
      useBaseStore.getState().setLoading(false)
      useBaseStore.getState().setLocallyUpdating(true)
      expect(isSystemBusy()).toBe(true)
      
      useBaseStore.getState().setLocallyUpdating(false)
      expect(isSystemBusy()).toBe(false)
    })

    it('should clear errors', () => {
      useBaseStore.getState().setError('Test error')
      expect(useBaseStore.getState().error).toBe('Test error')
      
      clearErrors()
      expect(useBaseStore.getState().error).toBe(null)
    })
  })

  describe('State Consistency', () => {
    it('should maintain immutable recentLocalChanges set', () => {
      const { addRecentLocalChange } = useBaseStore.getState()
      const initialSet = useBaseStore.getState().recentLocalChanges
      
      addRecentLocalChange('test-id')
      const newSet = useBaseStore.getState().recentLocalChanges
      
      expect(newSet).not.toBe(initialSet) // Different object reference
      expect(newSet.has('test-id')).toBe(true)
      expect(initialSet.has('test-id')).toBe(false)
    })

    it('should handle concurrent state updates', () => {
      const { setLoading, setError, setLocallyUpdating } = useBaseStore.getState()
      
      // Simulate concurrent updates
      setLoading(true)
      setError('Error message')
      setLocallyUpdating(true)
      
      const state = useBaseStore.getState()
      expect(state.isLoading).toBe(true)
      expect(state.error).toBe('Error message')
      expect(state.isLocallyUpdating).toBe(true)
    })
  })
})