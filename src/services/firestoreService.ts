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
import { Project, Round, WorkSession, Yarn, StitchInfo, StitchGroup } from '../types'

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
  stitches: StitchInfo[]
  stitchGroups: StitchGroup[]
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
        isCompleted: project.isCompleted,
        patternLength: project.pattern.length
      })
      
      // 先嘗試同步圈數，確保子集合更新成功
      console.log('[FIRESTORE] Syncing rounds first...')
      await this.syncRounds(userId, project.id, project.pattern)
      console.log('[FIRESTORE] Rounds synced successfully')
      
      // 圈數同步成功後，才更新主專案文檔
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
      
      console.log('[FIRESTORE] Updating project document...')
      await updateDoc(projectRef, {
        ...firestoreProject,
        lastModified: Timestamp.fromDate(firestoreProject.lastModified!),
        sessions: firestoreProject.sessions!.map(session => ({
          ...session,
          startTime: Timestamp.fromDate(session.startTime)
        }))
      })
      
      console.log('[FIRESTORE] Project sync completed successfully')
      
      // 驗證同步結果
      const roundsRef = collection(db, 'users', userId, 'projects', project.id, 'rounds')
      const roundsSnap = await getDocs(roundsRef)
      console.log('[FIRESTORE] Verification - Local pattern length:', project.pattern.length, 'Remote rounds count:', roundsSnap.docs.length)
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
      console.log('[FIRESTORE-CREATE-ROUND] Creating round:', {
        userId,
        projectId,
        roundId: round.id,
        roundNumber: round.roundNumber,
        stitchCount: round.stitches.length,
        groupCount: round.stitchGroups.length
      })
      
      const roundRef = doc(db, 'users', userId, 'projects', projectId, 'rounds', round.id)
      // Clean the data to ensure no undefined values
      const cleanStitches = (round.stitches || []).filter(stitch => stitch !== undefined && stitch !== null)
      const cleanStitchGroups = (round.stitchGroups || []).filter(group => group !== undefined && group !== null)
      
      // Deep clean stitches to remove any undefined properties
      const deepCleanedStitches = cleanStitches.map(stitch => ({
        id: stitch.id || '',
        type: stitch.type || 'single',
        yarnId: stitch.yarnId || '',
        count: stitch.count || 1,
        ...(stitch.customName && { customName: stitch.customName }),
        ...(stitch.customSymbol && { customSymbol: stitch.customSymbol })
      }))
      
      // Deep clean stitch groups
      const deepCleanedStitchGroups = cleanStitchGroups.map(group => ({
        id: group.id || '',
        name: group.name || '',
        repeatCount: group.repeatCount || 1,
        stitches: (group.stitches || []).map(stitch => ({
          id: stitch.id || '',
          type: stitch.type || 'single',
          yarnId: stitch.yarnId || '',
          count: stitch.count || 1,
          ...(stitch.customName && { customName: stitch.customName }),
          ...(stitch.customSymbol && { customSymbol: stitch.customSymbol })
        }))
      }))
      
      const roundData: any = {
        id: round.id,
        roundNumber: round.roundNumber,
        stitches: deepCleanedStitches,
        stitchGroups: deepCleanedStitchGroups
      }
      
      // Only include notes if it's defined and not empty
      if (round.notes !== undefined && round.notes !== null) {
        roundData.notes = round.notes
      }
      
      await setDoc(roundRef, roundData)
      
      console.log('[FIRESTORE-CREATE-ROUND] Round created successfully:', round.id)
    } catch (error) {
      console.error('[FIRESTORE-CREATE-ROUND] Error creating round:', round.id, error)
      throw error
    }
  }

  async updateRound(userId: string, projectId: string, round: Round): Promise<void> {
    try {
      console.log('[FIRESTORE-UPDATE-ROUND] Updating round:', {
        userId,
        projectId,
        roundId: round.id,
        roundNumber: round.roundNumber,
        stitchCount: round.stitches.length,
        groupCount: round.stitchGroups.length
      })
      
      const roundRef = doc(db, 'users', userId, 'projects', projectId, 'rounds', round.id)
      // Clean the data to ensure no undefined values
      const cleanStitches = (round.stitches || []).filter(stitch => stitch !== undefined && stitch !== null)
      const cleanStitchGroups = (round.stitchGroups || []).filter(group => group !== undefined && group !== null)
      
      // Deep clean stitches to remove any undefined properties
      const deepCleanedStitches = cleanStitches.map(stitch => ({
        id: stitch.id || '',
        type: stitch.type || 'single',
        yarnId: stitch.yarnId || '',
        count: stitch.count || 1,
        ...(stitch.customName && { customName: stitch.customName }),
        ...(stitch.customSymbol && { customSymbol: stitch.customSymbol })
      }))
      
      // Deep clean stitch groups
      const deepCleanedStitchGroups = cleanStitchGroups.map(group => ({
        id: group.id || '',
        name: group.name || '',
        repeatCount: group.repeatCount || 1,
        stitches: (group.stitches || []).map(stitch => ({
          id: stitch.id || '',
          type: stitch.type || 'single',
          yarnId: stitch.yarnId || '',
          count: stitch.count || 1,
          ...(stitch.customName && { customName: stitch.customName }),
          ...(stitch.customSymbol && { customSymbol: stitch.customSymbol })
        }))
      }))
      
      console.log('[FIRESTORE-UPDATE-ROUND] Cleaned data:', {
        originalStitchesLength: round.stitches?.length || 0,
        cleanStitchesLength: deepCleanedStitches.length,
        originalGroupsLength: round.stitchGroups?.length || 0,
        cleanGroupsLength: deepCleanedStitchGroups.length
      })
      
      const updateData: any = {
        roundNumber: round.roundNumber,
        stitches: deepCleanedStitches,
        stitchGroups: deepCleanedStitchGroups
      }
      
      // Only include notes if it's defined and not empty
      if (round.notes !== undefined && round.notes !== null) {
        updateData.notes = round.notes
      }
      
      // Use setDoc with merge to handle both create and update cases
      await setDoc(roundRef, updateData, { merge: true })
      
      console.log('[FIRESTORE-UPDATE-ROUND] Round updated successfully:', round.id)
    } catch (error) {
      console.error('[FIRESTORE-UPDATE-ROUND] Error updating round:', round.id, error)
      throw error
    }
  }

  async deleteRound(userId: string, projectId: string, roundId: string): Promise<void> {
    try {
      console.log('[FIRESTORE-DELETE-ROUND] Deleting round:', {
        userId,
        projectId,
        roundId
      })
      
      const roundRef = doc(db, 'users', userId, 'projects', projectId, 'rounds', roundId)
      await deleteDoc(roundRef)
      
      console.log('[FIRESTORE-DELETE-ROUND] Round deleted successfully:', roundId)
    } catch (error) {
      console.error('[FIRESTORE-DELETE-ROUND] Error deleting round:', roundId, error)
      throw error
    }
  }

  private async syncRounds(userId: string, projectId: string, rounds: Round[]): Promise<void> {
    try {
      console.log('[FIRESTORE-SYNC-ROUNDS] Starting sync for project:', projectId, {
        localRoundsCount: rounds.length,
        roundIds: rounds.map(r => ({ id: r.id, roundNumber: r.roundNumber }))
      })
      
      const roundsRef = collection(db, 'users', userId, 'projects', projectId, 'rounds')
      const existingRoundsSnap = await getDocs(roundsRef)
      const existingRoundIds = new Set(existingRoundsSnap.docs.map(doc => doc.id))
      const currentRoundIds = new Set(rounds.map(round => round.id))
      
      console.log('[FIRESTORE-SYNC-ROUNDS] Round comparison:', {
        existingCount: existingRoundIds.size,
        currentCount: currentRoundIds.size,
        toDelete: Array.from(existingRoundIds).filter(id => !currentRoundIds.has(id)),
        toCreateOrUpdate: rounds.map(r => ({ 
          id: r.id, 
          action: existingRoundIds.has(r.id) ? 'update' : 'create' 
        }))
      })
      
      // 刪除不再存在的圈數
      const roundsToDelete = Array.from(existingRoundIds).filter(id => !currentRoundIds.has(id))
      for (const roundId of roundsToDelete) {
        console.log('[FIRESTORE-SYNC-ROUNDS] Deleting round:', roundId)
        await this.deleteRound(userId, projectId, roundId)
      }
      
      // 創建或更新圈數
      for (const round of rounds) {
        if (existingRoundIds.has(round.id)) {
          console.log('[FIRESTORE-SYNC-ROUNDS] Updating round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches.length,
            groupCount: round.stitchGroups.length
          })
          await this.updateRound(userId, projectId, round)
        } else {
          console.log('[FIRESTORE-SYNC-ROUNDS] Creating new round:', round.id, {
            roundNumber: round.roundNumber,
            stitchCount: round.stitches.length,
            groupCount: round.stitchGroups.length
          })
          await this.createRound(userId, projectId, round)
        }
      }
      
      console.log('[FIRESTORE-SYNC-ROUNDS] Sync completed successfully')
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
      // 使用更簡單的方式測試連接 - 嘗試讀取用戶的profile信息
      // 這樣不會因為文檔不存在而失敗
      const testRef = doc(db, 'test', 'connectivity')
      await getDoc(testRef)
      console.log('[FIRESTORE] Connection test completed successfully')
      return true
    } catch (error) {
      console.error('[FIRESTORE] Connection test failed:', error)
      // 只有在真正的網路錯誤時才回傳false
      if (error instanceof Error) {
        const isNetworkError = error.message.includes('offline') ||
                               error.message.includes('network') ||
                               error.message.includes('unavailable') ||
                               error.message.includes('failed to connect')
        return !isNetworkError
      }
      return false
    }
  }
}

export const firestoreService = new FirestoreService()