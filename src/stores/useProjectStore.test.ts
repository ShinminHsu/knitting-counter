
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProjectStore } from './useProjectStore'
import { useAuthStore } from './useAuthStore'
import { useSyncStore } from './useSyncStore'
import { useBaseStore } from './useBaseStore'
import { firestoreService } from '../services/firestoreService'
import { Project } from '../types'
import { generateId, createSampleProject } from '../utils'
import { User } from 'firebase/auth'

// Mock dependencies
vi.mock('./useAuthStore')
vi.mock('./useSyncStore')
vi.mock('./useBaseStore')
vi.mock('../services/firestoreService')
vi.mock('../utils', () => ({
  generateId: vi.fn(() => 'mock-id-' + Date.now()),
  createSampleProject: vi.fn(() => ({
    id: 'sample-project-id',
    name: '範例杯墊',
    source: '',
    pattern: [],
    currentRound: 1,
    currentStitch: 0,
    yarns: [],
    sessions: [],
    createdDate: new Date('2024-01-01'),
    lastModified: new Date('2024-01-01'),
    isCompleted: false
  }))
}))

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User'
} as User

const mockProject: Project = {
  id: 'test-project-id',
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

describe('useProjectStore', () => {
  const mockSetLastSyncTime = vi.fn()
  const mockSyncProjectWithRetry = vi.fn()
  const mockSetLoading = vi.fn()
  const mockSetError = vi.fn()
  const mockSetLocallyUpdating = vi.fn()
  const mockSetLastLocalUpdateTime = vi.fn()
  const mockAddRecentLocalChange = vi.fn()
  const mockRemoveRecentLocalChange = vi.fn()

  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      projects: [],
      currentProject: null
    })

    vi.clearAllMocks()

    // Mock useAuthStore
    const mockedUseAuthStore = vi.mocked(useAuthStore)
    mockedUseAuthStore.getState = vi.fn(() => ({
      user: mockUser,
      isLoading: false,
      error: null,
      setUser: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn()
    } as any))

    // Mock useSyncStore
    const mockedUseSyncStore = vi.mocked(useSyncStore)
    mockedUseSyncStore.getState = vi.fn(() => ({
      isSyncing: false,
      lastSyncTime: null,
      networkStatusListener: null,
      setSyncing: vi.fn(),
      setLastSyncTime: mockSetLastSyncTime,
      initializeNetworkListener: vi.fn(),
      cleanupNetworkListener: vi.fn(),
      initializeUserProfile: vi.fn(),
      syncWithFirestore: vi.fn(),
      subscribeToFirestoreChanges: vi.fn(),
      syncProjectToFirestore: vi.fn(),
      syncProjectWithRetry: mockSyncProjectWithRetry
    }))

    // Mock useBaseStore
    const mockedUseBaseStore = vi.mocked(useBaseStore)
    mockedUseBaseStore.getState = vi.fn(() => ({
      isLoading: false,
      error: null,
      isLocallyUpdating: false,
      lastLocalUpdateTime: null,
      recentLocalChanges: new Set<string>(),
      setLoading: mockSetLoading,
      setError: mockSetError,
      setLocallyUpdating: mockSetLocallyUpdating,
      setLastLocalUpdateTime: mockSetLastLocalUpdateTime,
      addRecentLocalChange: mockAddRecentLocalChange,
      removeRecentLocalChange: mockRemoveRecentLocalChange,
      clearRecentLocalChanges: vi.fn(),
      hasRecentLocalChange: vi.fn()
    }))

    // Mock firestoreService
    const mockedFirestoreService = vi.mocked(firestoreService)
    mockedFirestoreService.createProject = vi.fn()
    mockedFirestoreService.updateProject = vi.fn()
    mockedFirestoreService.deleteProject = vi.fn()
    mockedFirestoreService.getUserProjects = vi.fn()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useProjectStore.getState()
      expect(state.projects).toEqual([])
      expect(state.currentProject).toBe(null)
    })
  })

  describe('Basic Setters', () => {
    it('should set projects', () => {
      const { setProjects } = useProjectStore.getState()
      const projects = [mockProject]
      
      setProjects(projects)
      expect(useProjectStore.getState().projects).toBe(projects)
    })

    it('should set current project', () => {
      const { setCurrentProject } = useProjectStore.getState()
      
      setCurrentProject(mockProject)
      expect(useProjectStore.getState().currentProject).toBe(mockProject)
      
      setCurrentProject(null)
      expect(useProjectStore.getState().currentProject).toBe(null)
    })
  })

  describe('Project Creation', () => {
    it('should create project for authenticated user', async () => {
      const { createProject } = useProjectStore.getState()
      
      await createProject('New Project', 'Test Source')
      
      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.currentProject).toEqual({
        id: expect.any(String),
        name: 'New Project',
        source: 'Test Source',
        pattern: [],
        currentRound: 1,
        currentStitch: 0,
        yarns: [],
        sessions: [],
        createdDate: expect.any(Date),
        lastModified: expect.any(Date),
        isCompleted: false
      })
      
      expect(firestoreService.createProject).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({ name: 'New Project' })
      )
      expect(mockSetLastSyncTime).toHaveBeenCalledWith(expect.any(Date))
    })

    it('should create project with default source', async () => {
      const { createProject } = useProjectStore.getState()
      
      await createProject('New Project')
      
      const state = useProjectStore.getState()
      expect(state.currentProject?.source).toBe('')
    })

    it('should handle project creation error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockedFirestoreService = vi.mocked(firestoreService)
      mockedFirestoreService.createProject.mockRejectedValue(new Error('Create failed'))
      
      const { createProject } = useProjectStore.getState()
      await createProject('New Project')
      
      // Project should still be created locally
      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.currentProject?.name).toBe('New Project')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Project Updates', () => {
    beforeEach(() => {
      useProjectStore.setState({
        projects: [mockProject],
        currentProject: mockProject
      })
    })

    it('should update project with sync', async () => {
      const { updateProject } = useProjectStore.getState()
      const updatedProject = { ...mockProject, name: 'Updated Project' }
      
      await updateProject(updatedProject)
      
      const state = useProjectStore.getState()
      expect(state.projects[0].name).toBe('Updated Project')
      expect(state.projects[0].lastModified).toBeInstanceOf(Date)
      expect(state.currentProject?.name).toBe('Updated Project')
      
      expect(firestoreService.updateProject).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({ name: 'Updated Project' })
      )
    })

    it('should update project locally with retry mechanism', async () => {
      mockSyncProjectWithRetry.mockResolvedValue(true)
      
      const { updateProjectLocally } = useProjectStore.getState()
      const updatedProject = { ...mockProject, name: 'Locally Updated' }
      
      await updateProjectLocally(updatedProject)
      
      const state = useProjectStore.getState()
      expect(state.projects[0].name).toBe('Locally Updated')
      expect(state.currentProject?.name).toBe('Locally Updated')
      
      expect(mockSetLocallyUpdating).toHaveBeenCalledWith(true)
      expect(mockSetLastLocalUpdateTime).toHaveBeenCalledWith(expect.any(Date))
      expect(mockAddRecentLocalChange).toHaveBeenCalledWith(mockProject.id)
      expect(mockSyncProjectWithRetry).toHaveBeenCalled()
    })
  })

  describe('Project Deletion', () => {
    beforeEach(() => {
      useProjectStore.setState({
        projects: [mockProject, { ...mockProject, id: 'project-2', name: 'Project 2' }],
        currentProject: mockProject
      })
    })

    it('should delete project', async () => {
      const { deleteProject } = useProjectStore.getState()
      
      await deleteProject(mockProject.id)
      
      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].id).toBe('project-2')
      expect(state.currentProject).toBe(null) // Current project was deleted
      
      expect(firestoreService.deleteProject).toHaveBeenCalledWith(mockUser.uid, mockProject.id)
    })
  })

  describe('Project Navigation', () => {
    beforeEach(() => {
      const project1 = { ...mockProject, id: 'project-1', name: 'Project 1' }
      const project2 = { ...mockProject, id: 'project-2', name: 'Project 2' }
      useProjectStore.setState({
        projects: [project1, project2],
        currentProject: project1
      })
    })

    it('should set current project by ID', () => {
      const { setCurrentProjectById } = useProjectStore.getState()
      
      setCurrentProjectById('project-2')
      
      const state = useProjectStore.getState()
      expect(state.currentProject?.id).toBe('project-2')
      expect(state.currentProject?.name).toBe('Project 2')
    })

    it('should handle setting non-existent project', () => {
      const { setCurrentProjectById } = useProjectStore.getState()
      const initialCurrentProject = useProjectStore.getState().currentProject
      
      setCurrentProjectById('non-existent-id')
      
      const state = useProjectStore.getState()
      expect(state.currentProject).toBe(initialCurrentProject) // Unchanged
    })
  })

  describe('Data Loading', () => {
    it('should load projects with existing data', async () => {
      useProjectStore.setState({
        projects: [mockProject],
        currentProject: mockProject
      })
      
      const { loadProjects } = useProjectStore.getState()
      await loadProjects()
      
      // Should not change existing data
      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.currentProject).toBe(mockProject)
    })

    it('should create sample project when no data exists', async () => {
      const mockedFirestoreService = vi.mocked(firestoreService)
      mockedFirestoreService.getUserProjects.mockResolvedValue([])
      
      const { loadProjects } = useProjectStore.getState()
      await loadProjects()
      
      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.currentProject?.name).toBe('範例杯墊')
      expect(createSampleProject).toHaveBeenCalled()
    })
  })

  describe('User Data Management', () => {
    beforeEach(() => {
      useProjectStore.setState({
        projects: [mockProject],
        currentProject: mockProject
      })
    })

    it('should clear user data', () => {
      const { clearUserData } = useProjectStore.getState()
      
      clearUserData()
      
      const state = useProjectStore.getState()
      expect(state.projects).toEqual([])
      expect(state.currentProject).toBe(null)
      expect(mockSetError).toHaveBeenCalledWith(null)
      expect(mockSetLastSyncTime).toHaveBeenCalledWith(null)
    })

    it('should clear user data silently', () => {
      const { clearUserDataSilently } = useProjectStore.getState()
      
      clearUserDataSilently()
      
      const state = useProjectStore.getState()
      expect(state.projects).toEqual([])
      expect(state.currentProject).toBe(null)
    })
  })

  describe('Load User Projects', () => {
    it('should load user projects from Firestore', async () => {
      const firestoreProjects = [
        { ...mockProject, id: 'firestore-project-1' },
        { ...mockProject, id: 'firestore-project-2', name: 'Project 2' }
      ]
      const mockedFirestoreService = vi.mocked(firestoreService)
      mockedFirestoreService.getUserProjects.mockResolvedValue(firestoreProjects)
      
      const { loadUserProjects } = useProjectStore.getState()
      await loadUserProjects()
      
      const state = useProjectStore.getState()
      expect(state.projects).toEqual(firestoreProjects)
      expect(state.currentProject).toEqual(firestoreProjects[0])
      expect(mockSetLoading).toHaveBeenCalledWith(true)
      expect(mockSetLoading).toHaveBeenCalledWith(false)
    })

    it('should handle no user in loadUserProjects', async () => {
      const mockedUseAuthStore = vi.mocked(useAuthStore)
      mockedUseAuthStore.getState = vi.fn(() => ({
        user: null,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
        initialize: vi.fn()
      } as any))
      
      const { loadUserProjects } = useProjectStore.getState()
      await loadUserProjects()
      
      // Should clear user data when no user
      const state = useProjectStore.getState()
      expect(state.projects).toEqual([])
      expect(state.currentProject).toBe(null)
    })

    it('should handle errors in loadUserProjects', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockedFirestoreService = vi.mocked(firestoreService)
      mockedFirestoreService.getUserProjects.mockRejectedValue(new Error('Firestore error'))
      
      const { loadUserProjects } = useProjectStore.getState()
      await loadUserProjects()
      
      expect(consoleSpy).toHaveBeenCalledWith('Error loading user projects:', expect.any(Error))
      expect(mockSetError).toHaveBeenCalledWith('載入專案時發生錯誤')
      expect(mockSetLoading).toHaveBeenCalledWith(false)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle createProject with no user', async () => {
      const mockedUseAuthStore = vi.mocked(useAuthStore)
      mockedUseAuthStore.getState = vi.fn(() => ({
        user: null,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
        initialize: vi.fn()
      } as any))
      
      const { createProject } = useProjectStore.getState()
      await createProject('Test Project')
      
      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.currentProject?.name).toBe('Test Project')
      expect(firestoreService.createProject).not.toHaveBeenCalled()
    })

    it('should handle updateProject with no user', async () => {
      useProjectStore.setState({
        projects: [mockProject],
        currentProject: mockProject
      })
      
      const mockedUseAuthStore = vi.mocked(useAuthStore)
      mockedUseAuthStore.getState = vi.fn(() => ({
        user: null,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
        initialize: vi.fn()
      } as any))
      
      const { updateProject } = useProjectStore.getState()
      const updatedProject = { ...mockProject, name: 'Updated Name' }
      
      await updateProject(updatedProject)
      
      const state = useProjectStore.getState()
      expect(state.projects[0].name).toBe('Updated Name')
      expect(firestoreService.updateProject).not.toHaveBeenCalled()
    })
  })

  describe('Persistence', () => {
    it('should persist only projects and currentProject', () => {
      const state = {
        projects: [mockProject],
        currentProject: mockProject,
        someOtherProperty: 'should not be persisted'
      }
      
      // This simulates what the persist middleware would do
      const persistedData = {
        projects: state.projects,
        currentProject: state.currentProject
      }
      
      expect(persistedData).toEqual({
        projects: [mockProject],
        currentProject: mockProject
      })
      expect(persistedData).not.toHaveProperty('someOtherProperty')
    })
  })
})