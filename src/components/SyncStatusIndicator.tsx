import { useState } from 'react'
import { useSyncedAppStore } from '../store/syncedAppStore'
import { authListener } from '../services/authListener'

export default function SyncStatusIndicator() {
  const { 
    isSyncing, 
    lastSyncTime, 
    error, 
    setError 
  } = useSyncedAppStore()
  
  const [isExpanded, setIsExpanded] = useState(false)

  const handleManualSync = async () => {
    try {
      await authListener.forceSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
      setError('手動同步失敗')
    }
  }

  return (
    <div className="relative">
      {/* 狀態點 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-2 h-2 rounded-full hover:scale-125 transition-transform"
        title={isSyncing ? '同步中...' : error ? '同步錯誤' : '已同步'}
      >
        <div className={`w-2 h-2 rounded-full ${
          isSyncing ? 'bg-yellow-500 animate-pulse' : 
          error ? 'bg-red-500' : 
          'bg-green-500'
        }`} />
      </button>

      {/* 展開的詳細資訊 */}
      {isExpanded && (
        <div className="absolute top-6 right-0 bg-white rounded-lg shadow-lg border p-3 w-56 z-50">
          {/* 標題列與關閉按鈕 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isSyncing ? 'bg-yellow-500 animate-pulse' : 
                error ? 'bg-red-500' : 
                'bg-green-500'
              }`} />
              <span className="text-sm font-medium">
                {isSyncing ? '同步中...' : 
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

          {/* 最後同步時間 */}
          {lastSyncTime && (
            <div className="text-xs text-text-secondary mb-2">
              最後同步: {lastSyncTime.toLocaleTimeString()}
            </div>
          )}

          {/* 錯誤信息 */}
          {error && (
            <div className="text-xs text-red-600 mb-2 break-words">
              {error}
            </div>
          )}

          {/* 手動同步按鈕 */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`w-full text-xs px-2 py-1 rounded ${
              isSyncing 
                ? 'bg-background-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {isSyncing ? '同步中...' : '手動同步'}
          </button>
        </div>
      )}
    </div>
  )
}