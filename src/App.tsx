import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSyncedAppStore } from './store/syncedAppStore'
import { useAuthStore } from './store/authStore'
import { cleanupLegacyData, migrateLegacyUserData, debugStorageInfo } from './utils/migrateLegacyData'
import ProjectListView from './components/ProjectListView'
import ProjectDetailView from './components/ProjectDetailView'
import PatternEditorView from './components/PatternEditorView'
import ProgressTrackingView from './components/ProgressTrackingView'
import YarnManagerView from './components/YarnManagerView'
import ImportExportView from './components/ImportExportView'
import NotFoundView from './components/NotFoundView'
import GoogleSignIn from './components/GoogleSignIn'
import WelcomeLoadingView from './components/WelcomeLoadingView'

function App() {
  const { loadUserProjects, clearUserDataSilently, setError, error, isLoading: appIsLoading, isSyncing, projects } = useSyncedAppStore()
  const { user, isLoading: authIsLoading, initialize } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    
    // 清理舊的共享數據
    cleanupLegacyData()
    
    // 開發環境下顯示存儲調試信息
    if (import.meta.env.DEV) {
      debugStorageInfo()
    }
    
    return () => unsubscribe()
  }, [initialize])

  useEffect(() => {
    if (user) {
      console.log(`使用者已登入 (${user.uid})，載入專案...`)
      
      // 嘗試遷移舊數據（如果存在）
      migrateLegacyUserData(user.uid)
      
      loadUserProjects().catch((err: any) => {
        console.error('載入專案錯誤:', err)
        setError(err instanceof Error ? err.message : '載入專案時發生錯誤');
      });
      
      // 開發環境下顯示用戶切換後的存儲狀態
      if (import.meta.env.DEV) {
        setTimeout(() => debugStorageInfo(), 500)
      }
    } else {
      console.log('使用者已登出，清空界面數據...')
      clearUserDataSilently()
    }
  }, [user, loadUserProjects, clearUserDataSilently, setError]);

  // 認證載入中狀態
  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">正在驗證身份...</p>
        </div>
      </div>
    )
  }

  // 未登入狀態
  if (!user) {
    return <GoogleSignIn />
  }

  // 已登入但還在載入或同步中，或專案還沒準備好
  if (appIsLoading || isSyncing || (projects.length === 0 && !error)) {
    return <WelcomeLoadingView />
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
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 主要路由 */}
      <Routes>
        {/* 歡迎載入頁面 */}
        <Route path="/welcome" element={<WelcomeLoadingView />} />
        
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

export default App