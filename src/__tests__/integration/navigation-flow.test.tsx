import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import AppWithSync from '../../AppWithSync'
import { useAuthStore } from '../../stores/useAuthStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useBaseStore } from '../../stores/useBaseStore'
import { useSyncStore } from '../../stores/useSyncStore'
import { mockUser, mockProject, waitForAsyncUpdates } from './setup'

// Mock stores
vi.mock('../../stores/useAuthStore')
vi.mock('../../stores/useProjectStore')
vi.mock('../../stores/useBaseStore')
vi.mock('../../stores/useSyncStore')

// Mock components that might not be fully implemented
vi.mock('../../components/ProjectDetailView', () => ({
  default: () => <div>專案詳情頁面</div>
}))

vi.mock('../../components/PatternEditorView', () => ({
  default: () => <div>織圖編輯頁面</div>
}))

vi.mock('../../components/ProgressTrackingView', () => ({
  default: () => <div>進度追蹤頁面</div>
}))

vi.mock('../../components/YarnManagerView', () => ({
  default: () => <div>毛線管理頁面</div>
}))

vi.mock('../../components/ImportExportView', () => ({
  default: () => <div>匯出入頁面</div>
}))

vi.mock('../../components/WelcomeLoadingView', () => ({
  default: () => <div>歡迎載入頁面</div>
}))

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseProjectStore = vi.mocked(useProjectStore)
const mockUseBaseStore = vi.mocked(useBaseStore)
const mockUseSyncStore = vi.mocked(useSyncStore)

describe('Navigation Flow Integration Tests', () => {
  const setupAuthenticatedState = () => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      initialize: vi.fn(() => () => {}),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    })

    mockUseBaseStore.mockReturnValue({
      setError: vi.fn(),
      error: null,
      isLoading: false,
      lastLocalUpdateTime: null,
      isLocallyUpdating: false,
      clearError: vi.fn(),
      setLoading: vi.fn(),
      setLocallyUpdating: vi.fn()
    })

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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupAuthenticatedState()
  })

  describe('Basic Route Navigation', () => {
    it('should render home page (project list) by default', async () => {
      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })
    })

    it('should navigate to project detail page', async () => {
      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('專案詳情頁面')).toBeInTheDocument()
      })
    })

    it('should navigate to pattern editor page', async () => {
      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}/pattern`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('織圖編輯頁面')).toBeInTheDocument()
      })
    })

    it('should navigate to progress tracking page', async () => {
      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}/progress`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('進度追蹤頁面')).toBeInTheDocument()
      })
    })

    it('should navigate to yarn manager page', async () => {
      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}/yarns`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('毛線管理頁面')).toBeInTheDocument()
      })
    })

    it('should navigate to import/export page', async () => {
      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}/import-export`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('匯出入頁面')).toBeInTheDocument()
      })
    })
  })

  describe('404 Error Handling', () => {
    it('should show 404 page for unknown routes', async () => {
      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('404 - 頁面不存在')).toBeInTheDocument()
      })
    })

    it('should redirect to 404 page for invalid routes', async () => {
      render(
        <MemoryRouter initialEntries={['/invalid/nested/route']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('404 - 頁面不存在')).toBeInTheDocument()
      })
    })

    it('should allow navigation back to home from 404 page', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/404']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('404 - 頁面不存在')).toBeInTheDocument()
      })

      const homeButton = screen.getByRole('button', { name: /回到首頁|返回首頁/i })
      await user.click(homeButton)

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication-Protected Routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isLoading: false,
        initialize: vi.fn(() => () => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /使用 Google 帳號登入/i })).toBeInTheDocument()
      })
    })

    it('should show loading during authentication', async () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isLoading: true,
        initialize: vi.fn(() => () => {}),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      })

      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('驗證中...')).toBeInTheDocument()
      })
    })
  })

  describe('Project-Specific Navigation', () => {
    it('should maintain project context across navigation', async () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('專案詳情頁面')).toBeInTheDocument()
      })

      // Navigate to pattern editor
      rerender(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}/pattern`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('織圖編輯頁面')).toBeInTheDocument()
      })

      // Navigate to progress tracking
      rerender(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}/progress`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('進度追蹤頁面')).toBeInTheDocument()
      })
    })

    it('should handle navigation with invalid project ID', async () => {
      render(
        <MemoryRouter initialEntries={['/project/invalid-id']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        // Should still render the component, let the component handle invalid ID
        expect(screen.getByText('專案詳情頁面')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States During Navigation', () => {
    it('should show loading state when app is loading', async () => {
      mockUseBaseStore.mockReturnValue({
        setError: vi.fn(),
        error: null,
        isLoading: true,
        lastLocalUpdateTime: null,
        isLocallyUpdating: false,
        clearError: vi.fn(),
        setLoading: vi.fn(),
        setLocallyUpdating: vi.fn()
      })

      render(
        <MemoryRouter initialEntries={[`/project/${mockProject.id}`]}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('載入數據中...')).toBeInTheDocument()
      })
    })

    it('should show sync indicator during data synchronization', async () => {
      mockUseSyncStore.mockReturnValue({
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
      })

      mockUseBaseStore.mockReturnValue({
        setError: vi.fn(),
        error: null,
        isLoading: true,
        lastLocalUpdateTime: null,
        isLocallyUpdating: false,
        clearError: vi.fn(),
        setLoading: vi.fn(),
        setLocallyUpdating: vi.fn()
      })

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('載入數據中...')).toBeInTheDocument()
        expect(screen.getByText('正在同步跨裝置數據...')).toBeInTheDocument()
      })
    })
  })

  describe('Error States During Navigation', () => {
    it('should display errors while maintaining navigation', async () => {
      mockUseBaseStore.mockReturnValue({
        setError: vi.fn(),
        error: '網路連接錯誤',
        isLoading: false,
        lastLocalUpdateTime: null,
        isLocallyUpdating: false,
        clearError: vi.fn(),
        setLoading: vi.fn(),
        setLocallyUpdating: vi.fn()
      })

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('網路連接錯誤')).toBeInTheDocument()
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })
    })

    it('should allow error dismissal without affecting navigation', async () => {
      const user = userEvent.setup()
      const mockSetError = vi.fn()

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

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppWithSync />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('測試錯誤訊息')).toBeInTheDocument()
      })

      const dismissButton = screen.getByRole('button', { name: '✕' })
      await user.click(dismissButton)

      expect(mockSetError).toHaveBeenCalledWith(null)
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })
  })
})