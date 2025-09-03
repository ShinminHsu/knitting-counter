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
      console.log('[FIRESTORE-ROUND] Creating round:', {
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
      
      console.log('[FIRESTORE-ROUND] Round created successfully:', round.id)
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error creating round:', round.id, error)
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
      console.log('[FIRESTORE-ROUND] Updating round:', {
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

      console.log('[FIRESTORE-ROUND] Cleaned data:', {
        originalStitchesLength: round.stitches?.length || 0,
        cleanStitchesLength: cleanedRoundData.stitches?.length || 0,
        originalGroupsLength: round.stitchGroups?.length || 0,
        cleanGroupsLength: cleanedRoundData.stitchGroups?.length || 0
      })

      // Use setDoc with merge to handle both create and update cases
      await setDoc(roundRef, cleanedRoundData, { merge: true })
      
      console.log('[FIRESTORE-ROUND] Round updated successfully:', round.id)
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error updating round:', round.id, error)
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
      console.log('[FIRESTORE-ROUND] Deleting round:', {
        userId,
        projectId,
        roundId
      })

      const roundRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION, roundId)
      await deleteDoc(roundRef)
      
      console.log('[FIRESTORE-ROUND] Round deleted successfully:', roundId)
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error deleting round:', roundId, error)
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
      console.log('[FIRESTORE-ROUND] Getting rounds for project:', projectId)

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

      console.log('[FIRESTORE-ROUND] Retrieved rounds:', rounds.length)
      return rounds
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error getting project rounds:', error)
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
      console.log('[FIRESTORE-ROUND-SYNC] Starting sync for project:', projectId, {
        localRoundsCount: localRounds.length,
        modifiedRoundsCount: modifiedRoundIds?.length || 'all'
      })

      // Optimized path: if only specific rounds are modified, skip collection scanning
      if (modifiedRoundIds && modifiedRoundIds.length > 0) {
        const roundsToProcess = localRounds.filter(round => modifiedRoundIds.includes(round.id))
        console.log('[FIRESTORE-ROUND-SYNC] Optimized sync - only processing modified rounds:', modifiedRoundIds)
        
        // Direct update without collection scanning
        for (const round of roundsToProcess) {
          console.log('[FIRESTORE-ROUND-SYNC] Directly updating round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches?.length || 0,
            groupCount: round.stitchGroups?.length || 0
          })
          await this.updateRound(userId, projectId, round)
        }
        
        console.log('[FIRESTORE-ROUND-SYNC] Optimized sync completed')
        return
      }

      // Full sync path: Get existing rounds from Firestore
      const roundsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION)
      const existingRoundsSnap = await getDocs(roundsRef)
      const existingRoundIds = new Set(existingRoundsSnap.docs.map(doc => doc.id))
      const currentRoundIds = new Set(localRounds.map(round => round.id))

      console.log('[FIRESTORE-ROUND-SYNC] Full sync - Round comparison:', {
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
        console.log('[FIRESTORE-ROUND-SYNC] Deleting round:', roundId)
        await this.deleteRound(userId, projectId, roundId)
      }

      // Create or update all local rounds
      for (const round of localRounds) {
        if (existingRoundIds.has(round.id)) {
          console.log('[FIRESTORE-ROUND-SYNC] Updating round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches?.length || 0,
            groupCount: round.stitchGroups?.length || 0
          })
          await this.updateRound(userId, projectId, round)
        } else {
          console.log('[FIRESTORE-ROUND-SYNC] Creating new round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches?.length || 0,
            groupCount: round.stitchGroups?.length || 0
          })
          await this.createRound(userId, projectId, round)
        }
      }
      
      console.log('[FIRESTORE-ROUND-SYNC] Sync completed successfully')
    } catch (error) {
      console.error('[FIRESTORE-ROUND-SYNC] Error syncing rounds:', error)
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
      console.log('[FIRESTORE-ROUND] Batch creating rounds:', rounds.length)

      for (const round of rounds) {
        await this.createRound(userId, projectId, round)
      }

      console.log('[FIRESTORE-ROUND] Batch create completed successfully')
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error in batch create rounds:', error)
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
      console.log('[FIRESTORE-ROUND] Batch updating rounds:', rounds.length)

      for (const round of rounds) {
        await this.updateRound(userId, projectId, round)
      }

      console.log('[FIRESTORE-ROUND] Batch update completed successfully')
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error in batch update rounds:', error)
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
      console.log('[FIRESTORE-ROUND] Deleting all rounds for project:', projectId)

      const roundsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId, this.ROUNDS_COLLECTION)
      const roundsSnap = await getDocs(roundsRef)
      
      for (const roundDoc of roundsSnap.docs) {
        await deleteDoc(roundDoc.ref)
      }
      
      console.log('[FIRESTORE-ROUND] All project rounds deleted successfully')
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error deleting all project rounds:', error)
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

      console.log('[FIRESTORE-ROUND] Project stats:', stats)
      return stats
    } catch (error) {
      console.error('[FIRESTORE-ROUND] Error getting project round stats:', error)
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