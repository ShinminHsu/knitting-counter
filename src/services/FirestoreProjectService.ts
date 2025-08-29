import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { Project, Chart, FirestoreProject } from '../types'
import { firestoreDataCleaner } from './FirestoreDataCleaner'
import { firestoreRoundService } from './FirestoreRoundService'
import { firestoreConnectionManager } from './FirestoreConnectionManager'
import { safeParseProjects, assertIsProject } from '../utils/validation'

/**
 * FirestoreProjectService handles all project-related operations
 * Responsible for:
 * - Project CRUD operations
 * - Project migration logic for legacy data
 * - Project subscriptions and real-time updates
 * - Integration with round service for pattern data
 */
export class FirestoreProjectService {
  private readonly USERS_COLLECTION = 'users'
  private readonly PROJECTS_COLLECTION = 'projects'

  /**
   * Get all projects for a user
   * @param userId - User ID
   * @returns Array of projects with migrated legacy data
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      console.log('[FIRESTORE-PROJECT] Getting user projects for:', userId)

      const projectsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION)
      const projectsQuery = query(projectsRef, orderBy('lastModified', 'desc'))
      const projectsSnap = await getDocs(projectsQuery)
      
      const rawProjects: Project[] = []
      
      for (const projectDoc of projectsSnap.docs) {
        const project = await this.processProjectDocument(userId, projectDoc)
        rawProjects.push(project)
      }
      
      // Apply runtime validation to ensure data integrity
      const validatedProjects = safeParseProjects(rawProjects)
      
      console.log('[FIRESTORE-PROJECT] Retrieved projects:', validatedProjects.length)
      if (rawProjects.length !== validatedProjects.length) {
        console.warn('[FIRESTORE-PROJECT] Some projects failed validation:', rawProjects.length - validatedProjects.length, 'invalid')
      }
      
      return validatedProjects
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error getting user projects:', error)
      throw this.createProjectServiceError('Failed to get user projects', error)
    }
  }

  /**
   * Get a single project by ID
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Project with migrated legacy data or null if not found
   */
  async getProject(userId: string, projectId: string): Promise<Project | null> {
    try {
      console.log('[FIRESTORE-PROJECT] Getting project:', projectId)

      const projectRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId)
      const projectSnap = await getDoc(projectRef)

      if (!projectSnap.exists()) {
        console.log('[FIRESTORE-PROJECT] Project not found:', projectId)
        return null
      }

      const project = await this.processProjectDocument(userId, projectSnap)
      console.log('[FIRESTORE-PROJECT] Project retrieved successfully:', projectId)
      return project
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error getting project:', error)
      throw this.createProjectServiceError('Failed to get project', error)
    }
  }

  /**
   * Create a new project
   * @param userId - User ID
   * @param project - Project data to create
   */
  async createProject(userId: string, project: Project): Promise<void> {
    try {
      console.log('[FIRESTORE-PROJECT] Creating project:', project.name)

      // Validate project data with both existing and new runtime validation
      firestoreDataCleaner.validateProject(project)
      assertIsProject(project, 'createProject')

      const projectRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, project.id)
      const cleanedProjectData = firestoreDataCleaner.cleanProjectForCreate(project)

      await setDoc(projectRef, cleanedProjectData)
      
      // Create rounds if they exist in the pattern
      if (project.pattern && project.pattern.length > 0) {
        await firestoreRoundService.batchCreateRounds(userId, project.id, project.pattern)
      }

      console.log('[FIRESTORE-PROJECT] Project created successfully:', project.name)
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error creating project:', error)
      throw this.createProjectServiceError('Failed to create project', error)
    }
  }

  /**
   * Update an existing project
   * @param userId - User ID
   * @param project - Project data to update
   */
  async updateProject(userId: string, project: Project): Promise<void> {
    try {
      console.log('[FIRESTORE-PROJECT] Updating project:', project.id, {
        currentRound: project.currentRound,
        currentStitch: project.currentStitch,
        isCompleted: project.isCompleted,
        patternLength: project.pattern?.length || 0
      })
      
      // Validate project data with both existing and new runtime validation
      firestoreDataCleaner.validateProject(project)
      assertIsProject(project, 'updateProject')

      // First sync rounds to ensure sub-collection updates succeed
      console.log('[FIRESTORE-PROJECT] Syncing rounds first...')
      await firestoreRoundService.syncRounds(userId, project.id, project.pattern || [])
      console.log('[FIRESTORE-PROJECT] Rounds synced successfully')
      
      // Then update the main project document
      const projectRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, project.id)
      const cleanedProjectData = firestoreDataCleaner.cleanProjectForUpdate(project)

      console.log('[FIRESTORE-PROJECT] Updating project document...')
      await updateDoc(projectRef, cleanedProjectData)
      
      console.log('[FIRESTORE-PROJECT] Project sync completed successfully')
      
      // Verify sync results
      const roundStats = await firestoreRoundService.getProjectRoundStats(userId, project.id)
      console.log('[FIRESTORE-PROJECT] Verification - Local pattern length:', project.pattern?.length || 0, 'Remote rounds count:', roundStats.totalRounds)
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error updating project:', error)
      
      // Handle network errors appropriately
      await firestoreConnectionManager.handleNetworkError(error, 'updateProject')
      
      throw this.createProjectServiceError('Failed to update project', error)
    }
  }

  /**
   * Delete a project and all its rounds
   * @param userId - User ID
   * @param projectId - Project ID to delete
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    try {
      console.log('[FIRESTORE-PROJECT] Deleting project:', projectId)

      // Delete all rounds first
      await firestoreRoundService.deleteAllProjectRounds(userId, projectId)
      
      // Then delete the project document
      const projectRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId)
      await deleteDoc(projectRef)
      
      console.log('[FIRESTORE-PROJECT] Project deleted successfully:', projectId)
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error deleting project:', error)
      throw this.createProjectServiceError('Failed to delete project', error)
    }
  }

  /**
   * Subscribe to real-time updates for user projects
   * @param userId - User ID
   * @param callback - Callback function to handle project updates
   * @returns Unsubscribe function
   */
  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void): () => void {
    console.log('[FIRESTORE-PROJECT] Setting up project subscription for user:', userId)

    const projectsRef = collection(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION)
    const projectsQuery = query(projectsRef, orderBy('lastModified', 'desc'))
    
    return onSnapshot(projectsQuery, async (snapshot) => {
      try {
        console.log('[FIRESTORE-PROJECT-SUBSCRIPTION] Received project updates:', snapshot.docs.length)

        const rawProjects: Project[] = []
        
        for (const projectDoc of snapshot.docs) {
          const project = await this.processProjectDocument(userId, projectDoc)
          rawProjects.push(project)
        }
        
        // Apply runtime validation to real-time updates
        const validatedProjects = safeParseProjects(rawProjects)
        
        if (rawProjects.length !== validatedProjects.length) {
          console.warn('[FIRESTORE-PROJECT-SUBSCRIPTION] Some projects failed validation:', rawProjects.length - validatedProjects.length, 'invalid')
        }
        
        callback(validatedProjects)
      } catch (error) {
        console.error('[FIRESTORE-PROJECT-SUBSCRIPTION] Error in projects subscription:', error)
      }
    })
  }

  /**
   * Migrate a project from legacy format to new multi-chart format
   * @param userId - User ID
   * @param projectId - Project ID to migrate
   * @param migratedChart - The migrated chart data
   */
  async migrateProjectToNewFormat(userId: string, projectId: string, migratedChart: Chart): Promise<void> {
    try {
      console.log('[FIRESTORE-PROJECT] Starting migration for project:', projectId)
      
      const projectRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId)
      const cleanedChart = firestoreDataCleaner.cleanChart(migratedChart)
      
      // Update project structure, adding charts field
      await updateDoc(projectRef, {
        charts: [cleanedChart],
        currentChartId: cleanedChart.id
      })
      
      console.log('[FIRESTORE-PROJECT] Project migration completed:', projectId)
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error migrating project:', projectId, error)
    }
  }

  /**
   * Check if a project exists
   * @param userId - User ID
   * @param projectId - Project ID to check
   * @returns Boolean indicating if project exists
   */
  async projectExists(userId: string, projectId: string): Promise<boolean> {
    try {
      const projectRef = doc(db, this.USERS_COLLECTION, userId, this.PROJECTS_COLLECTION, projectId)
      const projectSnap = await getDoc(projectRef)
      return projectSnap.exists()
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error checking project existence:', error)
      return false
    }
  }

  /**
   * Get project statistics for a user
   * @param userId - User ID
   * @returns Statistics about user's projects
   */
  async getUserProjectStats(userId: string): Promise<{
    totalProjects: number
    completedProjects: number
    totalRounds: number
    recentlyModified: string[]
  }> {
    try {
      const projects = await this.getUserProjects(userId)
      
      const stats = {
        totalProjects: projects.length,
        completedProjects: projects.filter(p => p.isCompleted).length,
        totalRounds: projects.reduce((sum, p) => sum + (p.pattern?.length || 0), 0),
        recentlyModified: projects
          .slice(0, 5)
          .map(p => p.name)
      }

      console.log('[FIRESTORE-PROJECT] User stats:', stats)
      return stats
    } catch (error) {
      console.error('[FIRESTORE-PROJECT] Error getting user project stats:', error)
      throw this.createProjectServiceError('Failed to get user project stats', error)
    }
  }

  /**
   * Process a project document from Firestore, handling legacy data migration
   * @private
   */
  private async processProjectDocument(userId: string, projectDoc: DocumentSnapshot | QueryDocumentSnapshot): Promise<Project> {
    const projectData = projectDoc.data() as FirestoreProject
    
    // Get rounds from sub-collection
    const rounds = await firestoreRoundService.getProjectRounds(userId, projectDoc.id)
    
    // Check if this is a legacy project (has rounds but no charts)
    const isLegacyProject = rounds.length > 0 && (!projectData.charts || projectData.charts.length === 0)
    
    let finalCharts = projectData.charts || []
    
    // Auto-migrate legacy projects
    if (isLegacyProject) {
      console.log('[FIRESTORE-PROJECT] Migrating legacy project to multi-chart format:', projectData.id)
      const migratedChart: Chart = {
        id: `chart-${projectData.id}`,
        name: '主織圖',
        description: '從舊版本遷移的織圖',
        rounds: rounds,
        currentRound: projectData.currentRound || 1,
        currentStitch: projectData.currentStitch || 0,
        createdDate: firestoreDataCleaner.convertTimestampsToDate(projectData).createdDate,
        lastModified: new Date(),
        isCompleted: projectData.isCompleted ?? false,
        notes: ''
      }
      
      finalCharts = [migratedChart]
      
      // Async update Firebase structure (don't wait to avoid blocking)
      setTimeout(() => {
        this.migrateProjectToNewFormat(userId, projectData.id, migratedChart)
      }, 100)
    }

    // Convert and clean the project data
    const convertedData = firestoreDataCleaner.convertTimestampsToDate(projectData)

    return {
      id: projectData.id,
      name: projectData.name,
      source: projectData.source,
      notes: projectData.notes || '',
      // Backward compatibility: maintain old pattern field
      pattern: rounds,
      currentRound: projectData.currentRound || 1,
      currentStitch: projectData.currentStitch || 0,
      // New multi-chart structure
      charts: finalCharts,
      currentChartId: isLegacyProject ? finalCharts[0]?.id : (projectData.currentChartId || ''),
      yarns: projectData.yarns || [],
      sessions: convertedData.sessions || [],
      createdDate: convertedData.createdDate,
      lastModified: convertedData.lastModified,
      isCompleted: projectData.isCompleted
    }
  }

  /**
   * Create a standardized project service error
   * @private
   */
  private createProjectServiceError(message: string, originalError: unknown): Error {
    const errorMessage = originalError instanceof Error ? originalError.message : String(originalError)
    const error = new Error(`[FirestoreProjectService] ${message}: ${errorMessage}`)
    return error
  }
}

export const firestoreProjectService = new FirestoreProjectService()