import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project, WorkSession, Yarn, Round, StitchInfo, StitchGroup } from '../types'
import { generateId, createSampleProject, getRoundTotalStitches, getProjectPattern, getProjectCurrentRound, getProjectCurrentStitch } from '../utils'
// import { clearUserData as clearStoredUserData } from '../utils/userStorage'
import { useAuthStore } from './authStore'
// import { firestoreService, UserProfile } from '../services/firestoreService'

interface AppStore {
  // 狀態
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  
  // 動作
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 用戶數據管理
  clearUserData: () => void
  clearUserDataSilently: () => void
  loadUserProjects: () => Promise<void>
  
  // 專案管理
  createProject: (name: string, source?: string) => void
  updateProject: (project: Project) => void
  deleteProject: (id: string) => void
  setCurrentProject: (id: string) => void
  loadProjects: () => Promise<void>
  
  // 編織進度
  nextStitch: () => void
  previousStitch: () => void
  setCurrentRound: (roundNumber: number) => void
  setCurrentStitch: (stitchNumber: number) => void
  startSession: () => void
  endSession: () => void
  
  // 織圖管理
  addRound: (round: Round) => void
  updateRound: (round: Round) => void
  deleteRound: (roundNumber: number) => void
  addStitchToRound: (roundNumber: number, stitch: StitchInfo) => void
  addStitchGroupToRound: (roundNumber: number, group: StitchGroup) => void
  updateStitchInRound: (roundNumber: number, stitchId: string, updatedStitch: StitchInfo) => void
  deleteStitchFromRound: (roundNumber: number, stitchId: string) => void
  reorderStitchesInRound: (roundNumber: number, fromIndex: number, toIndex: number) => void
  updateStitchGroupInRound: (roundNumber: number, groupId: string, updatedGroup: StitchGroup) => void
  deleteStitchGroupFromRound: (roundNumber: number, groupId: string) => void
  reorderStitchGroupsInRound: (roundNumber: number, fromIndex: number, toIndex: number) => void
  
  // 毛線管理
  addYarn: (yarn: Yarn) => void
  updateYarn: (yarn: Yarn) => void
  deleteYarn: (id: string) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,
      isSyncing: false,
      lastSyncTime: null,

      // 基本動作
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // 用戶數據管理
      clearUserData: () => {
        // 這個方法會觸發持久化，用於登出時清空界面
        set({
          projects: [],
          currentProject: null,
          error: null
        })
      },
      
      clearUserDataSilently: () => {
        // 這個方法不會觸發持久化，只清空內存狀態
        // 用於用戶切換時的臨時清空
        const currentState = get()
        Object.assign(currentState, {
          projects: [],
          currentProject: null,
          error: null
        })
      },
      
      loadUserProjects: async () => {
        const { user } = useAuthStore.getState()
        if (!user) {
          // 如果沒有用戶，清空數據
          get().clearUserDataSilently()
          return
        }
        
        // 手動從 localStorage 加載用戶數據
        const userStorageKey = `user_${user.uid}_knitting-counter-storage`
        const savedData = localStorage.getItem(userStorageKey)
        
        console.log('Manual loading for user:', user.uid, 'hasData:', !!savedData)
        
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData)
            const state = parsed.state || parsed
            
            // 轉換日期
            if (state.projects) {
              state.projects = state.projects.map((project: any) => ({
                ...project,
                createdDate: new Date(project.createdDate),
                lastModified: new Date(project.lastModified),
                sessions: project.sessions?.map((session: any) => ({
                  ...session,
                  startTime: new Date(session.startTime)
                })) || []
              }))
            }
            
            if (state.currentProject) {
              state.currentProject = {
                ...state.currentProject,
                createdDate: new Date(state.currentProject.createdDate),
                lastModified: new Date(state.currentProject.lastModified),
                sessions: state.currentProject.sessions?.map((session: any) => ({
                  ...session,
                  startTime: new Date(session.startTime)
                })) || []
              }
            }
            
            console.log('Loaded projects:', state.projects?.length || 0)
            set({
              projects: state.projects || [],
              currentProject: state.currentProject || null
            })
            return
          } catch (error) {
            console.error('Error parsing saved data:', error)
          }
        }
        
        // 如果沒有數據，建立樣本專案
        console.log('No saved data, creating sample project')
        const sampleProject = createSampleProject()
        set({
          projects: [sampleProject],
          currentProject: sampleProject
        })
      },

      // 專案管理
      createProject: (name, source) => {
        const newProject: Project = {
          id: generateId(),
          name,
          source,
          pattern: [],
          currentRound: 1,
          currentStitch: 0,
          yarns: [],
          sessions: [],
          createdDate: new Date(),
          lastModified: new Date()
        }
        
        set(state => ({
          projects: [...state.projects, newProject],
          currentProject: newProject
        }))
      },

      updateProject: (updatedProject) => {
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
      },

      deleteProject: (id) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
      },

      setCurrentProject: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({ currentProject: project })
        }
      },

      loadProjects: async () => {
        // 如果沒有專案，建立樣本專案
        const { projects } = get()
        if (projects.length === 0) {
          const sampleProject = createSampleProject()
          set({
            projects: [sampleProject],
            currentProject: sampleProject
          })
        }
      },

      // 編織進度管理
      nextStitch: () => {
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[DEBUG] nextStitch: No current project')
          return
        }

        // 如果已經完成，不允許繼續
        if (currentProject.isCompleted) {
          console.log('[DEBUG] nextStitch: Project already completed')
          return
        }

        const currentRound = getProjectPattern(currentProject).find(r => r.roundNumber === getProjectCurrentRound(currentProject))
        if (!currentRound) {
          console.log('[DEBUG] nextStitch: Current round not found', getProjectCurrentRound(currentProject))
          return
        }

        const totalStitchesInRound = getRoundTotalStitches(currentRound)
        let newStitch = getProjectCurrentStitch(currentProject) + 1
        let newRound = getProjectCurrentRound(currentProject)
        let isCompleted = false

        console.log('[DEBUG] nextStitch: Current state', {
          currentRound: getProjectCurrentRound(currentProject),
          currentStitch: getProjectCurrentStitch(currentProject),
          newStitch,
          totalStitchesInRound,
          patternRounds: getProjectPattern(currentProject).map(r => r.roundNumber)
        })

        // 如果超過當前圈數的針數，檢查是否完成或移到下一圈
        if (newStitch >= totalStitchesInRound) {
          // 檢查是否還有更多圈數
          const maxRoundNumber = Math.max(...getProjectPattern(currentProject).map(r => r.roundNumber))
          
          console.log('[DEBUG] nextStitch: Checking completion', {
            currentRound: getProjectCurrentRound(currentProject),
            maxRoundNumber,
            shouldComplete: getProjectCurrentRound(currentProject) >= maxRoundNumber
          })
          
          if (getProjectCurrentRound(currentProject) >= maxRoundNumber) {
            // 已完成所有圈數
            console.log('[DEBUG] nextStitch: Setting project as completed')
            isCompleted = true
            newStitch = totalStitchesInRound // 保持在最後一針
            newRound = getProjectCurrentRound(currentProject) // 保持在最後一圈
          } else {
            // 移到下一圈
            console.log('[DEBUG] nextStitch: Moving to next round')
            newStitch = 0
            newRound = getProjectCurrentRound(currentProject) + 1
          }
        }

        console.log('[DEBUG] nextStitch: Final state', {
          newRound,
          newStitch,
          isCompleted
        })

        const updatedProject = {
          ...currentProject,
          currentRound: newRound,
          currentStitch: newStitch,
          isCompleted,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      previousStitch: () => {
        const { currentProject } = get()
        if (!currentProject) return

        let newStitch = getProjectCurrentStitch(currentProject) - 1
        let newRound = getProjectCurrentRound(currentProject)

        // 如果小於0，移到上一圈的最後一針
        if (newStitch < 0 && newRound > 1) {
          newRound = getProjectCurrentRound(currentProject) - 1
          const previousRound = getProjectPattern(currentProject).find(r => r.roundNumber === newRound)
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

        get().updateProject(updatedProject)
      },

      setCurrentRound: (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          currentRound: roundNumber,
          currentStitch: 0,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      setCurrentStitch: (stitchNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          currentStitch: stitchNumber,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      startSession: () => {
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

        get().updateProject(updatedProject)
      },

      endSession: () => {
        const { currentProject } = get()
        if (!currentProject || currentProject.sessions.length === 0) return

        const lastSession = currentProject.sessions[currentProject.sessions.length - 1]
        if (lastSession.duration > 0) return // 已經結束的工作階段

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

        get().updateProject(updatedProject)
      },

      // 織圖管理
      addRound: (round) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          pattern: [...getProjectPattern(currentProject), round],
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      updateRound: (updatedRound) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          pattern: getProjectPattern(currentProject).map(r => 
            r.id === updatedRound.id ? updatedRound : r
          ),
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      deleteRound: (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        // 刪除指定圈數
        const filteredPattern = getProjectPattern(currentProject).filter(r => r.roundNumber !== roundNumber)
        
        // 重新編號後續圈數
        const renumberedPattern = filteredPattern.map(round => {
          if (round.roundNumber > roundNumber) {
            return {
              ...round,
              roundNumber: round.roundNumber - 1
            }
          }
          return round
        })

        // 調整當前圈數
        let newCurrentRound = getProjectCurrentRound(currentProject)
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

        get().updateProject(updatedProject)
      },

      addStitchToRound: (roundNumber, stitch) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      addStitchGroupToRound: (roundNumber, group) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      updateStitchInRound: (roundNumber, stitchId, updatedStitch) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      deleteStitchFromRound: (roundNumber, stitchId) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      reorderStitchesInRound: (roundNumber, fromIndex, toIndex) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      updateStitchGroupInRound: (roundNumber, groupId, updatedGroup) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      deleteStitchGroupFromRound: (roundNumber, groupId) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      reorderStitchGroupsInRound: (roundNumber, fromIndex, toIndex) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = getProjectPattern(currentProject).map(round => {
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

        get().updateProject(updatedProject)
      },

      // 毛線管理
      addYarn: (yarn) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: [...currentProject.yarns, yarn],
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      updateYarn: (updatedYarn) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: currentProject.yarns.map(y => 
            y.id === updatedYarn.id ? updatedYarn : y
          ),
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      deleteYarn: (id) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: currentProject.yarns.filter(y => y.id !== id),
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      }
    }),
    {
      name: 'knitting-counter-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject
      }),
      // 自定義序列化和反序列化來處理日期和用戶隔離
      storage: {
        getItem: (name) => {
          const { user } = useAuthStore.getState()
          console.log('getItem called:', { name, user: user?.uid })
          
          if (!user) {
            console.log('No user - returning empty state')
            // 沒有用戶時返回空狀態，而不是 null
            return JSON.stringify({
              state: {
                projects: [],
                currentProject: null
              },
              version: 0
            })
          }
          
          const userStorageKey = `user_${user.uid}_${name}`
          const str = localStorage.getItem(userStorageKey)
          console.log('Loading from storage:', { userStorageKey, hasData: !!str })
          
          if (!str) {
            console.log('No data found - returning empty state')
            // 沒有數據時返回空狀態
            return JSON.stringify({
              state: {
                projects: [],
                currentProject: null
              },
              version: 0
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
            currentProject: value?.state?.currentProject?.name || 'none'
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