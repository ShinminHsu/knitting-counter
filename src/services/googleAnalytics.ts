import { GA_MEASUREMENT_ID, ANALYTICS_EVENTS, type AnalyticsEvent } from '../config/analytics'
import { logger } from '../utils/logger'

// Extend gtag types
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

/**
 * Google Analytics 4 Service
 * Provides a clean interface for tracking events and page views
 */
class GoogleAnalyticsService {
  private isInitialized = false
  private isEnabled = true

  /**
   * Initialize Google Analytics
   * Should be called once when the app starts
   */
  initialize() {
    if (this.isInitialized) {
      logger.debug('GA4 already initialized')
      return
    }

    // Don't initialize in development mode unless explicitly enabled
    if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_GA_IN_DEV) {
      logger.debug('GA4 disabled in development mode')
      this.isEnabled = false
      return
    }

    try {
      // Wait for the script to load before initializing
      const waitForGtag = () => {
        if (typeof window.gtag === 'function') {
          this.configureGA4()
        } else if (window.dataLayer) {
          // If dataLayer exists but gtag isn't ready, set it up
          window.gtag = function() {
            window.dataLayer.push(arguments)
          }
          this.configureGA4()
        } else {
          // Initialize dataLayer and gtag function
          window.dataLayer = window.dataLayer || []
          window.gtag = function() {
            window.dataLayer.push(arguments)
          }
          this.configureGA4()
        }
      }

      // Check if gtag script is already loaded
      if (document.querySelector('script[src*="googletagmanager.com/gtag"]')) {
        // Script exists, wait a bit for it to load
        setTimeout(waitForGtag, 100)
      } else {
        // Script will be loaded from HTML, wait for it
        waitForGtag()
      }

    } catch (error) {
      logger.error('Failed to initialize GA4:', error)
      this.isEnabled = false
    }
  }

  private configureGA4() {
    try {
      // Configure GA4
      window.gtag('js', new Date())
      window.gtag('config', GA_MEASUREMENT_ID, {
        // Enhanced privacy settings
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        // Custom settings
        send_page_view: false, // We'll handle page views manually
      })

      this.isInitialized = true
      logger.debug('GA4 configured successfully with ID:', GA_MEASUREMENT_ID)
    } catch (error) {
      logger.error('Failed to configure GA4:', error)
      this.isEnabled = false
    }
  }

  /**
   * Track a page view
   * @param path - The page path (e.g., '/projects/123')
   * @param title - Optional page title
   */
  trackPageView(path: string, title?: string) {
    if (!this.isEnabled || !this.isInitialized) return
    
    // Check if gtag is available
    if (typeof window.gtag !== 'function') {
      logger.debug('GA4 gtag not ready, skipping page view:', path)
      return
    }

    try {
      window.gtag('event', ANALYTICS_EVENTS.PAGE_VIEW, {
        page_path: path,
        page_title: title || document.title,
        page_location: window.location.href,
      })
      
      logger.debug('GA4 page view tracked:', path)
    } catch (error) {
      logger.error('Failed to track page view:', error)
    }
  }

  /**
   * Track a custom event
   * @param eventName - The event name (should use ANALYTICS_EVENTS constants)
   * @param parameters - Additional event parameters
   */
  trackEvent(eventName: AnalyticsEvent, parameters?: Record<string, any>) {
    if (!this.isEnabled || !this.isInitialized) return
    
    // Check if gtag is available
    if (typeof window.gtag !== 'function') {
      logger.debug('GA4 gtag not ready, skipping event:', eventName)
      return
    }

    try {
      // Clean parameters to ensure they're GA4 compatible
      const cleanParameters = this.cleanParameters(parameters || {})
      
      window.gtag('event', eventName, cleanParameters)
      
      logger.debug('GA4 event tracked:', { eventName, parameters: cleanParameters })
    } catch (error) {
      logger.error('Failed to track event:', error)
    }
  }

  /**
   * Track project-related events
   */
  trackProjectEvent(action: 'create' | 'update' | 'delete' | 'view' | 'complete', projectData: {
    project_id: string
    project_name?: string
    rounds_count?: number
    stitches_count?: number
    charts_count?: number
  }) {
    const eventMap = {
      create: ANALYTICS_EVENTS.PROJECT_CREATE,
      update: ANALYTICS_EVENTS.PROJECT_UPDATE,
      delete: ANALYTICS_EVENTS.PROJECT_DELETE,
      view: ANALYTICS_EVENTS.PROJECT_VIEW,
      complete: ANALYTICS_EVENTS.PROJECT_COMPLETE,
    }

    this.trackEvent(eventMap[action], projectData)
  }

  /**
   * Track pattern editing events
   */
  trackPatternEvent(action: 'start' | 'add_round' | 'add_stitch' | 'add_group' | 'delete_round', data?: Record<string, any>) {
    const eventMap = {
      start: ANALYTICS_EVENTS.PATTERN_EDIT_START,
      add_round: ANALYTICS_EVENTS.PATTERN_ADD_ROUND,
      add_stitch: ANALYTICS_EVENTS.PATTERN_ADD_STITCH,
      add_group: ANALYTICS_EVENTS.PATTERN_ADD_GROUP,
      delete_round: ANALYTICS_EVENTS.PATTERN_DELETE_ROUND,
    }

    this.trackEvent(eventMap[action], data)
  }

  /**
   * Track progress tracking events
   */
  trackProgressEvent(action: 'start' | 'next_stitch' | 'previous_stitch' | 'complete_round' | 'reset', data?: Record<string, any>) {
    const eventMap = {
      start: ANALYTICS_EVENTS.PROGRESS_START,
      next_stitch: ANALYTICS_EVENTS.PROGRESS_NEXT_STITCH,
      previous_stitch: ANALYTICS_EVENTS.PROGRESS_PREVIOUS_STITCH,
      complete_round: ANALYTICS_EVENTS.PROGRESS_COMPLETE_ROUND,
      reset: ANALYTICS_EVENTS.PROGRESS_RESET,
    }

    this.trackEvent(eventMap[action], data)
  }

  /**
   * Track authentication events
   */
  trackAuthEvent(action: 'login' | 'logout' | 'guest_mode', data?: Record<string, any>) {
    const eventMap = {
      login: ANALYTICS_EVENTS.AUTH_LOGIN,
      logout: ANALYTICS_EVENTS.AUTH_LOGOUT,
      guest_mode: ANALYTICS_EVENTS.AUTH_GUEST_MODE,
    }

    this.trackEvent(eventMap[action], data)
  }

  /**
   * Track yarn management events
   */
  trackYarnEvent(action: 'add' | 'update' | 'delete', data?: Record<string, any>) {
    const eventMap = {
      add: ANALYTICS_EVENTS.YARN_ADD,
      update: ANALYTICS_EVENTS.YARN_UPDATE,
      delete: ANALYTICS_EVENTS.YARN_DELETE,
    }

    this.trackEvent(eventMap[action], data)
  }

  /**
   * Track import/export events
   */
  trackImportExportEvent(action: 'export' | 'import', data?: Record<string, any>) {
    const eventMap = {
      export: ANALYTICS_EVENTS.EXPORT_PROJECT,
      import: ANALYTICS_EVENTS.IMPORT_PROJECT,
    }

    this.trackEvent(eventMap[action], data)
  }

  /**
   * Track chart events
   */
  trackChartEvent(action: 'create' | 'select' | 'delete', data?: Record<string, any>) {
    const eventMap = {
      create: ANALYTICS_EVENTS.CHART_CREATE,
      select: ANALYTICS_EVENTS.CHART_SELECT,
      delete: ANALYTICS_EVENTS.CHART_DELETE,
    }

    this.trackEvent(eventMap[action], data)
  }

  /**
   * Clean parameters to ensure GA4 compatibility
   * - Convert arrays to strings
   * - Remove undefined values
   * - Ensure parameter names follow GA4 conventions
   */
  private cleanParameters(parameters: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {}

    for (const [key, value] of Object.entries(parameters)) {
      if (value === undefined || value === null) continue

      // Convert camelCase to snake_case for GA4 compatibility
      const cleanKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

      if (Array.isArray(value)) {
        cleaned[cleanKey] = value.join(',')
      } else if (typeof value === 'object') {
        cleaned[cleanKey] = JSON.stringify(value)
      } else {
        cleaned[cleanKey] = value
      }
    }

    return cleaned
  }

  /**
   * Set user properties (for user segmentation)
   */
  setUserProperties(properties: Record<string, string | number | boolean>) {
    if (!this.isEnabled || !this.isInitialized) return
    
    // Check if gtag is available
    if (typeof window.gtag !== 'function') {
      logger.debug('GA4 gtag not ready, skipping user properties')
      return
    }

    try {
      const cleanProperties = this.cleanParameters(properties)
      window.gtag('config', GA_MEASUREMENT_ID, {
        custom_map: cleanProperties
      })
      
      logger.debug('GA4 user properties set:', cleanProperties)
    } catch (error) {
      logger.error('Failed to set user properties:', error)
    }
  }

  /**
   * Enable/disable analytics (for privacy compliance)
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    logger.debug('GA4 tracking', enabled ? 'enabled' : 'disabled')
  }

  /**
   * Get current initialization status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      measurementId: GA_MEASUREMENT_ID,
    }
  }
}

// Export singleton instance
export const googleAnalytics = new GoogleAnalyticsService()