import { Project, Round, Chart } from '../types'
import { firestoreUserService, UserProfile } from './FirestoreUserService'
import { firestoreProjectService } from './FirestoreProjectService'
import { firestoreRoundService } from './FirestoreRoundService'
import { firestoreDataCleaner } from './FirestoreDataCleaner'
import { firestoreConnectionManager } from './FirestoreConnectionManager'

// Re-export interfaces for backward compatibility
export type { UserProfile } from './FirestoreUserService'

/**
 * Main FirestoreService class that composes all specialized services
 * This class maintains backward compatibility with the original API
 * while delegating to specialized service classes for better organization
 */
class FirestoreService {
  // Service instances
  private userService = firestoreUserService
  private projectService = firestoreProjectService
  private roundService = firestoreRoundService
  private dataCleaner = firestoreDataCleaner
  private connectionManager = firestoreConnectionManager

  // ===== USER PROFILE OPERATIONS =====
  
  /**
   * Get user profile from Firestore
   * @param userId - The user's UID
   * @returns UserProfile object or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.userService.getUserProfile(userId)
  }

  /**
   * Create a new user profile in Firestore
   * @param profile - UserProfile object to create
   */
  async createUserProfile(profile: UserProfile): Promise<void> {
    return this.userService.createUserProfile(profile)
  }

  /**
   * Update user's last login timestamp
   * @param userId - The user's UID
   */
  async updateUserLastLogin(userId: string): Promise<void> {
    return this.userService.updateUserLastLogin(userId)
  }

  // ===== PROJECT OPERATIONS =====

  /**
   * Get all projects for a user
   * @param userId - User ID
   * @returns Array of projects
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    return this.projectService.getUserProjects(userId)
  }

  /**
   * Create a new project
   * @param userId - User ID
   * @param project - Project data to create
   */
  async createProject(userId: string, project: Project): Promise<void> {
    return this.projectService.createProject(userId, project)
  }

  /**
   * Update an existing project
   * @param userId - User ID
   * @param project - Project data to update
   */
  async updateProject(userId: string, project: Project): Promise<void> {
    return this.projectService.updateProject(userId, project)
  }

  /**
   * Delete a project and all its rounds
   * @param userId - User ID
   * @param projectId - Project ID to delete
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    return this.projectService.deleteProject(userId, projectId)
  }

  /**
   * Subscribe to real-time updates for user projects
   * @param userId - User ID
   * @param callback - Callback function to handle project updates
   * @returns Unsubscribe function
   */
  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void): () => void {
    return this.projectService.subscribeToUserProjects(userId, callback)
  }

  /**
   * Migrate a project from legacy format to new multi-chart format
   * @param userId - User ID
   * @param projectId - Project ID to migrate
   * @param migratedChart - The migrated chart data
   */
  async migrateProjectToNewFormat(userId: string, projectId: string, migratedChart: Chart): Promise<void> {
    return this.projectService.migrateProjectToNewFormat(userId, projectId, migratedChart)
  }

  // ===== ROUND OPERATIONS =====

  /**
   * Create a new round in Firestore
   * @param userId - User ID
   * @param projectId - Project ID
   * @param round - Round data to create
   */
  async createRound(userId: string, projectId: string, round: Round): Promise<void> {
    return this.roundService.createRound(userId, projectId, round)
  }

  /**
   * Update an existing round in Firestore
   * @param userId - User ID
   * @param projectId - Project ID
   * @param round - Round data to update
   */
  async updateRound(userId: string, projectId: string, round: Round): Promise<void> {
    return this.roundService.updateRound(userId, projectId, round)
  }

  /**
   * Delete a round from Firestore
   * @param userId - User ID
   * @param projectId - Project ID
   * @param roundId - Round ID to delete
   */
  async deleteRound(userId: string, projectId: string, roundId: string): Promise<void> {
    return this.roundService.deleteRound(userId, projectId, roundId)
  }


  // ===== CONNECTION MANAGEMENT =====

  /**
   * Enable Firestore network connection
   */
  async enableOfflineSupport(): Promise<void> {
    return this.connectionManager.enableOfflineSupport()
  }

  /**
   * Disable Firestore network connection (enable offline mode)
   */
  async disableOfflineSupport(): Promise<void> {
    return this.connectionManager.disableOfflineSupport()
  }

  /**
   * Test Firestore connection
   * @returns Promise<boolean> indicating if connection is working
   */
  async testConnection(): Promise<boolean> {
    return this.connectionManager.testConnection()
  }

  // ===== UTILITY METHODS =====

  /**
   * Get service statistics for debugging
   */
  getServiceStats(): {
    connectionStats: unknown
    timestamp: string
  } {
    return {
      connectionStats: this.connectionManager.getConnectionStats(),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Access to specialized services for advanced operations
   * These are provided for cases where direct access to specialized services is needed
   */
  get services() {
    return {
      user: this.userService,
      project: this.projectService,
      round: this.roundService,
      dataCleaner: this.dataCleaner,
      connection: this.connectionManager
    }
  }

  // ===== LEGACY COMPATIBILITY METHODS =====
  // These methods ensure backward compatibility with existing code

  /**
   * @deprecated Use projectService.getUserProjects() directly
   * Legacy method for getting user projects - maintained for backward compatibility
   */
  async getProjects(userId: string): Promise<Project[]> {
    console.warn('[FIRESTORE] getProjects() is deprecated, use getUserProjects() instead')
    return this.getUserProjects(userId)
  }

  /**
   * @deprecated Use projectService.createProject() directly  
   * Legacy method for creating projects - maintained for backward compatibility
   */
  async saveProject(userId: string, project: Project): Promise<void> {
    console.warn('[FIRESTORE] saveProject() is deprecated, use createProject() or updateProject() instead')
    
    // Check if project exists to determine if this should be create or update
    const exists = await this.projectService.projectExists(userId, project.id)
    
    if (exists) {
      return this.updateProject(userId, project)
    } else {
      return this.createProject(userId, project)
    }
  }

  /**
   * @deprecated Direct round manipulation is handled internally
   * Legacy method - maintained for backward compatibility but delegates to project updates
   */
  async updateRounds(userId: string, projectId: string, rounds: Round[]): Promise<void> {
    console.warn('[FIRESTORE] updateRounds() is deprecated, rounds are updated via project updates')
    return this.roundService.syncRounds(userId, projectId, rounds)
  }
}

// Export singleton instance to maintain backward compatibility
export const firestoreService = new FirestoreService()

// Also export the class for dependency injection or testing
export { FirestoreService }

// Export specialized services for direct access when needed
export {
  firestoreUserService,
  firestoreProjectService, 
  firestoreRoundService,
  firestoreDataCleaner,
  firestoreConnectionManager
}