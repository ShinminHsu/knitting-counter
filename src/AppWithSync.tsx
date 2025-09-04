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
import { GuestDataRecovery } from './components/GuestDataRecovery'
import LoadingPage from './components/LoadingPage'

import { logger } from './utils/logger'
function AppWithSync() {
  const {
    setError,
    error,
    isLoading: appLoading
  } = useBaseStore()
  
  const { isSyncing } = useSyncStore()
  
  const { user, userType, isLoading: authLoading, isInitialized, initialize } = useAuthStore()
  
  // 恢復流程狀態
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryCompleted, setRecoveryCompleted] = useState(false)

  useEffect(() => {
    const unsubscribe = initialize()
    
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

  // 檢查是否需要顯示數據恢復界面
  useEffect(() => {
    const { canUseFirebase } = useAuthStore.getState()
    const shouldShowRecovery = isInitialized && 
      (userType === 'guest' || (user && !canUseFirebase())) && 
      !recoveryCompleted
    
    if (shouldShowRecovery) {
      setShowRecovery(true)
    }
  }, [isInitialized, userType, user, recoveryCompleted])

  // 數據恢復完成回調
  const handleRecoveryComplete = () => {
    setShowRecovery(false)
    setRecoveryCompleted(true)
  }

  // 顯示數據恢復界面（訪客用戶或非白名單用戶）
  const { canUseFirebase } = useAuthStore.getState()
  if (showRecovery && (userType === 'guest' || (user && !canUseFirebase()))) {
    return <GuestDataRecovery onRecoveryComplete={handleRecoveryComplete} />
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