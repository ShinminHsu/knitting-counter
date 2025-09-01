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
  timestamp: number
  priority: 'high' | 'medium' | 'low'
}

class DebouncedSyncManager {
  private pendingSyncs = new Map<string, PendingSync>()
  private batchTimer: NodeJS.Timeout | null = null
  private batchedProjects = new Set<string>()
  
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
    const priority = this.getPriority(context, isUrgent)
    
    // 清除之前的防抖計時器
    const existingSync = this.pendingSyncs.get(projectId)
    if (existingSync) {
      clearTimeout(existingSync.timeout)
    }
    
    // 決定防抖時間
    const debounceTime = this.getDebounceTime(context, isUrgent)
    
    // 對於低優先級操作（如編織進度），考慮批次處理
    if (priority === 'low' && this.shouldUseBatching(context)) {
      this.addToBatch(project, context, priority)
      return
    }
    
    // 設置新的防抖計時器
    const timeout = setTimeout(async () => {
      await this.performSync(project, context)
      this.pendingSyncs.delete(projectId)
    }, debounceTime)
    
    this.pendingSyncs.set(projectId, {
      project,
      context,
      timeout,
      timestamp: Date.now(),
      priority
    })
    
    console.log(`[DEBOUNCED-SYNC] Scheduled sync for project ${projectId} in ${debounceTime}ms (context: ${context}, priority: ${priority})`)
  }
  
  /**
   * 立即執行所有待處理的同步
   */
  async flushAll(): Promise<void> {
    const promises: Promise<void>[] = []
    
    console.log('[DEBOUNCED-SYNC] Starting flushAll...', {
      pendingSyncsCount: this.pendingSyncs.size,
      batchedProjectsCount: this.batchedProjects.size,
      hasBatchTimer: !!this.batchTimer
    })
    
    // 處理防抖同步
    for (const [projectId, pendingSync] of this.pendingSyncs.entries()) {
      console.log(`[DEBOUNCED-SYNC] Flushing pending sync for project: ${projectId} (context: ${pendingSync.context})`)
      clearTimeout(pendingSync.timeout)
      promises.push(this.performSync(pendingSync.project, pendingSync.context))
    }
    
    this.pendingSyncs.clear()
    
    // 處理批次同步
    if (this.batchTimer) {
      console.log('[DEBOUNCED-SYNC] Flushing batch timer with projects:', Array.from(this.batchedProjects))
      clearTimeout(this.batchTimer)
      this.batchTimer = null
      promises.push(this.processBatch())
    }
    
    if (promises.length === 0) {
      console.log('[DEBOUNCED-SYNC] No pending syncs or batches to flush')
    }
    
    await Promise.all(promises)
    console.log('[DEBOUNCED-SYNC] Flushed all pending syncs and batches')
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
    
    // 檢查批次中是否有這個項目
    if (this.batchedProjects.has(projectId)) {
      this.batchedProjects.delete(projectId)
      
      const { projects } = require('../stores/useProjectStore').useProjectStore.getState()
      const project = projects.find((p: Project) => p.id === projectId)
      if (project) {
        await this.performSync(project, 'flushProject')
        console.log(`[BATCH-SYNC] Flushed batched project ${projectId}`)
      }
    }
  }
  
  /**
   * 檢查項目是否有待處理的同步
   */
  hasPendingSync(projectId: string): boolean {
    return this.pendingSyncs.has(projectId) || this.batchedProjects.has(projectId)
  }
  
  /**
   * 獲取待處理同步數量
   */
  getPendingCount(): number {
    return this.pendingSyncs.size + this.batchedProjects.size
  }
  
  /**
   * 添加項目到批次處理
   */
  private addToBatch(project: Project, context: string, _priority: 'high' | 'medium' | 'low'): void {
    const projectId = project.id
    console.log(`[BATCH-SYNC] Adding project ${projectId} to batch (context: ${context})`)
    
    this.batchedProjects.add(projectId)
    
    // 只更新本地狀態，不觸發Firebase同步
    const { setProjects, setCurrentProject, projects, currentProject } = require('../stores/useProjectStore').useProjectStore.getState()
    setProjects(projects.map((p: Project) => p.id === projectId ? project : p))
    if (currentProject?.id === projectId) {
      setCurrentProject(project)
    }
    
    // 如果還沒有批次計時器，設置一個
    if (!this.batchTimer) {
      const batchDelay = this.getBatchDelay(context)
      this.batchTimer = setTimeout(() => {
        this.processBatch()
      }, batchDelay)
      
      console.log(`[BATCH-SYNC] Added project ${projectId} to batch, will process in ${batchDelay}ms (batchedProjects.size: ${this.batchedProjects.size})`)
    } else {
      console.log(`[BATCH-SYNC] Added project ${projectId} to existing batch (batchedProjects.size: ${this.batchedProjects.size})`)
    }
  }
  
  /**
   * 處理批次同步
   */
  private async processBatch(): Promise<void> {
    console.log(`[BATCH-SYNC] processBatch called, batchedProjects.size: ${this.batchedProjects.size}`)
    
    if (this.batchedProjects.size === 0) {
      console.log('[BATCH-SYNC] No projects in batch, exiting')
      this.batchTimer = null
      return
    }
    
    const projectIds = Array.from(this.batchedProjects)
    this.batchedProjects.clear()
    this.batchTimer = null
    
    console.log(`[BATCH-SYNC] Processing batch with ${projectIds.length} projects:`, projectIds)
    
    // 批次同步所有項目（可以考慮進一步優化，比如使用 Firestore batch writes）
    const { user } = useAuthStore.getState()
    if (!user) {
      console.log('[BATCH-SYNC] No user found, skipping batch sync')
      return
    }
    
    const config = getSyncConfig()
    const syncStore = useSyncStore.getState()
    
    // 並行同步所有項目
    const syncPromises = projectIds.map(async (projectId) => {
      try {
        const { projects } = require('../stores/useProjectStore').useProjectStore.getState()
        const project = projects.find((p: Project) => p.id === projectId)
        if (project) {
          await syncStore.syncProjectWithRetry(project, config.strategy.maxRetries, undefined, 'batch')
          console.log(`[BATCH-SYNC] Successfully synced project ${projectId}`)
        }
      } catch (error) {
        console.error(`[BATCH-SYNC] Error syncing project ${projectId}:`, error)
      }
    })
    
    await Promise.allSettled(syncPromises)
    console.log(`[BATCH-SYNC] Completed batch processing`)
  }
  
  /**
   * 判斷是否應該使用批次處理
   */
  private shouldUseBatching(context: string): boolean {
    const progressContexts = [
      'nextStitch',
      'previousStitch',
      'setCurrentStitch',
      'setCurrentRound'
    ]
    
    return progressContexts.includes(context)
  }
  
  /**
   * 獲取操作優先級
   */
  private getPriority(context: string, isUrgent: boolean): 'high' | 'medium' | 'low' {
    if (isUrgent) return 'high'
    
    const highPriorityContexts = [
      'deleteProject',
      'createProject'
    ]
    
    const mediumPriorityContexts = [
      'markProjectComplete',
      'resetProgress',
      'updateChart',
      'deleteChart'
    ]
    
    const lowPriorityContexts = [
      'nextStitch',
      'previousStitch',
      'setCurrentStitch',
      'setCurrentRound'
    ]
    
    if (highPriorityContexts.includes(context)) return 'high'
    if (mediumPriorityContexts.includes(context)) return 'medium'
    if (lowPriorityContexts.includes(context)) return 'low'
    
    return 'medium' // 預設為中等優先級
  }
  
  /**
   * 獲取批次處理延遲時間
   */
  private getBatchDelay(_context: string): number {
    const config = getSyncConfig()
    
    // 批次處理使用較長的延遲時間，進一步減少寫入頻率
    return Math.max(config.debounceTime.progress * 1.5, 10000) // 至少10秒
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
      const success = await syncStore.syncProjectWithRetry(project, config.strategy.maxRetries, undefined, context)
      
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