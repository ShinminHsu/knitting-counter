import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import YarnManagerView from '../YarnManagerView'
import { useProjectStore } from '../../stores/useProjectStore'
import { useYarnStore } from '../../stores/useYarnStore'
import { Project, Yarn } from '../../types'

// Mock the stores
vi.mock('../../stores/useProjectStore')
vi.mock('../../stores/useYarnStore')

// Mock SyncStatusIndicator
vi.mock('../SyncStatusIndicator', () => ({
  default: () => <div data-testid="sync-status">Sync Status</div>
}))

// Mock react-icons
vi.mock('react-icons/bs', () => ({
  BsHouse: () => <div data-testid="house-icon">🏠</div>
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'project-1' })
  }
})

// Mock generateId utility
vi.mock('../../utils', () => ({
  generateId: () => 'generated-id-123'
}))

const mockUseProjectStore = vi.mocked(useProjectStore)
const mockUseYarnStore = vi.mocked(useYarnStore)

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  source: 'Test Source',
  pattern: [],
  currentRound: 1,
  currentStitch: 0,
  yarns: [],
  sessions: [],
  createdDate: new Date('2024-01-01'),
  lastModified: new Date('2024-01-01'),
  isCompleted: false
}

const mockYarn: Yarn = {
  id: 'yarn-1',
  name: 'Test Yarn',
  color: { name: '紅色', hex: '#FF0000' },
  brand: 'Test Brand'
}

describe('YarnManagerView', () => {
  const mockSetCurrentProjectById = vi.fn()
  const mockAddYarn = vi.fn()
  const mockUpdateYarn = vi.fn()
  const mockDeleteYarn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseProjectStore.mockReturnValue({
      currentProject: mockProject,
      setCurrentProjectById: mockSetCurrentProjectById,
      projects: [mockProject]
    })

    mockUseYarnStore.mockReturnValue({
      addYarn: mockAddYarn,
      updateYarn: mockUpdateYarn,
      deleteYarn: mockDeleteYarn
    })
  })

  const renderComponent = (projectId = 'project-1') => {
    return render(
      <MemoryRouter initialEntries={[`/yarn/${projectId}`]}>
        <YarnManagerView />
      </MemoryRouter>
    )
  }

  describe('Component Rendering', () => {
    it('should render yarn manager header with correct title', () => {
      renderComponent()
      
      expect(screen.getByText('毛線管理')).toBeInTheDocument()
      expect(screen.getByText('+ 新增毛線')).toBeInTheDocument()
      expect(screen.getByTestId('sync-status')).toBeInTheDocument()
    })

    it('should render navigation buttons', () => {
      renderComponent()
      
      // Should have back button (←) and home button
      expect(screen.getByText('←')).toBeInTheDocument()
      expect(screen.getByTestId('house-icon')).toBeInTheDocument()
    })

    it('should render empty state when no yarns', () => {
      renderComponent()
      
      expect(screen.getByText('還沒有毛線')).toBeInTheDocument()
      expect(screen.getByText('點擊上方「新增毛線」按鈕來添加第一個毛線')).toBeInTheDocument()
      expect(screen.getByText('🧶')).toBeInTheDocument()
    })

    it('should render yarns when project has yarns', () => {
      const projectWithYarns: Project = {
        ...mockProject,
        yarns: [mockYarn]
      }

      mockUseProjectStore.mockReturnValue({
        currentProject: projectWithYarns,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: [projectWithYarns]
      })

      renderComponent()
      
      expect(screen.getByText('Test Yarn')).toBeInTheDocument()
      expect(screen.getByText('紅色 (#FF0000)')).toBeInTheDocument()
      expect(screen.getByText('Test Brand')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading when current project is null', () => {
      mockUseProjectStore.mockReturnValue({
        currentProject: null,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: []
      })

      renderComponent()
      
      expect(screen.getByText('載入中...')).toBeInTheDocument()
    })
  })

  describe('Project Navigation', () => {
    it('should call setCurrentProjectById when project is found', async () => {
      renderComponent('project-1')
      
      await waitFor(() => {
        expect(mockSetCurrentProjectById).toHaveBeenCalledWith('project-1')
      })
    })

    it('should navigate to 404 when project not found', async () => {
      mockUseProjectStore.mockReturnValue({
        currentProject: null,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: [] // No projects available
      })

      renderComponent('non-existent-project')
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/404')
      })
    })
  })

  describe('Yarn Management Modal', () => {
    it('should open add yarn modal when clicking add button', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      expect(screen.getByRole('heading', { name: '新增毛線' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('例如：4號線')).toBeInTheDocument()
    })

    it('should open modal from empty state button', () => {
      renderComponent()
      
      const emptyStateButton = screen.getByRole('button', { name: '新增毛線' })
      fireEvent.click(emptyStateButton)
      
      expect(screen.getByRole('heading', { name: '新增毛線' })).toBeInTheDocument()
    })

    it('should close modal when clicking cancel', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      fireEvent.click(screen.getByText('取消'))
      
      expect(screen.queryByRole('heading', { name: '新增毛線' })).not.toBeInTheDocument()
    })

    it('should validate yarn name before enabling save', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      // Clear the default yarn name to test validation
      const nameInput = screen.getByPlaceholderText('例如：4號線')
      fireEvent.change(nameInput, { target: { value: '' } })
      
      const saveButton = screen.getByText('新增')
      expect(saveButton).toBeDisabled()
      fireEvent.change(nameInput, { target: { value: 'Test Yarn Name' } })
      
      expect(saveButton).not.toBeDisabled()
    })

    it('should call addYarn when saving new yarn', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      const nameInput = screen.getByPlaceholderText('例如：4號線')
      fireEvent.change(nameInput, { target: { value: 'New Yarn' } })
      
      const saveButton = screen.getByText('新增')
      fireEvent.click(saveButton)
      
      expect(mockAddYarn).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Yarn',
        id: 'generated-id-123'
      }))
    })
  })

  describe('Yarn Editing', () => {
    it('should open edit modal when clicking edit button', () => {
      const projectWithYarns: Project = {
        ...mockProject,
        yarns: [mockYarn]
      }

      mockUseProjectStore.mockReturnValue({
        currentProject: projectWithYarns,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: [projectWithYarns]
      })

      renderComponent()
      
      fireEvent.click(screen.getByText('編輯'))
      
      expect(screen.getByText('編輯毛線')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Yarn')).toBeInTheDocument()
    })

    it('should call updateYarn when saving edited yarn', () => {
      const projectWithYarns: Project = {
        ...mockProject,
        yarns: [mockYarn]
      }

      mockUseProjectStore.mockReturnValue({
        currentProject: projectWithYarns,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: [projectWithYarns]
      })

      renderComponent()
      
      fireEvent.click(screen.getByText('編輯'))
      
      const nameInput = screen.getByDisplayValue('Test Yarn')
      fireEvent.change(nameInput, { target: { value: 'Updated Yarn' } })
      
      const saveButton = screen.getByText('更新')
      fireEvent.click(saveButton)
      
      expect(mockUpdateYarn).toHaveBeenCalledWith('yarn-1', expect.objectContaining({
        name: 'Updated Yarn'
      }))
    })
  })

  describe('Yarn Deletion', () => {
    it('should show confirmation dialog and delete yarn', () => {
      const projectWithYarns: Project = {
        ...mockProject,
        yarns: [mockYarn]
      }

      mockUseProjectStore.mockReturnValue({
        currentProject: projectWithYarns,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: [projectWithYarns]
      })

      // Mock window.confirm
      vi.stubGlobal('confirm', vi.fn(() => true))

      renderComponent()
      
      fireEvent.click(screen.getByText('刪除'))
      
      expect(mockDeleteYarn).toHaveBeenCalledWith('yarn-1')
      
      vi.unstubAllGlobals()
    })

    it('should not delete yarn if confirmation is cancelled', () => {
      const projectWithYarns: Project = {
        ...mockProject,
        yarns: [mockYarn]
      }

      mockUseProjectStore.mockReturnValue({
        currentProject: projectWithYarns,
        setCurrentProjectById: mockSetCurrentProjectById,
        projects: [projectWithYarns]
      })

      // Mock window.confirm to return false
      vi.stubGlobal('confirm', vi.fn(() => false))

      renderComponent()
      
      fireEvent.click(screen.getByText('刪除'))
      
      expect(mockDeleteYarn).not.toHaveBeenCalled()
      
      vi.unstubAllGlobals()
    })
  })

  describe('Color Selection', () => {
    it('should update yarn name when selecting preset color', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      // Find the red color button (should be #FF0000)
      const redColorButton = screen.getByTitle('紅色')
      fireEvent.click(redColorButton)
      
      const nameInput = screen.getByPlaceholderText('例如：4號線')
      expect(nameInput).toHaveValue('紅色毛線')
    })

    it('should show preview of selected yarn', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      expect(screen.getByText('預覽')).toBeInTheDocument()
      
      const nameInput = screen.getByPlaceholderText('例如：4號線')
      fireEvent.change(nameInput, { target: { value: 'Preview Yarn' } })
      
      expect(screen.getByText('Preview Yarn')).toBeInTheDocument()
    })

    it('should support custom color input', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      const colorInput = screen.getByRole('textbox', { hidden: true }) // Color input type="color" is treated as textbox
      fireEvent.change(colorInput, { target: { value: '#123456' } })
      
      const nameInput = screen.getByPlaceholderText('例如：4號線')
      expect(nameInput).toHaveValue('自定義毛線')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderComponent()
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('毛線管理')
    })

    it('should have accessible navigation links', () => {
      renderComponent()
      
      expect(screen.getByTitle('返回')).toBeInTheDocument()
      expect(screen.getByTitle('首頁')).toBeInTheDocument()
    })

    it('should have accessible form labels', () => {
      renderComponent()
      
      fireEvent.click(screen.getByText('+ 新增毛線'))
      
      expect(screen.getByText('毛線名稱 *')).toBeInTheDocument()
      expect(screen.getByText('品牌（選填）')).toBeInTheDocument()
      expect(screen.getByText('顏色')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile and desktop', () => {
      renderComponent()
      
      // Check that the component has responsive padding classes
      const mainContainer = screen.getByText('毛線管理').closest('div')
      // Get the parent container that has the responsive padding
      const responsiveContainer = mainContainer?.parentElement?.parentElement
      expect(responsiveContainer).toHaveClass('px-3', 'sm:px-4', 'lg:px-6')
    })
  })
})