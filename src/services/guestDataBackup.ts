/**
 * 訪客模式數據備份服務
 * 使用 IndexedDB 提供更穩定的數據持久化
 */

import { Project } from '../types'

import { logger } from '../utils/logger'
interface GuestData {
  projects: Project[]
  currentProject: Project | null
  lastBackup: number
  userIdentity?: string // 用戶身份標識，用於區分不同用戶的備份數據
}

class GuestDataBackupService {
  private dbName = 'knitting-counter-guest'
  private version = 1
  private storeName = 'guest-data'
  private db: IDBDatabase | null = null

  /**
   * 初始化 IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        logger.debug('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 創建對象存儲
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('lastBackup', 'lastBackup', { unique: false })
          logger.debug('Object store created')
        }
      }
    })
  }

  /**
   * 備份訪客數據到 IndexedDB
   */
  async backupGuestData(projects: Project[], currentProject: Project | null, userIdentity?: string): Promise<boolean> {
    try {
      logger.debug('Starting backup with data:', {
        projectCount: projects.length,
        currentProjectId: currentProject?.id,
        currentProjectName: currentProject?.name,
        projectNames: projects.map(p => p.name)
      })
      
      await this.init()
      
      if (!this.db) {
        logger.error('Database not initialized')
        return false
      }

      const data: GuestData = {
        projects,
        currentProject,
        lastBackup: Date.now(),
        userIdentity
      }

      // 使用用戶身份作為 key，如果沒有則使用 'guest-data'
      const backupKey = userIdentity ? `guest-data-${userIdentity}` : 'guest-data'

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        
        // 使用用戶特定的 key 存儲訪客數據
        const request = store.put({ id: backupKey, ...data })

        request.onsuccess = () => {
          logger.debug('Data backed up successfully')
          resolve(true)
        }

        request.onerror = () => {
          logger.error('Failed to backup data:', request.error)
          resolve(false)
        }
      })
    } catch (error) {
      logger.error('Error backing up data:', error)
      return false
    }
  }

  /**
   * 從 IndexedDB 恢復訪客數據
   */
  async restoreGuestData(userIdentity?: string): Promise<GuestData | null> {
    try {
      await this.init()
      
      if (!this.db) {
        logger.error('Database not initialized')
        return null
      }

      // 使用用戶身份作為 key，如果沒有則使用 'guest-data'
      const backupKey = userIdentity ? `guest-data-${userIdentity}` : 'guest-data'

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(backupKey)

        request.onsuccess = () => {
          const result = request.result
          if (result) {
            logger.debug('Data restored successfully', {
              projectCount: result.projects?.length || 0,
              projectNames: result.projects?.map((p: Project) => p.name) || [],
              currentProjectName: result.currentProject?.name || 'none',
              lastBackup: new Date(result.lastBackup).toLocaleString()
            })
            resolve({
              projects: result.projects || [],
              currentProject: result.currentProject || null,
              lastBackup: result.lastBackup || 0,
              userIdentity: result.userIdentity
            })
          } else {
            logger.debug('No backup data found')
            resolve(null)
          }
        }

        request.onerror = () => {
          logger.error('Failed to restore data:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      logger.error('Error restoring data:', error)
      return null
    }
  }

  /**
   * 清除訪客備份數據
   */
  async clearGuestData(userIdentity?: string): Promise<boolean> {
    try {
      await this.init()
      
      if (!this.db) {
        logger.error('Database not initialized')
        return false
      }

      // 使用用戶身份作為 key，如果沒有則使用 'guest-data'
      const backupKey = userIdentity ? `guest-data-${userIdentity}` : 'guest-data'

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(backupKey)

        request.onsuccess = () => {
          logger.debug('Backup data cleared')
          resolve(true)
        }

        request.onerror = () => {
          logger.error('Failed to clear data:', request.error)
          resolve(false)
        }
      })
    } catch (error) {
      logger.error('Error clearing data:', error)
      return false
    }
  }

  /**
   * 檢查是否有可用的備份數據
   */
  async hasBackupData(userIdentity?: string): Promise<boolean> {
    const data = await this.restoreGuestData(userIdentity)
    return data !== null && data.projects.length > 0
  }

  /**
   * 獲取備份數據的詳細信息
   */
  async getBackupInfo(userIdentity?: string): Promise<{ projectCount: number; lastBackup: Date | null } | null> {
    const data = await this.restoreGuestData(userIdentity)
    if (!data) return null

    return {
      projectCount: data.projects.length,
      lastBackup: data.lastBackup ? new Date(data.lastBackup) : null
    }
  }
}


// 導出單例實例
export const guestDataBackup = new GuestDataBackupService()

// 也導出類型供其他地方使用
export type { GuestData }