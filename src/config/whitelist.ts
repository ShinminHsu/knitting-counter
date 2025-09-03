/**
 * 白名單工具函數 - 現在使用 Firestore 檢查
 * 保留此文件用於向後兼容和工具函數
 */

/**
 * 檢查是否為開發環境，開發環境下可以繞過白名單限制
 */
export const isDevelopmentMode = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

/**
 * 開發環境下是否啟用白名單檢查
 * 設為 true 可以在開發環境測試白名單功能
 * (現在由 whitelistService.ts 處理)
 */

/**
 * 這些函數已被 whitelistService.ts 中的 Firestore 版本取代
 * 保留用於向後兼容，但建議使用新的異步版本
 */

/**
 * 舊的開發者工具已移除
 * 請使用 admin/whitelist-manager.js 腳本來管理白名單
 */