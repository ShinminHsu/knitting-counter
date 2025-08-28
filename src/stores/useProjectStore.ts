
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
        
        // Sync to Firestore
        if (user) {
          try {
            await firestoreService.createProject(user.uid, newProject)
            useSyncStore.getState().setLastSyncTime(new Date())
            console.log('[PROJECT] Project created and synced:', newProject.name)
          } catch (error) {
            handleAsyncError(error, 'Create Project')
          }
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
        
        // Sync to Firestore
        if (user) {
          try {
            await firestoreService.updateProject(user.uid, updatedProjectWithTimestamp)
            useSyncStore.getState().setLastSyncTime(new Date())
            console.log('[PROJECT] Project updated and synced:', updatedProjectWithTimestamp.name)
          } catch (error) {
            handleAsyncError(error, 'Update Project')
          }
        }
      },

      // Update project locally with retry sync mechanism
      updateProjectLocally: async (updatedProject: Project) => {
        console.log('[PROJECT] Starting local project update:', {
          projectId: updatedProject.id,
          lastModified: updatedProject.lastModified,
          userAgent: navigator.userAgent
        })
        
        // Update local state immediately
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
        baseStore.setLocallyUpdating(true)
        baseStore.setLastLocalUpdateTime(new Date())
        baseStore.addRecentLocalChange(updatedProject.id)

        // Attempt sync to Firestore with retry mechanism
        const { user } = useAuthStore.getState()
        if (user) {
          const syncStore = useSyncStore.getState()
          const success = await syncStore.syncProjectWithRetry(
            updatedProject,
            3, // max retries
            (attempt, maxRetries) => {
              baseStore.setError(`同步失敗，正在重試 (${attempt}/${maxRetries})`)
              
              // Clear error after a delay during retry
              setTimeout(() => {
                baseStore.setError(null)
              }, 2000)
            }
          )

          if (success) {
            console.log('[PROJECT] Project synced successfully:', updatedProject.id)
          } else {
            console.log('[PROJECT] Project sync failed, data saved locally:', updatedProject.id)
          }
        }

        baseStore.setLocallyUpdating(false)

        // Schedule cleanup of recent change flag
        setTimeout(() => {
          baseStore.removeRecentLocalChange(updatedProject.id)
        }, 5000)
      },

      // Delete project
      deleteProject: async (id) => {
        const { user } = useAuthStore.getState()
        
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
        
        // Sync to Firestore
        if (user) {
          try {
            await firestoreService.deleteProject(user.uid, id)
            useSyncStore.getState().setLastSyncTime(new Date())
            console.log('[PROJECT] Project deleted and synced:', id)
          } catch (error) {
            handleAsyncError(error, 'Delete Project')
          }
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
          // If user is logged in, try to load from Firestore first
          if (user) {
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
        const { user } = useAuthStore.getState()
        if (!user) {
          get().clearUserDataSilently()
          return
        }
        
        try {
          useBaseStore.getState().setLoading(true)
          useBaseStore.getState().setError(null)
          
          // Try to load from Firestore first
          const firestoreProjects = await firestoreService.getUserProjects(user.uid)
          
          if (firestoreProjects.length > 0) {
            console.log('Loaded projects from Firestore:', firestoreProjects.length)
            
            // Ensure backward compatibility with migrated data
            const migratedProjects = firestoreProjects.map((project: any) => ({
              ...project,
              pattern: project.pattern?.map((round: any) => ({
                ...round,
                stitches: round.stitches?.map((stitch: any) => ({
                  ...stitch,
                  customName: stitch.customName || undefined,
                  customSymbol: stitch.customSymbol || undefined
                })) || [],
                stitchGroups: round.stitchGroups?.map((group: any) => ({
                  ...group,
                  stitches: group.stitches?.map((stitch: any) => ({
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
          
          // If Firestore has no data, try to migrate from localStorage
          const userStorageKey = `user_${user.uid}_knitting-counter-storage`
          const savedData = localStorage.getItem(userStorageKey)
          
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData)
              const state = parsed.state || parsed
              
              if (state.projects && state.projects.length > 0) {
                // Convert date formats and ensure backward compatibility
                const localProjects = state.projects.map((project: any) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session: any) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || [],
                  pattern: project.pattern?.map((round: any) => ({
                    ...round,
                    stitches: round.stitches?.map((stitch: any) => ({
                      ...stitch,
                      customName: stitch.customName || undefined,
                      customSymbol: stitch.customSymbol || undefined
                    })) || [],
                    stitchGroups: round.stitchGroups?.map((group: any) => ({
                      ...group,
                      stitches: group.stitches?.map((stitch: any) => ({
                        ...stitch,
                        customName: stitch.customName || undefined,
                        customSymbol: stitch.customSymbol || undefined
                      })) || []
                    })) || []
                  })) || []
                }))
                
                console.log('Migrating local projects to Firestore:', localProjects.length)
                
                // Upload to Firestore
                for (const project of localProjects) {
                  await firestoreService.createProject(user.uid, project)
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
                const projects = state.projects.map((project: any) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session: any) => ({
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