import React, { useState, useEffect } from 'react'
import { getSyncConfig, setSyncMode, saveSyncConfigToStorage, loadSyncConfigFromStorage } from '../config/syncConfig'
import { debouncedSyncManager } from '../utils/debouncedSync'

interface SyncSettingsProps {
  isOpen: boolean
  onClose: () => void
}

// 開發者專用的 Firebase 同步調試工具
// 只在開發環境或通過特殊方式顯示，不向一般用戶暴露
export const SyncSettings: React.FC<SyncSettingsProps> = ({ isOpen, onClose }) => {
  const [currentMode, setCurrentMode] = useState<'default' | 'economy' | 'rapid'>('default')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    loadSyncConfigFromStorage()
    const config = getSyncConfig()
    
    // 根據配置判斷當前模式
    if (config.debounceTime.progress === 5000) {
      setCurrentMode('economy')
    } else if (config.debounceTime.progress === 1500) {
      setCurrentMode('rapid')
    } else {
      setCurrentMode('default')
    }

    // 定期更新待處理同步數量
    const interval = setInterval(() => {
      setPendingCount(debouncedSyncManager.getPendingCount())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleModeChange = (mode: 'default' | 'economy' | 'rapid') => {
    setSyncMode(mode)
    setCurrentMode(mode)
    saveSyncConfigToStorage()
  }

  const handleFlushAll = async () => {
    await debouncedSyncManager.flushAll()
    setPendingCount(0)
  }

  if (!isOpen) return null

  const config = getSyncConfig()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Firebase 同步設置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">同步模式</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="syncMode"
                  value="economy"
                  checked={currentMode === 'economy'}
                  onChange={() => handleModeChange('economy')}
                  className="mr-2"
                />
                <span>節約模式</span>
                <span className="text-sm text-gray-500 ml-2">
                  (較長防抖時間，減少Firebase用量)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="syncMode"
                  value="default"
                  checked={currentMode === 'default'}
                  onChange={() => handleModeChange('default')}
                  className="mr-2"
                />
                <span>標準模式</span>
                <span className="text-sm text-gray-500 ml-2">
                  (平衡的同步頻率)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="syncMode"
                  value="rapid"
                  checked={currentMode === 'rapid'}
                  onChange={() => handleModeChange('rapid')}
                  className="mr-2"
                />
                <span>快速模式</span>
                <span className="text-sm text-gray-500 ml-2">
                  (較短防抖時間，更頻繁同步)
                </span>
              </label>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">當前設置</h3>
            <div className="text-sm space-y-1">
              <div>編織計數防抖: {config.debounceTime.progress / 1000}秒</div>
              <div>一般操作防抖: {config.debounceTime.default / 1000}秒</div>
              <div>同步檢查間隔: {config.subscription.updateCheckInterval / 1000}秒</div>
              <div>本地更新冷卻: {config.subscription.localUpdateCooldown / 1000}秒</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">同步狀態</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                待處理同步: {pendingCount} 個
              </span>
              {pendingCount > 0 && (
                <button
                  onClick={handleFlushAll}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  立即同步全部
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-4">
            <p>節約模式: 降低Firebase寫入頻率，適合避免達到用量限制</p>
            <p>快速模式: 更頻繁同步，適合穩定網路環境</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}