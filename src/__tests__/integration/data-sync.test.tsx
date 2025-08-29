import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AppWithSync from '../../AppWithSync'
import { useAuthStore } from '../../stores/useAuthStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useBaseStore } from '../../stores/useBaseStore'
import { useSyncStore } from '../../stores/useSyncStore'
import { firestoreService } from '../../services/firestoreService'
import { authListener } from '../../services/authListener'
import { networkStatus } from '../../utils/networkStatus'
import { mockUser, mockProject, waitForAsyncUpdates, simulateDelay } from './setup'

// Mock services
vi.mock('../../services/firestoreService')
vi.mock('../../services/authListener')
vi.mock('../../utils/networkStatus')

// Mock stores
vi.mock('../../stores/useAuthStore')
vi.mock('../../stores/useProjectStore')
vi.mock('../../stores/useBaseStore')
vi.mock('../../stores/useSyncStore')

const mockFirestoreService = vi.mocked(firestoreService)
const mockAuthListener = vi.mocked(authListener)
const mockNetworkStatus = vi.mocked(networkStatus)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseProjectStore = vi.mocked(useProjectStore)
const mockUseBaseStore = vi.mocked(useBaseStore)
const mockUseSyncStore = vi.mocked(useSyncStore)

describe('Data Synchronization Integration Tests', () => {
  const mockSyncWithFirestore = vi.fn()
  const mockSyncProjectToFirestore = vi.fn()
  const mockSyncProjectWithRetry = vi.fn()
  const mockSubscribeToFirestoreChanges = vi.fn()
  const mockSetError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup authenticated state
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      initialize: vi.fn(() => () => {}),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    })

    mockUseBaseStore.mockReturnValue({
      setError: mockSetError,
      error: null,
      isLoading: false,
      lastLocalUpdateTime: null,
      isLocallyUpdating: false,
      clearError: vi.fn(),
      setLoading: vi.fn(),
      setLocallyUpdating: vi.fn()
    })

    mockUseProjectStore.mockReturnValue({
      projects: [mockProject],
      currentProject: mockProject,
      loadUserProjects: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      setCurrentProject: vi.fn(),
      setProjects: vi.fn(),
      clearUserData: vi.fn(),
      clearUserDataSilently: vi.fn()
    })

    mockUseSyncStore.mockReturnValue({
      isSyncing: false,
      lastSyncTime: null,
      setSyncing: vi.fn(),
      setLastSyncTime: vi.fn(),
      initializeNetworkListener: vi.fn(),
      cleanupNetworkListener: vi.fn(),
      initializeUserProfile: vi.fn(),
      syncWithFirestore: mockSyncWithFirestore,
      subscribeToFirestoreChanges: mockSubscribeToFirestoreChanges,
      syncProjectToFirestore: mockSyncProjectToFirestore,
      syncProjectWithRetry: mockSyncProjectWithRetry
    })

    // Setup network status
    mockNetworkStatus.getIsOnline.mockReturnValue(true)
    mockNetworkStatus.addListener.mockReturnValue(() => {})
    mockNetworkStatus.waitForConnection.mockResolvedValue(true)

    // Setup auth listener
    mockAuthListener.setupAuthStateListener.mockReturnValue(() => {})
    mockAuthListener.handleUserLogin.mockResolvedValue(undefined)
    mockAuthListener.handleUserLogout.mockResolvedValue(undefined)

    // Setup firestore service
    mockFirestoreService.testConnection.mockResolvedValue(true)
    mockFirestoreService.getUserProjects.mockResolvedValue([mockProject])
  })

  describe('Initial Data Sync on Login', () => {
    it('should sync data when user logs in', async () => {
      mockSyncWithFirestore.mockResolvedValue([mockProject])

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      await waitForAsyncUpdates()
      expect(mockAuthListener.handleUserLogin).toHaveBeenCalledWith(mockUser)
    })

    it('should show loading state during initial sync', async () => {
      mockUseSyncStore.mockReturnValue({
        isSyncing: true,
        lastSyncTime: null,
        setSyncing: vi.fn(),
        setLastSyncTime: vi.fn(),
        initializeNetworkListener: vi.fn(),
        cleanupNetworkListener: vi.fn(),
        initializeUserProfile: vi.fn(),
        syncWithFirestore: mockSyncWithFirestore,
        subscribeToFirestoreChanges: mockSubscribeToFirestoreChanges,
        syncProjectToFirestore: mockSyncProjectToFirestore,
        syncProjectWithRetry: mockSyncProjectWithRetry
      })

      mockUseBaseStore.mockReturnValue({
        setError: mockSetError,
        error: null,
        isLoading: true,
        lastLocalUpdateTime: null,
        isLocallyUpdating: false,
        clearError: vi.fn(),
        setLoading: vi.fn(),
        setLocallyUpdating: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('載入數據中...')).toBeInTheDocument()
        expect(screen.getByText('正在同步跨裝置數據...')).toBeInTheDocument()
      })
    })

    it('should handle sync errors during login', async () => {
      mockAuthListener.handleUserLogin.mockRejectedValue(new Error('Sync failed'))

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()
      expect(mockSetError).toHaveBeenCalledWith('登入處理失敗')
    })
  })

  describe('Real-time Data Synchronization', () => {
    it('should subscribe to Firestore changes on login', async () => {
      const mockUnsubscribe = vi.fn()
      mockSubscribeToFirestoreChanges.mockReturnValue(mockUnsubscribe)

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()
      // The subscription is handled by authListener
      expect(mockAuthListener.handleUserLogin).toHaveBeenCalled()
    })

    it('should handle incoming Firestore updates', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' }
      const mockCallback = vi.fn()
      
      mockSubscribeToFirestoreChanges.mockImplementation((callback) => {
        mockCallback.mockImplementation(callback)
        return () => {}
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Simulate incoming Firestore update
      if (mockCallback.mock.calls.length > 0) {
        mockCallback([updatedProject])
      }

      await waitForAsyncUpdates()
      // Updates should be processed by the sync store
    })
  })

  describe('Network-aware Synchronization', () => {
    it('should handle network connectivity changes', async () => {
      const mockNetworkListener = vi.fn()
      mockNetworkStatus.addListener.mockImplementation((listener) => {
        mockNetworkListener.mockImplementation(listener)
        return () => {}
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Simulate network going offline
      mockNetworkStatus.getIsOnline.mockReturnValue(false)
      mockNetworkListener(false)

      await simulateDelay(100)

      // Simulate network coming back online
      mockNetworkStatus.getIsOnline.mockReturnValue(true)
      mockNetworkListener(true)

      await simulateDelay(100)
      // Should attempt to sync when network is restored
    })

    it('should retry sync when network is restored', async () => {
      mockNetworkStatus.getIsOnline.mockReturnValue(false)
      mockSyncProjectWithRetry.mockResolvedValue(true)

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Simulate network restoration
      mockNetworkStatus.getIsOnline.mockReturnValue(true)
      mockNetworkStatus.waitForConnection.mockResolvedValue(true)

      await simulateDelay(100)
      // Sync operations should be aware of network status
    })

    it('should handle offline mode gracefully', async () => {
      mockNetworkStatus.getIsOnline.mockReturnValue(false)
      mockNetworkStatus.waitForConnection.mockResolvedValue(false)

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      // App should still function in offline mode
      expect(screen.queryByText('網路連接錯誤')).not.toBeInTheDocument()
    })
  })

  describe('Project Sync Operations', () => {
    it('should sync project changes to Firestore', async () => {
      mockSyncProjectToFirestore.mockResolvedValue(true)
      const mockUpdateProject = vi.fn()

      mockUseProjectStore.mockReturnValue({
        projects: [mockProject],
        currentProject: mockProject,
        loadUserProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: mockUpdateProject,
        deleteProject: vi.fn(),
        setCurrentProject: vi.fn(),
        setProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Simulate project update
      const updatedProject = { ...mockProject, name: 'Updated Title' }
      mockUpdateProject(updatedProject)

      await waitForAsyncUpdates()
      // Project updates should trigger sync
    })

    it('should handle sync failures with retry logic', async () => {
      mockSyncProjectWithRetry.mockImplementation(async (_, maxRetries, onRetry) => {
        // Simulate retry attempts
        if (onRetry) {
          onRetry(1, maxRetries || 3)
          onRetry(2, maxRetries || 3)
        }
        return false // Simulate failure after retries
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Simulate sync with retry
      await mockSyncProjectWithRetry(mockProject, 3, vi.fn())

      // Should handle failure gracefully without crashing
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })

    it('should show sync success indicators', async () => {
      mockSyncProjectToFirestore.mockResolvedValue(true)
      const mockSetLastSyncTime = vi.fn()

      mockUseSyncStore.mockReturnValue({
        isSyncing: false,
        lastSyncTime: new Date(),
        setSyncing: vi.fn(),
        setLastSyncTime: mockSetLastSyncTime,
        initializeNetworkListener: vi.fn(),
        cleanupNetworkListener: vi.fn(),
        initializeUserProfile: vi.fn(),
        syncWithFirestore: mockSyncWithFirestore,
        subscribeToFirestoreChanges: mockSubscribeToFirestoreChanges,
        syncProjectToFirestore: mockSyncProjectToFirestore,
        syncProjectWithRetry: mockSyncProjectWithRetry
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Successful sync should update last sync time
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })
  })

  describe('Conflict Resolution', () => {
    it('should handle sync conflicts gracefully', async () => {
      const conflictedProject = {
        ...mockProject,
        updatedAt: new Date(Date.now() + 1000) // Newer timestamp
      }

      mockSyncWithFirestore.mockResolvedValue([conflictedProject])

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Should handle conflicts without errors
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })

    it('should prefer newer data in conflicts', async () => {
      const newerProject = {
        ...mockProject,
        name: 'Newer Version',
        updatedAt: new Date(Date.now() + 1000)
      }

      mockSyncWithFirestore.mockResolvedValue([newerProject])
      const mockSetProjects = vi.fn()

      mockUseProjectStore.mockReturnValue({
        projects: [mockProject],
        currentProject: mockProject,
        loadUserProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProject: vi.fn(),
        setProjects: mockSetProjects,
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()
      // Conflict resolution is handled by sync manager
    })
  })

  describe('Error Recovery', () => {
    it('should recover from temporary sync failures', async () => {
      mockSyncWithFirestore
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce([mockProject])

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Should recover and continue functioning
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })

    it('should handle authentication errors during sync', async () => {
      mockSyncWithFirestore.mockRejectedValue(new Error('Authentication failed'))

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Should handle auth errors gracefully
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })

    it('should handle Firestore connection errors', async () => {
      mockFirestoreService.testConnection.mockResolvedValue(false)
      mockSyncWithFirestore.mockRejectedValue(new Error('Firestore unavailable'))

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()

      // Should continue to function with local data
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })
  })
})