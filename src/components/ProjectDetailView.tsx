import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { IoPlayCircleOutline } from 'react-icons/io5'
// import { FaRegEdit } from 'react-icons/fa'
import { FiEdit3 } from "react-icons/fi"
import { LiaVolleyballBallSolid } from 'react-icons/lia'
import { FiUploadCloud } from 'react-icons/fi'
import { BsHouse } from 'react-icons/bs'
import { useSyncedAppStore } from '../store/syncedAppStore'
import SyncStatusIndicator from './SyncStatusIndicator'
import { formatDate, getProjectTotalStitches, getCurrentChart, isLegacyProject } from '../utils'

export default function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { 
    currentProject, 
    setCurrentProject, 
    projects, 
    updateProject,
    getChartSummaries,
    createChart,
    updateChart,
    setCurrentChart: setActiveChart,
    deleteChart,
    migrateCurrentProjectToMultiChart
  } = useSyncedAppStore()
  
  // 編輯專案模態狀態
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSource, setEditSource] = useState('')

  // 織圖管理狀態
  const [showCreateChartModal, setShowCreateChartModal] = useState(false)
  const [showEditChartModal, setShowEditChartModal] = useState(false)
  const [newChartName, setNewChartName] = useState('')
  const [newChartDescription, setNewChartDescription] = useState('')
  const [newChartNotes, setNewChartNotes] = useState('')
  const [editingChart, setEditingChart] = useState<any>(null)
  const [currentChart, setCurrentChart] = useState(() => currentProject ? getCurrentChart(currentProject) : null)

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(projectId)
        
        // 如果是舊格式專案，自動遷移
        if (isLegacyProject(project)) {
          console.log('Migrating legacy project to multi-chart format')
          migrateCurrentProjectToMultiChart()
        }
      } else {
        navigate('/404')
      }
    }
  }, [projectId, setCurrentProject, projects, navigate, migrateCurrentProjectToMultiChart])

  // 更新當前織圖
  useEffect(() => {
    if (currentProject) {
      setCurrentChart(getCurrentChart(currentProject))
    }
  }, [currentProject])

  // 打開編輯模態
  const handleOpenEditModal = () => {
    if (!currentProject) return
    setEditName(currentProject.name)
    setEditSource(currentProject.source || '')
    setShowEditModal(true)
  }

  // 更新專案資訊
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject || !editName.trim()) return
    
    const updatedProject = {
      ...currentProject,
      name: editName.trim(),
      source: editSource.trim() || undefined,
      lastModified: new Date()
    }
    
    await updateProject(updatedProject)
    setShowEditModal(false)
  }

  // 創建新織圖
  const handleCreateChart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChartName.trim()) return

    await createChart({
      name: newChartName.trim(),
      description: newChartDescription.trim() || undefined,
      notes: newChartNotes.trim() || undefined
    })

    setNewChartName('')
    setNewChartDescription('')
    setNewChartNotes('')
    setShowCreateChartModal(false)
  }

  // 設置當前織圖
  const handleSetCurrentChart = async (chartId: string) => {
    await setActiveChart(chartId)
  }

  // 編輯織圖
  const handleOpenEditChart = (chart: any) => {
    setEditingChart(chart)
    setNewChartName(chart.name)
    setNewChartDescription(chart.description || '')
    setNewChartNotes(chart.notes || '')
    setShowEditChartModal(true)
  }

  const handleUpdateChart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChart || !newChartName.trim()) return

    const updatedChart = {
      ...editingChart,
      name: newChartName.trim(),
      description: newChartDescription.trim() || undefined,
      notes: newChartNotes.trim() || undefined,
      lastModified: new Date()
    }

    await updateChart(updatedChart)
    
    setNewChartName('')
    setNewChartDescription('')
    setNewChartNotes('')
    setEditingChart(null)
    setShowEditChartModal(false)
  }

  // 刪除織圖
  const handleDeleteChart = async (chartId: string, chartName: string) => {
    if (confirm(`確定要刪除織圖「${chartName}」嗎？此操作無法復原。`)) {
      await deleteChart(chartId)
    }
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
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
              <h1 className="text-base sm:text-xl font-semibold text-text-primary truncate">
                {currentProject.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 專案資訊 */}
        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={handleOpenEditModal}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">專案資訊</h2>
            <button className="text-text-tertiary hover:text-text-primary p-2">
              <FiEdit3 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {currentProject.source && (
              <div>
                <div className="text-sm text-text-secondary mb-1">來源</div>
                <a
                  href={currentProject.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentProject.source}
                </a>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">建立日期</div>
                <div className="text-text-primary text-sm">
                  {formatDate(currentProject.createdDate)}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-text-secondary mb-1">最後修改</div>
                <div className="text-text-primary text-sm">
                  {formatDate(currentProject.lastModified)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
              <div className="text-center">
                <div className="text-sm text-text-secondary">使用毛線</div>
                <div className="text-lg font-semibold text-text-primary">
                  {currentProject.yarns.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary">織圖數量</div>
                <div className="text-lg font-semibold text-text-primary">
                  {getChartSummaries().length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary">總針數</div>
                <div className="text-lg font-semibold text-text-primary">
                  {getProjectTotalStitches(currentProject)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to={`/project/${currentProject.id}/progress`}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <IoPlayCircleOutline className="w-8 h-8 text-text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">開始編織</h3>
                <p className="text-sm text-text-secondary">追蹤編織進度</p>
              </div>
            </div>
          </Link>

          <Link
            to={`/project/${currentProject.id}/pattern`}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <FiEdit3 className="w-7 h-7 text-text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">編輯織圖</h3>
                <p className="text-sm text-text-secondary">管理圈數和針法</p>
              </div>
            </div>
          </Link>

          <Link
            to={`/project/${currentProject.id}/yarns`}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <LiaVolleyballBallSolid className="w-8 h-8 text-text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">毛線管理</h3>
                <p className="text-sm text-text-secondary">管理專案毛線</p>
              </div>
            </div>
          </Link>

          <Link
            to={`/project/${currentProject.id}/import-export`}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <FiUploadCloud className="w-7 h-7 text-text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">匯入匯出</h3>
                <p className="text-sm text-text-secondary">備份和分享</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 使用的毛線 */}
        <div className="card">
          <h2 className="text-xl font-semibold text-text-primary mb-4">使用的毛線</h2>
          
          {currentProject.yarns.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-3 flex justify-center">
                <LiaVolleyballBallSolid className="w-8 h-8 text-text-tertiary" />
              </div>
              <p className="text-text-tertiary mb-3">尚未添加毛線</p>
              <Link
                to={`/project/${currentProject.id}/yarns`}
                className="text-primary hover:underline text-sm"
              >
                點擊這裡管理毛線
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentProject.yarns.map((yarn) => (
                <div key={yarn.id} className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full shadow-sm flex-shrink-0 border border-gray-400"
                    style={{ backgroundColor: yarn.color.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{yarn.name}</h3>
                    {yarn.brand && (
                      <p className="text-sm text-text-secondary truncate">{yarn.brand}</p>
                    )}
                    <p className="text-xs text-text-tertiary">{yarn.color.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 織圖管理 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">織圖管理</h2>
            <button
              onClick={() => setShowCreateChartModal(true)}
              className="btn btn-primary text-sm"
            >
              新增織圖
            </button>
          </div>
          
          {(() => {
            const chartSummaries = getChartSummaries()
            
            if (chartSummaries.length === 0) {
              return (
                <div className="text-center py-8">
                  <div className="mb-3 flex justify-center">
                    <FiEdit3 className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <p className="text-text-tertiary mb-3">尚未建立織圖</p>
                  <button
                    onClick={() => setShowCreateChartModal(true)}
                    className="text-primary hover:underline text-sm"
                  >
                    點擊這裡建立第一個織圖
                  </button>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {/* 織圖列表 */}
                <div className="space-y-3">
                  {chartSummaries.map((chart) => {
                    const isActive = currentChart?.id === chart.id
                    
                    return (
                      <div 
                        key={chart.id} 
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isActive 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-background-secondary border-border hover:border-border-hover'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-text-primary truncate">
                                {chart.name}
                              </h3>
                              {isActive && (
                                <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                                  當前
                                </span>
                              )}
                              {chart.isCompleted && (
                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                                  完成
                                </span>
                              )}
                            </div>
                            
                            {chart.description && (
                              <p className="text-sm text-text-secondary mb-2 truncate">
                                {chart.description}
                              </p>
                            )}
                            
                            <div className="grid grid-cols-3 gap-4 text-xs text-text-secondary">
                              <div>圈數: {chart.roundCount}</div>
                              <div>針數: {chart.totalStitches}</div>
                              <div>進度: {Math.round(chart.currentProgress)}%</div>
                            </div>
                            
                            {chart.currentProgress > 0 && (
                              <div className="w-full bg-background-tertiary rounded-full h-1.5 mt-2">
                                <div
                                  className="h-1.5 rounded-full transition-all duration-300 bg-primary"
                                  style={{ width: `${chart.currentProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {!isActive && (
                              <button
                                onClick={() => handleSetCurrentChart(chart.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                設為當前
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditChart(chart)}
                              className="text-xs text-primary hover:underline"
                            >
                              編輯資訊
                            </button>
                            <Link
                              to={`/project/${currentProject.id}/pattern?chartId=${chart.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              編輯圖樣
                            </Link>
                            {chartSummaries.length > 1 && (
                              <button
                                onClick={() => handleDeleteChart(chart.id, chart.name)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                刪除
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 總計資訊 */}
                <div className="flex items-center justify-between pt-3 border-t border-border text-sm text-text-secondary">
                  <div>織圖總數: {chartSummaries.length}</div>
                  <div>總針數: {chartSummaries.reduce((sum, chart) => sum + chart.totalStitches, 0)}</div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* 編輯專案彈窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              編輯專案資訊
            </h2>
            
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  專案名稱 *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 建立織圖彈窗 */}
      {showCreateChartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              建立新織圖
            </h2>
            
            <form onSubmit={handleCreateChart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  織圖名稱 *
                </label>
                <input
                  type="text"
                  value={newChartName}
                  onChange={(e) => setNewChartName(e.target.value)}
                  className="input"
                  placeholder="輸入織圖名稱，如：主體、袖子、領口等"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  描述（選填）
                </label>
                <input
                  type="text"
                  value={newChartDescription}
                  onChange={(e) => setNewChartDescription(e.target.value)}
                  className="input"
                  placeholder="織圖的簡單描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  備註（選填）
                </label>
                <textarea
                  value={newChartNotes}
                  onChange={(e) => setNewChartNotes(e.target.value)}
                  className="input"
                  placeholder="織圖的詳細備註"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateChartModal(false)}
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

      {/* 編輯織圖彈窗 */}
      {showEditChartModal && editingChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              編輯織圖資訊
            </h2>
            
            <form onSubmit={handleUpdateChart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  織圖名稱 *
                </label>
                <input
                  type="text"
                  value={newChartName}
                  onChange={(e) => setNewChartName(e.target.value)}
                  className="input"
                  placeholder="輸入織圖名稱，如：主體、袖子、領口等"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  描述（選填）
                </label>
                <input
                  type="text"
                  value={newChartDescription}
                  onChange={(e) => setNewChartDescription(e.target.value)}
                  className="input"
                  placeholder="織圖的簡單描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  備註（選填）
                </label>
                <textarea
                  value={newChartNotes}
                  onChange={(e) => setNewChartNotes(e.target.value)}
                  className="input"
                  placeholder="織圖的詳細備註"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditChartModal(false)
                    setEditingChart(null)
                    setNewChartName('')
                    setNewChartDescription('')
                    setNewChartNotes('')
                  }}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}