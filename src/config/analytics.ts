// Google Analytics 4 Configuration
export const GA_MEASUREMENT_ID = 'G-4T4J8NYV3D'

// Analytics Events Configuration
export const ANALYTICS_EVENTS = {
  // Page Views
  PAGE_VIEW: 'page_view',
  
  // Project Events
  PROJECT_CREATE: 'project_create',
  PROJECT_UPDATE: 'project_update', 
  PROJECT_DELETE: 'project_delete',
  PROJECT_VIEW: 'project_view',
  PROJECT_COMPLETE: 'project_complete',
  
  // Pattern Editing Events
  PATTERN_EDIT_START: 'pattern_edit_start',
  PATTERN_ADD_ROUND: 'pattern_add_round',
  PATTERN_ADD_STITCH: 'pattern_add_stitch',
  PATTERN_ADD_GROUP: 'pattern_add_group',
  PATTERN_DELETE_ROUND: 'pattern_delete_round',
  
  // Progress Tracking Events  
  PROGRESS_START: 'progress_start',
  PROGRESS_NEXT_STITCH: 'progress_next_stitch',
  PROGRESS_PREVIOUS_STITCH: 'progress_previous_stitch',
  PROGRESS_COMPLETE_ROUND: 'progress_complete_round',
  PROGRESS_RESET: 'progress_reset',
  
  // Yarn Management Events
  YARN_ADD: 'yarn_add',
  YARN_UPDATE: 'yarn_update',
  YARN_DELETE: 'yarn_delete',
  
  // Import/Export Events
  EXPORT_PROJECT: 'export_project',
  IMPORT_PROJECT: 'import_project',
  
  // Auth Events
  AUTH_LOGIN: 'login',
  AUTH_LOGOUT: 'logout',
  AUTH_GUEST_MODE: 'guest_mode_enter',
  
  // Chart Events
  CHART_CREATE: 'chart_create',
  CHART_SELECT: 'chart_select',
  CHART_DELETE: 'chart_delete',
  
  // Navigation Events
  NAVIGATE_TO_PROGRESS: 'navigate_to_progress',
  NAVIGATE_TO_DETAILS: 'navigate_to_details',
  NAVIGATE_TO_PATTERN: 'navigate_to_pattern',
  NAVIGATE_TO_YARNS: 'navigate_to_yarns',
  NAVIGATE_TO_IMPORT_EXPORT: 'navigate_to_import_export',
} as const

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]