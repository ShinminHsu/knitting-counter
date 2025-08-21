import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project, WorkSession, Yarn, Round, StitchInfo, StitchGroup } from '../types'
import { 
  generateId, 
  createSampleProject, 
  getRoundTotalStitches,
  addStitchToPatternItems,
  addGroupToPatternItems,
  reorderPatternItems,
  updateStitchInPatternItems,
  deleteStitchFromPatternItems,
  updateGroupInPatternItems,
  deleteGroupFromPatternItems
} from '../utils'
import { useAuthStore } from './authStore'
import { firestoreService, UserProfile } from '../services/firestoreService'
import { networkStatus } from '../utils/networkStatus'

interface SyncedAppStore {
  // 狀態
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  isSyncing: boolean
  lastSyncTime: Date | null
  isLocallyUpdating: boolean
  lastLocalUpdateTime: Date | null
  recentLocalChanges: Set<string> // 記錄最近本地更改的專案ID
  networkStatusListener: (() => void) | null
  
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
  updateProjectLocally: (project: Project) => Promise<void>
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
  updateStitchInGroup: (roundNumber: number, groupId: string, stitchId: string, updatedStitch: StitchInfo) => Promise<void>
  deleteStitchGroupFromRound: (roundNumber: number, groupId: string) => Promise<void>
  reorderStitchGroupsInRound: (roundNumber: number, fromIndex: number, toIndex: number) => Promise<void>
  reorderPatternItemsInRound: (roundNumber: number, fromIndex: number, toIndex: number) => Promise<void>
  
  // 毛線管理
  addYarn: (yarn: Yarn) => Promise<void>
  updateYarn: (yarn: Yarn) => Promise<void>
  deleteYarn: (id: string) => Promise<void>
  
  // 網絡狀態管理
  initializeNetworkListener: () => void
  cleanupNetworkListener: () => void
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
      lastLocalUpdateTime: null,
      recentLocalChanges: new Set<string>(),
      networkStatusListener: null,

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
            
            // 確保從 Firestore 載入的數據向後兼容
            const migratedProjects = firestoreProjects.map((project: any) => ({
              ...project,
              pattern: project.pattern?.map((round: any) => ({
                ...round,
                stitches: round.stitches?.map((stitch: any) => ({
                  ...stitch,
                  // 確保新欄位存在（向後兼容）
                  customName: stitch.customName || undefined,
                  customSymbol: stitch.customSymbol || undefined
                })) || [],
                stitchGroups: round.stitchGroups?.map((group: any) => ({
                  ...group,
                  stitches: group.stitches?.map((stitch: any) => ({
                    ...stitch,
                    // 確保新欄位存在（向後兼容）
                    customName: stitch.customName || undefined,
                    customSymbol: stitch.customSymbol || undefined
                  })) || []
                })) || []
              })) || []
            }))
            
            set({
              projects: migratedProjects,
              currentProject: migratedProjects[0] || null,
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
                // 轉換日期格式並確保向後兼容
                const localProjects = state.projects.map((project: any) => ({
                  ...project,
                  createdDate: new Date(project.createdDate),
                  lastModified: new Date(project.lastModified),
                  sessions: project.sessions?.map((session: any) => ({
                    ...session,
                    startTime: new Date(session.startTime)
                  })) || [],
                  // 確保 pattern 中的針法有正確的結構
                  pattern: project.pattern?.map((round: any) => ({
                    ...round,
                    stitches: round.stitches?.map((stitch: any) => ({
                      ...stitch,
                      // 確保新欄位存在（向後兼容）
                      customName: stitch.customName || undefined,
                      customSymbol: stitch.customSymbol || undefined
                    })) || [],
                    stitchGroups: round.stitchGroups?.map((group: any) => ({
                      ...group,
                      stitches: group.stitches?.map((stitch: any) => ({
                        ...stitch,
                        // 確保新欄位存在（向後兼容）
                        customName: stitch.customName || undefined,
                        customSymbol: stitch.customSymbol || undefined
                      })) || []
                    })) || []
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
          
          console.log('[FIRESTORE-SUBSCRIPTION] Received update from Firestore:', {
            receivedProjectsCount: projects.length,
            currentProjectsCount: currentState.projects.length,
            currentProjectId: currentState.currentProject?.id,
            timestamp: new Date().toISOString()
          })
          
          // 更嚴格的條件檢查，避免覆蓋本地更新
          // 只有在完全沒有任何同步活動且沒有錯誤狀態時才更新
          const timeSinceLastSync = currentState.lastSyncTime ? Date.now() - currentState.lastSyncTime.getTime() : Infinity
          const timeSinceLastLocalUpdate = currentState.lastLocalUpdateTime ? Date.now() - currentState.lastLocalUpdateTime.getTime() : Infinity
          
          const canUpdate = !currentState.isSyncing && 
                           !currentState.isLocallyUpdating && 
                           !currentState.error &&
                           currentState.lastSyncTime &&
                           timeSinceLastSync > 15000 && // 延長到15秒，給手機更多時間
                           timeSinceLastLocalUpdate > 20000 // 本地更新後20秒內不允許覆蓋
          
          // 額外檢查：比較數據是否真的不同，避免無意義的更新
          const hasActualChanges = currentState.projects.length !== projects.length ||
                                   currentState.projects.some((localProject, index) => {
                                     const remoteProject = projects[index]
                                     return !remoteProject || 
                                            localProject.lastModified.getTime() !== remoteProject.lastModified.getTime()
                                   })
          
          // 特別檢查當前專案的針法數量變化和本地變更保護
          const currentLocalProject = currentState.currentProject
          const currentRemoteProject = projects.find(p => p.id === currentLocalProject?.id)
          let hasRecentLocalChanges = false
          
          if (currentLocalProject) {
            hasRecentLocalChanges = currentState.recentLocalChanges.has(currentLocalProject.id)
            console.log('[FIRESTORE-SUBSCRIPTION] Local change protection check:', {
              projectId: currentLocalProject.id,
              hasRecentLocalChanges,
              recentChangesSize: currentState.recentLocalChanges.size
            })
          }
          
          if (currentLocalProject && currentRemoteProject) {
            console.log('[FIRESTORE-SUBSCRIPTION] Comparing current project data:', {
              localProjectId: currentLocalProject.id,
              remoteProjectId: currentRemoteProject.id,
              localPatternLength: currentLocalProject.pattern.length,
              remotePatternLength: currentRemoteProject.pattern.length,
              localLastModified: currentLocalProject.lastModified.getTime(),
              remoteLastModified: currentRemoteProject.lastModified.getTime(),
              hasRecentLocalChanges
            })
            
            // 檢查每一圈的針法數量
            currentLocalProject.pattern.forEach((localRound) => {
              const remoteRound = currentRemoteProject.pattern.find(r => r.roundNumber === localRound.roundNumber)
              if (remoteRound) {
                console.log('[FIRESTORE-SUBSCRIPTION] Round comparison:', {
                  roundNumber: localRound.roundNumber,
                  localStitchCount: localRound.stitches.length,
                  remoteStitchCount: remoteRound.stitches.length
                })
              }
            })
          }
          
          if (canUpdate && hasActualChanges && !hasRecentLocalChanges) {
            console.log('[FIRESTORE-SUBSCRIPTION] UPDATING local data from Firestore')
            set({
              projects,
              currentProject: projects.find(p => p.id === currentState.currentProject?.id) || projects[0] || null,
              lastSyncTime: new Date()
            })
          } else {
            console.log('[FIRESTORE-SUBSCRIPTION] Skipping update', {
              canUpdate,
              hasActualChanges,
              hasRecentLocalChanges,
              isSyncing: currentState.isSyncing,
              isLocallyUpdating: currentState.isLocallyUpdating,
              hasError: !!currentState.error,
              lastSync: currentState.lastSyncTime,
              lastLocalUpdate: currentState.lastLocalUpdateTime,
              timeSinceLastSync,
              timeSinceLastLocalUpdate
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

        if (!currentProject.pattern || currentProject.pattern.length === 0) {
          console.log('[DEBUG] nextStitch: No pattern available')
          return
        }

        const currentRound = currentProject.pattern.find(r => r.roundNumber === currentProject.currentRound)
        if (!currentRound) {
          console.log('[DEBUG] nextStitch: Current round not found', currentProject.currentRound)
          // 嘗試調整到有效的圈數
          const minRoundNumber = Math.min(...currentProject.pattern.map(r => r.roundNumber))
          const updatedProject = {
            ...currentProject,
            currentRound: minRoundNumber,
            currentStitch: 0,
            lastModified: new Date()
          }
          await get().updateProjectLocally(updatedProject)
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
            // 尋找下一個可用的圈數
            const nextRoundNumber = currentProject.currentRound + 1
            const nextRound = currentProject.pattern.find(r => r.roundNumber === nextRoundNumber)
            if (nextRound) {
              newStitch = 0
              newRound = nextRoundNumber
            } else {
              // 如果下一圈不存在，保持在當前圈的結尾
              newStitch = totalStitchesInRound
              newRound = currentProject.currentRound
              isCompleted = true
            }
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

        if (!currentProject.pattern || currentProject.pattern.length === 0) {
          console.log('[DEBUG] previousStitch: No pattern available')
          return
        }

        let newStitch = currentProject.currentStitch - 1
        let newRound = currentProject.currentRound

        if (newStitch < 0 && newRound > 1) {
          // 嘗試找到前一個可用的圈數
          for (let roundNum = currentProject.currentRound - 1; roundNum >= 1; roundNum--) {
            const previousRound = currentProject.pattern.find(r => r.roundNumber === roundNum)
            if (previousRound) {
              newRound = roundNum
              newStitch = getRoundTotalStitches(previousRound) - 1
              break
            }
          }
          
          // 如果找不到前一圈，保持在當前位置
          if (newStitch < 0) {
            newStitch = 0
            newRound = currentProject.currentRound
          }
        } else if (newStitch < 0) {
          newStitch = 0
        }

        // 確保圈數有效
        const targetRound = currentProject.pattern.find(r => r.roundNumber === newRound)
        if (!targetRound) {
          console.log('[DEBUG] previousStitch: Target round not found', newRound)
          // 調整到最小的可用圈數
          const minRoundNumber = Math.min(...currentProject.pattern.map(r => r.roundNumber))
          newRound = minRoundNumber
          newStitch = 0
        }

        const updatedProject = {
          ...currentProject,
          currentRound: newRound,
          currentStitch: newStitch,
          isCompleted: false, // 回退時取消完成狀態
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      setCurrentRound: async (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[DEBUG] setCurrentRound: No current project')
          return
        }

        // 驗證圈數是否有效
        const targetRound = currentProject.pattern.find(r => r.roundNumber === roundNumber)
        if (!targetRound) {
          console.error('[DEBUG] setCurrentRound: Invalid round number', roundNumber)
          return
        }

        console.log('[DEBUG] setCurrentRound: Updating from round', currentProject.currentRound, 'to', roundNumber)

        const updatedProject = {
          ...currentProject,
          currentRound: roundNumber,
          currentStitch: 0,
          isCompleted: false, // 重置完成狀態
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
        console.log('[SYNC] Starting local project update:', {
          projectId: updatedProject.id,
          lastModified: updatedProject.lastModified,
          userAgent: navigator.userAgent
        })
        
        // 設置本地更新標誌並立即更新本地狀態
        set(state => {
          const newRecentChanges = new Set(state.recentLocalChanges)
          newRecentChanges.add(updatedProject.id)
          
          return {
            isLocallyUpdating: true,
            lastLocalUpdateTime: new Date(), // 記錄本地更新時間
            recentLocalChanges: newRecentChanges,
            projects: state.projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            ),
            currentProject: state.currentProject?.id === updatedProject.id 
              ? updatedProject 
              : state.currentProject
          }
        })

        // 異步同步到Firestore，增加重試機制
        const { user } = useAuthStore.getState()
        if (user) {
          let retryCount = 0
          const maxRetries = 3
          
          const attemptSync = async (): Promise<void> => {
            // 檢查網絡狀態
            if (!networkStatus.getIsOnline()) {
              console.log('[SYNC] Device is offline, waiting for connection...')
              const isConnected = await networkStatus.waitForConnection(5000)
              
              if (!isConnected) {
                console.log('[SYNC] Still offline after waiting, will retry later')
                if (retryCount < maxRetries) {
                  retryCount++
                  const delay = Math.pow(2, retryCount - 1) * 1000
                  
                  // 保持 isLocallyUpdating 狀態，只更新錯誤訊息
                  set({ 
                    error: `設備離線，${Math.ceil(delay/1000)}秒後重試 (${retryCount}/${maxRetries})`
                  })
                  
                  setTimeout(() => {
                    // 重試時清除錯誤訊息，保持同步狀態
                    set({ error: null })
                    attemptSync()
                  }, delay)
                  return
                } else {
                  set({ 
                    isLocallyUpdating: false,
                    error: '設備離線，無法同步數據' 
                  })
                  setTimeout(() => set({ error: null }), 3000)
                  return
                }
              }
            }

            try {
              // 針對手機端，跳過連接測試以避免不必要的失敗
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              
              if (!isMobile) {
                // 桌面端才進行連接測試
                const connectionOk = await firestoreService.testConnection()
                if (!connectionOk && retryCount === 0) {
                  console.log('[SYNC] Firestore connection test failed, attempting to restart connection...')
                  await firestoreService.enableOfflineSupport()
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  await firestoreService.disableOfflineSupport()
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              } else {
                console.log('[SYNC] Mobile device detected, skipping connection test')
              }
              
              await firestoreService.updateProject(user.uid, updatedProject)
              set(state => {
                const newRecentChanges = new Set(state.recentLocalChanges)
                newRecentChanges.delete(updatedProject.id)
                
                // 定時清除最近更改標記，給其他設備一些時間同步
                setTimeout(() => {
                  set(prevState => {
                    const finalRecentChanges = new Set(prevState.recentLocalChanges)
                    finalRecentChanges.delete(updatedProject.id)
                    return { recentLocalChanges: finalRecentChanges }
                  })
                }, 5000) // 5秒後完全清除保護
                
                return {
                  lastSyncTime: new Date(), 
                  isLocallyUpdating: false,
                  recentLocalChanges: newRecentChanges,
                  error: null 
                }
              })
              console.log('[SYNC] Project synced successfully to Firestore:', updatedProject.id)
            } catch (error) {
              console.error(`[SYNC] Error syncing project update to Firestore (attempt ${retryCount + 1}):`, error)
              
              // 檢查是否為特定的網路錯誤
              const isNetworkError = error instanceof Error && (
                error.message.includes('offline') ||
                error.message.includes('network') ||
                error.message.includes('unavailable') ||
                error.message.includes('timeout') ||
                error.message.includes('failed to connect') ||
                error.message.includes('network-request-failed') ||
                error.message.includes('firebase') ||
                error.message.includes('permission-denied') ||
                error.message.includes('unauthenticated')
              )
              
              // 對於手機端，更寬容地處理某些錯誤
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              const shouldRetry = isMobile ? (retryCount < maxRetries) : (retryCount < maxRetries && isNetworkError)
              
              if (shouldRetry) {
                retryCount++
                // 針對手機端和網路錯誤使用不同的延遲策略
                const baseDelay = isMobile ? 1500 : (isNetworkError ? 2000 : 1000)
                const delay = Math.pow(2, retryCount - 1) * baseDelay
                console.log(`[SYNC] Retrying sync in ${delay}ms... (Mobile: ${isMobile}, Network error: ${isNetworkError})`)
                
                // 保持 isLocallyUpdating 狀態，只更新錯誤訊息
                set({ 
                  error: `同步失敗，${Math.ceil(delay/1000)}秒後重試 (${retryCount}/${maxRetries})`
                })
                
                setTimeout(() => {
                  // 重試時清除錯誤訊息，保持同步狀態
                  set({ error: null })
                  attemptSync()
                }, delay)
              } else {
                console.error('[SYNC] Max retries reached, sync failed for project:', updatedProject.id)
                
                // 對於手機端，提供更友善的訊息
                const errorMessage = isMobile 
                  ? '手機網路同步失敗，資料已保存在本地' 
                  : isNetworkError 
                    ? '網路連接不穩定，同步失敗' 
                    : '同步失敗，請檢查網絡連接'
                
                set(state => {
                  const newRecentChanges = new Set(state.recentLocalChanges)
                  // 保留在失敗時，讓用戶知道數據還沒同步
                  
                  return {
                    isLocallyUpdating: false,
                    error: errorMessage,
                    recentLocalChanges: newRecentChanges
                  }
                })
                
                // 對於手機端，錯誤訊息保留更久讓用戶看到
                const clearDelay = isMobile ? 5000 : 3000
                setTimeout(() => {
                  set({ error: null })
                }, clearDelay)
              }
            }
          }
          
          attemptSync()
        } else {
          set({ isLocallyUpdating: false })
        }
      },

      // 織圖管理 - 包含同步功能
      addRound: async (round) => {
        console.log('[ADD-ROUND] Starting addRound:', {
          round,
          timestamp: new Date().toISOString()
        })
        
        const currentState = get()
        const { currentProject } = currentState
        if (!currentProject) {
          console.log('[ADD-ROUND] No current project found')
          return
        }

        console.log('[ADD-ROUND] Current state before update:', {
          projectId: currentProject.id,
          projectName: currentProject.name,
          currentPatternLength: currentProject.pattern.length,
          isLocallyUpdating: currentState.isLocallyUpdating,
          isSyncing: currentState.isSyncing,
          error: currentState.error
        })

        const updatedProject = {
          ...currentProject,
          pattern: [...currentProject.pattern, round],
          lastModified: new Date()
        }

        console.log('[ADD-ROUND] About to call updateProjectLocally with:', {
          projectId: updatedProject.id,
          newPatternLength: updatedProject.pattern.length,
          addedRound: round
        })

        await get().updateProjectLocally(updatedProject)
        
        // 驗證更新後的狀態
        const afterState = get()
        console.log('[ADD-ROUND] State after updateProjectLocally:', {
          projectId: afterState.currentProject?.id,
          patternLength: afterState.currentProject?.pattern.length,
          isLocallyUpdating: afterState.isLocallyUpdating,
          isSyncing: afterState.isSyncing,
          error: afterState.error
        })
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

        // 智能進度調整
        let newCurrentRound = currentProject.currentRound
        let newCurrentStitch = currentProject.currentStitch

        if (currentProject.currentRound === roundNumber) {
          // 如果刪除的是正在編織的圈數，調整到前一圈的結尾或下一圈的開始
          if (roundNumber > 1 && renumberedPattern.find(r => r.roundNumber === roundNumber - 1)) {
            // 調整到前一圈的結尾
            const previousRound = renumberedPattern.find(r => r.roundNumber === roundNumber - 1)
            if (previousRound) {
              newCurrentRound = roundNumber - 1
              newCurrentStitch = getRoundTotalStitches(previousRound)
            }
          } else if (renumberedPattern.find(r => r.roundNumber === roundNumber)) {
            // 調整到下一圈的開始（現在編號為原本的roundNumber）
            newCurrentRound = roundNumber
            newCurrentStitch = 0
          } else {
            // 如果沒有其他圈數，調整到第1圈開始
            newCurrentRound = 1
            newCurrentStitch = 0
          }
        } else if (currentProject.currentRound > roundNumber) {
          // 如果刪除的圈數在當前圈數之前，圈數減1但保持針數
          newCurrentRound = Math.max(1, currentProject.currentRound - 1)
          // 保持原有的針數進度
        }

        // 確保進度不超出新的織圖範圍
        const maxRoundNumber = Math.max(1, ...renumberedPattern.map(r => r.roundNumber))
        if (newCurrentRound > maxRoundNumber) {
          newCurrentRound = maxRoundNumber
          const lastRound = renumberedPattern.find(r => r.roundNumber === maxRoundNumber)
          newCurrentStitch = lastRound ? getRoundTotalStitches(lastRound) : 0
        } else {
          // 確保針數不超出當前圈的範圍
          const currentRound = renumberedPattern.find(r => r.roundNumber === newCurrentRound)
          if (currentRound) {
            const maxStitches = getRoundTotalStitches(currentRound)
            newCurrentStitch = Math.min(newCurrentStitch, maxStitches)
          }
        }

        const updatedProject = {
          ...currentProject,
          pattern: renumberedPattern,
          currentRound: newCurrentRound,
          currentStitch: newCurrentStitch,
          lastModified: new Date()
        }

        await get().updateProjectLocally(updatedProject)
      },

      addStitchToRound: async (roundNumber, stitch) => {
        console.log('[ADD-STITCH] Starting addStitchToRound:', {
          roundNumber,
          stitch,
          timestamp: new Date().toISOString()
        })
        
        const currentState = get()
        const { currentProject } = currentState
        if (!currentProject) {
          console.log('[ADD-STITCH] No current project found')
          return
        }

        console.log('[ADD-STITCH] Current state before update:', {
          projectId: currentProject.id,
          projectName: currentProject.name,
          currentRoundInPattern: currentProject.pattern.find(r => r.roundNumber === roundNumber),
          patternLength: currentProject.pattern.length,
          isLocallyUpdating: currentState.isLocallyUpdating,
          isSyncing: currentState.isSyncing,
          error: currentState.error
        })

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[ADD-STITCH] Adding stitch to round:', {
              roundNumber,
              originalStitchCount: round.stitches.length,
              addedStitch: stitch
            })
            return addStitchToPatternItems(round, stitch)
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        console.log('[ADD-STITCH] About to call updateProjectLocally with:', {
          projectId: updatedProject.id,
          patternLength: updatedProject.pattern.length,
          targetRoundStitches: updatedProject.pattern.find(r => r.roundNumber === roundNumber)?.stitches.length
        })

        await get().updateProjectLocally(updatedProject)
        
        // 驗證更新後的狀態
        const afterState = get()
        console.log('[ADD-STITCH] State after updateProjectLocally:', {
          projectId: afterState.currentProject?.id,
          patternLength: afterState.currentProject?.pattern.length,
          targetRoundStitches: afterState.currentProject?.pattern.find(r => r.roundNumber === roundNumber)?.stitches.length,
          isLocallyUpdating: afterState.isLocallyUpdating,
          isSyncing: afterState.isSyncing,
          error: afterState.error
        })
      },

      addStitchGroupToRound: async (roundNumber, group) => {
        console.log('[ADD-GROUP] Starting addStitchGroupToRound:', {
          roundNumber,
          group,
          timestamp: new Date().toISOString()
        })
        
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[ADD-GROUP] No current project found')
          return
        }

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[ADD-GROUP] Adding group to round:', {
              roundNumber,
              originalGroupCount: round.stitchGroups.length,
              addedGroup: group
            })
            return addGroupToPatternItems(round, group)
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
        console.log('[UPDATE-STITCH] Starting updateStitchInRound:', {
          roundNumber,
          stitchId,
          updatedStitch,
          timestamp: new Date().toISOString()
        })
        
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[UPDATE-STITCH] No current project found')
          return
        }

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[UPDATE-STITCH] Updating stitch in round:', {
              roundNumber,
              stitchId,
              updatedStitch
            })
            return updateStitchInPatternItems(round, stitchId, updatedStitch)
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
        console.log('[DELETE-STITCH] Starting deleteStitchFromRound:', {
          roundNumber,
          stitchId,
          timestamp: new Date().toISOString()
        })
        
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[DELETE-STITCH] No current project found')
          return
        }

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[DELETE-STITCH] Deleting stitch from round:', {
              roundNumber,
              stitchId
            })
            return deleteStitchFromPatternItems(round, stitchId)
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
        console.log('[UPDATE-GROUP] Starting updateStitchGroupInRound:', {
          roundNumber,
          groupId,
          updatedGroup,
          timestamp: new Date().toISOString()
        })
        
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[UPDATE-GROUP] No current project found')
          return
        }

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[UPDATE-GROUP] Updating group in round:', {
              roundNumber,
              groupId,
              updatedGroup
            })
            return updateGroupInPatternItems(round, groupId, updatedGroup)
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

      updateStitchInGroup: async (roundNumber, groupId, stitchId, updatedStitch) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitchGroups: round.stitchGroups.map(group => {
                if (group.id === groupId) {
                  return {
                    ...group,
                    stitches: group.stitches.map(stitch =>
                      stitch.id === stitchId ? updatedStitch : stitch
                    )
                  }
                }
                return group
              })
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
        console.log('[DELETE-GROUP] Starting deleteStitchGroupFromRound:', {
          roundNumber,
          groupId,
          timestamp: new Date().toISOString()
        })
        
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[DELETE-GROUP] No current project found')
          return
        }

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[DELETE-GROUP] Deleting group from round:', {
              roundNumber,
              groupId
            })
            return deleteGroupFromPatternItems(round, groupId)
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

      reorderPatternItemsInRound: async (roundNumber, fromIndex, toIndex) => {
        console.log('[REORDER-PATTERN-ITEMS] Starting reorderPatternItemsInRound:', {
          roundNumber,
          fromIndex,
          toIndex,
          timestamp: new Date().toISOString()
        })
        
        const { currentProject } = get()
        if (!currentProject) {
          console.log('[REORDER-PATTERN-ITEMS] No current project found')
          return
        }

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            console.log('[REORDER-PATTERN-ITEMS] Reordering pattern items in round:', {
              roundNumber,
              fromIndex,
              toIndex,
              currentItemsCount: round.stitches.length + round.stitchGroups.length
            })
            return reorderPatternItems(round, fromIndex, toIndex)
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
      },

      // 初始化網絡狀態監聽器
      initializeNetworkListener: () => {
        const { networkStatusListener } = get()
        if (networkStatusListener) {
          networkStatusListener() // 先清除現有監聽器
        }

        const listener = networkStatus.addListener((isOnline) => {
          console.log('[SYNC] Network status changed:', isOnline ? 'online' : 'offline')
          
          if (isOnline) {
            // 網絡恢復時，嘗試同步待同步的數據
            const { currentProject } = get()
            if (currentProject) {
              console.log('[SYNC] Network restored, attempting to sync current project...')
              get().updateProjectLocally(currentProject)
            }
          }
        })

        set({ networkStatusListener: listener })
      },

      // 清理網絡狀態監聽器
      cleanupNetworkListener: () => {
        const { networkStatusListener } = get()
        if (networkStatusListener) {
          networkStatusListener()
          set({ networkStatusListener: null })
        }
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