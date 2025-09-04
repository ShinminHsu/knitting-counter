import { User } from 'firebase/auth'
import { useAuthStore } from '../stores/useAuthStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useBaseStore } from '../stores/useBaseStore'
import { useSyncStore } from '../stores/useSyncStore'
import { syncManager, ProjectConflict } from './syncManager'

import { logger } from '../utils/logger'
class AuthListener {
  private unsubscribeFirestore: (() => void) | null = null
  
  async handleUserLogin(user: User) {
    logger.debug('User logged in:', user.uid)
    
    try {
      const projectStore = useProjectStore.getState()
      
      // 載入用戶專案數據
      await projectStore.loadUserProjects()
      
      // TODO: 實現 Firestore 監聽功能（目前在新架構中暫不支援）
      // this.unsubscribeFirestore = subscribeToFirestoreChanges()
      
      logger.debug('User login handling completed')
    } catch (error) {
      logger.error('Error handling user login:', error)
      const baseStore = useBaseStore.getState()
      baseStore.setError('登入時載入數據失敗，請檢查網絡連接並重新整理頁面')
    }
  }
  
  async handleUserLogout() {
    logger.debug('User logged out')
    
    try {
      // 停止監聽Firestore變化
      if (this.unsubscribeFirestore) {
        this.unsubscribeFirestore()
        this.unsubscribeFirestore = null
      }
      
      // 清空用戶數據
      const projectStore = useProjectStore.getState()
      projectStore.clearUserData()
      
      logger.debug('User logout handling completed')
    } catch (error) {
      logger.error('Error handling user logout:', error)
    }
  }
  
  async handleGuestMode() {
    logger.debug('Entering guest mode')
    
    try {
      // 停止任何Firebase監聽
      if (this.unsubscribeFirestore) {
        this.unsubscribeFirestore()
        this.unsubscribeFirestore = null
      }
      
      // 載入本地項目數據（訪客模式）- 使用loadProjects會創建範例專案
      const projectStore = useProjectStore.getState()
      await projectStore.loadProjects()
      
      logger.debug('Guest mode handling completed')
    } catch (error) {
      logger.error('Error handling guest mode:', error)
      const baseStore = useBaseStore.getState()
      baseStore.setError('載入本地數據失敗')
    }
  }
  
  async handleUserSwitch(newUser: User, oldUser: User | null) {
    logger.debug('User switched:', { 
      from: oldUser?.uid || 'none', 
      to: newUser.uid 
    })
    
    try {
      // 先處理舊用戶登出
      if (oldUser) {
        await this.handleUserLogout()
      }
      
      // 再處理新用戶登入
      await this.handleUserLogin(newUser)
      
      logger.debug('User switch handling completed')
    } catch (error) {
      logger.error('Error handling user switch:', error)
    }
  }
  
  async performCrossDeviceSync(user: User) {
    logger.debug('Performing cross-device sync for user:', user.uid)
    
    try {
      const syncStore = useSyncStore.getState()
      const projectStore = useProjectStore.getState()
      syncStore.setSyncing(true)
      
      // 獲取本地專案
      const localProjects = projectStore.projects
      
      // 執行數據合併
      const syncResult = await syncManager.mergeLocalAndRemoteData(
        user.uid, 
        localProjects,
        { strategy: 'newest_wins', autoResolve: true }
      )
      
      if (syncResult.success) {
        // 更新本地狀態
        projectStore.setProjects(syncResult.merged)
        const currentProjectId = projectStore.currentProject?.id
        const newCurrentProject = syncResult.merged.find(p => p.id === currentProjectId) || syncResult.merged[0] || null
        projectStore.setCurrentProject(newCurrentProject)
        syncStore.setLastSyncTime(new Date())
        
        logger.debug('Cross-device sync completed successfully:', {
          merged: syncResult.merged.length,
          conflicts: syncResult.conflicts.length,
          errors: syncResult.errors.length
        })
      } else {
        logger.warn('Cross-device sync completed with issues:', syncResult.errors)
        const baseStore = useBaseStore.getState()
        baseStore.setError('同步過程中發生問題')
      }
    } catch (error) {
      logger.error('Error in cross-device sync:', error)
      const baseStore = useBaseStore.getState()
      baseStore.setError('跨裝置同步失敗')
    } finally {
      const syncStore = useSyncStore.getState()
      syncStore.setSyncing(false)
    }
  }
  
  setupAuthStateListener() {
    let previousUser: User | null = null
    
    // 使用內建的認證狀態監聽器
    const unsubscribe = useAuthStore.getState().initialize()
    
    // 設置定期檢查用戶狀態變化
    const checkInterval = setInterval(() => {
      const currentUser = useAuthStore.getState().user
      
      if (previousUser?.uid !== currentUser?.uid) {
        logger.debug('Auth state changed:', { 
          previousUser: previousUser?.uid || 'none',
          currentUser: currentUser?.uid || 'none'
        })
        
        if (!previousUser && currentUser) {
          // 用戶首次登入
          this.handleUserLogin(currentUser)
        } else if (previousUser && !currentUser) {
          // 用戶登出
          this.handleUserLogout()
        } else if (previousUser && currentUser && previousUser.uid !== currentUser.uid) {
          // 用戶切換
          this.handleUserSwitch(currentUser, previousUser)
        } else if (currentUser) {
          // 用戶重新載入或狀態更新
          this.performCrossDeviceSync(currentUser)
        }
        
        previousUser = currentUser
      }
    }, 1000) // 每秒檢查一次
    
    return () => {
      unsubscribe()
      clearInterval(checkInterval)
    }
  }
  
  async forceSync() {
    const { user } = useAuthStore.getState()
    if (user) {
      await this.performCrossDeviceSync(user)
    }
  }
  
  async resolveConflicts(conflicts: ProjectConflict[], resolutions: { [projectId: string]: 'local' | 'remote' }) {
    const { user } = useAuthStore.getState()
    if (!user) return false
    
    try {
      for (const conflict of conflicts) {
        const resolution = resolutions[conflict.projectId]
        if (resolution) {
          await syncManager.resolveConflict(
            user.uid,
            conflict,
            resolution === 'local' ? 'use_local' : 'use_remote'
          )
        }
      }
      
      // 重新同步
      await this.performCrossDeviceSync(user)
      return true
    } catch (error) {
      logger.error('Error resolving conflicts:', error)
      return false
    }
  }
}

export const authListener = new AuthListener()