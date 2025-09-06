import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useBaseStore } from './stores/useBaseStore'
import { useSyncStore } from './stores/useSyncStore'
import { useAuthStore } from './stores/useAuthStore'
import { authListener } from './services/authListener'
import { testFirebaseConnection, testAuthConnection } from './utils/firebaseTest'
// import { networkStatus } from './utils/networkStatus'
import ProjectListView from './components/ProjectListView'
import ProjectDetailView from './components/ProjectDetailView'
import PatternEditorView from './components/PatternEditorView'
import ProgressTrackingView from './components/ProgressTrackingView'
import YarnManagerView from './components/YarnManagerView'
import ImportExportView from './components/ImportExportView'
import NotFoundView from './components/NotFoundView'
import UserGuideView from './components/UserGuideView'
import { GuestModeLogin } from './components/GuestModeLogin'
import LoadingPage from './components/LoadingPage'

import { logger } from './utils/logger'
import { googleAnalytics } from './services/googleAnalytics'
function AppWithSync() {
  const {
    setError,
    error,
    isLoading: appLoading
  } = useBaseStore()
  
  const { isSyncing } = useSyncStore()
  
  const { user, userType, isLoading: authLoading, isInitialized, initialize } = useAuthStore()
  
  // 恢復流程狀態
  const [recoveryCompleted, setRecoveryCompleted] = useState(false)

  useEffect(() => {
    const unsubscribe = initialize()
    
    // 初始化 Google Analytics
    googleAnalytics.initialize()
    
    // 設置認證狀態監聽器
    const authUnsubscribe = authListener.setupAuthStateListener()
    
    // 初始化網絡狀態監聽器
    logger.debug('Initializing network status monitoring')
    
    // 測試Firebase連接 - 只在用戶登入後執行
    if (user) {
      testFirebaseConnection()
      testAuthConnection()
    }
    
    return () => {
      unsubscribe()
      if (authUnsubscribe) authUnsubscribe()
    }
  }, [initialize])

  useEffect(() => {
    if (user) {
      logger.debug('使用者已登入 (${user.uid})，開始同步...')
      
      // 使用新的認證監聽器處理登入
      authListener.handleUserLogin(user).catch((err: any) => {
        logger.error('處理用戶登入錯誤:', err)
        setError('登入處理失敗')
      })
    } else if (userType === 'guest') {
      logger.debug('訪客模式，使用本地數據...')
      // 訪客模式需要載入本地項目
      authListener.handleGuestMode().catch((err: any) => {
        logger.error('處理訪客模式錯誤:', err)
        setError('載入本地數據失敗')
      })
    } else {
      logger.debug('使用者已登出，清空數據...')
      authListener.handleUserLogout()
    }
  }, [user, userType, setError])

  // 自動恢復數據（訪客模式或無法使用Firebase的用戶）
  useEffect(() => {
    const { canUseFirebase } = useAuthStore.getState()
    const shouldAutoRestore = isInitialized && 
      (userType === 'guest' || (user && !canUseFirebase())) && 
      !recoveryCompleted
    
    if (shouldAutoRestore) {
      handleAutoRestore()
    }
  }, [isInitialized, userType, user, recoveryCompleted])

  // 自動恢復數據函數
  const handleAutoRestore = async () => {
    try {
      const { guestDataBackup } = await import('./services/guestDataBackup')
      const { useProjectStore } = await import('./stores/useProjectStore')
      
      const userIdentity = userType === 'guest' ? 'guest' : user?.email || 'unknown'
      const hasData = await guestDataBackup.hasBackupData(userIdentity)
      
      if (hasData) {
        logger.debug('Found backup data, restoring automatically...')
        const backupData = await guestDataBackup.restoreGuestData(userIdentity)
        
        if (backupData) {
          const { projects: currentProjects, setProjects, setCurrentProject } = useProjectStore.getState()
          
          // 智能合併：以最新修改時間為準
          const allProjects = [...currentProjects]
          const existingIds = new Set(currentProjects.map(p => p.id))
          
          // 添加備份中不存在於當前項目列表的項目
          for (const backupProject of backupData.projects) {
            if (!existingIds.has(backupProject.id)) {
              allProjects.push(backupProject)
              logger.debug('Added missing project from backup:', backupProject.name)
            } else {
              // 如果項目存在，比較修改時間，選擇更新的版本
              const currentProject = currentProjects.find(p => p.id === backupProject.id)
              if (currentProject && backupProject.lastModified > currentProject.lastModified) {
                const index = allProjects.findIndex(p => p.id === backupProject.id)
                allProjects[index] = backupProject
                logger.debug('Updated project from backup (newer):', backupProject.name)
              }
            }
          }
          
          // 設置合併後的項目
          setProjects(allProjects)
          
          // 設置當前項目：優先使用備份的當前項目
          const { currentProject: localCurrentProject } = useProjectStore.getState()
          if (backupData.currentProject && allProjects.find(p => p.id === backupData.currentProject!.id)) {
            setCurrentProject(backupData.currentProject)
          } else if (localCurrentProject && allProjects.find(p => p.id === localCurrentProject.id)) {
            // 保持現有的當前項目
          } else if (allProjects.length > 0) {
            // 如果都沒有，選擇最後修改的項目
            const latestProject = allProjects.reduce((latest, project) => 
              project.lastModified > latest.lastModified ? project : latest
            )
            setCurrentProject(latestProject)
          }
          
          logger.debug('Data restored automatically, total projects:', allProjects.length)
        }
      }
    } catch (error) {
      logger.error('Error during auto restore:', error)
    } finally {
      setRecoveryCompleted(true)
    }
  }

  // 載入中狀態
  if (authLoading || appLoading || !isInitialized) {
    const message = authLoading ? '驗證中...' : '載入數據中...';
    const submessage = isSyncing ? '正在同步跨裝置數據...' : undefined;
    
    return <LoadingPage message={message} submessage={submessage} />
  }

  // 未初始化狀態 - 顯示選擇登入方式
  if (!user && userType === 'uninitialized') {
    return <GuestModeLogin />
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* 錯誤提示 */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}


      {/* 主要路由 */}
      <Routes>
        {/* 首頁 - 專案列表 */}
        <Route path="/" element={<ProjectListView />} />
        
        {/* 專案詳情 */}
        <Route path="/project/:projectId" element={<ProjectDetailView />} />
        
        {/* 織圖編輯 */}
        <Route path="/project/:projectId/pattern" element={<PatternEditorView />} />
        
        {/* 編織進度追蹤 */}
        <Route path="/project/:projectId/progress" element={<ProgressTrackingView />} />
        
        {/* 毛線管理 */}
        <Route path="/project/:projectId/yarns" element={<YarnManagerView />} />
        
        {/* 匯出/匯入 */}
        <Route path="/project/:projectId/import-export" element={<ImportExportView />} />
        
        {/* 使用說明 */}
        <Route path="/guide" element={<UserGuideView />} />
        
        {/* 404 頁面 */}
        <Route path="/404" element={<NotFoundView />} />
        
        {/* 重定向未知路由到 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </div>
  )
}

export default AppWithSync