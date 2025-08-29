import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectListView from '../ProjectListView'
import { useProjectStore } from '../../stores/useProjectStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { Project } from '../../types'
import { User } from 'firebase/auth'

// Mock the stores
vi.mock('../../stores/useProjectStore')
vi.mock('../../stores/useAuthStore')

// Mock SyncStatusIndicator
vi.mock('../SyncStatusIndicator', () => ({
  default: () => <div data-testid="sync-status">Sync Status</div>
}))

// Mock react-icons
vi.mock('react-icons/bs', () => ({
  BsPlus: () => <div data-testid="plus-icon">+</div>
}))

const mockUseProjectStore = vi.mocked(useProjectStore)
const mockUseAuthStore = vi.mocked(useAuthStore)

const mockUser: User = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  refreshToken: '',
  tenantId: null,
  providerId: 'google.com',
  delete: vi.fn(),
  getIdToken: vi.fn(),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn(),
  phoneNumber: null,
  photoURL: null
}

const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    source: 'Test Source 1',
    pattern: [],
    currentRound: 1,
    currentStitch: 0,
    yarns: [],
    sessions: [],
    createdDate: new Date('2024-01-01'),
    lastModified: new Date('2024-01-02'),
    isCompleted: false
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    source: 'Test Source 2',
    pattern: [],
    currentRound: 5,
    currentStitch: 10,
    yarns: [],
    sessions: [],
    createdDate: new Date('2024-01-03'),
    lastModified: new Date('2024-01-04'),
    isCompleted: true
  }
]

describe('ProjectListView', () => {
  const mockCreateProject = vi.fn()
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseProjectStore.mockReturnValue({
      projects: mockProjects,
      createProject: mockCreateProject,
      currentProject: null
    })

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      isLoading: false,
      error: null
    })
  })

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ProjectListView />
      </MemoryRouter>
    )
  }

  describe('Component Rendering', () => {
    it('should render project list header', () => {
      renderComponent()
      
      expect(screen.getByText('編織專案')).toBeInTheDocument()
      expect(screen.getByTestId('sync-status')).toBeInTheDocument()
    })

    it('should render user profile section', () => {
      renderComponent()
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should render create new project button', () => {
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      expect(createButton).toBeInTheDocument()
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument()
    })

    it('should render all projects', () => {
      renderComponent()
      
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })

    it('should show project completion status', () => {
      renderComponent()
      
      // Project 2 is completed
      const completedProject = screen.getByText('Test Project 2').closest('.card')
      expect(completedProject).toBeInTheDocument()
    })

    it('should show project progress information', () => {
      renderComponent()
      
      // Project 1: Round 1, Stitch 0
      expect(screen.getByText(/第 1 圈/)).toBeInTheDocument()
      
      // Project 2: Round 5, Stitch 10  
      expect(screen.getByText(/第 5 圈/)).toBeInTheDocument()
    })
  })

  describe('Project Creation', () => {
    it('should open create project modal when button is clicked', () => {
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      expect(screen.getByText('新增專案')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('專案名稱')).toBeInTheDocument()
    })

    it('should validate project name before creating', () => {
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      const saveButton = screen.getByText('建立')
      expect(saveButton).toBeDisabled()
      
      const nameInput = screen.getByPlaceholderText('專案名稱')
      fireEvent.change(nameInput, { target: { value: 'New Project' } })
      
      expect(saveButton).not.toBeDisabled()
    })

    it('should call createProject when form is submitted', async () => {
      mockCreateProject.mockResolvedValue(undefined)
      
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      const nameInput = screen.getByPlaceholderText('專案名稱')
      fireEvent.change(nameInput, { target: { value: 'New Project' } })
      
      const sourceInput = screen.getByPlaceholderText('來源（選填）')
      fireEvent.change(sourceInput, { target: { value: 'Test Source' } })
      
      const saveButton = screen.getByText('建立')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith('New Project', 'Test Source')
      })
    })

    it('should close modal after successful creation', async () => {
      mockCreateProject.mockResolvedValue(undefined)
      
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      const nameInput = screen.getByPlaceholderText('專案名稱')
      fireEvent.change(nameInput, { target: { value: 'New Project' } })
      
      const saveButton = screen.getByText('建立')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.queryByText('新增專案')).not.toBeInTheDocument()
      })
    })

    it('should close modal when cancel is clicked', () => {
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      const cancelButton = screen.getByText('取消')
      fireEvent.click(cancelButton)
      
      expect(screen.queryByText('新增專案')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no projects', () => {
      mockUseProjectStore.mockReturnValue({
        projects: [],
        createProject: mockCreateProject,
        currentProject: null
      })
      
      renderComponent()
      
      expect(screen.getByText('還沒有專案')).toBeInTheDocument()
      expect(screen.getByText('建立您的第一個編織專案來開始')).toBeInTheDocument()
      expect(screen.getByText('🧶')).toBeInTheDocument()
    })

    it('should show create button in empty state', () => {
      mockUseProjectStore.mockReturnValue({
        projects: [],
        createProject: mockCreateProject,
        currentProject: null
      })
      
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: '建立專案' })
      expect(createButton).toBeInTheDocument()
    })
  })

  describe('User Authentication', () => {
    it('should handle sign out', () => {
      renderComponent()
      
      const signOutButton = screen.getByRole('button', { name: /登出/ })
      fireEvent.click(signOutButton)
      
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should show loading state during auth operations', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
        isLoading: true,
        error: null
      })
      
      renderComponent()
      
      expect(screen.getByText('載入中...')).toBeInTheDocument()
    })

    it('should handle user without display name', () => {
      const userWithoutName = { ...mockUser, displayName: null }
      mockUseAuthStore.mockReturnValue({
        user: userWithoutName,
        signOut: mockSignOut,
        isLoading: false,
        error: null
      })
      
      renderComponent()
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  describe('Project Navigation', () => {
    it('should have links to individual projects', () => {
      renderComponent()
      
      const projectLink1 = screen.getByRole('link', { name: /Test Project 1/ })
      expect(projectLink1).toHaveAttribute('href', '/project/project-1')
      
      const projectLink2 = screen.getByRole('link', { name: /Test Project 2/ })
      expect(projectLink2).toHaveAttribute('href', '/project/project-2')
    })
  })

  describe('Project Display Information', () => {
    it('should format dates correctly', () => {
      renderComponent()
      
      // Check that dates are displayed (exact format may vary based on locale)
      expect(screen.getByText(/2024/)).toBeInTheDocument()
    })

    it('should show project source when available', () => {
      renderComponent()
      
      expect(screen.getByText('Test Source 1')).toBeInTheDocument()
      expect(screen.getByText('Test Source 2')).toBeInTheDocument()
    })

    it('should handle projects without source', () => {
      const projectsWithoutSource = [
        { ...mockProjects[0], source: '' },
        { ...mockProjects[1], source: undefined }
      ]
      
      mockUseProjectStore.mockReturnValue({
        projects: projectsWithoutSource,
        createProject: mockCreateProject,
        currentProject: null
      })
      
      renderComponent()
      
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive grid layout', () => {
      renderComponent()
      
      const projectsContainer = screen.getByText('Test Project 1').closest('.grid')
      expect(projectsContainer).toHaveClass('grid')
    })

    it('should have responsive text sizes', () => {
      renderComponent()
      
      const title = screen.getByText('編織專案')
      expect(title).toHaveClass('text-xl', 'sm:text-2xl')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderComponent()
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('編織專案')
    })

    it('should have accessible form labels in modal', () => {
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      expect(screen.getByLabelText(/專案名稱/)).toBeInTheDocument()
      expect(screen.getByLabelText(/來源/)).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      createButton.focus()
      expect(createButton).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    it('should handle project creation errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateProject.mockRejectedValue(new Error('Creation failed'))
      
      renderComponent()
      
      const createButton = screen.getByRole('button', { name: /新增專案/ })
      fireEvent.click(createButton)
      
      const nameInput = screen.getByPlaceholderText('專案名稱')
      fireEvent.change(nameInput, { target: { value: 'New Project' } })
      
      const saveButton = screen.getByText('建立')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })
      
      consoleSpy.mockRestore()
    })
  })
})