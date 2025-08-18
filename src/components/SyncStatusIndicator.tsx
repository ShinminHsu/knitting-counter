import { useSyncedAppStore } from '../store/syncedAppStore'
import { authListener } from '../services/authListener'

export default function SyncStatusIndicator() {
  const { 
    isSyncing, 
    lastSyncTime, 
    error, 
    setError 
  } = useSyncedAppStore()

  const handleManualSync = async () => {
    try {
      await authListener.forceSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
      setError('手動同步失敗')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border p-3 max-w-xs">
        {/* 同步狀態 */}
        <div className="flex items-center gap-2 mb-2">
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

        {/* 最後同步時間 */}
        {lastSyncTime && (
          <div className="text-xs text-gray-600 mb-2">
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
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isSyncing ? '同步中...' : '手動同步'}
        </button>
      </div>
    </div>
  )
}