/**
 * Firebase 同步配置
 * 控制Firebase寫入頻率以避免達到使用限制
 */

export interface SyncConfig {
  // 防抖時間設置 (毫秒)
  debounceTime: {
    // 編織計數操作的防抖時間
    progress: number
    // 一般編輯操作的防抖時間
    default: number
    // 關鍵操作的防抖時間 (如項目完成、重置)
    critical: number
    // 緊急操作的防抖時間 (如刪除項目)
    urgent: number
  }
  
  // 訂閱更新間隔設置
  subscription: {
    // Firestore訂閱更新檢查間隔
    updateCheckInterval: number
    // 本地更新冷卻時間
    localUpdateCooldown: number
  }
  
  // 同步策略設置
  strategy: {
    // 是否啟用防抖同步
    enableDebouncing: boolean
    // 最大重試次數
    maxRetries: number
    // 在頁面隱藏時是否立即同步
    flushOnVisibilityChange: boolean
    // 在頁面卸載時是否立即同步
    flushOnBeforeUnload: boolean
  }
}

// 預設配置
export const defaultSyncConfig: SyncConfig = {
  debounceTime: {
    progress: 3000,    // 編織計數3秒防抖
    default: 2000,     // 一般操作2秒防抖
    critical: 1000,    // 關鍵操作1秒防抖
    urgent: 100        // 緊急操作0.1秒防抖
  },
  subscription: {
    updateCheckInterval: 15000,      // 15秒
    localUpdateCooldown: 20000       // 20秒
  },
  strategy: {
    enableDebouncing: true,
    maxRetries: 2,
    flushOnVisibilityChange: true,
    flushOnBeforeUnload: true
  }
}

// 節約模式配置 - 更長的防抖時間以減少Firebase使用量
export const economySyncConfig: SyncConfig = {
  debounceTime: {
    progress: 5000,    // 編織計數5秒防抖
    default: 3000,     // 一般操作3秒防抖
    critical: 1500,    // 關鍵操作1.5秒防抖
    urgent: 200        // 緊急操作0.2秒防抖
  },
  subscription: {
    updateCheckInterval: 30000,      // 30秒
    localUpdateCooldown: 30000       // 30秒
  },
  strategy: {
    enableDebouncing: true,
    maxRetries: 2,
    flushOnVisibilityChange: true,
    flushOnBeforeUnload: true
  }
}

// 快速模式配置 - 較短的防抖時間，適合穩定網路環境
export const rapidSyncConfig: SyncConfig = {
  debounceTime: {
    progress: 1500,    // 編織計數1.5秒防抖
    default: 1000,     // 一般操作1秒防抖
    critical: 500,     // 關鍵操作0.5秒防抖
    urgent: 50         // 緊急操作0.05秒防抖
  },
  subscription: {
    updateCheckInterval: 10000,      // 10秒
    localUpdateCooldown: 15000       // 15秒
  },
  strategy: {
    enableDebouncing: true,
    maxRetries: 3,
    flushOnVisibilityChange: true,
    flushOnBeforeUnload: true
  }
}

// 當前使用的配置 - 可以通過環境變數或用戶設置來切換
let currentConfig: SyncConfig = defaultSyncConfig

export const getSyncConfig = (): SyncConfig => currentConfig

export const setSyncConfig = (config: Partial<SyncConfig>): void => {
  currentConfig = {
    ...currentConfig,
    ...config,
    debounceTime: {
      ...currentConfig.debounceTime,
      ...config.debounceTime
    },
    subscription: {
      ...currentConfig.subscription,
      ...config.subscription
    },
    strategy: {
      ...currentConfig.strategy,
      ...config.strategy
    }
  }
}

export const setSyncMode = (mode: 'default' | 'economy' | 'rapid'): void => {
  switch (mode) {
    case 'economy':
      currentConfig = { ...economySyncConfig }
      break
    case 'rapid':
      currentConfig = { ...rapidSyncConfig }
      break
    case 'default':
    default:
      currentConfig = { ...defaultSyncConfig }
      break
  }
  console.log(`[SYNC-CONFIG] Switched to ${mode} mode:`, currentConfig)
}

// 從localStorage載入配置
export const loadSyncConfigFromStorage = (): void => {
  try {
    const stored = localStorage.getItem('sync-config')
    if (stored) {
      const config = JSON.parse(stored)
      setSyncConfig(config)
      console.log('[SYNC-CONFIG] Loaded configuration from localStorage:', config)
    }
  } catch (error) {
    console.error('[SYNC-CONFIG] Error loading configuration from localStorage:', error)
  }
}

// 儲存配置到localStorage
export const saveSyncConfigToStorage = (): void => {
  try {
    localStorage.setItem('sync-config', JSON.stringify(currentConfig))
    console.log('[SYNC-CONFIG] Saved configuration to localStorage')
  } catch (error) {
    console.error('[SYNC-CONFIG] Error saving configuration to localStorage:', error)
  }
}