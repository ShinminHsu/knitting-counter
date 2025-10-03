import { CustomStitchPattern, StitchGroupTemplate } from '../../types'
import { StorageStrategy, StorageConfig } from './types'
import { FirebaseStorageStrategy } from './firebaseStorageService'
import { IndexedDBStorageStrategy } from './indexedDBService'
import { LocalStorageStrategy } from './localStorageService'
import { MigrationService } from './migrationService'
import { logger } from '../../utils/logger'

export class StorageManager implements StorageStrategy {
  private primaryStrategy: StorageStrategy | null = null
  private fallbackStrategy: StorageStrategy | null = null
  private isInitialized = false
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Always create fallback strategy
      this.fallbackStrategy = new LocalStorageStrategy(this.config.userType, this.config.userId)
      await this.fallbackStrategy.initialize()

      // Determine primary strategy based on user type
      if (this.config.userType === 'authenticated' && this.config.userId) {
        // Try Firebase for authenticated users
        try {
          this.primaryStrategy = new FirebaseStorageStrategy(this.config.userId)
          await this.primaryStrategy.initialize()
          
          if (!(await this.primaryStrategy.isAvailable())) {
            logger.warn('Firebase storage not available, falling back to localStorage')
            this.primaryStrategy = null
          } else {
            logger.info('Firebase storage initialized successfully')
          }
        } catch (error) {
          logger.error('Failed to initialize Firebase storage:', error)
          this.primaryStrategy = null
        }
      } else {
        // Try IndexedDB for guest users
        try {
          this.primaryStrategy = new IndexedDBStorageStrategy()
          await this.primaryStrategy.initialize()
          
          if (!(await this.primaryStrategy.isAvailable())) {
            logger.warn('IndexedDB not available, falling back to localStorage')
            this.primaryStrategy = null
          } else {
            logger.info('IndexedDB storage initialized successfully')
          }
        } catch (error) {
          logger.error('Failed to initialize IndexedDB storage:', error)
          this.primaryStrategy = null
        }
      }

      // If we have a primary strategy, check for migration
      if (this.primaryStrategy) {
        await this.handleMigration()
      }

      this.isInitialized = true
      logger.info('Storage manager initialized:', {
        userType: this.config.userType,
        primaryStrategy: this.primaryStrategy?.constructor.name || 'None',
        fallbackStrategy: this.fallbackStrategy?.constructor.name || 'None'
      })
    } catch (error) {
      logger.error('Failed to initialize storage manager:', error)
      // Continue with fallback only
      this.isInitialized = true
    }
  }

  private async handleMigration(): Promise<void> {
    if (!this.primaryStrategy) return

    try {
      const migrationCheck = await MigrationService.checkMigrationNeeded(
        this.config.userType,
        this.config.userId
      )

      if (migrationCheck.needsMigration) {
        logger.info('Migration needed:', migrationCheck)
        
        const migrationResult = await MigrationService.migrateFromLocalStorage(
          this.config.userType,
          this.config.userId,
          this.primaryStrategy
        )

        if (migrationResult.success) {
          logger.info('Migration completed successfully:', migrationResult)
          
          // Clear localStorage after successful migration
          await MigrationService.clearLocalStorageAfterMigration(
            this.config.userType,
            this.config.userId
          )
        } else {
          logger.error('Migration failed:', migrationResult)
        }
      }
    } catch (error) {
      logger.error('Migration process failed:', error)
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.isInitialized
  }

  private async withFallback<T>(
    operation: (strategy: StorageStrategy) => Promise<T>,
    operationName: string
  ): Promise<T> {
    await this.initialize()

    // Try primary strategy first
    if (this.primaryStrategy) {
      try {
        return await operation(this.primaryStrategy)
      } catch (error) {
        logger.error(`Primary storage ${operationName} failed:`, error)
        // Continue to fallback
      }
    }

    // Use fallback strategy
    if (this.fallbackStrategy) {
      try {
        return await operation(this.fallbackStrategy)
      } catch (error) {
        logger.error(`Fallback storage ${operationName} failed:`, error)
        throw error
      }
    }

    throw new Error('No storage strategy available')
  }

  // Custom Stitches
  async loadCustomStitches(): Promise<CustomStitchPattern[]> {
    return this.withFallback(
      strategy => strategy.loadCustomStitches(),
      'loadCustomStitches'
    )
  }

  async saveCustomStitch(stitch: CustomStitchPattern): Promise<void> {
    return this.withFallback(
      strategy => strategy.saveCustomStitch(stitch),
      'saveCustomStitch'
    )
  }

  async updateCustomStitch(id: string, updates: Partial<CustomStitchPattern>): Promise<void> {
    return this.withFallback(
      strategy => strategy.updateCustomStitch(id, updates),
      'updateCustomStitch'
    )
  }

  async deleteCustomStitch(id: string): Promise<void> {
    return this.withFallback(
      strategy => strategy.deleteCustomStitch(id),
      'deleteCustomStitch'
    )
  }

  async clearAllCustomStitches(): Promise<void> {
    return this.withFallback(
      strategy => strategy.clearAllCustomStitches(),
      'clearAllCustomStitches'
    )
  }

  // Templates
  async loadTemplates(): Promise<StitchGroupTemplate[]> {
    return this.withFallback(
      strategy => strategy.loadTemplates(),
      'loadTemplates'
    )
  }

  async saveTemplate(template: StitchGroupTemplate): Promise<void> {
    return this.withFallback(
      strategy => strategy.saveTemplate(template),
      'saveTemplate'
    )
  }

  async updateTemplate(id: string, updates: Partial<StitchGroupTemplate>): Promise<void> {
    return this.withFallback(
      strategy => strategy.updateTemplate(id, updates),
      'updateTemplate'
    )
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.withFallback(
      strategy => strategy.deleteTemplate(id),
      'deleteTemplate'
    )
  }

  async clearAllTemplates(): Promise<void> {
    return this.withFallback(
      strategy => strategy.clearAllTemplates(),
      'clearAllTemplates'
    )
  }

  // Utility methods
  getCurrentStrategy(): string {
    if (this.primaryStrategy) {
      return this.primaryStrategy.constructor.name
    }
    if (this.fallbackStrategy) {
      return this.fallbackStrategy.constructor.name
    }
    return 'None'
  }

  getConfig(): StorageConfig {
    return { ...this.config }
  }
}