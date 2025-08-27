import { 
  enableNetwork, 
  disableNetwork,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'

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
        console.log('[FIRESTORE-CONNECTION] Enabling network...')
        await enableNetwork(db)
        this.isNetworkEnabled = true
        console.log('[FIRESTORE-CONNECTION] Network enabled successfully')
      } else {
        console.log('[FIRESTORE-CONNECTION] Network already enabled')
      }
    } catch (error) {
      console.error('[FIRESTORE-CONNECTION] Error enabling network:', error)
      throw this.createConnectionError('Failed to enable network', error)
    }
  }

  /**
   * Disable Firestore network connection (enable offline mode)
   */
  async disableOfflineSupport(): Promise<void> {
    try {
      if (this.isNetworkEnabled) {
        console.log('[FIRESTORE-CONNECTION] Disabling network...')
        await disableNetwork(db)
        this.isNetworkEnabled = false
        console.log('[FIRESTORE-CONNECTION] Network disabled successfully')
      } else {
        console.log('[FIRESTORE-CONNECTION] Network already disabled')
      }
    } catch (error) {
      console.error('[FIRESTORE-CONNECTION] Error disabling network:', error)
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
        console.log('[FIRESTORE-CONNECTION] Using cached connection test result:', cached.result)
        return cached.result
      }
    }

    try {
      console.log('[FIRESTORE-CONNECTION] Testing Firestore connection...')
      
      // Use a simple document read to test connectivity
      // This won't fail if the document doesn't exist, only if there are connection issues
      const testRef = doc(db, 'test', 'connectivity')
      await getDoc(testRef)
      
      const result = true
      console.log('[FIRESTORE-CONNECTION] Connection test completed successfully')
      
      // Cache the result
      this.connectionTestCache.set(cacheKey, { result, timestamp: Date.now() })
      
      return result
    } catch (error) {
      console.error('[FIRESTORE-CONNECTION] Connection test failed:', error)
      
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
      console.log('[FIRESTORE-CONNECTION] Restarting Firestore connection...')
      
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
      
      console.log('[FIRESTORE-CONNECTION] Connection restart completed, success:', isConnected)
      return isConnected
    } catch (error) {
      console.error('[FIRESTORE-CONNECTION] Error restarting connection:', error)
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
  async handleNetworkError(error: any, context: string): Promise<void> {
    console.log(`[FIRESTORE-CONNECTION] Handling network error in ${context}:`, error?.message)
    
    if (!this.isNetworkRelatedError(error)) {
      console.log('[FIRESTORE-CONNECTION] Error is not network-related, no recovery needed')
      return
    }

    // For mobile devices, try connection restart
    if (this.isMobileDevice()) {
      console.log('[FIRESTORE-CONNECTION] Mobile device detected, attempting connection restart...')
      
      const restartSuccess = await this.restartConnection()
      if (restartSuccess) {
        console.log('[FIRESTORE-CONNECTION] Connection restart successful')
      } else {
        console.log('[FIRESTORE-CONNECTION] Connection restart failed')
      }
    } else {
      console.log('[FIRESTORE-CONNECTION] Desktop device, skipping connection restart')
    }
  }

  /**
   * Determine if an error is network-related
   * @private
   */
  private isNetworkRelatedError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code?.toLowerCase() || ''

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

    return networkKeywords.some(keyword => errorMessage.includes(keyword)) ||
           networkCodes.some(code => errorCode.includes(code)) ||
           error.name === 'AbortError'
  }

  /**
   * Get optimized Firestore settings for the current device
   */
  getOptimizedSettings(): any {
    const baseSettings = {
      ignoreUndefinedProperties: true,
      cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache
      localCache: {
        kind: 'persistent' as const
      }
    }

    if (this.isMobileDevice()) {
      console.log('[FIRESTORE-CONNECTION] Mobile device detected, using optimized settings')
      return {
        ...baseSettings,
        experimentalForceLongPolling: true, // Mobile devices use long polling
        experimentalAutoDetectLongPolling: false, // Don't use auto detection
      }
    } else {
      console.log('[FIRESTORE-CONNECTION] Desktop device detected, using standard settings')
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
    console.log('[FIRESTORE-CONNECTION] Connection cache cleared')
  }

  /**
   * Get connection statistics for debugging
   */
  getConnectionStats(): any {
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
  private createConnectionError(message: string, originalError: any): Error {
    const error = new Error(`[FirestoreConnectionManager] ${message}: ${originalError?.message || originalError}`)
    return error
  }
}

export const firestoreConnectionManager = new FirestoreConnectionManager()