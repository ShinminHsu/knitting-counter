import { 
  enableNetwork, 
  disableNetwork,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'

import { logger } from '../utils/logger'
/**
 * FirestoreConnectionManager handles connection management and network operations
 * Responsible for:
 * - Network connectivity management
 * - Connection testing and validation
 * - Offline/online mode handling
 * - Connection restart and recovery
 */
export class FirestoreConnectionManager {
  private isNetworkEnabled: boolean = true
  private connectionTestCache: Map<string, { result: boolean; timestamp: number }> = new Map()
  private readonly CONNECTION_TEST_CACHE_DURATION = 30000 // 30 seconds

  /**
   * Enable Firestore network connection
   */
  async enableOfflineSupport(): Promise<void> {
    try {
      if (!this.isNetworkEnabled) {
        logger.debug('Enabling network...')
        await enableNetwork(db)
        this.isNetworkEnabled = true
        logger.debug('Network enabled successfully')
      } else {
        logger.debug('Network already enabled')
      }
    } catch (error) {
      logger.error('Error enabling network:', error)
      throw this.createConnectionError('Failed to enable network', error)
    }
  }

  /**
   * Disable Firestore network connection (enable offline mode)
   */
  async disableOfflineSupport(): Promise<void> {
    try {
      if (this.isNetworkEnabled) {
        logger.debug('Disabling network...')
        await disableNetwork(db)
        this.isNetworkEnabled = false
        logger.debug('Network disabled successfully')
      } else {
        logger.debug('Network already disabled')
      }
    } catch (error) {
      logger.error('Error disabling network:', error)
      throw this.createConnectionError('Failed to disable network', error)
    }
  }

  /**
   * Test Firestore connection by attempting to read a test document
   * @param useCache - Whether to use cached result if available
   * @returns Promise<boolean> indicating if connection is working
   */
  async testConnection(useCache: boolean = true): Promise<boolean> {
    const cacheKey = 'connection_test'
    
    // Check cache first if enabled
    if (useCache) {
      const cached = this.connectionTestCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CONNECTION_TEST_CACHE_DURATION) {
        logger.debug('Using cached connection test result:', cached.result)
        return cached.result
      }
    }

    try {
      logger.debug('Testing Firestore connection...')
      
      // Use a simple document read to test connectivity
      // This won't fail if the document doesn't exist, only if there are connection issues
      const testRef = doc(db, 'test', 'connectivity')
      await getDoc(testRef)
      
      const result = true
      logger.debug('Connection test completed successfully')
      
      // Cache the result
      this.connectionTestCache.set(cacheKey, { result, timestamp: Date.now() })
      
      return result
    } catch (error) {
      logger.error('Connection test failed:', error)
      
      // Determine if this is a real network error vs other issues
      const isNetworkError = this.isNetworkRelatedError(error)
      const result = !isNetworkError
      
      // Cache the result for a shorter duration on failure
      this.connectionTestCache.set(cacheKey, { 
        result, 
        timestamp: Date.now() - (this.CONNECTION_TEST_CACHE_DURATION * 0.5) // Shorter cache for failures
      })
      
      return result
    }
  }

  /**
   * Restart Firestore connection by disabling and re-enabling network
   * Useful for recovering from network issues on mobile devices
   */
  async restartConnection(): Promise<boolean> {
    try {
      logger.debug('Restarting Firestore connection...')
      
      // Clear connection test cache
      this.connectionTestCache.clear()
      
      // Disable then re-enable network
      await this.enableOfflineSupport()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      await this.disableOfflineSupport()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      await this.enableOfflineSupport()
      
      // Test the connection after restart
      const isConnected = await this.testConnection(false) // Don't use cache after restart
      
      logger.debug('Connection restart completed, success:', isConnected)
      return isConnected
    } catch (error) {
      logger.error('Error restarting connection:', error)
      return false
    }
  }

  /**
   * Get current network enabled state
   */
  getNetworkState(): boolean {
    return this.isNetworkEnabled
  }

  /**
   * Check if device is likely mobile based on user agent
   */
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  /**
   * Handle network errors with appropriate recovery strategies
   * @param error - The error that occurred
   * @param context - Context information about the operation
   */
  async handleNetworkError(error: unknown, context: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.debug('[FIRESTORE-CONNECTION] Handling network error in ${context}:', errorMessage)
    
    if (!this.isNetworkRelatedError(error)) {
      logger.debug('Error is not network-related, no recovery needed')
      return
    }

    // For mobile devices, try connection restart
    if (this.isMobileDevice()) {
      logger.debug('Mobile device detected, attempting connection restart...')
      
      const restartSuccess = await this.restartConnection()
      if (restartSuccess) {
        logger.debug('Connection restart successful')
      } else {
        logger.debug('Connection restart failed')
      }
    } else {
      logger.debug('Desktop device, skipping connection restart')
    }
  }

  /**
   * Determine if an error is network-related
   * @private
   */
  private isNetworkRelatedError(error: unknown): boolean {
    if (!error) return false

    const errorMessage = error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : ''
    const errorCode = error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code).toLowerCase()
      : ''

    const networkKeywords = [
      'offline',
      'network',
      'unavailable',
      'timeout',
      'failed to connect',
      'network-request-failed',
      'fetch',
      'aborted',
      'connection'
    ]

    const networkCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted'
    ]

    const hasName = error && typeof error === 'object' && 'name' in error
    const errorName = hasName ? (error as { name: unknown }).name : ''
    
    return networkKeywords.some(keyword => errorMessage.includes(keyword)) ||
           networkCodes.some(code => errorCode.includes(code)) ||
           errorName === 'AbortError'
  }

  /**
   * Get optimized Firestore settings for the current device
   */
  getOptimizedSettings(): Record<string, unknown> {
    const baseSettings = {
      ignoreUndefinedProperties: true,
      cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache
      localCache: {
        kind: 'persistent' as const
      }
    }

    if (this.isMobileDevice()) {
      logger.debug('Mobile device detected, using optimized settings')
      return {
        ...baseSettings,
        experimentalForceLongPolling: true, // Mobile devices use long polling
        experimentalAutoDetectLongPolling: false, // Don't use auto detection
      }
    } else {
      logger.debug('Desktop device detected, using standard settings')
      return {
        ...baseSettings,
        experimentalForceLongPolling: false, // Desktop uses standard connection
        experimentalAutoDetectLongPolling: true, // Auto detect best connection method
      }
    }
  }

  /**
   * Clear connection test cache
   */
  clearConnectionCache(): void {
    this.connectionTestCache.clear()
    logger.debug('Connection cache cleared')
  }

  /**
   * Get connection statistics for debugging
   */
  getConnectionStats(): Record<string, unknown> {
    return {
      isNetworkEnabled: this.isNetworkEnabled,
      isMobile: this.isMobileDevice(),
      cacheSize: this.connectionTestCache.size,
      userAgent: navigator.userAgent
    }
  }

  /**
   * Create a standardized connection error
   * @private
   */
  private createConnectionError(message: string, originalError: unknown): Error {
    const errorMessage = originalError instanceof Error ? originalError.message : String(originalError)
    const error = new Error(`[FirestoreConnectionManager] ${message}: ${errorMessage}`)
    return error
  }
}

export const firestoreConnectionManager = new FirestoreConnectionManager()