import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSyncedAppStore } from './store/syncedAppStore'
import { useAuthStore } from './store/authStore'
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
import GoogleSignIn from './components/GoogleSignIn'
import LoadingPage from './components/LoadingPage'

function AppWithSync() {
  const { 
    setError, 
    error,
    isSyncing,
    isLoading: appLoading
  } = useSyncedAppStore()
  
  const { user, isLoading: authLoading, initialize } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    
    // 設置認證狀態監聽器
    const authUnsubscribe = authListener.setupAuthStateListener()
    
    // 初始化網絡狀態監聽器
    console.log('[NETWORK] Initializing network status monitoring')
    
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
      console.log(`使用者已登入 (${user.uid})，開始同步...`)
      
      // 使用新的認證監聽器處理登入
      authListener.handleUserLogin(user).catch((err: any) => {
        console.error('處理用戶登入錯誤:', err)
        setError('登入處理失敗')
      })
    } else {
      console.log('使用者已登出，清空數據...')
      authListener.handleUserLogout()
    }
  }, [user, setError])

  // 載入中狀態
  if (authLoading || appLoading) {
    const message = authLoading ? '驗證中...' : '載入數據中...';
    const submessage = isSyncing ? '正在同步跨裝置數據...' : undefined;
    
    return <LoadingPage message={message} submessage={submessage} />
  }

  // 未登入狀態
  if (!user) {
    return <GoogleSignIn />
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
        
        {/* 404 頁面 */}
        <Route path="/404" element={<NotFoundView />} />
        
        {/* 重定向未知路由到 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </div>
  )
}

export default AppWithSync