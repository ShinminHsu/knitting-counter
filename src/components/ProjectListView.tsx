import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../stores/useProjectStore'
import UserProfile from './UserProfile'
import SyncStatusIndicator from './SyncStatusIndicator'
import { formatDate, getProjectProgressPercentage, getProjectTotalStitchesAllCharts } from '../utils'
import { useChartStore } from '../stores/useChartStore'
import { ImportExportService } from '../services/importExportService'
import { ImportMode } from '../types'
import knittingIcon from '../assets/images/kniitingIcon.png'

import { logger } from '../utils/logger'
import { googleAnalytics } from '../services/googleAnalytics'
import { ANALYTICS_EVENTS } from '../config/analytics'
export default function ProjectListView() {
  const { projects, createProject, deleteProject, setProjects, setCurrentProject, updateProjectLocally } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectSource, setNewProjectSource] = useState('')
  
  // 匯入相關狀態
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)
  
  logger.debug('ProjectListView 渲染，專案數量:', projects.length)

  const { getChartSummaries } = useChartStore()

  // Track page view
  useEffect(() => {
    googleAnalytics.trackPageView('/', 'Project List')
  }, [])
  
  // Track project creation by watching projects length
  const previousProjectCount = useRef(projects.length)
  useEffect(() => {
    if (projects.length > previousProjectCount.current) {
      // A new project was added
      const latestProject = projects[projects.length - 1]
      if (latestProject) {
        googleAnalytics.trackProjectEvent('create', {
          project_id: latestProject.id,
          project_name: latestProject.name
        })
      }
    }
    previousProjectCount.current = projects.length
  }, [projects])

  const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ImportExportService.isValidExportFile(file)) {
      showMessage('error', '請選擇有效的JSON檔案')
      return
    }

    // 直接執行匯入，使用檔案中的原始專案名稱
    await executeImport(file)
    
    // 清除檔案選擇
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const executeImport = async (file: File) => {
    try {
      setIsImporting(true)
      const result = await ImportExportService.importProjectFromFile(file, ImportMode.CREATE_NEW)
      
      if (result.success && result.project) {
        // 直接使用檔案中的原始專案名稱
        const projectToCreate = result.project
        
        // 直接添加到本地專案列表
        const updatedProjects = [...projects, projectToCreate]
        setProjects(updatedProjects)
        setCurrentProject(projectToCreate)
        
        // 使用本地更新方法來處理同步
        await updateProjectLocally(projectToCreate)
        
        // Track import success
        googleAnalytics.trackImportExportEvent('import', {
          project_id: projectToCreate.id,
          project_name: projectToCreate.name,
          success: true
        })
        
        let successMessage = '專案匯入成功'
        if (result.warnings.length > 0) {
          successMessage += `，${result.warnings.join('，')}`
        }
        showMessage('success', successMessage)
      } else {
        // Track import failure
        googleAnalytics.trackImportExportEvent('import', {
          success: false,
          error: result.errors.join('，')
        })
        showMessage('error', `匯入失敗：${result.errors.join('，')}`)
      }
    } catch (error) {
      logger.error('Import error:', error)
      
      // Track import error
      googleAnalytics.trackImportExportEvent('import', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      showMessage('error', '匯入失敗，請檢查檔案格式')
    } finally {
      setIsImporting(false)
    }
  }


  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    await createProject(newProjectName.trim(), newProjectSource.trim() || undefined)
    
    setNewProjectName('')
    setNewProjectSource('')
    setShowCreateForm(false)
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`確定要刪除專案「${projectName}」嗎？此操作無法復原。`)) {
      deleteProject(projectId)
      
      // Track project deletion
      googleAnalytics.trackProjectEvent('delete', {
        project_id: projectId,
        project_name: projectName
      })
    }
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={knittingIcon} alt="Stitchie" className="w-12 h-12" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">Stitchie</h1>
              <Link
                to="/guide"
                className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                title="使用說明"
              >
                使用說明
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <UserProfile />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary text-xs sm:text-sm"
                >
                  新增專案
                </button>
                <button
                  onClick={triggerFileSelect}
                  disabled={isImporting}
                  className="btn btn-secondary text-xs sm:text-sm"
                >
                  {isImporting ? '匯入中...' : '匯入專案'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      {/* 訊息顯示 */}
      {message && (
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* 專案列表 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {projects.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-2">
              還沒有編織專案
            </h2>
            <p className="text-sm sm:text-base text-text-secondary mb-6">
              建立你的第一個編織專案開始記錄進度
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary text-sm sm:text-base"
            >
              建立新專案
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <div key={project.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary truncate">
                      {project.name}
                    </h3>
                    {project.isCompleted && (
                      <span className="text-text-secondary text-sm font-medium">完成</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteProject(project.id, project.name)}
                    className="text-text-tertiary hover:text-red-500 transition-colors text-sm sm:text-base ml-2"
                  >
                    刪除
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-text-secondary">當前織圖進度</span>
                    <span className="text-text-primary">
                      {project.isCompleted ? '100' : Math.round(getProjectProgressPercentage(project) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-background-tertiary rounded-full h-1.5 sm:h-2">
                    <div
                      className="h-1.5 sm:h-2 rounded-full transition-all duration-300 bg-primary"
                      style={{ width: `${project.isCompleted ? 100 : getProjectProgressPercentage(project) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 mb-4 text-xs sm:text-sm text-text-secondary">
                  <div>織圖數量：{getChartSummaries().length}</div>
                  <div>總針數：{getProjectTotalStitchesAllCharts(project)}</div>
                  <div>更新時間：{formatDate(project.lastModified)}</div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/project/${project.id}/progress`}
                    className="btn btn-primary flex-1"
                    onClick={() => {
                      googleAnalytics.trackProjectEvent('view', {
                        project_id: project.id,
                        project_name: project.name
                      })
                      googleAnalytics.trackEvent(ANALYTICS_EVENTS.NAVIGATE_TO_PROGRESS, {
                        project_id: project.id
                      })
                    }}
                  >
                    開始編織
                  </Link>
                  <Link
                    to={`/project/${project.id}`}
                    className="btn btn-secondary"
                    onClick={() => {
                      googleAnalytics.trackProjectEvent('view', {
                        project_id: project.id,
                        project_name: project.name
                      })
                      googleAnalytics.trackEvent(ANALYTICS_EVENTS.NAVIGATE_TO_DETAILS, {
                        project_id: project.id
                      })
                    }}
                  >
                    詳情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 建立專案彈窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              建立新專案
            </h2>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  專案名稱 *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input"
                  placeholder="輸入專案名稱"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  來源網址（選填）
                </label>
                <input
                  type="url"
                  value={newProjectSource}
                  onChange={(e) => setNewProjectSource(e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}