import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SyncStatusIndicator from '../SyncStatusIndicator'
import { useSyncStore } from '../../stores/useSyncStore'
import { useBaseStore } from '../../stores/useBaseStore'
import { authListener } from '../../services/authListener'
import { networkStatus } from '../../utils/networkStatus'

// Mock the stores
vi.mock('../../stores/useSyncStore')
vi.mock('../../stores/useBaseStore')

// Mock services
vi.mock('../../services/authListener', () => ({
  authListener: {
    forceSync: vi.fn()
  }
}))

// Mock network status utility
vi.mock('../../utils/networkStatus', () => ({
  networkStatus: {
    getIsOnline: vi.fn(() => true),
    addListener: vi.fn(() => vi.fn()) // Return cleanup function
  }
}))

const mockUseSyncStore = vi.mocked(useSyncStore)
const mockUseBaseStore = vi.mocked(useBaseStore)
const mockAuthListener = vi.mocked(authListener)
const mockNetworkStatus = vi.mocked(networkStatus)

describe('SyncStatusIndicator', () => {
  const mockSetError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseSyncStore.mockReturnValue({
      isSyncing: false,
      lastSyncTime: null
    })

    mockUseBaseStore.mockReturnValue({
      error: null,
      setError: mockSetError,
      isLocallyUpdating: false
    })

    mockNetworkStatus.getIsOnline.mockReturnValue(true)
    mockNetworkStatus.addListener.mockReturnValue(vi.fn())
  })

  describe('Basic Rendering', () => {
    it('should render sync status indicator', () => {
      render(<SyncStatusIndicator />)
      
      const statusDot = screen.getByRole('button')
      expect(statusDot).toBeInTheDocument()
      expect(statusDot).toHaveClass('w-2', 'h-2', 'rounded-full')
    })

    it('should show green status when synced and online', () => {
      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '已同步')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-green-500')
    })

    it('should show yellow status when syncing', () => {
      mockUseSyncStore.mockReturnValue({
        isSyncing: true,
        lastSyncTime: null
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '同步中...')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-yellow-500', 'animate-pulse')
    })

    it('should show yellow status when locally updating', () => {
      mockUseBaseStore.mockReturnValue({
        error: null,
        setError: mockSetError,
        isLocallyUpdating: true
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '同步中...')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-yellow-500', 'animate-pulse')
    })

    it('should show red status when there is an error', () => {
      mockUseBaseStore.mockReturnValue({
        error: 'Sync failed',
        setError: mockSetError,
        isLocallyUpdating: false
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '同步錯誤')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-red-500')
    })

    it('should show gray status when offline', () => {
      mockNetworkStatus.getIsOnline.mockReturnValue(false)

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '離線模式')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-gray-500')
    })
  })

  describe('Expanded Details', () => {
    it('should expand details when clicked', () => {
      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      expect(screen.getByText('已同步')).toBeInTheDocument()
      expect(screen.getByText('網絡狀態: 已連接')).toBeInTheDocument()
    })

    it('should close details when close button is clicked', () => {
      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const closeButton = screen.getByText('✕')
      fireEvent.click(closeButton)
      
      expect(screen.queryByText('已同步')).not.toBeInTheDocument()
    })

    it('should show last sync time when available', () => {
      const lastSyncTime = new Date('2024-01-01T12:00:00Z')
      mockUseSyncStore.mockReturnValue({
        isSyncing: false,
        lastSyncTime
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      expect(screen.getByText(/最後同步:/)).toBeInTheDocument()
    })

    it('should show offline network status', () => {
      mockNetworkStatus.getIsOnline.mockReturnValue(false)

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      expect(screen.getByText('網絡狀態: 離線')).toBeInTheDocument()
    })

    it('should show local updating status', () => {
      mockUseBaseStore.mockReturnValue({
        error: null,
        setError: mockSetError,
        isLocallyUpdating: true
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      expect(screen.getByText('正在同步本地更改...')).toBeInTheDocument()
    })

    it('should show error message when there is an error', () => {
      mockUseBaseStore.mockReturnValue({
        error: 'Sync failed',
        setError: mockSetError,
        isLocallyUpdating: false
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      expect(screen.getByText('Sync failed')).toBeInTheDocument()
    })
  })

  describe('Manual Sync', () => {
    it('should show manual sync button when online and not syncing', () => {
      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const syncButton = screen.getByText('手動同步')
      expect(syncButton).toBeInTheDocument()
      expect(syncButton).not.toBeDisabled()
    })

    it('should disable manual sync button when offline', () => {
      mockNetworkStatus.getIsOnline.mockReturnValue(false)

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const syncButton = screen.getByText('離線中')
      expect(syncButton).toBeDisabled()
    })

    it('should disable manual sync button when syncing', () => {
      mockUseSyncStore.mockReturnValue({
        isSyncing: true,
        lastSyncTime: null
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const syncButton = screen.getByRole('button', { name: '同步中...' })
      expect(syncButton).toBeDisabled()
    })

    it('should disable manual sync button when locally updating', () => {
      mockUseBaseStore.mockReturnValue({
        error: null,
        setError: mockSetError,
        isLocallyUpdating: true
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const syncButton = screen.getByRole('button', { name: '同步中...' })
      expect(syncButton).toBeDisabled()
    })

    it('should call forceSync when manual sync button is clicked', async () => {
      mockAuthListener.forceSync.mockResolvedValue(undefined)

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const syncButton = screen.getByText('手動同步')
      fireEvent.click(syncButton)
      
      expect(mockAuthListener.forceSync).toHaveBeenCalled()
    })

    it('should handle manual sync error', async () => {
      const error = new Error('Sync failed')
      mockAuthListener.forceSync.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      fireEvent.click(statusButton)
      
      const syncButton = screen.getByText('手動同步')
      fireEvent.click(syncButton)
      
      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('手動同步失敗')
        expect(consoleSpy).toHaveBeenCalledWith('Manual sync failed:', error)
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Network Status Listener', () => {
    it('should set up network status listener on mount', () => {
      render(<SyncStatusIndicator />)
      
      expect(mockNetworkStatus.addListener).toHaveBeenCalled()
    })

    it('should clean up network status listener on unmount', () => {
      const cleanup = vi.fn()
      mockNetworkStatus.addListener.mockReturnValue(cleanup)

      const { unmount } = render(<SyncStatusIndicator />)
      unmount()
      
      expect(cleanup).toHaveBeenCalled()
    })

    it('should update online status when network changes', () => {
      let networkListener: (online: boolean) => void = () => {}
      mockNetworkStatus.addListener.mockImplementation((listener) => {
        networkListener = listener
        return vi.fn()
      })

      render(<SyncStatusIndicator />)
      
      // Initially online
      expect(screen.getByRole('button')).toHaveAttribute('title', '已同步')
      
      // Simulate going offline
      networkListener(false)
      
      // Should update the status
      expect(screen.getByRole('button')).toHaveAttribute('title', '離線模式')
    })
  })

  describe('Status Priority', () => {
    it('should prioritize offline status over other states', () => {
      mockNetworkStatus.getIsOnline.mockReturnValue(false)
      mockUseSyncStore.mockReturnValue({
        isSyncing: true,
        lastSyncTime: null
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '離線模式')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-gray-500')
    })

    it('should prioritize syncing status over error when online', () => {
      mockUseSyncStore.mockReturnValue({
        isSyncing: true,
        lastSyncTime: null
      })
      mockUseBaseStore.mockReturnValue({
        error: 'Some error',
        setError: mockSetError,
        isLocallyUpdating: false
      })

      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '同步中...')
      
      const statusDot = statusButton.querySelector('div')
      expect(statusDot).toHaveClass('bg-yellow-500')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button with proper title', () => {
      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      expect(statusButton).toHaveAttribute('title', '已同步')
    })

    it('should be keyboard accessible', () => {
      render(<SyncStatusIndicator />)
      
      const statusButton = screen.getByRole('button')
      statusButton.focus()
      expect(statusButton).toHaveFocus()
    })
  })
})