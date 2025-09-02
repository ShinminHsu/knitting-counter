
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project } from '../types'
import { generateId, createSampleProject } from '../utils'
import { useAuthStore } from './useAuthStore'
import { firestoreService } from '../services/firestoreService'
import { useSyncStore } from './useSyncStore'
import { useBaseStore, handleAsyncError } from './useBaseStore'

interface ProjectStoreState {
  projects: Project[]
  currentProject: Project | null
}

interface ProjectStoreActions {
  // Project management
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  
  // CRUD operations
  createProject: (name: string, source?: string) => Promise<void>
  updateProject: (project: Project) => Promise<void>
  updateProjectLocally: (project: Project) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProjectById: (id: string) => void
  
  // Data loading
  loadProjects: () => Promise<void>
  loadUserProjects: () => Promise<void>
  
  // User data management
  clearUserData: () => void
  clearUserDataSilently: () => void
}

interface ProjectStore extends ProjectStoreState, ProjectStoreActions {}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,

      // Basic setters
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),

      // Create new project
      createProject: async (name, source) => {
        const { user } = useAuthStore.getState()
        
        const newProject: Project = {
          id: generateId(),
          name,
          source: source || '',
          pattern: [],
          currentRound: 1,
          currentStitch: 0,
          yarns: [],
          sessions: [],
          createdDate: new Date(),
          lastModified: new Date(),
          isCompleted: false
        }
        
        set(state => ({
          projects: [...state.projects, newProject],
          currentProject: newProject
        }))
        
        // Sync to Firestore (only if user can use Firebase)
        const { canUseFirebase } = useAuthStore.getState()
        if (user && canUseFirebase()) {
          try {
            await firestoreService.createProject(user.uid, newProject)
            useSyncStore.getState().setLastSyncTime(new Date())
            console.log('[PROJECT] Project created and synced:', newProject.name)
          } catch (error) {
            handleAsyncError(error, 'Create Project')
          }
        } else if (user) {
          console.log('[PROJECT] Project created locally (user not in whitelist):', newProject.name)
        }
      },

      // Update project with sync
      updateProject: async (updatedProject) => {
        const { user } = useAuthStore.getState()
        
        const updatedProjectWithTimestamp = {
          ...updatedProject,
          lastModified: new Date()
        }
        
        set(state => ({
          projects: state.projects.map(p => 
            p.id === updatedProject.id ? updatedProjectWithTimestamp : p
          ),
          currentProject: state.currentProject?.id === updatedProject.id 
            ? updatedProjectWithTimestamp 
            : state.currentProject
        }))
        
        // Sync to Firestore (only if user can use Firebase)
        const { canUseFirebase } = useAuthStore.getState()
        if (user && canUseFirebase()) {
          try {
            await firestoreService.updateProject(user.uid, updatedProjectWithTimestamp)
            useSyncStore.getState().setLastSyncTime(new Date())
            console.log('[PROJECT] Project updated and synced:', updatedProjectWithTimestamp.name)
          } catch (error) {
            handleAsyncError(error, 'Update Project')
          }
        } else if (user) {
          console.log('[PROJECT] Project updated locally (user not in whitelist):', updatedProjectWithTimestamp.name)
        }
      },

      // Update project locally with non-blocking background sync
      updateProjectLocally: async (updatedProject: Project) => {
        console.log('[PROJECT] Starting local project update:', {
          projectId: updatedProject.id,
          lastModified: updatedProject.lastModified
        })
        
        // Update local state immediately - this should be instant
        set(state => ({
          projects: state.projects.map(p =>
            p.id === updatedProject.id ? updatedProject : p
          ),
          currentProject: state.currentProject?.id === updatedProject.id
            ? updatedProject
            : state.currentProject
        }))

        // Use base store for local update tracking
        const baseStore = useBaseStore.getState()
        baseStore.setLastLocalUpdateTime(new Date())
        baseStore.addRecentLocalChange(updatedProject.id)

        // Perform background sync without blocking UI
        const { user } = useAuthStore.getState()
        if (user) {
          // Fire and forget - don't await the sync operation
          const syncStore = useSyncStore.getState()
          syncStore.syncProjectWithRetry(
            updatedProject,
            2, // reduced retries for faster response
            (attempt, maxRetries) => {
              // Only show error for final failure, not during retries
              if (attempt === maxRetries) {
                baseStore.setError('同步失敗，資料已保存在本地')
                setTimeout(() => baseStore.setError(null), 3000)
              }
            }
          ).then(success => {
            if (success) {
              console.log('[PROJECT] Background sync successful:', updatedProject.id)
            } else {
              console.log('[PROJECT] Background sync failed, data saved locally:', updatedProject.id)
            }
          }).catch(error => {
            console.error('[PROJECT] Background sync error:', error)
          })
        }

        // Quick cleanup
        setTimeout(() => {
          baseStore.removeRecentLocalChange(updatedProject.id)
        }, 3000) // Reduced from 5000ms to 3000ms
      },

      // Delete project
      deleteProject: async (id) => {
        const { user } = useAuthStore.getState()
        
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
        
        // Sync to Firestore (only if user can use Firebase)
        const { canUseFirebase } = useAuthStore.getState()
        if (user && canUseFirebase()) {
          try {
            await firestoreService.deleteProject(user.uid, id)
            useSyncStore.getState().setLastSyncTime(new Date())
            console.log('[PROJECT] Project deleted and synced:', id)
          } catch (error) {
            handleAsyncError(error, 'Delete Project')
          }
        } else if (user) {
          console.log('[PROJECT] Project deleted locally (user not in whitelist):', id)
        }
      },

      // Set current project by ID
      setCurrentProjectById: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({ currentProject: project })
        }
      },

      // Load projects (local fallback)
      loadProjects: async () => {
        const { projects } = get()
        const user = useAuthStore.getState().user
        
        if (projects.length === 0) {
          // If user is logged in and can use Firebase, try to load from Firestore first
          const { canUseFirebase } = useAuthStore.getState()
          if (user && canUseFirebase()) {
            try {
              const firestoreProjects = await firestoreService.getUserProjects(user.uid)
              if (firestoreProjects.length > 0) {
                set({
                  projects: firestoreProjects,
                  currentProject: firestoreProjects[0]
                })
                return
              }
            } catch (error) {
              console.error('Error loading from Firestore in loadProjects:', error)
            }
          }
          
          // Create sample project only if no data exists
          const sampleProject = createSampleProject()
          set({
            projects: [sampleProject],
            currentProject: sampleProject
          })
        }
      },

      // Load user projects from Firestore
      loadUserProjects: async () => {
        const { user, canUseFirebase } = useAuthStore.getState()
        if (!user) {
          get().clearUserDataSilently()
          return
        }
        
        try {
          useBaseStore.getState().setLoading(true)
          useBaseStore.getState().setError(null)
          
          // Try to load from Firestore first (only if user can use Firebase)
          if (canUseFirebase()) {
            const firestoreProjects = await firestoreService.getUserProjects(user.uid)
          
            if (firestoreProjects.length > 0) {
            console.log('Loaded projects from Firestore:', firestoreProjects.length)
            
            // Ensure backward compatibility with migrated data
            const migratedProjects = firestoreProjects.map((project: Project) => ({
              ...project,
              pattern: project.pattern?.map((round) => ({
                ...round,
                stitches: round.stitches?.map((stitch) => ({
                  ...stitch,
                  customName: stitch.customName || undefined,
                  customSymbol: stitch.customSymbol || undefined
                })) || [],
                stitchGroups: round.stitchGroups?.map((group) => ({
                  ...group,
                  stitches: group.stitches?.map((stitch) => ({
                    ...stitch,
                    customName: stitch.customName || undefined,
                    customSymbol: stitch.customSymbol || undefined
                  })) || []
                })) || []
              })) || []
            }))
            
            set({
              projects: migratedProjects,
              currentProject: migratedProjects[0] || null
            })
            useSyncStore.getState().setLastSyncTime(new Date())
            return
            }
          }
          
          // If Firestore has no data, try to migrate from localStorage
          const userStorageKey = `user_${user.uid}_knitting-counter-storage`
          const savedData = localStorage.getItem(userStorageKey)
          
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData)
              const state = parsed.state || parsed
              
              if (state.projects && state.projects.length > 0) {
                // Convert date formats and ensure backward compatibility
                interface LegacyProject {
                  id: string
                  name: string
                  source?: string
                  createdDate: string | Date
                  lastModified: string | Date
                  isCompleted?: boolean
                  currentRound?: number
                  currentStitch?: number
                  yarns?: Array<{
                    id: string
                    brand: string
                    name: string
                    color: string
                    weight?: string
                    [key: string]: unknown
                  }>
                  sessions?: Array<{
                    id: string
                    startTime: string | Date
                    duration?: number
                    roundsCompleted?: number
                  }>
                  pattern?: Array<{
                    id: string
                    roundNumber: number
                    notes?: string
                    stitches?: Array<{
                      id: string
                      type: string
                      yarnId: string
                      count: number
                      customName?: string
                      customSymbol?: string
                    }>
                    stitchGroups?: Array<{
                      id: string
                      name: string
                      repeatCount: number
                      stitches: Array<{
                        id: string
                        type: string
                        yarnId: string
                        count: number
                        customName?: string
                        customSymbol?: string
                      }>
                    }>
                  }>
                }
                
                const localProjects = state.projects.map((project: LegacyProject) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || [],
                  pattern: project.pattern?.map((round) => ({
                    ...round,
                    stitches: round.stitches?.map((stitch) => ({
                      ...stitch,
                      customName: stitch.customName || undefined,
                      customSymbol: stitch.customSymbol || undefined
                    })) || [],
                    stitchGroups: round.stitchGroups?.map((group) => ({
                      ...group,
                      stitches: group.stitches?.map((stitch) => ({
                        ...stitch,
                        customName: stitch.customName || undefined,
                        customSymbol: stitch.customSymbol || undefined
                      })) || []
                    })) || []
                  })) || []
                }))
                
                console.log('Migrating local projects to Firestore:', localProjects.length)
                
                // Upload to Firestore (only if user can use Firebase)
                if (canUseFirebase()) {
                  for (const project of localProjects) {
                    await firestoreService.createProject(user.uid, project)
                  }
                } else {
                  console.log('User not in whitelist, keeping projects local only')
                }
                
                set({
                  projects: localProjects,
                  currentProject: localProjects[0] || null
                })
                useSyncStore.getState().setLastSyncTime(new Date())
                return
              }
            } catch (error) {
              console.error('Error parsing saved data:', error)
            }
          }
          
          // If no data exists, check if sample project already exists to avoid duplicates
          if (canUseFirebase()) {
            const existingProjects = await firestoreService.getUserProjects(user.uid)
            const hasSampleProject = existingProjects.some(p => p.name === '範例杯墊')
            
            if (!hasSampleProject) {
              console.log('No data found, creating sample project')
              const sampleProject = createSampleProject()
              await firestoreService.createProject(user.uid, sampleProject)
              
              set({
                projects: [sampleProject],
                currentProject: sampleProject
              })
              useSyncStore.getState().setLastSyncTime(new Date())
            } else {
              console.log('Sample project already exists, loading existing projects')
              set({
                projects: existingProjects,
                currentProject: existingProjects[0] || null
              })
              useSyncStore.getState().setLastSyncTime(new Date())
            }
          } else {
            // 本地模式，創建範例專案但不同步到 Firebase
            console.log('Local mode: creating sample project locally')
            const sampleProject = createSampleProject()
            set({
              projects: [sampleProject],
              currentProject: sampleProject
            })
          }
          
        } catch (error) {
          console.error('Error loading user projects:', error)
          useBaseStore.getState().setError('載入專案時發生錯誤')
          
          // Fallback to localStorage on error
          const userStorageKey = `user_${user.uid}_knitting-counter-storage`
          const savedData = localStorage.getItem(userStorageKey)
          
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData)
              const state = parsed.state || parsed
              
              if (state.projects) {
                interface FallbackProject {
                  id: string
                  name: string
                  source?: string
                  createdDate: string | Date
                  lastModified: string | Date
                  isCompleted?: boolean
                  sessions?: Array<{
                    id: string
                    startTime: string | Date
                    duration?: number
                    roundsCompleted?: number
                  }>
                  [key: string]: unknown
                }
                
                const projects = state.projects.map((project: FallbackProject) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || []
                }))
                
                set({
                  projects,
                  currentProject: projects[0] || null
                })
              }
            } catch (localError) {
              console.error('Error loading from localStorage:', localError)
              // Only create sample project if no projects exist
              const { projects } = get()
              if (!projects || projects.length === 0) {
                const sampleProject = createSampleProject()
                set({
                  projects: [sampleProject],
                  currentProject: sampleProject
                })
              }
            }
          }
        } finally {
          useBaseStore.getState().setLoading(false)
        }
      },

      // Clear user data
      clearUserData: () => {
        set({
          projects: [],
          currentProject: null
        })
        useBaseStore.getState().setError(null)
        useSyncStore.getState().setLastSyncTime(null)
      },
      
      clearUserDataSilently: () => {
        const currentState = get()
        Object.assign(currentState, {
          projects: [],
          currentProject: null
        })
        useBaseStore.getState().setError(null)
        useSyncStore.getState().setLastSyncTime(null)
      }
    }),
    {
      name: 'project-store',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject
      })
    }
  )
)