import { useAuthStore } from '../stores/useAuthStore'
import { logger } from '../utils/logger'

export class StorageInitializer {
  private static isInitialized = false
  private static initializingPromise: Promise<void> | null = null

  static async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializingPromise) {
      return this.initializingPromise
    }

    if (this.isInitialized) {
      return
    }

    this.initializingPromise = this.performInitialization()
    
    try {
      await this.initializingPromise
      this.isInitialized = true
    } catch (error) {
      logger.error('Storage initialization failed:', error)
      throw error
    } finally {
      this.initializingPromise = null
    }
  }

  private static async performInitialization(): Promise<void> {
    logger.info('Initializing storage systems...')

    try {
      // Storage systems are automatically initialized through zustand persistence
      // No manual initialization needed for custom stitch and template stores
      logger.info('Storage systems initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize storage systems:', error)
      throw error
    }
  }

  static async reinitialize(): Promise<void> {
    this.isInitialized = false
    this.initializingPromise = null
    await this.initialize()
  }

  static getInitializationStatus(): { isInitialized: boolean; isInitializing: boolean } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.initializingPromise !== null
    }
  }

  // Helper to reinitialize when auth state changes
  static async handleAuthStateChange(): Promise<void> {
    const authState = useAuthStore.getState()
    logger.info('Auth state changed, reinitializing storage:', { 
      userType: authState.userType,
      userId: authState.user?.uid 
    })
    
    await this.reinitialize()
  }
}