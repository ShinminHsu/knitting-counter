import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { formatDate, formatDuration, getProjectProgressPercentage, getProjectTotalRounds, getProjectTotalStitches, getProjectCompletedStitches, getProjectTotalTime } from '../utils'

export default function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject, projects } = useAppStore()

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(projectId)
      } else {
        navigate('/404')
      }
    }
  }, [projectId, setCurrentProject, projects, navigate])

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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              ← 返回
            </Link>
            <h1 className="text-xl font-semibold text-text-primary truncate">
              {currentProject.name}
            </h1>
          </div>
        </div>
      </div>

      {/* 專案資訊 */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 進度卡片 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">編織進度</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">總體進度</span>
              <span className="text-lg font-semibold text-text-primary">
                {Math.round(getProjectProgressPercentage(currentProject) * 100)}%
              </span>
            </div>
            
            <div className="w-full bg-background-tertiary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProjectProgressPercentage(currentProject) * 100}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-sm text-text-secondary">當前圈數</div>
                <div className="text-xl font-semibold text-text-primary">
                  R{currentProject.currentRound}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary">總圈數</div>
                <div className="text-xl font-semibold text-text-primary">
                  {getProjectTotalRounds(currentProject)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-secondary">已完成針數</div>
                <div className="text-lg font-medium text-text-primary">
                  {getProjectCompletedStitches(currentProject)}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary">總針數</div>
                <div className="text-lg font-medium text-text-primary">
                  {getProjectTotalStitches(currentProject)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to={`/project/${currentProject.id}/progress`}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">▶️</div>
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
              <div className="text-3xl">📝</div>
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
              <div className="text-3xl">🧶</div>
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
              <div className="text-3xl">📤</div>
              <div>
                <h3 className="font-semibold text-text-primary">匯入匯出</h3>
                <p className="text-sm text-text-secondary">備份和分享</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 統計資訊 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">統計資訊</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-text-secondary">編織時間</div>
              <div className="text-lg font-semibold text-text-primary">
                {formatDuration(getProjectTotalTime(currentProject))}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">工作階段</div>
              <div className="text-lg font-semibold text-text-primary">
                {currentProject.sessions.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">使用毛線</div>
              <div className="text-lg font-semibold text-text-primary">
                {currentProject.yarns.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">織圖圈數</div>
              <div className="text-lg font-semibold text-text-primary">
                {currentProject.pattern.length}
              </div>
            </div>
          </div>
        </div>

        {/* 專案資訊 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">專案資訊</h2>
          
          <div className="space-y-3">
            {currentProject.source && (
              <div>
                <div className="text-sm text-text-secondary">來源</div>
                <a
                  href={currentProject.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {currentProject.source}
                </a>
              </div>
            )}
            
            <div>
              <div className="text-sm text-text-secondary">建立日期</div>
              <div className="text-text-primary">
                {formatDate(currentProject.createdDate)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-text-secondary">最後修改</div>
              <div className="text-text-primary">
                {formatDate(currentProject.lastModified)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}