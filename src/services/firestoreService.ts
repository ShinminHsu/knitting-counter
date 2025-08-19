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
  Timestamp,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { Project, Round, WorkSession, Yarn } from '../types'

export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  createdAt: Date
  lastLogin: Date
}

export interface FirestoreProject {
  id: string
  name: string
  source?: string
  currentRound: number
  currentStitch: number
  yarns: Yarn[]
  sessions: WorkSession[]
  createdDate: Date
  lastModified: Date
  isCompleted?: boolean
}

export interface FirestoreRound {
  id: string
  roundNumber: number
  stitches: any[]
  stitchGroups: any[]
  notes?: string
}

class FirestoreService {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId, 'profile', 'info')
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        const data = userSnap.data()
        return {
          uid: data.uid,
          displayName: data.displayName,
          email: data.email,
          createdAt: data.createdAt.toDate(),
          lastLogin: data.lastLogin.toDate()
        }
      }
      return null
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  }

  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      const userRef = doc(db, 'users', profile.uid, 'profile', 'info')
      await setDoc(userRef, {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        createdAt: Timestamp.fromDate(profile.createdAt),
        lastLogin: Timestamp.fromDate(profile.lastLogin)
      })
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId, 'profile', 'info')
      await updateDoc(userRef, {
        lastLogin: Timestamp.fromDate(new Date())
      })
    } catch (error) {
      console.error('Error updating last login:', error)
      throw error
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      const projectsRef = collection(db, 'users', userId, 'projects')
      const projectsQuery = query(projectsRef, orderBy('lastModified', 'desc'))
      const projectsSnap = await getDocs(projectsQuery)
      
      const projects: Project[] = []
      
      for (const projectDoc of projectsSnap.docs) {
        const projectData = projectDoc.data() as FirestoreProject
        
        const roundsRef = collection(db, 'users', userId, 'projects', projectDoc.id, 'rounds')
        const roundsQuery = query(roundsRef, orderBy('roundNumber'))
        const roundsSnap = await getDocs(roundsQuery)
        
        const rounds: Round[] = roundsSnap.docs.map(roundDoc => {
          const roundData = roundDoc.data() as FirestoreRound
          return {
            id: roundData.id,
            roundNumber: roundData.roundNumber,
            stitches: roundData.stitches,
            stitchGroups: roundData.stitchGroups,
            notes: roundData.notes
          }
        })
        
        projects.push({
          id: projectData.id,
          name: projectData.name,
          source: projectData.source,
          pattern: rounds,
          currentRound: projectData.currentRound,
          currentStitch: projectData.currentStitch,
          yarns: projectData.yarns,
          sessions: projectData.sessions.map(session => ({
            ...session,
            startTime: session.startTime instanceof Date ? session.startTime : (session.startTime as any).toDate()
          })),
          createdDate: projectData.createdDate instanceof Date ? projectData.createdDate : (projectData.createdDate as any).toDate(),
          lastModified: projectData.lastModified instanceof Date ? projectData.lastModified : (projectData.lastModified as any).toDate(),
          isCompleted: projectData.isCompleted
        })
      }
      
      return projects
    } catch (error) {
      console.error('Error getting user projects:', error)
      throw error
    }
  }

  async createProject(userId: string, project: Project): Promise<void> {
    try {
      const projectRef = doc(db, 'users', userId, 'projects', project.id)
      
      const firestoreProject: FirestoreProject = {
        id: project.id,
        name: project.name,
        source: project.source || '',
        currentRound: project.currentRound,
        currentStitch: project.currentStitch,
        yarns: project.yarns || [],
        sessions: project.sessions?.map(session => ({
          ...session,
          startTime: session.startTime
        })) || [],
        createdDate: project.createdDate,
        lastModified: project.lastModified,
        isCompleted: project.isCompleted ?? false
      }
      
      await setDoc(projectRef, {
        ...firestoreProject,
        createdDate: Timestamp.fromDate(firestoreProject.createdDate),
        lastModified: Timestamp.fromDate(firestoreProject.lastModified),
        sessions: firestoreProject.sessions.map(session => ({
          ...session,
          startTime: Timestamp.fromDate(session.startTime)
        }))
      })
      
      for (const round of project.pattern) {
        await this.createRound(userId, project.id, round)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  async updateProject(userId: string, project: Project): Promise<void> {
    try {
      console.log('[FIRESTORE] Updating project:', project.id, {
        currentRound: project.currentRound,
        currentStitch: project.currentStitch,
        isCompleted: project.isCompleted
      })
      
      const projectRef = doc(db, 'users', userId, 'projects', project.id)
      
      const firestoreProject: Partial<FirestoreProject> = {
        name: project.name,
        source: project.source || '',
        currentRound: project.currentRound,
        currentStitch: project.currentStitch,
        yarns: project.yarns || [],
        sessions: project.sessions?.map(session => ({
          ...session,
          startTime: session.startTime
        })) || [],
        lastModified: project.lastModified,
        isCompleted: project.isCompleted ?? false
      }
      
      await updateDoc(projectRef, {
        ...firestoreProject,
        lastModified: Timestamp.fromDate(firestoreProject.lastModified!),
        sessions: firestoreProject.sessions!.map(session => ({
          ...session,
          startTime: Timestamp.fromDate(session.startTime)
        }))
      })
      
      console.log('[FIRESTORE] Project document updated successfully')
      
      await this.syncRounds(userId, project.id, project.pattern)
      
      console.log('[FIRESTORE] Project sync completed successfully')
    } catch (error) {
      console.error('[FIRESTORE] Error updating project:', error)
      
      // 檢查是否為網絡相關錯誤
      if (error instanceof Error) {
        if (error.message.includes('offline') || 
            error.message.includes('network') || 
            error.message.includes('fetch') ||
            error.message.includes('unavailable') ||
            error.message.includes('timeout') ||
            error.name === 'AbortError') {
          console.error('[FIRESTORE] Network connectivity issue detected:', error.message)
          
          // 針對移動裝置的網路問題，重新初始化 Firestore 連接
          if (error.message.includes('failed to connect') || error.message.includes('network-request-failed')) {
            console.log('[FIRESTORE] Attempting to restart Firestore connection...')
            try {
              await this.enableOfflineSupport()
              setTimeout(async () => {
                await this.disableOfflineSupport()
              }, 1000)
            } catch (restartError) {
              console.error('[FIRESTORE] Failed to restart connection:', restartError)
            }
          }
        }
      }
      
      throw error
    }
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    try {
      const roundsRef = collection(db, 'users', userId, 'projects', projectId, 'rounds')
      const roundsSnap = await getDocs(roundsRef)
      
      for (const roundDoc of roundsSnap.docs) {
        await deleteDoc(roundDoc.ref)
      }
      
      const projectRef = doc(db, 'users', userId, 'projects', projectId)
      await deleteDoc(projectRef)
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  }

  async createRound(userId: string, projectId: string, round: Round): Promise<void> {
    try {
      const roundRef = doc(db, 'users', userId, 'projects', projectId, 'rounds', round.id)
      await setDoc(roundRef, {
        id: round.id,
        roundNumber: round.roundNumber,
        stitches: round.stitches,
        stitchGroups: round.stitchGroups,
        notes: round.notes
      })
    } catch (error) {
      console.error('Error creating round:', error)
      throw error
    }
  }

  async updateRound(userId: string, projectId: string, round: Round): Promise<void> {
    try {
      const roundRef = doc(db, 'users', userId, 'projects', projectId, 'rounds', round.id)
      await updateDoc(roundRef, {
        roundNumber: round.roundNumber,
        stitches: round.stitches,
        stitchGroups: round.stitchGroups,
        notes: round.notes
      })
    } catch (error) {
      console.error('Error updating round:', error)
      throw error
    }
  }

  async deleteRound(userId: string, projectId: string, roundId: string): Promise<void> {
    try {
      const roundRef = doc(db, 'users', userId, 'projects', projectId, 'rounds', roundId)
      await deleteDoc(roundRef)
    } catch (error) {
      console.error('Error deleting round:', error)
      throw error
    }
  }

  private async syncRounds(userId: string, projectId: string, rounds: Round[]): Promise<void> {
    try {
      const roundsRef = collection(db, 'users', userId, 'projects', projectId, 'rounds')
      const existingRoundsSnap = await getDocs(roundsRef)
      const existingRoundIds = new Set(existingRoundsSnap.docs.map(doc => doc.id))
      const currentRoundIds = new Set(rounds.map(round => round.id))
      
      for (const roundId of existingRoundIds) {
        if (!currentRoundIds.has(roundId)) {
          await this.deleteRound(userId, projectId, roundId)
        }
      }
      
      for (const round of rounds) {
        if (existingRoundIds.has(round.id)) {
          await this.updateRound(userId, projectId, round)
        } else {
          await this.createRound(userId, projectId, round)
        }
      }
    } catch (error) {
      console.error('Error syncing rounds:', error)
      throw error
    }
  }

  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void): () => void {
    const projectsRef = collection(db, 'users', userId, 'projects')
    const projectsQuery = query(projectsRef, orderBy('lastModified', 'desc'))
    
    return onSnapshot(projectsQuery, async (snapshot) => {
      try {
        const projects: Project[] = []
        
        for (const projectDoc of snapshot.docs) {
          const projectData = projectDoc.data() as FirestoreProject
          
          const roundsRef = collection(db, 'users', userId, 'projects', projectDoc.id, 'rounds')
          const roundsQuery = query(roundsRef, orderBy('roundNumber'))
          const roundsSnap = await getDocs(roundsQuery)
          
          const rounds: Round[] = roundsSnap.docs.map(roundDoc => {
            const roundData = roundDoc.data() as FirestoreRound
            return {
              id: roundData.id,
              roundNumber: roundData.roundNumber,
              stitches: roundData.stitches,
              stitchGroups: roundData.stitchGroups,
              notes: roundData.notes
            }
          })
          
          projects.push({
            id: projectData.id,
            name: projectData.name,
            source: projectData.source,
            pattern: rounds,
            currentRound: projectData.currentRound,
            currentStitch: projectData.currentStitch,
            yarns: projectData.yarns,
            sessions: projectData.sessions.map(session => ({
              ...session,
              startTime: session.startTime instanceof Date ? session.startTime : (session.startTime as any).toDate()
            })),
            createdDate: projectData.createdDate instanceof Date ? projectData.createdDate : (projectData.createdDate as any).toDate(),
            lastModified: projectData.lastModified instanceof Date ? projectData.lastModified : (projectData.lastModified as any).toDate(),
            isCompleted: projectData.isCompleted
          })
        }
        
        callback(projects)
      } catch (error) {
        console.error('Error in projects subscription:', error)
      }
    })
  }

  async enableOfflineSupport(): Promise<void> {
    try {
      await enableNetwork(db)
      console.log('[FIRESTORE] Network enabled successfully')
    } catch (error) {
      console.error('[FIRESTORE] Error enabling network:', error)
    }
  }

  async disableOfflineSupport(): Promise<void> {
    try {
      await disableNetwork(db)
      console.log('[FIRESTORE] Network disabled successfully')
    } catch (error) {
      console.error('[FIRESTORE] Error disabling network:', error)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // 嘗試一個簡單的讀取操作來測試連接
      await getDoc(doc(db, '_test', 'connection'))
      console.log('[FIRESTORE] Connection test completed successfully')
      return true
    } catch (error) {
      console.error('[FIRESTORE] Connection test failed:', error)
      return false
    }
  }
}

export const firestoreService = new FirestoreService()