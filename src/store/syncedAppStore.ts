import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project, WorkSession, Yarn, Round, StitchInfo, StitchGroup } from '../types'
import { generateId, createSampleProject, getRoundTotalStitches } from '../utils'
import { useAuthStore } from './authStore'
import { firestoreService, UserProfile } from '../services/firestoreService'

interface SyncedAppStore {
  // 狀態
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  isSyncing: boolean
  lastSyncTime: Date | null
  isLocallyUpdating: boolean
  
  // 動作
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSyncing: (syncing: boolean) => void
  
  // 用戶數據管理
  clearUserData: () => void
  clearUserDataSilently: () => void
  loadUserProjects: () => Promise<void>
  
  // 雲端同步
  syncWithFirestore: () => Promise<void>  
  initializeUserProfile: (user: any) => Promise<void>
  subscribeToFirestoreChanges: () => (() => void) | null
  
  // 專案管理
  createProject: (name: string, source?: string) => Promise<void>
  updateProject: (project: Project) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (id: string) => void
  loadProjects: () => Promise<void>
  
  // 編織進度
  nextStitch: () => Promise<void>
  previousStitch: () => Promise<void>
  setCurrentRound: (roundNumber: number) => Promise<void>
  setCurrentStitch: (stitchNumber: number) => Promise<void>
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  
  // 織圖管理
  addRound: (round: Round) => Promise<void>
  updateRound: (round: Round) => Promise<void>
  deleteRound: (roundNumber: number) => Promise<void>
  addStitchToRound: (roundNumber: number, stitch: StitchInfo) => Promise<void>
  addStitchGroupToRound: (roundNumber: number, group: StitchGroup) => Promise<void>
  updateStitchInRound: (roundNumber: number, stitchId: string, updatedStitch: StitchInfo) => Promise<void>
  deleteStitchFromRound: (roundNumber: number, stitchId: string) => Promise<void>
  reorderStitchesInRound: (roundNumber: number, fromIndex: number, toIndex: number) => Promise<void>
  updateStitchGroupInRound: (roundNumber: number, groupId: string, updatedGroup: StitchGroup) => Promise<void>
  deleteStitchGroupFromRound: (roundNumber: number, groupId: string) => Promise<void>
  reorderStitchGroupsInRound: (roundNumber: number, fromIndex: number, toIndex: number) => Promise<void>
  
  // 毛線管理
  addYarn: (yarn: Yarn) => Promise<void>
  updateYarn: (yarn: Yarn) => Promise<void>
  deleteYarn: (id: string) => Promise<void>
}

export const useSyncedAppStore = create<SyncedAppStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,
      isSyncing: false,
      lastSyncTime: null,
      isLocallyUpdating: false,

      // 基本動作
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      
      // 用戶數據管理
      clearUserData: () => {
        set({
          projects: [],
          currentProject: null,
          error: null,
          lastSyncTime: null
        })
      },
      
      clearUserDataSilently: () => {
        const currentState = get()
        Object.assign(currentState, {
          projects: [],
          currentProject: null,
          error: null,
          lastSyncTime: null
        })
      },
      
      loadUserProjects: async () => {
        const { user } = useAuthStore.getState()
        if (!user) {
          get().clearUserDataSilently()
          return
        }
        
        try {
          set({ isLoading: true, error: null })
          
          // 先嘗試從Firestore載入
          const firestoreProjects = await firestoreService.getUserProjects(user.uid)
          
          if (firestoreProjects.length > 0) {
            console.log('Loaded projects from Firestore:', firestoreProjects.length)
            set({
              projects: firestoreProjects,
              currentProject: firestoreProjects[0] || null,
              lastSyncTime: new Date()
            })
            return
          }
          
          // 如果Firestore沒有資料，嘗試從localStorage載入並上傳
          const userStorageKey = `user_${user.uid}_knitting-counter-storage`
          const savedData = localStorage.getItem(userStorageKey)
          
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData)
              const state = parsed.state || parsed
              
              if (state.projects && state.projects.length > 0) {
                // 轉換日期格式
                const localProjects = state.projects.map((project: any) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session: any) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || []
                }))
                
                console.log('Migrating local projects to Firestore:', localProjects.length)
                
                // 上傳到Firestore
                for (const project of localProjects) {
                  await firestoreService.createProject(user.uid, project)
                }
                
                set({
                  projects: localProjects,
                  currentProject: localProjects[0] || null,
                  lastSyncTime: new Date()
                })
                return
              }
            } catch (error) {
              console.error('Error parsing saved data:', error)
            }
          }
          
          // 如果都沒有資料，建立樣本專案並上傳
          console.log('No data found, creating sample project')
          const sampleProject = createSampleProject()
          await firestoreService.createProject(user.uid, sampleProject)
          
          set({
            projects: [sampleProject],
            currentProject: sampleProject,
            lastSyncTime: new Date()
          })
          
        } catch (error) {
          console.error('Error loading user projects:', error)
          set({ error: '載入專案時發生錯誤' })
          
          // 發生錯誤時，嘗試從localStorage載入作為備用
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
              const sampleProject = createSampleProject()
              set({
                projects: [sampleProject],
                currentProject: sampleProject
              })
            }
          }
        } finally {
          set({ isLoading: false })
        }
      },

      // 雲端同步功能
      syncWithFirestore: async () => {
        const { user } = useAuthStore.getState()
        if (!user) return
        
        try {
          set({ isSyncing: true, error: null })
          
          const firestoreProjects = await firestoreService.getUserProjects(user.uid)
          
          set({
            projects: firestoreProjects,
            currentProject: firestoreProjects.find(p => p.id === get().currentProject?.id) || firestoreProjects[0] || null,
            lastSyncTime: new Date()
          })
        } catch (error) {
          console.error('Error syncing with Firestore:', error)
          set({ error: '同步失敗' })
        } finally {
          set({ isSyncing: false })
        }
      },
      
      initializeUserProfile: async (user) => {
        try {
          const existingProfile = await firestoreService.getUserProfile(user.uid)
          
          if (!existingProfile) {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              createdAt: new Date(),
              lastLogin: new Date()
            }
            
            await firestoreService.createUserProfile(newProfile)
          } else {
            await firestoreService.updateUserLastLogin(user.uid)
          }
        } catch (error) {
          console.error('Error initializing user profile:', error)
        }
      },
      
      subscribeToFirestoreChanges: () => {
        const { user } = useAuthStore.getState()
        if (!user) return null
        
        return firestoreService.subscribeToUserProjects(user.uid, (projects) => {
          const currentState = get()
          
          // 避免覆蓋本地更新和同步狀態
          if (!currentState.isSyncing && !currentState.isLocallyUpdating) {
            set({
              projects,
              currentProject: projects.find(p => p.id === currentState.currentProject?.id) || projects[0] || null,
              lastSyncTime: new Date()
            })
          }
        })
      },

      // 專案管理 - 包含同步功能
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
        
        // 同步到Firestore
        if (user) {
          try {
            await firestoreService.createProject(user.uid, newProject)
            set({ lastSyncTime: new Date() })
          } catch (error) {
            console.error('Error syncing new project to Firestore:', error)
          }
        }
      },

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
        
        // 同步到Firestore
        if (user) {
          try {
            await firestoreService.updateProject(user.uid, updatedProjectWithTimestamp)
            set({ lastSyncTime: new Date() })
          } catch (error) {
            console.error('Error syncing project update to Firestore:', error)
          }
        }
      },

      deleteProject: async (id) => {
        const { user } = useAuthStore.getState()
        
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
        
        // 同步到Firestore
        if (user) {
          try {
            await firestoreService.deleteProject(user.uid, id)
            set({ lastSyncTime: new Date() })
          } catch (error) {
            console.error('Error syncing project deletion to Firestore:', error)
          }
        }
      },

      setCurrentProject: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({ currentProject: project })
        }
      },

      loadProjects: async () => {
        const { projects } = get()
        if (projects.length === 0) {
          const sampleProject = createSampleProject()
          set({
            projects: [sampleProject],
            currentProject: sampleProject
          })
        }
      },

      // 編織進度管理 - 包含同步功能
      nextStitch: async () => {
        const { currentProject } = get()
        if (!currentProject || currentProject.isCompleted) {
          console.log('[DEBUG] nextStitch: No current project or already completed')
          return
        }

        const currentRound = currentProject.pattern.find(r => r.roundNumber === currentProject.currentRound)
        if (!currentRound) {
          console.log('[DEBUG] nextStitch: Current round not found', currentProject.currentRound)
          return
        }

        const totalStitchesInRound = getRoundTotalStitches(currentRound)
        let newStitch = currentProject.currentStitch + 1
        let newRound = currentProject.currentRound
        let isCompleted = false

        if (newStitch >= totalStitchesInRound) {
          const maxRoundNumber = Math.max(...currentProject.pattern.map(r => r.roundNumber))
          
          if (currentProject.currentRound >= maxRoundNumber) {
            isCompleted = true
            newStitch = totalStitchesInRound
            newRound = currentProject.currentRound
          } else {
            newStitch = 0
            newRound = currentProject.currentRound + 1
          }
        }

        const updatedProject = {
          ...currentProject,
          currentRound: newRound,
          currentStitch: newStitch,
          isCompleted,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      previousStitch: async () => {
        const { currentProject } = get()
        if (!currentProject) return

        let newStitch = currentProject.currentStitch - 1
        let newRound = currentProject.currentRound

        if (newStitch < 0 && newRound > 1) {
          newRound = currentProject.currentRound - 1
          const previousRound = currentProject.pattern.find(r => r.roundNumber === newRound)
          if (previousRound) {
            newStitch = getRoundTotalStitches(previousRound) - 1
          } else {
            newStitch = 0
          }
        } else if (newStitch < 0) {
          newStitch = 0
        }

        const updatedProject = {
          ...currentProject,
          currentRound: newRound,
          currentStitch: newStitch,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      setCurrentRound: async (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          currentRound: roundNumber,
          currentStitch: 0,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      setCurrentStitch: async (stitchNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          currentStitch: stitchNumber,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      startSession: async () => {
        const { currentProject } = get()
        if (!currentProject) return

        const newSession: WorkSession = {
          id: generateId(),
          startTime: new Date(),
          duration: 0,
          roundsCompleted: 0,
          stitchesCompleted: 0
        }

        const updatedProject = {
          ...currentProject,
          sessions: [...currentProject.sessions, newSession],
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      endSession: async () => {
        const { currentProject } = get()
        if (!currentProject || currentProject.sessions.length === 0) return

        const lastSession = currentProject.sessions[currentProject.sessions.length - 1]
        if (lastSession.duration > 0) return

        const now = new Date()
        const duration = Math.floor((now.getTime() - lastSession.startTime.getTime()) / 1000)

        const updatedSession = {
          ...lastSession,
          duration
        }

        const updatedProject = {
          ...currentProject,
          sessions: [
            ...currentProject.sessions.slice(0, -1),
            updatedSession
          ],
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      // 通用專案更新函數
      updateProjectLocally: async (updatedProject: Project) => {
        // 設置本地更新標誌並立即更新本地狀態
        set(state => ({
          isLocallyUpdating: true,
          projects: state.projects.map(p => 
            p.id === updatedProject.id ? updatedProject : p
          ),
          currentProject: state.currentProject?.id === updatedProject.id 
            ? updatedProject 
            : state.currentProject
        }))

        // 異步同步到Firestore
        const { user } = useAuthStore.getState()
        if (user) {
          try {
            await firestoreService.updateProject(user.uid, updatedProject)
            set({ lastSyncTime: new Date(), isLocallyUpdating: false })
          } catch (error) {
            console.error('Error syncing project update to Firestore:', error)
            set({ isLocallyUpdating: false })
          }
        } else {
          set({ isLocallyUpdating: false })
        }
      },

      // 織圖管理 - 包含同步功能
      addRound: async (round) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          pattern: [...currentProject.pattern, round],
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      updateRound: async (updatedRound) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          pattern: currentProject.pattern.map(r => 
            r.id === updatedRound.id ? updatedRound : r
          ),
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      deleteRound: async (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const filteredPattern = currentProject.pattern.filter(r => r.roundNumber !== roundNumber)
        
        const renumberedPattern = filteredPattern.map(round => {
          if (round.roundNumber > roundNumber) {
            return {
              ...round,
              roundNumber: round.roundNumber - 1
            }
          }
          return round
        })

        let newCurrentRound = currentProject.currentRound
        if (newCurrentRound > roundNumber) {
          newCurrentRound = Math.max(1, newCurrentRound - 1)
        }

        const updatedProject = {
          ...currentProject,
          pattern: renumberedPattern,
          currentRound: newCurrentRound,
          currentStitch: 0,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      addStitchToRound: async (roundNumber, stitch) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitches: [...round.stitches, stitch]
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      addStitchGroupToRound: async (roundNumber, group) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitchGroups: [...round.stitchGroups, group]
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      updateStitchInRound: async (roundNumber, stitchId, updatedStitch) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitches: round.stitches.map(stitch => 
                stitch.id === stitchId ? updatedStitch : stitch
              )
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      deleteStitchFromRound: async (roundNumber, stitchId) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitches: round.stitches.filter(stitch => stitch.id !== stitchId)
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      reorderStitchesInRound: async (roundNumber, fromIndex, toIndex) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            const newStitches = [...round.stitches]
            const [removed] = newStitches.splice(fromIndex, 1)
            newStitches.splice(toIndex, 0, removed)
            
            return {
              ...round,
              stitches: newStitches
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      updateStitchGroupInRound: async (roundNumber, groupId, updatedGroup) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitchGroups: round.stitchGroups.map(group => 
                group.id === groupId ? updatedGroup : group
              )
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      deleteStitchGroupFromRound: async (roundNumber, groupId) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitchGroups: round.stitchGroups.filter(group => group.id !== groupId)
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      reorderStitchGroupsInRound: async (roundNumber, fromIndex, toIndex) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            const newGroups = [...round.stitchGroups]
            const [removed] = newGroups.splice(fromIndex, 1)
            newGroups.splice(toIndex, 0, removed)
            
            return {
              ...round,
              stitchGroups: newGroups
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      // 毛線管理 - 包含同步功能
      addYarn: async (yarn) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: [...currentProject.yarns, yarn],
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      updateYarn: async (updatedYarn) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: currentProject.yarns.map(y => 
            y.id === updatedYarn.id ? updatedYarn : y
          ),
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      deleteYarn: async (id) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: currentProject.yarns.filter(y => y.id !== id),
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      }
    }),
    {
      name: 'synced-knitting-counter-storage',
      version: 1,
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
        lastSyncTime: state.lastSyncTime
      }),
      // 自定義序列化和反序列化來處理日期和用戶隔離
      storage: {
        getItem: (name) => {
          const { user } = useAuthStore.getState()
          console.log('getItem called:', { name, user: user?.uid })
          
          if (!user) {
            console.log('No user - returning empty state')
            return JSON.stringify({
              state: {
                projects: [],
                currentProject: null,
                lastSyncTime: null
              },
              version: 1
            })
          }
          
          const userStorageKey = `user_${user.uid}_${name}`
          const str = localStorage.getItem(userStorageKey)
          console.log('Loading from storage:', { userStorageKey, hasData: !!str })
          
          if (!str) {
            console.log('No data found - returning empty state')
            return JSON.stringify({
              state: {
                projects: [],
                currentProject: null,
                lastSyncTime: null
              },
              version: 1
            })
          }
          
          try {
            const data = JSON.parse(str)
            // 轉換日期字符串回Date對象
            if (data.state) {
              if (data.state.projects) {
                data.state.projects = data.state.projects.map((project: any) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session: any) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || []
                }))
              }
              if (data.state.currentProject) {
                data.state.currentProject = {
                  ...data.state.currentProject,
                  createdDate: new Date(data.state.currentProject.createdDate),
                  lastModified: new Date(data.state.currentProject.lastModified),
                  sessions: data.state.currentProject.sessions?.map((session: any) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || []
                }
              }
              if (data.state.lastSyncTime) {
                data.state.lastSyncTime = new Date(data.state.lastSyncTime)
              }
            }
            return data
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          const { user } = useAuthStore.getState()
          if (!user) {
            console.log('No user - skipping save to localStorage')
            return
          }
          
          const userStorageKey = `user_${user.uid}_${name}`
          console.log(`Saving to ${userStorageKey}`, { 
            projects: value?.state?.projects?.length || 0,
            currentProject: value?.state?.currentProject?.name || 'none',
            lastSyncTime: value?.state?.lastSyncTime
          })
          localStorage.setItem(userStorageKey, JSON.stringify(value))
        },
        removeItem: (name) => {
          const { user } = useAuthStore.getState()
          if (!user) return
          
          const userStorageKey = `user_${user.uid}_${name}`
          localStorage.removeItem(userStorageKey)
        }
      }
    }
  )
)