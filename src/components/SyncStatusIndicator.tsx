import { useState, useEffect } from 'react'
import { useSyncStore } from '../stores/useSyncStore'
import { useBaseStore } from '../stores/useBaseStore'
import { useAuthStore } from '../stores/useAuthStore'
import { authListener } from '../services/authListener'
import { networkStatus } from '../utils/networkStatus'

export default function SyncStatusIndicator() {
  const {
    isSyncing,
    lastSyncTime
  } = useSyncStore()
  
  const {
    error,
    setError,
    isLocallyUpdating
  } = useBaseStore()
  
  const { syncMode, userType } = useAuthStore()
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOnline, setIsOnline] = useState(networkStatus.getIsOnline())

  useEffect(() => {
    const cleanup = networkStatus.addListener((online) => {
      setIsOnline(online)
    })
    
    return cleanup
  }, [])

  const handleManualSync = async () => {
    try {
      await authListener.forceSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
      setError('手動同步失敗')
    }
  }

  // 只有 Firebase 同步模式的用戶才顯示同步指示器
  if (syncMode !== 'firebase' || userType === 'guest') {
    return null
  }

  return (
    <div className="relative">
      {/* 狀態點 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-2 h-2 rounded-full hover:scale-125 transition-transform"
        title={
          !isOnline ? '離線模式' :
          isSyncing || isLocallyUpdating ? '同步中...' : 
          error ? '同步錯誤' : 
          '已同步'
        }
      >
        <div className={`w-2 h-2 rounded-full ${
          !isOnline ? 'bg-gray-500' :
          isSyncing || isLocallyUpdating ? 'bg-yellow-500 animate-pulse' : 
          error ? 'bg-red-500' : 
          'bg-green-500'
        }`} />
      </button>

      {/* 展開的詳細資訊 */}
      {isExpanded && (
        <div className="absolute top-6 right-0 sm:right-0 bg-white rounded-lg shadow-lg border p-3 w-56 z-50 
                       translate-x-[-90%] sm:translate-x-0
                       max-w-[90vw] sm:max-w-none">
          {/* 標題列與關閉按鈕 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                !isOnline ? 'bg-gray-500' :
                isSyncing || isLocallyUpdating ? 'bg-yellow-500 animate-pulse' : 
                error ? 'bg-red-500' : 
                'bg-green-500'
              }`} />
              <span className="text-sm font-medium">
                {!isOnline ? '離線模式' :
                 isSyncing || isLocallyUpdating ? '同步中...' : 
                 error ? '同步錯誤' : 
                 '已同步'}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-text-tertiary hover:text-text-secondary text-sm"
            >
              ✕
            </button>
          </div>

          {/* 網絡狀態 */}
          <div className="text-xs text-text-secondary mb-2">
            網絡狀態: {isOnline ? '已連接' : '離線'}
          </div>

          {/* 最後同步時間 */}
          {lastSyncTime && (
            <div className="text-xs text-text-secondary mb-2">
              最後同步: {lastSyncTime.toLocaleTimeString()}
            </div>
          )}

          {/* 本地更新狀態 */}
          {isLocallyUpdating && (
            <div className="text-xs text-yellow-600 mb-2">
              正在同步本地更改...
            </div>
          )}

          {/* 錯誤信息 */}
          {error && (
            <div className={`text-xs mb-2 break-words ${
              error.includes('重試') ? 'text-orange-600' : 'text-red-600'
            }`}>
              {error}
            </div>
          )}

          {/* 手動同步按鈕 */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || isLocallyUpdating || !isOnline}
            className={`w-full text-xs px-2 py-1 rounded ${
              isSyncing || isLocallyUpdating || !isOnline
                ? 'bg-background-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {!isOnline ? '離線中' :
             isSyncing || isLocallyUpdating ? '同步中...' : 
             '手動同步'}
          </button>
        </div>
      )}
    </div>
  )
}