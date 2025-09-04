import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp,
  increment
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { 
  UserAnalytics, 
  ProjectAnalytics, 
  UsageEvent, 
  AnalyticsSession,
  AnalyticsQuery,
  AnalyticsSummary,
  AnalyticsAggregates
} from '../types/analytics'
import { generateId } from '../utils'
import { logger } from '../utils/logger'

class AnalyticsService {
  private currentSession: AnalyticsSession | null = null
  private sessionStartTime: Date | null = null
  private activityTimer: NodeJS.Timeout | null = null
  private isInitializing: boolean = false
  private eventBuffer: any[] = []
  private bufferFlushTimer: NodeJS.Timeout | null = null
  private lastEventTimes: Map<string, number> = new Map()
  
  // 配置參數
  private readonly BUFFER_SIZE = 5 // 批量處理事件數量
  private readonly BUFFER_FLUSH_INTERVAL = 30000 // 30秒強制刷新
  private readonly MIN_EVENT_INTERVAL = 5000 // 同類事件最小間隔5秒


  private getUserType(): 'authenticated_whitelist' | 'authenticated_non_whitelist' | 'guest' {
    const authStore = useAuthStore.getState()
    
    if (!authStore.user) {
      return 'guest'
    }
    
    return authStore.canUseFirebase() ? 'authenticated_whitelist' : 'authenticated_non_whitelist'
  }

  private getUserId(): string {
    const authStore = useAuthStore.getState()
    // 增強匿名化：使用哈希化的用戶ID
    if (authStore.user?.uid) {
      return this.hashUserId(authStore.user.uid)
    }
    return `guest_${this.getDeviceFingerprint()}`
  }

  private hashUserId(uid: string): string {
    // 簡單的哈希化，避免直接存儲用戶 UID
    let hash = 0
    for (let i = 0; i < uid.length; i++) {
      const char = uid.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 轉為32位整數
    }
    return `user_${Math.abs(hash).toString(36)}`
  }

  private getDeviceFingerprint(): string {
    // 簡化設備指紋，只使用基本信息
    const fingerprint = [
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      navigator.language
    ].join('|')
    
    return btoa(fingerprint).slice(0, 16)
  }

  private getDeviceInfo() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    return {
      isMobile
    }
  }

  private cleanUndefinedFields(obj: any): any {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          cleaned[key] = this.cleanUndefinedFields(value)
        } else {
          cleaned[key] = value
        }
      }
    }
    return cleaned
  }

  private shouldSkipEvent(eventKey: string): boolean {
    const now = Date.now()
    const lastTime = this.lastEventTimes.get(eventKey)
    
    if (lastTime && (now - lastTime) < this.MIN_EVENT_INTERVAL) {
      logger.debug(`Skipping duplicate event: ${eventKey}`)
      return true
    }
    
    this.lastEventTimes.set(eventKey, now)
    return false
  }

  private addToBuffer(eventData: any): void {
    this.eventBuffer.push({
      ...eventData,
      timestamp: serverTimestamp()
    })
    
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer()
    } else if (!this.bufferFlushTimer) {
      this.bufferFlushTimer = setTimeout(() => {
        this.flushBuffer()
      }, this.BUFFER_FLUSH_INTERVAL)
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return
    
    try {
      logger.debug(`Flushing ${this.eventBuffer.length} events to Firebase`)
      
      // 批量寫入所有事件
      const batch = this.eventBuffer.splice(0)
      
      for (const eventData of batch) {
        await addDoc(collection(db, 'analytics', 'data', 'events'), eventData)
      }
      
      logger.debug(`Successfully flushed ${batch.length} events`)
    } catch (error) {
      logger.error('Failed to flush event buffer:', error)
      // 如果失敗，不要丟失數據，但限制重試次數
      if (this.eventBuffer.length < this.BUFFER_SIZE * 2) {
        this.eventBuffer.unshift(...this.eventBuffer.splice(0))
      }
    } finally {
      if (this.bufferFlushTimer) {
        clearTimeout(this.bufferFlushTimer)
        this.bufferFlushTimer = null
      }
    }
  }

  async initializeSession(): Promise<void> {
    // 防止重複初始化
    if (this.currentSession || this.isInitializing) {
      logger.debug('Session already exists or initializing, skipping...')
      return
    }

    try {
      this.isInitializing = true
      logger.debug('Starting session initialization...')
      
      const now = new Date()
      const sessionId = generateId()
      const userId = this.getUserId()
      const userType = this.getUserType()
      const authStore = useAuthStore.getState()
      
      logger.debug('Session data:', {
        sessionId,
        userId,
        userType,
        hasUser: !!authStore.user,
        userEmail: authStore.user?.email ? authStore.user.email.split('@')[1] : 'none'
      })
      
      this.currentSession = {
        id: sessionId,
        userId,
        userType,
        userEmail: authStore.user?.email ? authStore.user.email.split('@')[1] : undefined,
        startTime: now,
        pageViews: 1,
        actions: 0,
        deviceInfo: this.getDeviceInfo(),
        lastActivity: now
      }
      
      this.sessionStartTime = now
      
      logger.debug('Updating user analytics...')
      await this.updateUserAnalytics()
      
      // 不要在初始化時調用 recordUsageEvent，避免無限遞歸
      logger.debug('Recording app start event...')
      await this.recordUsageEventDirect('app_start', 'session_start')
      
      this.startActivityTimer()
      
      logger.debug('Session initialized successfully!')
    } catch (error) {
      logger.error('Failed to initialize session:', error)
      // 即使初始化失敗，也創建本地會話以避免後續調用崩潰
      const now = new Date()
      this.currentSession = {
        id: generateId(),
        userId: 'fallback_user',
        userType: 'guest',
        startTime: now,
        pageViews: 1,
        actions: 0,
        deviceInfo: { isMobile: false },
        lastActivity: now
      }
    } finally {
      this.isInitializing = false
    }
  }

  async endSession(): Promise<void> {
    if (!this.currentSession || !this.sessionStartTime) return
    
    try {
      // 先刷新所有緩衝的事件
      await this.flushBuffer()
      
      const now = new Date()
      const duration = now.getTime() - this.sessionStartTime.getTime()
      
      this.currentSession.endTime = now
      this.currentSession.duration = duration
      
      await this.saveSession()
      
      if (this.activityTimer) {
        clearTimeout(this.activityTimer)
        this.activityTimer = null
      }
      
      if (this.bufferFlushTimer) {
        clearTimeout(this.bufferFlushTimer)
        this.bufferFlushTimer = null
      }
      
      logger.debug('Session ended:', {
        sessionId: this.currentSession.id,
        duration: Math.round(duration / 1000) + 's'
      })
      
      this.currentSession = null
      this.sessionStartTime = null
    } catch (error) {
      logger.error('Failed to end session:', error)
    }
  }

  async recordProjectAction(
    action: 'create' | 'update' | 'delete' | 'view',
    projectId: string,
    projectName?: string,
    metadata?: any
  ): Promise<void> {
    if (!this.currentSession) {
      logger.warn('No active session for project action, initializing...')
      await this.initializeSession()
      if (!this.currentSession) {
        logger.error('Failed to initialize session for project action')
        return
      }
    }

    try {
      // 避免重複記錄相同的view動作
      const eventKey = `project_${action}_${projectId}`
      if (action === 'view' && this.shouldSkipEvent(eventKey)) {
        return
      }

      const projectAnalytics: Omit<ProjectAnalytics, 'id'> = {
        userId: this.currentSession.userId,
        userType: this.currentSession.userType,
        sessionId: this.currentSession.id,
        action,
        projectId,
        projectName,
        timestamp: new Date(),
        metadata
      }

      // 清理 undefined 值
      const cleanedProjectAnalytics = this.cleanUndefinedFields(projectAnalytics)
      
      // 使用緩衝機制
      this.addToBuffer({
        ...cleanedProjectAnalytics,
        eventCategory: 'project_action'
      })

      this.updateActivity()
      
      logger.debug('Project action buffered:', { action, projectId, projectName })
    } catch (error) {
      logger.error('Failed to record project action:', error)
    }
  }

  async recordUsageEvent(
    eventType: 'app_start' | 'pattern_edit' | 'progress_track' | 'yarn_manage' | 'export_data' | 'import_data' | 'auth_action',
    eventAction?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.currentSession) {
      logger.warn('No active session for usage event, initializing...')
      await this.initializeSession()
      if (!this.currentSession) {
        logger.error('Failed to initialize session for usage event')
        return
      }
    }

    try {
      // 避免重複記錄相同的功能進入事件
      const eventKey = `usage_${eventType}_${eventAction || ''}`
      if (eventAction?.includes('enter_') && this.shouldSkipEvent(eventKey)) {
        return
      }

      const usageEvent: Omit<UsageEvent, 'id'> = {
        userId: this.currentSession.userId,
        userType: this.currentSession.userType,
        sessionId: this.currentSession.id,
        eventType,
        eventAction,
        timestamp: new Date(),
        metadata
      }

      // 清理 undefined 值
      const cleanedUsageEvent = this.cleanUndefinedFields(usageEvent)

      // 使用緩衝機制
      this.addToBuffer({
        ...cleanedUsageEvent,
        eventCategory: 'usage_event'
      })

      this.updateActivity()
      
      logger.debug('Usage event buffered:', { eventType, eventAction })
    } catch (error) {
      logger.error('Failed to record usage event:', error)
    }
  }

  // 直接記錄使用事件，不檢查會話狀態（用於初始化時）
  private async recordUsageEventDirect(
    eventType: 'app_start' | 'pattern_edit' | 'progress_track' | 'yarn_manage' | 'export_data' | 'import_data' | 'auth_action',
    eventAction?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.currentSession) return

    try {
      const usageEvent: Omit<UsageEvent, 'id'> = {
        userId: this.currentSession.userId,
        userType: this.currentSession.userType,
        sessionId: this.currentSession.id,
        eventType,
        eventAction,
        timestamp: new Date(),
        metadata
      }

      // 清理 undefined 值
      const cleanedUsageEvent = this.cleanUndefinedFields(usageEvent)

      // 使用緩衝機制（app_start 等重要事件也可以緩衝）
      this.addToBuffer({
        ...cleanedUsageEvent,
        eventCategory: 'usage_event'
      })

      this.updateActivity()
      
      logger.debug('Usage event buffered directly:', { eventType, eventAction })
    } catch (error) {
      logger.error('Failed to record usage event directly:', error)
    }
  }

  async getAnalyticsSummary(queryParams?: AnalyticsQuery): Promise<AnalyticsSummary> {
    try {
      const summary: AnalyticsSummary = {
        totalUsers: 0,
        activeUsers: 0,
        totalProjects: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        userDistribution: {
          authenticated_whitelist: 0,
          authenticated_non_whitelist: 0,
          guest: 0
        },
        topFeatures: [],
        dailyActiveUsers: [],
        projectCreationTrend: []
      }

      const aggregatesRef = collection(db, 'analytics', 'data', 'daily_stats')
      
      let aggregatesSnapshot
      if (queryParams?.startDate) {
        const dateFilter = where('date', '>=', queryParams.startDate.toISOString().split('T')[0])
        const q = query(aggregatesRef, dateFilter, orderBy('date', 'desc'), limit(30))
        aggregatesSnapshot = await getDocs(q)
      } else {
        const q = query(aggregatesRef, orderBy('date', 'desc'), limit(30))
        aggregatesSnapshot = await getDocs(q)
      }

      aggregatesSnapshot.forEach(doc => {
        const data = doc.data() as AnalyticsAggregates
        summary.totalUsers += data.totalUsers || 0
        summary.totalSessions += data.totalSessions || 0
        summary.averageSessionDuration += data.averageSessionDuration || 0
        
        if (data.usersByType) {
          summary.userDistribution.authenticated_whitelist += data.usersByType.authenticated_whitelist || 0
          summary.userDistribution.authenticated_non_whitelist += data.usersByType.authenticated_non_whitelist || 0
          summary.userDistribution.guest += data.usersByType.guest || 0
        }
      })

      if (aggregatesSnapshot.size > 0) {
        summary.averageSessionDuration = summary.averageSessionDuration / aggregatesSnapshot.size
      }

      return summary
    } catch (error) {
      logger.error('Failed to get analytics summary:', error)
      throw error
    }
  }

  private async updateUserAnalytics(): Promise<void> {
    if (!this.currentSession) return

    try {
      const userAnalyticsRef = doc(db, 'analytics', 'data', 'user_analytics', this.currentSession.userId)
      const userDoc = await getDoc(userAnalyticsRef)
      
      const now = new Date()
      const authStore = useAuthStore.getState()
      
      if (userDoc.exists()) {
        const updateData = this.cleanUndefinedFields({
          lastActivity: serverTimestamp(),
          totalSessions: increment(1),
          userType: this.currentSession.userType,
          userEmail: authStore.user?.email ? authStore.user.email.split('@')[1] : undefined
        })
        
        await updateDoc(userAnalyticsRef, updateData)
      } else {
        const userAnalytics: Omit<UserAnalytics, 'id'> = {
          userType: this.currentSession.userType,
          userId: authStore.user?.uid || undefined,
          userEmail: authStore.user?.email ? authStore.user.email.split('@')[1] : undefined, // 只存儲域名
          sessionId: this.currentSession.id,
          firstVisit: now,
          lastActivity: now,
          totalSessions: 1,
          totalActiveTime: 0,
          deviceInfo: this.currentSession.deviceInfo
        }

        const cleanedUserAnalytics = this.cleanUndefinedFields({
          ...userAnalytics,
          firstVisit: serverTimestamp(),
          lastActivity: serverTimestamp()
        })
        
        await setDoc(userAnalyticsRef, cleanedUserAnalytics)
      }
    } catch (error) {
      logger.error('Failed to update user analytics:', error)
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession) return

    try {
      const sessionRef = doc(db, 'analytics', 'data', 'sessions', this.currentSession.id)
      const sessionData = this.cleanUndefinedFields({
        ...this.currentSession,
        startTime: Timestamp.fromDate(this.currentSession.startTime),
        endTime: this.currentSession.endTime ? Timestamp.fromDate(this.currentSession.endTime) : null,
        lastActivity: Timestamp.fromDate(this.currentSession.lastActivity)
      })
      
      await setDoc(sessionRef, sessionData)
    } catch (error) {
      logger.error('Failed to save session:', error)
    }
  }

  private updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.actions += 1
      this.currentSession.lastActivity = new Date()
    }
  }

  private startActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer)
    }

    this.activityTimer = setTimeout(() => {
      this.endSession()
    }, 30 * 60 * 1000)
  }

  onPageView(): void {
    if (this.currentSession) {
      this.currentSession.pageViews += 1
      this.updateActivity()
    }
  }

  onUserAction(): void {
    this.updateActivity()
    this.startActivityTimer()
  }
}

export const analyticsService = new AnalyticsService()