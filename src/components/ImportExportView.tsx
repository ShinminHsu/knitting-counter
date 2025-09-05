import { useParams, Link } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'
import { useState } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { ImportExportService } from '../services/importExportService'
import { ExportType } from '../types'
import SyncStatusIndicator from './SyncStatusIndicator'

import { logger } from '../utils/logger'
export default function ImportExportView() {
  const { projectId } = useParams()
  
  const { projects } = useProjectStore()
  const currentProject = projects.find(p => p.id === projectId)
  
  const [exportType, setExportType] = useState<ExportType>(ExportType.FULL_PROJECT)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)


  const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleExport = async () => {
    if (!currentProject) {
      showMessage('error', '找不到要匯出的專案')
      return
    }

    try {
      setIsExporting(true)
      ImportExportService.exportProjectAsFile(currentProject, exportType)
      showMessage('success', '專案匯出成功')
    } catch (error) {
      logger.error('Export error:', error)
      showMessage('error', '匯出失敗，請稍後重試')
    } finally {
      setIsExporting(false)
    }
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background-primary safe-top safe-bottom">
        <div className="bg-background-secondary border-b border-border">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  title="首頁"
                >
                  <BsHouse className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <h1 className="text-base sm:text-xl font-semibold text-text-primary">匯出專案</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <SyncStatusIndicator />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-text-primary mb-2">找不到專案</h2>
            <p className="text-text-secondary mb-4">請先選擇一個專案進行匯出操作</p>
            <Link
              to="/"
              className="inline-block px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
            >
              返回專案列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={`/project/${projectId}`}
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="返回"
              >
                ←
              </Link>
              <Link
                to="/"
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="首頁"
              >
                <BsHouse className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-text-primary">匯出專案</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-2xl mx-auto">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* 匯出區域 */}
          <div className="bg-background-secondary rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold text-text-primary mb-4">匯出專案</h2>
            <p className="text-text-secondary mb-4">
              目前專案：<span className="font-medium text-text-primary">{currentProject.name}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">匯出類型</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value={ExportType.FULL_PROJECT}
                      checked={exportType === ExportType.FULL_PROJECT}
                      onChange={(e) => setExportType(e.target.value as ExportType)}
                      className="w-4 h-4 text-accent"
                    />
                    <span className="ml-2 text-text-primary">完整專案（包含編織進度）</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value={ExportType.PATTERN_ONLY}
                      checked={exportType === ExportType.PATTERN_ONLY}
                      onChange={(e) => setExportType(e.target.value as ExportType)}
                      className="w-4 h-4 text-accent"
                    />
                    <span className="ml-2 text-text-primary">僅織圖內容（不含進度）</span>
                  </label>
                </div>
              </div>
              
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3 px-4 bg-accent text-background rounded-lg hover:bg-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? '匯出中...' : '匯出專案'}
              </button>
            </div>
          </div>

          {/* 說明區域 */}
          <div className="bg-background-secondary rounded-lg p-6 border border-border">
            <h3 className="text-md font-semibold text-text-primary mb-3">使用說明</h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p><strong>匯出類型：</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>完整專案：包含編織進度、工作記錄等所有資料</li>
                <li>僅織圖：只包含織圖內容，適合分享織圖模式</li>
              </ul>
              <p className="mt-3"><strong>匯入專案：</strong></p>
              <p className="ml-4">如需匯入專案，請到首頁點擊「匯入專案」按鈕</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}