export interface UserAnalytics {
  id: string
  userType: 'authenticated_whitelist' | 'authenticated_non_whitelist' | 'guest'
  userId?: string
  userEmail?: string
  sessionId: string
  firstVisit: Date
  lastActivity: Date
  totalSessions: number
  totalActiveTime: number
  deviceInfo: {
    isMobile: boolean
  }
}

export interface ProjectAnalytics {
  id: string
  userId: string
  userType: 'authenticated_whitelist' | 'authenticated_non_whitelist' | 'guest'
  sessionId: string
  action: 'create' | 'update' | 'delete' | 'view'
  projectId: string
  projectName?: string
  timestamp: Date
  metadata?: {
    roundsCount?: number
    stitchesCount?: number
    chartsCount?: number
    isCompleted?: boolean
  }
}

export interface UsageEvent {
  id: string
  userId: string
  userType: 'authenticated_whitelist' | 'authenticated_non_whitelist' | 'guest'
  sessionId: string
  eventType: 'app_start' | 'pattern_edit' | 'progress_track' | 'yarn_manage' | 'export_data' | 'import_data' | 'auth_action'
  eventAction?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AnalyticsAggregates {
  id: string
  date: string
  totalUsers: number
  uniqueUsers: number
  totalSessions: number
  averageSessionDuration: number
  usersByType: {
    authenticated_whitelist: number
    authenticated_non_whitelist: number
    guest: number
  }
  projectActions: {
    created: number
    updated: number
    deleted: number
    viewed: number
  }
  popularFeatures: Array<{
    feature: string
    usageCount: number
  }>
  deviceStats: {
    mobile: number
    desktop: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface AnalyticsSession {
  id: string
  userId: string
  userType: 'authenticated_whitelist' | 'authenticated_non_whitelist' | 'guest'
  userEmail?: string
  startTime: Date
  endTime?: Date
  duration?: number
  pageViews: number
  actions: number
  deviceInfo: {
    isMobile: boolean
  }
  lastActivity: Date
}

export interface AnalyticsQuery {
  startDate?: Date
  endDate?: Date
  userType?: 'authenticated_whitelist' | 'authenticated_non_whitelist' | 'guest'
  eventType?: string
  limit?: number
  offset?: number
}

export interface AnalyticsSummary {
  totalUsers: number
  activeUsers: number
  totalProjects: number
  totalSessions: number
  averageSessionDuration: number
  userDistribution: {
    authenticated_whitelist: number
    authenticated_non_whitelist: number
    guest: number
  }
  topFeatures: Array<{
    feature: string
    usageCount: number
    percentage: number
  }>
  dailyActiveUsers: Array<{
    date: string
    count: number
  }>
  projectCreationTrend: Array<{
    date: string
    count: number
  }>
}