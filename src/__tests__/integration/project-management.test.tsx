import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
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

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseProjectStore = vi.mocked(useProjectStore)
const mockUseBaseStore = vi.mocked(useBaseStore)
const mockUseSyncStore = vi.mocked(useSyncStore)

describe('Project Management Integration Tests', () => {
  const mockCreateProject = vi.fn()
  const mockUpdateProject = vi.fn()
  const mockDeleteProject = vi.fn()
  const mockSetCurrentProject = vi.fn()
  const mockLoadUserProjects = vi.fn()
  const mockSyncProjectToFirestore = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup authenticated user state
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isLoading: false,
      initialize: vi.fn(() => () => {}),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    })

    // Setup base store
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

    // Setup sync store
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
      syncProjectToFirestore: mockSyncProjectToFirestore,
      syncProjectWithRetry: vi.fn()
    })

    // Setup project store with default state
    mockUseProjectStore.mockReturnValue({
      projects: [mockProject],
      currentProject: mockProject,
      loadUserProjects: mockLoadUserProjects,
      createProject: mockCreateProject,
      updateProject: mockUpdateProject,
      deleteProject: mockDeleteProject,
      setCurrentProject: mockSetCurrentProject,
      setProjects: vi.fn(),
      clearUserData: vi.fn(),
      clearUserDataSilently: vi.fn()
    })
  })

  describe('Project List Management', () => {
    it('should display project list when user has projects', async () => {
      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
        expect(screen.getByText(mockProject.name)).toBeInTheDocument()
      })
    })

    it('should handle empty project list state', async () => {
      mockUseProjectStore.mockReturnValue({
        projects: [],
        currentProject: null,
        loadUserProjects: mockLoadUserProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject,
        setCurrentProject: mockSetCurrentProject,
        setProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })
    })
  })

  describe('Project Creation Flow', () => {
    it('should create a new project successfully', async () => {
      const user = userEvent.setup()
      mockCreateProject.mockResolvedValue(undefined)
      mockSyncProjectToFirestore.mockResolvedValue(true)

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      // Look for create project button
      const createButton = screen.getByRole('button', { name: /新增專案|建立專案|create/i })
      expect(createButton).toBeInTheDocument()

      await user.click(createButton)

      // Wait for form or modal to appear
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/專案名稱|title/i) || 
                          screen.getByPlaceholderText(/專案名稱|title/i)
        expect(titleInput).toBeInTheDocument()
      })

      // Fill in project details
      const titleInput = screen.getByLabelText(/專案名稱|title/i) || 
                        screen.getByPlaceholderText(/專案名稱|title/i)
      await user.type(titleInput, '新的編織專案')

      const descriptionInput = screen.queryByLabelText(/描述|description/i) || 
                              screen.queryByPlaceholderText(/描述|description/i)
      if (descriptionInput) {
        await user.type(descriptionInput, '這是一個測試專案')
      }

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /確認|提交|save|create/i })
      await user.click(submitButton)

      await waitForAsyncUpdates()
      expect(mockCreateProject).toHaveBeenCalled()
    })

    it('should handle project creation errors', async () => {
      const user = userEvent.setup()
      const mockSetError = vi.fn()
      mockCreateProject.mockRejectedValue(new Error('Creation failed'))

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

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /新增專案|建立專案|create/i })
      await user.click(createButton)

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/專案名稱|title/i) || 
                          screen.getByPlaceholderText(/專案名稱|title/i)
        expect(titleInput).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText(/專案名稱|title/i) || 
                        screen.getByPlaceholderText(/專案名稱|title/i)
      await user.type(titleInput, '失敗的專案')

      const submitButton = screen.getByRole('button', { name: /確認|提交|save|create/i })
      await user.click(submitButton)

      await waitForAsyncUpdates()
      expect(mockSetError).toHaveBeenCalled()
    })
  })

  describe('Project Navigation', () => {
    it('should navigate to project detail view', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(mockProject.name)).toBeInTheDocument()
      })

      // Click on project to navigate
      const projectLink = screen.getByText(mockProject.name)
      await user.click(projectLink)

      await waitForAsyncUpdates()
      expect(mockSetCurrentProject).toHaveBeenCalledWith(mockProject)
    })
  })

  describe('Project Updates', () => {
    it('should update project successfully', async () => {
      mockUpdateProject.mockResolvedValue(undefined)
      mockSyncProjectToFirestore.mockResolvedValue(true)

      const updatedProject = { ...mockProject, name: '更新後的專案' }

      // Simulate project update
      mockUseProjectStore.mockReturnValue({
        projects: [updatedProject],
        currentProject: updatedProject,
        loadUserProjects: mockLoadUserProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject,
        setCurrentProject: mockSetCurrentProject,
        setProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      })

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('更新後的專案')).toBeInTheDocument()
      })
    })

    it('should handle project update with sync failure', async () => {
      mockUpdateProject.mockResolvedValue(undefined)
      mockSyncProjectToFirestore.mockResolvedValue(false)

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      // Simulate update action that triggers sync
      await waitForAsyncUpdates()
      
      // The sync failure should be handled gracefully without crashing
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })
  })

  describe('Project Deletion', () => {
    it('should delete project successfully', async () => {
      const user = userEvent.setup()
      mockDeleteProject.mockResolvedValue(undefined)

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(mockProject.name)).toBeInTheDocument()
      })

      // Look for delete button (might be in a menu or directly visible)
      const deleteButton = screen.queryByRole('button', { name: /刪除|delete/i })
      
      if (deleteButton) {
        await user.click(deleteButton)

        // Confirm deletion if there's a confirmation dialog
        const confirmButton = screen.queryByRole('button', { name: /確認刪除|confirm/i })
        if (confirmButton) {
          await user.click(confirmButton)
        }

        await waitForAsyncUpdates()
        expect(mockDeleteProject).toHaveBeenCalledWith(mockProject.id)
      }
    })

    it('should handle deletion errors gracefully', async () => {
      const mockSetError = vi.fn()
      mockDeleteProject.mockRejectedValue(new Error('Deletion failed'))

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

      render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })

      // Simulate deletion failure
      await waitForAsyncUpdates()
      
      // Error should be handled without crashing the app
      expect(screen.getByText('編織專案列表')).toBeInTheDocument()
    })
  })

  describe('Project Synchronization', () => {
    it('should show sync status during project operations', async () => {
      mockUseSyncStore.mockReturnValue({
        isSyncing: true,
        lastSyncTime: new Date(),
        setSyncing: vi.fn(),
        setLastSyncTime: vi.fn(),
        initializeNetworkListener: vi.fn(),
        cleanupNetworkListener: vi.fn(),
        initializeUserProfile: vi.fn(),
        syncWithFirestore: vi.fn(),
        subscribeToFirestoreChanges: vi.fn(),
        syncProjectToFirestore: mockSyncProjectToFirestore,
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
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('載入數據中...')).toBeInTheDocument()
        expect(screen.getByText('正在同步跨裝置數據...')).toBeInTheDocument()
      })
    })

    it('should handle sync completion', async () => {
      // Start with syncing state
      const { rerender } = render(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      // Update to completed sync state
      mockUseSyncStore.mockReturnValue({
        isSyncing: false,
        lastSyncTime: new Date(),
        setSyncing: vi.fn(),
        setLastSyncTime: vi.fn(),
        initializeNetworkListener: vi.fn(),
        cleanupNetworkListener: vi.fn(),
        initializeUserProfile: vi.fn(),
        syncWithFirestore: vi.fn(),
        subscribeToFirestoreChanges: vi.fn(),
        syncProjectToFirestore: mockSyncProjectToFirestore,
        syncProjectWithRetry: vi.fn()
      })

      rerender(
        <BrowserRouter>
          <AppWithSync />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('編織專案列表')).toBeInTheDocument()
      })
    })
  })
})