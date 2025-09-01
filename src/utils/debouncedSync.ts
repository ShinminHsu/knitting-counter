/**
 * Debounced sync utility to reduce Firebase write frequency
 * 用於降低Firebase寫入頻率的防抖同步工具
 */

import { Project } from '../types'
import { useSyncStore } from '../stores/useSyncStore'
import { useAuthStore } from '../stores/useAuthStore'
import { getSyncConfig } from '../config/syncConfig'

interface PendingSync {
  project: Project
  context: string
  timeout: NodeJS.Timeout
}

class DebouncedSyncManager {
  private pendingSyncs = new Map<string, PendingSync>()
  
  /**
   * 防抖同步項目
   * @param project 要同步的項目
   * @param context 操作上下文，用於決定防抖時間
   * @param isUrgent 是否為緊急同步（如項目刪除）
   */
  async debouncedSync(
    project: Project, 
    context: string = 'unknown',
    isUrgent: boolean = false
  ): Promise<void> {
    const projectId = project.id
    
    // 清除之前的防抖計時器
    const existingSync = this.pendingSyncs.get(projectId)
    if (existingSync) {
      clearTimeout(existingSync.timeout)
    }
    
    // 決定防抖時間
    const debounceTime = this.getDebounceTime(context, isUrgent)
    
    // 設置新的防抖計時器
    const timeout = setTimeout(async () => {
      await this.performSync(project, context)
      this.pendingSyncs.delete(projectId)
    }, debounceTime)
    
    this.pendingSyncs.set(projectId, {
      project,
      context,
      timeout
    })
    
    console.log(`[DEBOUNCED-SYNC] Scheduled sync for project ${projectId} in ${debounceTime}ms (context: ${context})`)
  }
  
  /**
   * 立即執行所有待處理的同步
   */
  async flushAll(): Promise<void> {
    const promises: Promise<void>[] = []
    
    for (const [, pendingSync] of this.pendingSyncs.entries()) {
      clearTimeout(pendingSync.timeout)
      promises.push(this.performSync(pendingSync.project, pendingSync.context))
    }
    
    this.pendingSyncs.clear()
    await Promise.all(promises)
    console.log('[DEBOUNCED-SYNC] Flushed all pending syncs')
  }
  
  /**
   * 立即同步特定項目
   */
  async flushProject(projectId: string): Promise<void> {
    const pendingSync = this.pendingSyncs.get(projectId)
    if (pendingSync) {
      clearTimeout(pendingSync.timeout)
      await this.performSync(pendingSync.project, pendingSync.context)
      this.pendingSyncs.delete(projectId)
      console.log(`[DEBOUNCED-SYNC] Flushed sync for project ${projectId}`)
    }
  }
  
  /**
   * 檢查項目是否有待處理的同步
   */
  hasPendingSync(projectId: string): boolean {
    return this.pendingSyncs.has(projectId)
  }
  
  /**
   * 獲取待處理同步數量
   */
  getPendingCount(): number {
    return this.pendingSyncs.size
  }
  
  private async performSync(project: Project, context: string): Promise<void> {
    const { user } = useAuthStore.getState()
    if (!user) {
      console.log('[DEBOUNCED-SYNC] No user found, skipping sync')
      return
    }
    
    try {
      const config = getSyncConfig()
      const syncStore = useSyncStore.getState()
      const success = await syncStore.syncProjectWithRetry(project, config.strategy.maxRetries)
      
      if (success) {
        console.log(`[DEBOUNCED-SYNC] Successfully synced project ${project.id} (context: ${context})`)
      } else {
        console.log(`[DEBOUNCED-SYNC] Failed to sync project ${project.id} (context: ${context})`)
      }
    } catch (error) {
      console.error('[DEBOUNCED-SYNC] Error during sync:', error)
    }
  }
  
  private getDebounceTime(context: string, isUrgent: boolean): number {
    const config = getSyncConfig()
    
    if (!config.strategy.enableDebouncing) {
      return 0 // 如果禁用防抖，立即執行
    }
    
    if (isUrgent) {
      return config.debounceTime.urgent
    }
    
    // 根據操作類型決定防抖時間
    const criticalContexts = [
      'deleteProject',
      'createProject', 
      'markProjectComplete',
      'resetProgress'
    ]
    
    const progressContexts = [
      'nextStitch',
      'previousStitch',
      'setCurrentStitch',
      'setCurrentRound'
    ]
    
    if (criticalContexts.includes(context)) {
      return config.debounceTime.critical
    }
    
    if (progressContexts.includes(context)) {
      // 編織計數操作使用專門的防抖時間
      return config.debounceTime.progress
    }
    
    return config.debounceTime.default
  }
}

// 導出單例實例
export const debouncedSyncManager = new DebouncedSyncManager()

// 根據配置設置事件監聽器
if (typeof window !== 'undefined') {
  // 在頁面卸載時立即同步所有待處理的更新
  window.addEventListener('beforeunload', () => {
    const config = getSyncConfig()
    if (config.strategy.flushOnBeforeUnload) {
      debouncedSyncManager.flushAll().catch(console.error)
    }
  })
  
  // 在頁面變為隱藏時也觸發同步
  document.addEventListener('visibilitychange', () => {
    const config = getSyncConfig()
    if (document.hidden && config.strategy.flushOnVisibilityChange) {
      debouncedSyncManager.flushAll().catch(console.error)
    }
  })
}