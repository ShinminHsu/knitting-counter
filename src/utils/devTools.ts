/**
 * 開發者工具 - Firebase 同步調試
 * 只在開發環境下可用，用於監控和調整 Firebase 同步行為
 */

import { getSyncConfig, setSyncMode, setSyncConfig } from '../config/syncConfig'
import { debouncedSyncManager } from './debouncedSync'
import { logger } from './logger'
declare global {
  interface Window {
    // Firebase 同步開發者工具
    firebaseDebug: {
      // 查看當前同步配置
      getConfig: () => void
      // 切換同步模式
      setMode: (mode: 'default' | 'economy' | 'rapid') => void
      // 查看待處理同步數量
      getPendingCount: () => number
      // 立即同步所有待處理項目
      flushAll: () => Promise<void>
      // 立即同步特定項目
      flushProject: (projectId: string) => Promise<void>
      // 檢查項目是否有待處理同步
      hasPendingSync: (projectId: string) => boolean
      // 檢查同步狀態
      checkSyncStatus: () => any
      // 自定義防抖時間（臨時調整）
      setDebounceTime: (context: string, time: number) => void
      // 啟用/禁用防抖
      toggleDebouncing: (enabled: boolean) => void
    }
  }
}

// 只在開發環境下初始化開發者工具
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.firebaseDebug = {
    getConfig: () => {
      const config = getSyncConfig()
      logger.group('🔧 Firebase Sync Configuration')
      logger.debug('Current Mode:', 
        config.debounceTime.progress === 15000 ? 'economy' :
        config.debounceTime.progress === 8000 ? 'default' :
        config.debounceTime.progress === 5000 ? 'rapid' : 'custom'
      )
      logger.debug('Debounce Times:', config.debounceTime)
      logger.debug('Batch Delay (progress):', Math.max(config.debounceTime.progress * 1.5, 10000) + 'ms')
      logger.debug('Subscription Settings:', config.subscription)
      logger.debug('Strategy Settings:', config.strategy)
      logger.groupEnd()
      return config
    },

    setMode: (mode: 'default' | 'economy' | 'rapid') => {
      setSyncMode(mode)
      logger.debug(`🔄 Switched to ${mode} mode`)
      window.firebaseDebug.getConfig()
    },

    getPendingCount: () => {
      const count = debouncedSyncManager.getPendingCount()
      logger.debug(`⏳ Pending syncs: ${count}`)
      return count
    },

    flushAll: async () => {
      logger.debug('🚀 Flushing all pending syncs...')
      await debouncedSyncManager.flushAll()
      logger.debug('✅ All syncs completed')
    },

    flushProject: async (projectId: string) => {
      logger.debug(`🚀 Flushing sync for project: ${projectId}`)
      await debouncedSyncManager.flushProject(projectId)
      logger.debug(`✅ Project ${projectId} sync completed`)
    },

    hasPendingSync: (projectId: string) => {
      const hasPending = debouncedSyncManager.hasPendingSync(projectId)
      logger.debug(`🔍 Project ${projectId} has pending sync: ${hasPending}`)
      return hasPending
    },

    // 檢查同步狀態
    checkSyncStatus: () => {
      logger.group('📊 Firebase Sync Status')
      
      // 獲取同步 store 狀態
      const { useSyncStore } = require('../stores/useSyncStore')
      const syncStore = useSyncStore.getState()
      logger.debug('Last Sync Time:', syncStore.lastSyncTime)
      logger.debug('Is Currently Syncing:', syncStore.isSyncing)
      
      // 獲取網路狀態
      const { networkStatus } = require('../utils/networkStatus')
      logger.debug('Network Status:', networkStatus.getIsOnline() ? 'Online' : 'Offline')
      
      // 獲取認證狀態
      const { useAuthStore } = require('../stores/useAuthStore')
      const authStore = useAuthStore.getState()
      logger.debug('User Authenticated:', !!authStore.user)
      if (authStore.user) {
        logger.debug('User ID:', authStore.user.uid)
      }
      
      // 待處理同步
      const pendingCount = debouncedSyncManager.getPendingCount()
      logger.debug('Pending Syncs:', pendingCount)
      
      logger.groupEnd()
      
      return {
        lastSync: syncStore.lastSyncTime,
        isSyncing: syncStore.isSyncing,
        isOnline: networkStatus.getIsOnline(),
        isAuthenticated: !!authStore.user,
        pendingCount
      }
    },

    setDebounceTime: (context: string, time: number) => {
      const config = getSyncConfig()
      if (context === 'progress') {
        setSyncConfig({ debounceTime: { ...config.debounceTime, progress: time } })
      } else if (context === 'default') {
        setSyncConfig({ debounceTime: { ...config.debounceTime, default: time } })
      } else if (context === 'critical') {
        setSyncConfig({ debounceTime: { ...config.debounceTime, critical: time } })
      }
      logger.debug(`⏱️ Set ${context} debounce time to ${time}ms`)
    },

    toggleDebouncing: (enabled: boolean) => {
      setSyncConfig({ strategy: { ...getSyncConfig().strategy, enableDebouncing: enabled } })
      logger.debug(`🔄 Debouncing ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  // 顯示開發者工具說明
  logger.group('🛠️ Firebase Debug Tools Available')
  logger.debug('Use window.firebaseDebug to access Firebase sync debugging tools:')
  logger.debug('• window.firebaseDebug.getConfig() - View current configuration')
  logger.debug('• window.firebaseDebug.setMode("economy") - Switch to economy mode')
  logger.debug('• window.firebaseDebug.getPendingCount() - Check pending syncs')
  logger.debug('• window.firebaseDebug.flushAll() - Force sync all pending')
  logger.debug('• window.firebaseDebug.toggleDebouncing(false) - Disable debouncing')
  logger.groupEnd()
}

// 導出類型供開發環境使用
export type FirebaseDebugTools = typeof window.firebaseDebug