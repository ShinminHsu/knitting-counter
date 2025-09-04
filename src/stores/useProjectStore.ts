
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project } from '../types'
import { generateId, createSampleProject } from '../utils'
import { useAuthStore } from './useAuthStore'
import { firestoreService } from '../services/firestoreService'
import { useSyncStore } from './useSyncStore'
import { useBaseStore, handleAsyncError } from './useBaseStore'
import { guestDataBackup } from '../services/guestDataBackup'
import { analyticsService } from '../services/analyticsService'

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

// 輔助函數：為訪客用戶自動備份數據到 IndexedDB
const backupGuestDataIfNeeded = async (projects: Project[], currentProject: Project | null) => {
  const { user, userType } = useAuthStore.getState()
  
  console.log('[PROJECT-BACKUP] Checking if backup needed:', {
    userType,
    hasUser: !!user,
    userEmail: user?.email,
    canUseFirebase: user ? useAuthStore.getState().canUseFirebase() : false,
    projectCount: projects.length,
    currentProjectName: currentProject?.name,
    currentProjectLastModified: currentProject?.lastModified instanceof Date ? currentProject.lastModified.toISOString() : currentProject?.lastModified
  })
  
  // 只有訪客用戶或非白名單用戶需要備份
  if (userType === 'guest' || (user && !useAuthStore.getState().canUseFirebase())) {
    try {
      // 為非 Firebase 用戶（訪客或非白名單用戶）生成用戶身份標識
      const userIdentity = userType === 'guest' ? 'guest' : user?.email || 'unknown'
      
      console.log('[PROJECT-BACKUP] Triggering backup for guest/non-whitelist user:', {
        userIdentity,
        projectsToBackup: projects.length,
        currentProjectData: {
          id: currentProject?.id,
          name: currentProject?.name,
          lastModified: currentProject?.lastModified instanceof Date ? currentProject.lastModified.toISOString() : currentProject?.lastModified,
          chartsCount: currentProject?.charts?.length || 0
        }
      })
      await guestDataBackup.backupGuestData(projects, currentProject, userIdentity)
      console.log('[PROJECT-BACKUP] Guest data backed up to IndexedDB with identity:', userIdentity)
    } catch (error) {
      console.error('[PROJECT-BACKUP] Failed to backup guest data:', error)
    }
  } else {
    console.log('[PROJECT-BACKUP] Backup not needed - user can use Firebase')
  }
}

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
        
        const newState = {
          projects: [...get().projects, newProject],
          currentProject: newProject
        }
        
        set(newState)
        
        // 自動備份訪客數據
        backupGuestDataIfNeeded(newState.projects, newState.currentProject)
        
        // 記錄統計數據
        analyticsService.recordProjectAction('create', newProject.id, newProject.name, {
          roundsCount: newProject.pattern?.length || 0,
          stitchesCount: newProject.pattern?.reduce((sum, round) => sum + (round.stitches?.length || 0), 0) || 0,
          chartsCount: newProject.charts?.length || 0
        })
        
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
        
        const newState = {
          projects: get().projects.map(p => 
            p.id === updatedProject.id ? updatedProjectWithTimestamp : p
          ),
          currentProject: get().currentProject?.id === updatedProject.id 
            ? updatedProjectWithTimestamp 
            : get().currentProject
        }
        
        set(newState)
        
        // 自動備份訪客數據
        backupGuestDataIfNeeded(newState.projects, newState.currentProject)
        
        // 記錄統計數據
        analyticsService.recordProjectAction('update', updatedProjectWithTimestamp.id, updatedProjectWithTimestamp.name, {
          roundsCount: updatedProjectWithTimestamp.pattern?.length || 0,
          stitchesCount: updatedProjectWithTimestamp.pattern?.reduce((sum, round) => sum + (round.stitches?.length || 0), 0) || 0,
          chartsCount: updatedProjectWithTimestamp.charts?.length || 0,
          isCompleted: updatedProjectWithTimestamp.isCompleted
        })
        
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
          lastModified: updatedProject.lastModified,
          projectName: updatedProject.name
        })
        
        // Update local state immediately - this should be instant
        const newState = {
          projects: get().projects.map(p =>
            p.id === updatedProject.id ? updatedProject : p
          ),
          currentProject: get().currentProject?.id === updatedProject.id
            ? updatedProject
            : get().currentProject
        }
        
        set(newState)

        // 自動備份訪客數據 - 延遲執行確保狀態已更新
        setTimeout(async () => {
          await backupGuestDataIfNeeded(newState.projects, newState.currentProject)
        }, 100)

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
        
        const newState = {
          projects: get().projects.filter(p => p.id !== id),
          currentProject: get().currentProject?.id === id ? null : get().currentProject
        }
        
        set(newState)
        
        // 自動備份訪客數據
        backupGuestDataIfNeeded(newState.projects, newState.currentProject)
        
        // 記錄統計數據
        const deletedProject = get().projects.find(p => p.id === id)
        if (deletedProject) {
          analyticsService.recordProjectAction('delete', id, deletedProject.name)
        }
        
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
          // 記錄專案查看統計
          analyticsService.recordProjectAction('view', project.id, project.name)
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
          const { projects: currentProjects } = get()
          if (!currentProjects || currentProjects.length === 0) {
            console.log('loadProjects: creating sample project (no existing projects)')
            const sampleProject = createSampleProject()
            const newState = {
              projects: [sampleProject],
              currentProject: sampleProject
            }
            set(newState)
            
            // 自動備份訪客數據
            await backupGuestDataIfNeeded(newState.projects, newState.currentProject)
          } else {
            console.log('loadProjects: keeping existing projects, not creating sample project')
            // 只備份現有數據，不創建新項目
            await backupGuestDataIfNeeded(currentProjects, get().currentProject)
          }
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
            // 本地模式，檢查是否已有項目，避免覆蓋現有數據
            const { projects: currentProjects } = get()
            
            if (!currentProjects || currentProjects.length === 0) {
              console.log('Local mode: creating sample project locally (no existing projects)')
              const sampleProject = createSampleProject()
              const newState = {
                projects: [sampleProject],
                currentProject: sampleProject
              }
              set(newState)
              
              // 自動備份訪客數據
              await backupGuestDataIfNeeded(newState.projects, newState.currentProject)
            } else {
              console.log('Local mode: keeping existing projects, not creating sample project')
              // 只備份現有數據，不創建新項目
              await backupGuestDataIfNeeded(currentProjects, get().currentProject)
            }
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
                const newState = {
                  projects: [sampleProject],
                  currentProject: sampleProject
                }
                set(newState)
                
                // 自動備份訪客數據
                await backupGuestDataIfNeeded(newState.projects, newState.currentProject)
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