import { Project } from '../types'
import { firestoreService } from '../services/firestoreService'
import { syncManager } from '../services/syncManager'
import { generateId, createSampleProject } from './index'

export interface SyncTestResult {
  success: boolean
  message: string
  details?: any
}

export class SyncTester {
  async testFirestoreConnection(userId: string): Promise<SyncTestResult> {
    try {
      // 測試用戶配置檔案讀寫
      const profile = await firestoreService.getUserProfile(userId)
      
      if (!profile) {
        await firestoreService.createUserProfile({
          uid: userId,
          displayName: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          lastLogin: new Date()
        })
      } else {
        await firestoreService.updateUserLastLogin(userId)
      }
      
      return {
        success: true,
        message: 'Firestore連接測試成功'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Firestore連接測試失敗',
        details: error
      }
    }
  }
  
  async testProjectCRUD(userId: string): Promise<SyncTestResult> {
    try {
      // 創建測試專案
      const testProject: Project = {
        ...createSampleProject(),
        id: generateId(),
        name: `測試專案_${Date.now()}`
      }
      
      // 測試創建
      await firestoreService.createProject(userId, testProject)
      
      // 測試讀取
      const projects = await firestoreService.getUserProjects(userId)
      const createdProject = projects.find(p => p.id === testProject.id)
      
      if (!createdProject) {
        throw new Error('創建的專案無法找到')
      }
      
      // 測試更新
      const updatedProject = {
        ...createdProject,
        name: `更新的測試專案_${Date.now()}`,
        lastModified: new Date()
      }
      await firestoreService.updateProject(userId, updatedProject)
      
      // 驗證更新
      const updatedProjects = await firestoreService.getUserProjects(userId)
      const verifyProject = updatedProjects.find(p => p.id === testProject.id)
      
      if (!verifyProject || verifyProject.name === testProject.name) {
        throw new Error('專案更新失敗')
      }
      
      // 測試刪除
      await firestoreService.deleteProject(userId, testProject.id)
      
      // 驗證刪除
      const finalProjects = await firestoreService.getUserProjects(userId)
      const deletedProject = finalProjects.find(p => p.id === testProject.id)
      
      if (deletedProject) {
        throw new Error('專案刪除失敗')
      }
      
      return {
        success: true,
        message: '專案CRUD測試成功',
        details: {
          created: true,
          updated: true,
          deleted: true
        }
      }
    } catch (error) {
      return {
        success: false,
        message: '專案CRUD測試失敗',
        details: error
      }
    }
  }
  
  async testDataMerging(userId: string): Promise<SyncTestResult> {
    try {
      // 創建本地專案
      const localProject1: Project = {
        ...createSampleProject(),
        id: generateId(),
        name: '本地專案1',
        lastModified: new Date()
      }
      
      const localProject2: Project = {
        ...createSampleProject(),
        id: generateId(),
        name: '本地專案2',
        lastModified: new Date(Date.now() - 10000) // 10秒前
      }
      
      // 創建遠端專案（模擬另一裝置的資料）
      const remoteProject2: Project = {
        ...localProject2,
        name: '遠端專案2（更新版）',
        lastModified: new Date() // 較新的時間戳
      }
      
      const remoteProject3: Project = {
        ...createSampleProject(),
        id: generateId(),
        name: '只存在於遠端的專案',
        lastModified: new Date()
      }
      
      // 上傳遠端專案到Firestore
      await firestoreService.createProject(userId, remoteProject2)
      await firestoreService.createProject(userId, remoteProject3)
      
      // 執行資料合併
      const syncResult = await syncManager.mergeLocalAndRemoteData(
        userId,
        [localProject1, localProject2],
        { strategy: 'newest_wins', autoResolve: true }
      )
      
      if (!syncResult.success) {
        throw new Error('資料合併失敗')
      }
      
      // 驗證合併結果
      const expectedProjects = 3 // localProject1 + remoteProject2 + remoteProject3
      if (syncResult.merged.length !== expectedProjects) {
        throw new Error(`期望${expectedProjects}個專案，實際得到${syncResult.merged.length}個`)
      }
      
      // 驗證衝突解決（應該選擇較新的遠端版本）
      const mergedProject2 = syncResult.merged.find(p => p.id === localProject2.id)
      if (!mergedProject2 || mergedProject2.name !== remoteProject2.name) {
        throw new Error('衝突解決失敗')
      }
      
      return {
        success: true,
        message: '資料合併測試成功',
        details: {
          merged: syncResult.merged.length,
          conflicts: syncResult.conflicts.length,
          errors: syncResult.errors.length
        }
      }
    } catch (error) {
      return {
        success: false,
        message: '資料合併測試失敗',
        details: error
      }
    }
  }
  
  async testRealTimeSync(userId: string): Promise<SyncTestResult> {
    try {
      let syncCallbackCount = 0
      const receivedProjects: Project[] = []
      
      // 設置即時監聽
      const unsubscribe = firestoreService.subscribeToUserProjects(userId, (projects) => {
        syncCallbackCount++
        receivedProjects.splice(0, receivedProjects.length, ...projects)
      })
      
      // 等待初始載入
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 創建測試專案
      const testProject: Project = {
        ...createSampleProject(),
        id: generateId(),
        name: `即時同步測試_${Date.now()}`
      }
      
      await firestoreService.createProject(userId, testProject)
      
      // 等待同步
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 停止監聽
      unsubscribe()
      
      if (syncCallbackCount < 2) {
        throw new Error('即時同步回調次數不足')
      }
      
      const syncedProject = receivedProjects.find(p => p.id === testProject.id)
      if (!syncedProject) {
        throw new Error('即時同步的專案未找到')
      }
      
      // 清理測試數據
      await firestoreService.deleteProject(userId, testProject.id)
      
      return {
        success: true,
        message: '即時同步測試成功',
        details: {
          callbacks: syncCallbackCount,
          projectsSynced: receivedProjects.length
        }
      }
    } catch (error) {
      return {
        success: false,
        message: '即時同步測試失敗',
        details: error
      }
    }
  }
  
  async runAllTests(userId: string): Promise<SyncTestResult[]> {
    console.log('開始執行同步功能測試...')
    
    const results: SyncTestResult[] = []
    
    // 測試1: Firestore連接
    console.log('測試1: Firestore連接')
    const connectionTest = await this.testFirestoreConnection(userId)
    results.push(connectionTest)
    
    if (!connectionTest.success) {
      console.log('Firestore連接失敗，跳過後續測試')
      return results
    }
    
    // 測試2: 專案CRUD操作
    console.log('測試2: 專案CRUD操作')
    const crudTest = await this.testProjectCRUD(userId)
    results.push(crudTest)
    
    // 測試3: 資料合併
    console.log('測試3: 資料合併')
    const mergeTest = await this.testDataMerging(userId)
    results.push(mergeTest)
    
    // 測試4: 即時同步
    console.log('測試4: 即時同步')
    const realtimeTest = await this.testRealTimeSync(userId)
    results.push(realtimeTest)
    
    const passedTests = results.filter(r => r.success).length
    const totalTests = results.length
    
    console.log(`測試完成: ${passedTests}/${totalTests} 通過`)
    
    return results
  }
}

export const syncTester = new SyncTester()