import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project } from '../types'
import { useAuthStore } from '../store/authStore'
import { firestoreService, UserProfile } from '../services/firestoreService'
import { networkStatus } from '../utils/networkStatus'
import { useBaseStore, withLoading, handleAsyncError } from './useBaseStore'

interface SyncStoreState {
  isSyncing: boolean
  lastSyncTime: Date | null
  networkStatusListener: (() => void) | null
}

interface SyncStoreActions {
  setSyncing: (syncing: boolean) => void
  setLastSyncTime: (time: Date | null) => void
  
  // Network management
  initializeNetworkListener: () => void
  cleanupNetworkListener: () => void
  
  // User profile management
  initializeUserProfile: (user: any) => Promise<void>
  
  // Firestore synchronization
  syncWithFirestore: () => Promise<Project[]>
  subscribeToFirestoreChanges: () => (() => void) | null
  
  // Project synchronization helpers
  syncProjectToFirestore: (project: Project) => Promise<boolean>
  syncProjectWithRetry: (
    project: Project, 
    maxRetries?: number, 
    onRetry?: (attempt: number, maxRetries: number) => void
  ) => Promise<boolean>
}

interface SyncStore extends SyncStoreState, SyncStoreActions {}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isSyncing: false,
      lastSyncTime: null,
      networkStatusListener: null,

      // Basic actions
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // Network management
      initializeNetworkListener: () => {
        const { networkStatusListener } = get()
        if (networkStatusListener) {
          networkStatusListener() // Clear existing listener
        }

        const listener = networkStatus.addListener((isOnline) => {
          console.log('[SYNC] Network status changed:', isOnline ? 'online' : 'offline')
          
          if (isOnline) {
            // Network restored, attempt to sync pending data
            console.log('[SYNC] Network restored, attempting to sync pending data...')
            // This will be handled by individual stores when they detect network restoration
          }
        })

        set({ networkStatusListener: listener })
      },

      cleanupNetworkListener: () => {
        const { networkStatusListener } = get()
        if (networkStatusListener) {
          networkStatusListener()
          set({ networkStatusListener: null })
        }
      },

      // User profile management
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
          handleAsyncError(error, 'Initialize User Profile')
        }
      },

      // Firestore synchronization
      syncWithFirestore: async () => {
        const { user } = useAuthStore.getState()
        if (!user) {
          console.log('[SYNC] No user found for sync')
          return []
        }
        
        try {
          set({ isSyncing: true })
          
          const firestoreProjects = await firestoreService.getUserProjects(user.uid)
          
          set({
            lastSyncTime: new Date(),
            isSyncing: false
          })
          
          console.log('[SYNC] Successfully synced', firestoreProjects.length, 'projects from Firestore')
          return firestoreProjects
        } catch (error) {
          set({ isSyncing: false })
          handleAsyncError(error, 'Sync with Firestore')
          return []
        }
      },

      subscribeToFirestoreChanges: () => {
        const { user } = useAuthStore.getState()
        if (!user) return null
        
        return firestoreService.subscribeToUserProjects(user.uid, (projects) => {
          const currentState = get()
          const baseStore = useBaseStore.getState()
          
          console.log('[FIRESTORE-SUBSCRIPTION] Received update from Firestore:', {
            receivedProjectsCount: projects.length,
            timestamp: new Date().toISOString()
          })
          
          // Check if we should update based on sync state and timing
          const timeSinceLastSync = currentState.lastSyncTime ? 
            Date.now() - currentState.lastSyncTime.getTime() : Infinity
          const timeSinceLastLocalUpdate = baseStore.lastLocalUpdateTime ? 
            Date.now() - baseStore.lastLocalUpdateTime.getTime() : Infinity
          
          const canUpdate = !currentState.isSyncing && 
                           !baseStore.isLocallyUpdating && 
                           !baseStore.error &&
                           currentState.lastSyncTime &&
                           timeSinceLastSync > 15000 && // 15 seconds
                           timeSinceLastLocalUpdate > 20000 // 20 seconds
          
          if (canUpdate) {
            console.log('[FIRESTORE-SUBSCRIPTION] Updating local data from Firestore')
            set({ lastSyncTime: new Date() })
            
            // The actual project update will be handled by the project store
            // This store just manages the sync timing and validation
          } else {
            console.log('[FIRESTORE-SUBSCRIPTION] Skipping update', {
              canUpdate,
              isSyncing: currentState.isSyncing,
              isLocallyUpdating: baseStore.isLocallyUpdating,
              hasError: !!baseStore.error,
              lastSync: currentState.lastSyncTime,
              lastLocalUpdate: baseStore.lastLocalUpdateTime,
              timeSinceLastSync,
              timeSinceLastLocalUpdate
            })
          }
        })
      },

      // Project synchronization helpers
      syncProjectToFirestore: async (project: Project): Promise<boolean> => {
        const { user } = useAuthStore.getState()
        if (!user) {
          console.log('[SYNC] No user found for project sync')
          return false
        }

        try {
          await firestoreService.updateProject(user.uid, project)
          set({ lastSyncTime: new Date() })
          console.log('[SYNC] Project synced successfully to Firestore:', project.id)
          return true
        } catch (error) {
          handleAsyncError(error, 'Sync Project to Firestore')
          return false
        }
      },

      syncProjectWithRetry: async (
        project: Project, 
        maxRetries: number = 3,
        onRetry?: (attempt: number, maxRetries: number) => void
      ): Promise<boolean> => {
        const { user } = useAuthStore.getState()
        if (!user) return false

        let retryCount = 0
        
        const attemptSync = async (): Promise<boolean> => {
          // Check network status
          if (!networkStatus.getIsOnline()) {
            console.log('[SYNC] Device is offline, waiting for connection...')
            const isConnected = await networkStatus.waitForConnection(5000)
            
            if (!isConnected) {
              console.log('[SYNC] Still offline after waiting')
              if (retryCount < maxRetries) {
                retryCount++
                const delay = Math.pow(2, retryCount - 1) * 1000
                
                if (onRetry) {
                  onRetry(retryCount, maxRetries)
                }
                
                setTimeout(() => attemptSync(), delay)
                return false
              } else {
                useBaseStore.getState().setError('設備離線，無法同步數據')
                return false
              }
            }
          }

          try {
            // For mobile devices, skip connection test to avoid unnecessary failures
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            
            if (!isMobile) {
              // Desktop connection test
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
            
            await firestoreService.updateProject(user.uid, project)
            set({ lastSyncTime: new Date() })
            console.log('[SYNC] Project synced successfully with retry mechanism:', project.id)
            return true
            
          } catch (error) {
            console.error(`[SYNC] Error syncing project (attempt ${retryCount + 1}):`, error)
            
            // Check if it's a network error
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
            
            // More lenient retry logic for mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const shouldRetry = isMobile ? (retryCount < maxRetries) : (retryCount < maxRetries && isNetworkError)
            
            if (shouldRetry) {
              retryCount++
              const baseDelay = isMobile ? 1500 : (isNetworkError ? 2000 : 1000)
              const delay = Math.pow(2, retryCount - 1) * baseDelay
              
              console.log(`[SYNC] Retrying sync in ${delay}ms... (Mobile: ${isMobile}, Network error: ${isNetworkError})`)
              
              if (onRetry) {
                onRetry(retryCount, maxRetries)
              }
              
              setTimeout(() => attemptSync(), delay)
              return false
            } else {
              console.error('[SYNC] Max retries reached, sync failed for project:', project.id)
              
              const errorMessage = isMobile
                ? '手機網路同步失敗，資料已保存在本地'
                : isNetworkError
                  ? '網路連接不穩定，同步失敗'
                  : '同步失敗，請檢查網絡連接'
              
              useBaseStore.getState().setError(errorMessage)
              return false
            }
          }
        }
        
        return attemptSync()
      }
    }),
    {
      name: 'sync-store',
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime
      })
    }
  )
)