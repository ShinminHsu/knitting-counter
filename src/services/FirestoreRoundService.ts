import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { Round, FirestoreRound } from '../types'
import { firestoreDataCleaner } from './FirestoreDataCleaner'

import { logger } from '../utils/logger'
/**
 * FirestoreRoundService handles all round-related operations
 * Responsible for:
 * - Round CRUD operations
 * - Round synchronization between local and remote
 * - Batch round operations
 * - Round data validation and cleaning
 */
export class FirestoreRoundService {
  private readonly USERS_COLLECTION = 'users'
  private readonly PROJECTS_COLLECTION = 'projects'
  private readonly ROUNDS_COLLECTION = 'rounds'

  /**
   * Create a new round in Firestore
   * @param userId - User ID
   * @param projectId - Project ID
   * @param round - Round data to create
   */
  async createRound(userId: string, projectId: string, round: Round): Promise<void> {
    try {
      logger.debug('Creating round:', {
        userId,
        projectId,
        roundId: round.id,
        roundNumber: round.roundNumber,
        stitchCount: round.stitches?.length || 0,
        groupCount: round.stitchGroups?.length || 0
      })

      // Validate round data
      firestoreDataCleaner.validateRound(round)

      const roundRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION, round.id)
      const cleanedRoundData = firestoreDataCleaner.cleanRound(round)

      await setDoc(roundRef, cleanedRoundData)
      
      logger.debug('Round created successfully:', round.id)
    } catch (error) {
      logger.error('Error creating round:', round.id, error)
      throw this.createRoundServiceError('Failed to create round', error)
    }
  }

  /**
   * Update an existing round in Firestore
   * @param userId - User ID
   * @param projectId - Project ID
   * @param round - Round data to update
   */
  async updateRound(userId: string, projectId: string, round: Round): Promise<void> {
    try {
      logger.debug('Updating round:', {
        userId,
        projectId,
        roundId: round.id,
        roundNumber: round.roundNumber,
        stitchCount: round.stitches?.length || 0,
        groupCount: round.stitchGroups?.length || 0
      })

      // Validate round data
      firestoreDataCleaner.validateRound(round)

      const roundRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION, round.id)
      const cleanedRoundData = firestoreDataCleaner.cleanRound(round)

      logger.debug('Cleaned data:', {
        originalStitchesLength: round.stitches?.length || 0,
        cleanStitchesLength: cleanedRoundData.stitches?.length || 0,
        originalGroupsLength: round.stitchGroups?.length || 0,
        cleanGroupsLength: cleanedRoundData.stitchGroups?.length || 0
      })

      // Use setDoc with merge to handle both create and update cases
      await setDoc(roundRef, cleanedRoundData, { merge: true })
      
      logger.debug('Round updated successfully:', round.id)
    } catch (error) {
      logger.error('Error updating round:', round.id, error)
      throw this.createRoundServiceError('Failed to update round', error)
    }
  }

  /**
   * Delete a round from Firestore
   * @param userId - User ID
   * @param projectId - Project ID
   * @param roundId - Round ID to delete
   */
  async deleteRound(userId: string, projectId: string, roundId: string): Promise<void> {
    try {
      logger.debug('Deleting round:', {
        userId,
        projectId,
        roundId
      })

      const roundRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION, roundId)
      await deleteDoc(roundRef)
      
      logger.debug('Round deleted successfully:', roundId)
    } catch (error) {
      logger.error('Error deleting round:', roundId, error)
      throw this.createRoundServiceError('Failed to delete round', error)
    }
  }

  /**
   * Get all rounds for a project
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Array of rounds ordered by round number
   */
  async getProjectRounds(userId: string, projectId: string): Promise<Round[]> {
    try {
      logger.debug('Getting rounds for project:', projectId)

      const roundsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION)
      const roundsQuery = query(roundsRef, orderBy('roundNumber'))
      const roundsSnap = await getDocs(roundsQuery)
      
      const rounds: Round[] = roundsSnap.docs.map(roundDoc => {
        const roundData = roundDoc.data() as FirestoreRound
        return {
          id: roundData.id,
          roundNumber: roundData.roundNumber,
          stitches: roundData.stitches || [],
          stitchGroups: roundData.stitchGroups || [],
          notes: roundData.notes
        }
      })

      logger.debug('Retrieved rounds:', rounds.length)
      return rounds
    } catch (error) {
      logger.error('Error getting project rounds:', error)
      throw this.createRoundServiceError('Failed to get project rounds', error)
    }
  }

  /**
   * Synchronize rounds between local and remote
   * This method handles the complex logic of determining which rounds need to be created, updated, or deleted
   * @param userId - User ID
   * @param projectId - Project ID
   * @param localRounds - Local rounds array
   * @param modifiedRoundIds - Optional array of round IDs that have been modified (for optimization)
   */
  async syncRounds(userId: string, projectId: string, localRounds: Round[], modifiedRoundIds?: string[]): Promise<void> {
    try {
      logger.debug('Starting sync for project:', projectId, {
        localRoundsCount: localRounds.length,
        modifiedRoundsCount: modifiedRoundIds?.length || 'all'
      })

      // Optimized path: if only specific rounds are modified, skip collection scanning
      if (modifiedRoundIds && modifiedRoundIds.length > 0) {
        const roundsToProcess = localRounds.filter(round => modifiedRoundIds.includes(round.id))
        logger.debug('Optimized sync - only processing modified rounds:', modifiedRoundIds)
        
        // Direct update without collection scanning
        for (const round of roundsToProcess) {
          logger.debug('Directly updating round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches?.length || 0,
            groupCount: round.stitchGroups?.length || 0
          })
          await this.updateRound(userId, projectId, round)
        }
        
        logger.debug('Optimized sync completed')
        return
      }

      // Full sync path: Get existing rounds from Firestore
      const roundsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION)
      const existingRoundsSnap = await getDocs(roundsRef)
      const existingRoundIds = new Set(existingRoundsSnap.docs.map(doc => doc.id))
      const currentRoundIds = new Set(localRounds.map(round => round.id))

      logger.debug('Full sync - Round comparison:', {
        existingCount: existingRoundIds.size,
        currentCount: currentRoundIds.size,
        toDelete: Array.from(existingRoundIds).filter(id => !currentRoundIds.has(id)),
        toCreateOrUpdate: localRounds.map(r => ({ 
          id: r.id, 
          action: existingRoundIds.has(r.id) ? 'update' : 'create' 
        }))
      })

      // Delete rounds that no longer exist locally
      const roundsToDelete = Array.from(existingRoundIds).filter(id => !currentRoundIds.has(id))
      for (const roundId of roundsToDelete) {
        logger.debug('Deleting round:', roundId)
        await this.deleteRound(userId, projectId, roundId)
      }

      // Create or update all local rounds
      for (const round of localRounds) {
        if (existingRoundIds.has(round.id)) {
          logger.debug('Updating round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches?.length || 0,
            groupCount: round.stitchGroups?.length || 0
          })
          await this.updateRound(userId, projectId, round)
        } else {
          logger.debug('Creating new round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches?.length || 0,
            groupCount: round.stitchGroups?.length || 0
          })
          await this.createRound(userId, projectId, round)
        }
      }
      
      logger.debug('Sync completed successfully')
    } catch (error) {
      logger.error('Error syncing rounds:', error)
      throw this.createRoundServiceError('Failed to sync rounds', error)
    }
  }

  /**
   * Batch create multiple rounds
   * @param userId - User ID
   * @param projectId - Project ID
   * @param rounds - Array of rounds to create
   */
  async batchCreateRounds(userId: string, projectId: string, rounds: Round[]): Promise<void> {
    try {
      logger.debug('Batch creating rounds:', rounds.length)

      for (const round of rounds) {
        await this.createRound(userId, projectId, round)
      }

      logger.debug('Batch create completed successfully')
    } catch (error) {
      logger.error('Error in batch create rounds:', error)
      throw this.createRoundServiceError('Failed to batch create rounds', error)
    }
  }

  /**
   * Batch update multiple rounds
   * @param userId - User ID
   * @param projectId - Project ID
   * @param rounds - Array of rounds to update
   */
  async batchUpdateRounds(userId: string, projectId: string, rounds: Round[]): Promise<void> {
    try {
      logger.debug('Batch updating rounds:', rounds.length)

      for (const round of rounds) {
        await this.updateRound(userId, projectId, round)
      }

      logger.debug('Batch update completed successfully')
    } catch (error) {
      logger.error('Error in batch update rounds:', error)
      throw this.createRoundServiceError('Failed to batch update rounds', error)
    }
  }

  /**
   * Delete all rounds for a project
   * @param userId - User ID
   * @param projectId - Project ID
   */
  async deleteAllProjectRounds(userId: string, projectId: string): Promise<void> {
    try {
      logger.debug('Deleting all rounds for project:', projectId)

      const roundsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION)
      const roundsSnap = await getDocs(roundsRef)
      
      for (const roundDoc of roundsSnap.docs) {
        await deleteDoc(roundDoc.ref)
      }
      
      logger.debug('All project rounds deleted successfully')
    } catch (error) {
      logger.error('Error deleting all project rounds:', error)
      throw this.createRoundServiceError('Failed to delete all project rounds', error)
    }
  }

  /**
   * Get round statistics for a project
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Statistics about the project's rounds
   */
  async getProjectRoundStats(userId: string, projectId: string): Promise<{
    totalRounds: number
    totalStitches: number
    totalGroups: number
    roundNumbers: number[]
  }> {
    try {
      const rounds = await this.getProjectRounds(userId, projectId)
      
      const stats = {
        totalRounds: rounds.length,
        totalStitches: rounds.reduce((sum, round) => sum + (round.stitches?.length || 0), 0),
        totalGroups: rounds.reduce((sum, round) => sum + (round.stitchGroups?.length || 0), 0),
        roundNumbers: rounds.map(round => round.roundNumber).sort((a, b) => a - b)
      }

      logger.debug('Project stats:', stats)
      return stats
    } catch (error) {
      logger.error('Error getting project round stats:', error)
      throw this.createRoundServiceError('Failed to get project round stats', error)
    }
  }

  /**
   * Create a standardized round service error
   * @private
   */
  private createRoundServiceError(message: string, originalError: unknown): Error {
    const errorMessage = originalError instanceof Error ? originalError.message : String(originalError)
    const error = new Error(`[FirestoreRoundService] ${message}: ${errorMessage}`)
    return error
  }
}

export const firestoreRoundService = new FirestoreRoundService()