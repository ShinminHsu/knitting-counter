// Migration service for moving data between storage strategies
import { StorageStrategy, MigrationResult } from './types'
import { LocalStorageStrategy } from './localStorageService'
import { logger } from '../../utils/logger'

export class MigrationService {
  static async migrateFromLocalStorage(
    fromUserType: 'guest' | 'authenticated' | 'uninitialized',
    fromUserId: string | undefined,
    toStorage: StorageStrategy
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCustomStitches: 0,
      migratedTemplates: 0,
      errors: []
    }

    try {
      // Create localStorage strategy to read existing data
      const localStorageStrategy = new LocalStorageStrategy(fromUserType, fromUserId)
      await localStorageStrategy.initialize()

      // Migrate custom stitches
      try {
        const existingCustomStitches = await localStorageStrategy.loadCustomStitches()
        logger.debug(`Found ${existingCustomStitches.length} custom stitches to migrate`)

        for (const stitch of existingCustomStitches) {
          try {
            await toStorage.saveCustomStitch(stitch)
            result.migratedCustomStitches++
          } catch (error) {
            const errorMsg = `Failed to migrate custom stitch ${stitch.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            logger.error(errorMsg)
            result.errors.push(errorMsg)
          }
        }
      } catch (error) {
        const errorMsg = `Failed to load custom stitches for migration: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error(errorMsg)
        result.errors.push(errorMsg)
      }

      // Migrate templates
      try {
        const existingTemplates = await localStorageStrategy.loadTemplates()
        logger.debug(`Found ${existingTemplates.length} templates to migrate`)

        for (const template of existingTemplates) {
          try {
            await toStorage.saveTemplate(template)
            result.migratedTemplates++
          } catch (error) {
            const errorMsg = `Failed to migrate template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            logger.error(errorMsg)
            result.errors.push(errorMsg)
          }
        }
      } catch (error) {
        const errorMsg = `Failed to load templates for migration: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error(errorMsg)
        result.errors.push(errorMsg)
      }

      result.success = result.errors.length === 0 || 
                      (result.migratedCustomStitches > 0 || result.migratedTemplates > 0)

      logger.info('Migration completed:', {
        success: result.success,
        migratedCustomStitches: result.migratedCustomStitches,
        migratedTemplates: result.migratedTemplates,
        errors: result.errors.length
      })

      return result
    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error(errorMsg)
      result.errors.push(errorMsg)
      return result
    }
  }

  static async checkMigrationNeeded(
    userType: 'guest' | 'authenticated' | 'uninitialized',
    userId: string | undefined
  ): Promise<{ needsMigration: boolean; customStitchCount: number; templateCount: number }> {
    try {
      const localStorageStrategy = new LocalStorageStrategy(userType, userId)
      await localStorageStrategy.initialize()

      const customStitches = await localStorageStrategy.loadCustomStitches()
      const templates = await localStorageStrategy.loadTemplates()

      const needsMigration = customStitches.length > 0 || templates.length > 0

      return {
        needsMigration,
        customStitchCount: customStitches.length,
        templateCount: templates.length
      }
    } catch (error) {
      logger.error('Failed to check migration status:', error)
      return {
        needsMigration: false,
        customStitchCount: 0,
        templateCount: 0
      }
    }
  }

  static async clearLocalStorageAfterMigration(
    userType: 'guest' | 'authenticated' | 'uninitialized',
    userId: string | undefined
  ): Promise<void> {
    try {
      const localStorageStrategy = new LocalStorageStrategy(userType, userId)
      await localStorageStrategy.initialize()
      
      await localStorageStrategy.clearAllCustomStitches()
      await localStorageStrategy.clearAllTemplates()
      
      logger.info('Cleared localStorage after successful migration')
    } catch (error) {
      logger.error('Failed to clear localStorage after migration:', error)
      // Don't throw - this is not critical
    }
  }
}