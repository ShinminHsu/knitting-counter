import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSyncedAppStore } from '../store/syncedAppStore'

export default function WelcomeLoadingView() {
  const navigate = useNavigate()
  const { isLoading, isSyncing, projects, error } = useSyncedAppStore()

  useEffect(() => {
    // 當載入和同步都完成，且有專案資料時，導航到專案列表
    if (!isLoading && !isSyncing && projects.length > 0) {
      // 稍微延遲一下，讓用戶看到完成狀態
      const timer = setTimeout(() => {
        navigate('/', { replace: true })
      }, 500)
      
      return () => clearTimeout(timer)
    }
    
    // 如果發生錯誤，也導航到主頁面讓用戶處理
    if (error && !isLoading && !isSyncing) {
      const timer = setTimeout(() => {
        navigate('/', { replace: true })
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, isSyncing, projects.length, error, navigate])

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo 或 App 圖標 */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl mx-auto flex items-center justify-center">
            <span className="text-2xl font-bold text-white">編織</span>
          </div>
        </div>

        {/* App 標題 */}
        <h1 className="text-3xl font-bold text-text-primary mb-2">編織計數器</h1>
        <p className="text-text-secondary mb-8">專業的編織計數和織圖管理工具</p>

        {/* 載入狀態 */}
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          
          <div className="space-y-2">
            {isLoading && (
              <p className="text-text-secondary text-sm">正在載入您的專案...</p>
            )}
            {isSyncing && (
              <p className="text-text-secondary text-sm">正在同步雲端資料...</p>
            )}
            {!isLoading && !isSyncing && projects.length > 0 && (
              <p className="text-primary text-sm font-medium">準備就緒！</p>
            )}
            {error && (
              <p className="text-red-600 text-sm">載入時發生問題，正在重試...</p>
            )}
          </div>
        </div>

        {/* 載入進度指示 */}
        <div className="mt-8">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`bg-primary h-1 rounded-full transition-all duration-500 ${
                isLoading ? 'w-1/3' : 
                isSyncing ? 'w-2/3' : 
                projects.length > 0 ? 'w-full' : 'w-1/4'
              }`}
            />
          </div>
        </div>

        {/* 提示文字 */}
        <div className="mt-8 text-xs text-text-tertiary">
          <p>首次載入可能需要幾秒鐘時間</p>
        </div>
      </div>
    </div>
  )
}