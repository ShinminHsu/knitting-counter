import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'
import { useAuthStore } from './store/authStore'
import ProjectListView from './components/ProjectListView'
import ProjectDetailView from './components/ProjectDetailView'
import PatternEditorView from './components/PatternEditorView'
import ProgressTrackingView from './components/ProgressTrackingView'
import YarnManagerView from './components/YarnManagerView'
import ImportExportView from './components/ImportExportView'
import NotFoundView from './components/NotFoundView'
import GoogleSignIn from './components/GoogleSignIn'

function App() {
  const { loadProjects, setError, error } = useAppStore()
  const { user, isLoading, initialize } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    return () => unsubscribe()
  }, [initialize])

  useEffect(() => {
    if (user) {
      console.log('使用者已登入，載入專案...')
      // 清除舊的localStorage數據（僅在開發時）
      if (import.meta.env.DEV) {
        localStorage.removeItem('knitting-counter-storage')
      }
      loadProjects().catch((err: any) => {
        console.error('載入專案錯誤:', err)
        setError(err instanceof Error ? err.message : '載入專案時發生錯誤');
      });
    }
  }, [user, loadProjects, setError]);

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">載入中...</p>
        </div>
      </div>
    )
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
              className="text-red-500 hover:text-red-700"
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

export default App