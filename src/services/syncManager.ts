import { Project } from '../types'
import { firestoreService } from './firestoreService'

export interface SyncResult {
  success: boolean
  merged: Project[]
  conflicts: ProjectConflict[]
  errors: string[]
}

export interface ProjectConflict {
  projectId: string
  projectName: string
  localVersion: Project
  remoteVersion: Project
  conflictType: 'local_newer' | 'remote_newer' | 'both_modified'
}

export interface SyncOptions {
  strategy: 'local_wins' | 'remote_wins' | 'newest_wins' | 'manual_resolve'
  autoResolve: boolean
}

class SyncManager {
  async mergeLocalAndRemoteData(
    userId: string, 
    localProjects: Project[], 
    options: SyncOptions = { strategy: 'newest_wins', autoResolve: true }
  ): Promise<SyncResult> {
    try {
      const remoteProjects = await firestoreService.getUserProjects(userId)
      
      console.log('Merging data:', {
        localCount: localProjects.length,
        remoteCount: remoteProjects.length,
        strategy: options.strategy
      })
      
      const result: SyncResult = {
        success: true,
        merged: [],
        conflicts: [],
        errors: []
      }
      
      // 建立項目對應關係
      const localMap = new Map(localProjects.map(p => [p.id, p]))
      const remoteMap = new Map(remoteProjects.map(p => [p.id, p]))
      const allProjectIds = new Set([...localMap.keys(), ...remoteMap.keys()])
      
      for (const projectId of allProjectIds) {
        const localProject = localMap.get(projectId)
        const remoteProject = remoteMap.get(projectId)
        
        if (localProject && !remoteProject) {
          // 只存在於本地，上傳到雲端
          console.log(`Uploading local-only project: ${localProject.name}`)
          try {
            await firestoreService.createProject(userId, localProject)
            result.merged.push(localProject)
          } catch (error) {
            console.error('Error uploading local project:', error)
            result.errors.push(`Failed to upload project ${localProject.name}`)
            result.merged.push(localProject) // 保留本地版本
          }
        } else if (!localProject && remoteProject) {
          // 只存在於雲端，直接使用
          console.log(`Adding remote-only project: ${remoteProject.name}`)
          result.merged.push(remoteProject)
        } else if (localProject && remoteProject) {
          // 兩邊都存在，需要合併
          const mergeResult = await this.mergeProjects(
            userId, 
            localProject, 
            remoteProject, 
            options
          )
          
          if (mergeResult.conflict && !options.autoResolve) {
            result.conflicts.push(mergeResult.conflict)
          }
          
          result.merged.push(mergeResult.merged)
        }
      }
      
      // 如果有衝突且不自動解決，標記為非成功
      if (result.conflicts.length > 0 && !options.autoResolve) {
        result.success = false
      }
      
      console.log('Merge completed:', {
        merged: result.merged.length,
        conflicts: result.conflicts.length,
        errors: result.errors.length
      })
      
      return result
    } catch (error) {
      console.error('Error in merge operation:', error)
      return {
        success: false,
        merged: localProjects, // 發生錯誤時保留本地數據
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error during merge']
      }
    }
  }
  
  private async mergeProjects(
    userId: string,
    localProject: Project, 
    remoteProject: Project, 
    options: SyncOptions
  ): Promise<{
    merged: Project
    conflict?: ProjectConflict
  }> {
    const localTime = localProject.lastModified.getTime()
    const remoteTime = remoteProject.lastModified.getTime()
    
    console.log(`Merging project ${localProject.name}:`, {
      localTime: new Date(localTime).toISOString(),
      remoteTime: new Date(remoteTime).toISOString(),
      timeDiff: localTime - remoteTime
    })
    
    let winningProject: Project
    let conflict: ProjectConflict | undefined
    
    // 判斷衝突類型
    if (Math.abs(localTime - remoteTime) < 1000) {
      // 時間差小於1秒，認為是同時修改
      conflict = {
        projectId: localProject.id,
        projectName: localProject.name,
        localVersion: localProject,
        remoteVersion: remoteProject,
        conflictType: 'both_modified'
      }
    } else if (localTime > remoteTime) {
      conflict = {
        projectId: localProject.id,
        projectName: localProject.name,
        localVersion: localProject,
        remoteVersion: remoteProject,
        conflictType: 'local_newer'
      }
    } else {
      conflict = {
        projectId: localProject.id,
        projectName: localProject.name,
        localVersion: localProject,
        remoteVersion: remoteProject,
        conflictType: 'remote_newer'
      }
    }
    
    // 根據策略決定使用哪個版本
    switch (options.strategy) {
      case 'local_wins':
        winningProject = localProject
        break
      case 'remote_wins':
        winningProject = remoteProject
        break
      case 'newest_wins':
      default:
        winningProject = localTime >= remoteTime ? localProject : remoteProject
        break
    }
    
    // 如果自動解決，更新到雲端
    if (options.autoResolve) {
      try {
        await firestoreService.updateProject(userId, winningProject)
        console.log(`Auto-resolved conflict for ${winningProject.name}, chose ${localTime >= remoteTime ? 'local' : 'remote'} version`)
        // 自動解決後不返回衝突
        conflict = undefined
      } catch (error) {
        console.error('Error auto-resolving conflict:', error)
        // 更新失敗時保留本地版本
        winningProject = localProject
      }
    }
    
    return {
      merged: winningProject,
      conflict
    }
  }
  
  async resolveConflict(
    userId: string,
    conflict: ProjectConflict, 
    resolution: 'use_local' | 'use_remote' | 'custom',
    customProject?: Project
  ): Promise<boolean> {
    try {
      let projectToSave: Project
      
      switch (resolution) {
        case 'use_local':
          projectToSave = conflict.localVersion
          break
        case 'use_remote':
          projectToSave = conflict.remoteVersion
          break
        case 'custom':
          if (!customProject) {
            throw new Error('Custom project required for custom resolution')
          }
          projectToSave = customProject
          break
        default:
          throw new Error(`Unknown resolution type: ${resolution}`)
      }
      
      await firestoreService.updateProject(userId, projectToSave)
      console.log(`Conflict resolved for project ${conflict.projectName} using ${resolution}`)
      return true
    } catch (error) {
      console.error('Error resolving conflict:', error)
      return false
    }
  }
  
  async syncProjectChanges(userId: string, project: Project): Promise<boolean> {
    try {
      // 獲取雲端版本
      const remoteProjects = await firestoreService.getUserProjects(userId)
      const remoteProject = remoteProjects.find(p => p.id === project.id)
      
      if (!remoteProject) {
        // 雲端不存在，創建新項目
        await firestoreService.createProject(userId, project)
        console.log(`Created new project in cloud: ${project.name}`)
        return true
      }
      
      // 檢查是否有衝突
      if (remoteProject.lastModified.getTime() > project.lastModified.getTime()) {
        console.log(`Remote version is newer for ${project.name}, skipping sync`)
        return false
      }
      
      // 更新到雲端
      await firestoreService.updateProject(userId, project)
      console.log(`Synced project changes: ${project.name}`)
      return true
    } catch (error) {
      console.error('Error syncing project changes:', error)
      return false
    }
  }
  
  async performIncrementalSync(
    userId: string, 
    lastSyncTime: Date | null,
    localProjects: Project[]
  ): Promise<{
    updated: Project[]
    conflicts: ProjectConflict[]
    errors: string[]
  }> {
    try {
      const result = {
        updated: [] as Project[],
        conflicts: [] as ProjectConflict[],
        errors: [] as string[]
      }
      
      // 獲取雲端所有項目（Firestore沒有直接的增量查詢，所以獲取全部）
      const remoteProjects = await firestoreService.getUserProjects(userId)
      
      // 如果有上次同步時間，只處理在此之後修改的項目
      const changedRemoteProjects = lastSyncTime 
        ? remoteProjects.filter(p => p.lastModified.getTime() > lastSyncTime.getTime())
        : remoteProjects
      
      console.log(`Incremental sync: ${changedRemoteProjects.length} changed remote projects`)
      
      for (const remoteProject of changedRemoteProjects) {
        const localProject = localProjects.find(p => p.id === remoteProject.id)
        
        if (!localProject) {
          // 新的雲端項目
          result.updated.push(remoteProject)
        } else {
          // 檢查衝突
          const localTime = localProject.lastModified.getTime()
          const remoteTime = remoteProject.lastModified.getTime()
          
          if (Math.abs(localTime - remoteTime) > 1000) {
            if (remoteTime > localTime) {
              // 雲端較新，使用雲端版本
              result.updated.push(remoteProject)
            } else {
              // 本地較新，上傳本地版本
              try {
                await firestoreService.updateProject(userId, localProject)
                result.updated.push(localProject)
              } catch (error) {
                result.errors.push(`Failed to sync ${localProject.name}: ${error}`)
              }
            }
          }
        }
      }
      
      return result
    } catch (error) {
      console.error('Error in incremental sync:', error)
      return {
        updated: [],
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}

export const syncManager = new SyncManager()