import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AppWithSync from '../../AppWithSync'
import { useAuthStore } from '../../stores/useAuthStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useBaseStore } from '../../stores/useBaseStore'
import { useSyncStore } from '../../stores/useSyncStore'
import { mockUser, mockProject, waitForAsyncUpdates } from './setup'

// Mock stores with proper initial state
vi.mock('../../stores/useAuthStore')
vi.mock('../../stores/useProjectStore')
vi.mock('../../stores/useBaseStore')
vi.mock('../../stores/useSyncStore')

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseProjectStore = vi.mocked(useProjectStore)
const mockUseBaseStore = vi.mocked(useBaseStore)
const mockUseSyncStore = vi.mocked(useSyncStore)

describe('Authentication Flow Integration Tests', () => {
  const mockSetError = vi.fn()
  const mockLoadUserProjects = vi.fn()
  const mockClearUserData = vi.fn()
  const mockInitialize = vi.fn()

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup sync store mock
    mockUseSyncStore.mockReturnValue({
      isSyncing: false,
      lastSyncTime: null,
      setSyncing: vi.fn(),
      setLastSyncTime: vi.fn(),
      initializeNetworkListener: vi.fn(),
      cleanupNetworkListener: vi.fn(),
      initializeUserProfile: vi.fn(),
      syncWithFirestore: vi.fn(),
      subscribeToFirestoreChanges: vi.fn(),
      syncProjectToFirestore: vi.fn(),
      syncProjectWithRetry: vi.fn()
    })

    // Setup base store mock
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

    // Setup project store mock
    mockUseProjectStore.mockReturnValue({
      projects: [],
      currentProject: null,
      loadUserProjects: mockLoadUserProjects,
      clearUserData: mockClearUserData,
      setProjects: vi.fn(),
      setCurrentProject: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      clearUserDataSilently: vi.fn()
    })

    // Setup default auth store mock (logged out state)
    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: false,
      initialize: mockInitialize.mockReturnValue(() => {}),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    })

    // Mock getState for stores
    mockUseAuthStore.getState = vi.fn(() => ({
      user: null,
      isLoading: false,
      initialize: mockInitialize.mockReturnValue(() => {}),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      setUser: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      error: null
    })) as any
  })

  describe('Initial App Load - Unauthenticated State', () => {
    it('should show Google sign-in when user is not authenticated', async () => {
      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /使用 Google 帳號登入/i })).toBeInTheDocument()
      })

      expect(screen.getByText(/歡迎使用編織計數器/i)).toBeInTheDocument()
      expect(mockInitialize).toHaveBeenCalledOnce()
    })

    it('should show loading state when auth is loading', async () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isLoading: true,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('驗證中...')).toBeInTheDocument()
      })
    })
  })

  describe('User Login Flow', () => {
    it('should handle successful login and load user projects', async () => {
      // Start with unauthenticated state
      const { rerender } = render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      // Verify initial state
      expect(screen.getByRole('button', { name: /使用 Google 帳號登入/i })).toBeInTheDocument()

      // Simulate successful login
      mockLoadUserProjects.mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      mockUseProjectStore.mockReturnValue({
        projects: [mockProject],
        currentProject: mockProject,
        loadUserProjects: mockLoadUserProjects,
        clearUserData: mockClearUserData,
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      // Re-render with authenticated state
      rerender(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      await waitForAsyncUpdates()
      expect(mockLoadUserProjects).toHaveBeenCalled()
    })

    it('should handle login errors gracefully', async () => {
      mockLoadUserProjects.mockRejectedValue(new Error('Network error'))
      
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitForAsyncUpdates()
      expect(mockSetError).toHaveBeenCalledWith('登入處理失敗')
    })
  })

  describe('User Logout Flow', () => {
    it('should handle logout and clear user data', async () => {
      // Start with authenticated state
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      mockUseProjectStore.mockReturnValue({
        projects: [mockProject],
        currentProject: mockProject,
        loadUserProjects: mockLoadUserProjects,
        clearUserData: mockClearUserData,
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      const { rerender } = render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      // Simulate logout
      mockUseAuthStore.mockReturnValue({
        user: null,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      mockUseProjectStore.mockReturnValue({
        projects: [],
        currentProject: null,
        loadUserProjects: mockLoadUserProjects,
        clearUserData: mockClearUserData,
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      // Re-render with logged out state
      rerender(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /使用 Google 帳號登入/i })).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error messages and allow dismissal', async () => {
      mockUseBaseStore.mockReturnValue({
        setError: mockSetError,
        error: '測試錯誤訊息',
        isLoading: false,
        lastLocalUpdateTime: null,
        isLocallyUpdating: false,
        clearError: vi.fn(),
        setLoading: vi.fn(),
        setLocallyUpdating: vi.fn()
      })

      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('測試錯誤訊息')).toBeInTheDocument()
      })

      const dismissButton = screen.getByRole('button', { name: '✕' })
      expect(dismissButton).toBeInTheDocument()
      
      fireEvent.click(dismissButton)
      expect(mockSetError).toHaveBeenCalledWith(null)
    })
  })

  describe('App Loading States', () => {
    it('should show loading state when app is loading', async () => {
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

      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('載入數據中...')).toBeInTheDocument()
      })
    })

    it('should show sync status when syncing', async () => {
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

      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        isLoading: false,
        initialize: mockInitialize.mockReturnValue(() => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      // Mock sync store to return syncing state
      vi.doMock('../../stores/useSyncStore', () => ({
        useSyncStore: vi.fn(() => ({
          isSyncing: true,
          lastSyncTime: null,
          setSyncing: vi.fn(),
          setLastSyncTime: vi.fn(),
          initializeNetworkListener: vi.fn(),
          cleanupNetworkListener: vi.fn(),
          initializeUserProfile: vi.fn(),
          syncWithFirestore: vi.fn(),
          subscribeToFirestoreChanges: vi.fn(),
          syncProjectToFirestore: vi.fn(),
          syncProjectWithRetry: vi.fn()
        }))
      }))

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
  })
})