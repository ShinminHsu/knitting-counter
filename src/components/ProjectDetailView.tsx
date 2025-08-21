import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { IoPlayCircleOutline } from 'react-icons/io5'
// import { FaRegEdit } from 'react-icons/fa'
import { FiEdit3 } from "react-icons/fi"
import { LiaVolleyballBallSolid } from 'react-icons/lia'
import { FiUploadCloud } from 'react-icons/fi'
import { useSyncedAppStore } from '../store/syncedAppStore'
import SyncStatusIndicator from './SyncStatusIndicator'
import { formatDate, getProjectTotalRounds, getProjectTotalStitches, describeRound, getRoundTotalStitches } from '../utils'

export default function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject, projects } = useSyncedAppStore()

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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/"
                className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-base"
              >
                ← 返回
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold text-text-primary truncate">
                {currentProject.name}
              </h1>
            </div>
            <SyncStatusIndicator />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 專案資訊 */}
        <div className="card">
          <h2 className="text-xl font-semibold text-text-primary mb-4">專案資訊</h2>
          
          <div className="space-y-4">
            {currentProject.source && (
              <div>
                <div className="text-sm text-text-secondary mb-1">來源</div>
                <a
                  href={currentProject.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all text-sm"
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
                <div className="text-sm text-text-secondary">織圖圈數</div>
                <div className="text-lg font-semibold text-text-primary">
                  {currentProject.pattern.length}
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
                    className="w-8 h-8 rounded-full shadow-sm flex-shrink-0"
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

        {/* 織圖預覽 */}
        <div className="card">
          <h2 className="text-xl font-semibold text-text-primary mb-4">織圖</h2>
          
          {currentProject.pattern.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-3 flex justify-center">
                <FiEdit3 className="w-8 h-8 text-text-tertiary" />
              </div>
              <p className="text-text-tertiary mb-3">尚未建立織圖</p>
              <Link
                to={`/project/${currentProject.id}/pattern`}
                className="text-primary hover:underline text-sm"
              >
                點擊這裡開始編輯織圖
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 織圖列表 */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {currentProject.pattern.map((round) => {
                  const roundStitches = getRoundTotalStitches(round)
                  const roundDescription = describeRound(round, currentProject.yarns)
                  
                  return (
                    <div key={round.id} className="flex gap-3 p-3 bg-background-secondary rounded-lg">
                      <div className="text-sm font-semibold flex-shrink-0 leading-relaxed" style={{ color: '#d96699' }}>
                        R{round.roundNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium text-sm leading-relaxed m-0">
                          {roundDescription}
                        </p>
                        {round.notes && (
                          <p className="text-xs text-text-tertiary mt-1">
                            {round.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-text-primary leading-relaxed m-0">
                          {roundStitches} 針
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 總計資訊 */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-sm font-medium text-text-secondary">
                  總圈數: {getProjectTotalRounds(currentProject)}
                </div>
                <div className="text-sm font-medium text-text-secondary">
                  總針數: {getProjectTotalStitches(currentProject)}
                </div>
              </div>
              
              <div className="text-center pt-2">
                <Link
                  to={`/project/${currentProject.id}/pattern`}
                  className="text-primary hover:underline text-sm"
                >
                  前往織圖編輯頁面
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}