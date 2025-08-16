import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { 
  formatDate, 
  formatDuration, 
  getProjectProgressPercentage, 
  getProjectTotalRounds, 
  getProjectTotalStitches, 
  getProjectCompletedStitches,
  getRoundTotalStitches,
  getExpandedStitches
} from '../utils'
import { StitchTypeInfo } from '../types'

export default function ProgressTrackingView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { 
    currentProject, 
    setCurrentProject, 
    projects, 
    nextStitch, 
    previousStitch, 
    setCurrentRound,
    startSession,
    endSession
  } = useAppStore()

  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [viewingRound, setViewingRound] = useState<number | null>(null) // 查看模式的圈數

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

  // 計時器更新
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionActive, sessionStartTime])

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

  // 判斷是否在查看模式
  const isViewMode = viewingRound !== null && viewingRound !== currentProject.currentRound
  const displayRoundNumber = viewingRound ?? currentProject.currentRound
  const displayRound = currentProject.pattern.find(r => r.roundNumber === displayRoundNumber)
  
  const totalStitches = getProjectTotalStitches(currentProject)
  const completedStitches = getProjectCompletedStitches(currentProject)
  const progressPercentage = getProjectProgressPercentage(currentProject)
  
  // 獲取顯示圈的展開針目
  const expandedStitches = displayRound ? getExpandedStitches(displayRound) : []
  const currentStitchInRound = isViewMode ? 0 : currentProject.currentStitch // 查看模式下不顯示進度
  const totalStitchesInCurrentRound = displayRound ? getRoundTotalStitches(displayRound) : 0

  const handleStartSession = () => {
    startSession()
    setIsSessionActive(true)
    setSessionStartTime(new Date())
    setElapsedTime(0)
  }

  const handleEndSession = () => {
    endSession()
    setIsSessionActive(false)
    setSessionStartTime(null)
    setElapsedTime(0)
  }

  const handleNextStitch = () => {
    nextStitch()
  }

  const handlePreviousStitch = () => {
    previousStitch()
  }

  const handleJumpToRound = (roundNumber: number) => {
    if (roundNumber === currentProject.currentRound) {
      // 如果跳轉到當前圈，退出查看模式
      setViewingRound(null)
    } else {
      // 進入查看模式
      setViewingRound(roundNumber)
    }
  }

  const handleCompleteRound = () => {
    if (!displayRound) return
    
    // 將進度設置到下一圈的開始
    const nextRoundNumber = displayRoundNumber + 1
    setCurrentRound(nextRoundNumber)
    setViewingRound(null) // 退出查看模式
  }

  const handleExitViewMode = () => {
    setViewingRound(null)
  }

  // 渲染針目進度視覺化
  const renderStitchProgress = () => {
    if (!displayRound || totalStitchesInCurrentRound === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-text-tertiary">當前圈數沒有針法資料</p>
        </div>
      )
    }

    const stitchElements = []
    let stitchIndex = 0

    // 渲染個別針法
    displayRound.stitches.forEach((stitch) => {
      for (let i = 0; i < stitch.count; i++) {
        const isCompleted = stitchIndex < currentStitchInRound
        const isCurrent = stitchIndex === currentStitchInRound
        
        stitchElements.push(
          <div
            key={`${stitch.id}-${i}`}
            className="flex flex-col items-center justify-center w-12 h-12 transition-all duration-300"
          >
            <div className={`text-lg font-bold transition-colors duration-300 ${
              isCompleted 
                ? 'text-text-primary' 
                : isCurrent 
                ? 'text-primary' 
                : 'text-text-tertiary/50'
            }`}>
              {StitchTypeInfo[stitch.type]?.symbol || '○'}
            </div>
            <div className={`text-xs font-bold ${
              isCompleted 
                ? 'text-text-secondary' 
                : isCurrent 
                ? 'text-primary' 
                : 'text-text-tertiary/50'
            }`}>
              {stitchIndex + 1}
            </div>
          </div>
        )
        stitchIndex++
      }
    })

    // 渲染群組針法
    displayRound.stitchGroups.forEach((group) => {
      for (let repeat = 0; repeat < group.repeatCount; repeat++) {
        group.stitches.forEach((stitch) => {
          for (let i = 0; i < stitch.count; i++) {
            const isCompleted = stitchIndex < currentStitchInRound
            const isCurrent = stitchIndex === currentStitchInRound
            
            stitchElements.push(
              <div
                key={`${group.id}-${repeat}-${stitch.id}-${i}`}
                className="flex flex-col items-center justify-center w-12 h-12 transition-all duration-300"
              >
                <div className={`text-lg font-bold transition-colors duration-300 ${
                  isCompleted 
                    ? 'text-text-primary' 
                    : isCurrent 
                    ? 'text-primary' 
                    : 'text-text-tertiary/50'
                }`}>
                  {StitchTypeInfo[stitch.type]?.symbol || '○'}
                </div>
                <div className={`text-xs font-bold ${
                  isCompleted 
                    ? 'text-text-secondary' 
                    : isCurrent 
                    ? 'text-primary' 
                    : 'text-text-tertiary/50'
                }`}>
                  {stitchIndex + 1}
                </div>
              </div>
            )
            stitchIndex++
          }
        })
      }
    })

    return (
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
        {stitchElements}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/project/${projectId}`}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-semibold text-text-primary truncate">
                {currentProject.name}
              </h1>
            </div>
            
            {/* 工作階段控制 */}
            <div className="flex items-center gap-2">
              {isSessionActive ? (
                <>
                  <div className="text-sm text-text-secondary hidden sm:block">
                    {formatDuration(elapsedTime)}
                  </div>
                  <button
                    onClick={handleEndSession}
                    className="btn btn-secondary text-sm"
                  >
                    結束
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartSession}
                  className="btn btn-primary text-sm"
                >
                  <span className="hidden sm:inline">開始計時</span>
                  <span className="sm:hidden">計時</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* 圈數資訊 */}
        <div className="card">
          {/* 查看模式提示 */}
          {isViewMode && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600 text-sm font-medium">
                    📖 查看模式，無法編輯進度
                  </span>
                </div>
                <button
                  onClick={handleExitViewMode}
                  className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                >
                  返回當前圈
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                第 {displayRoundNumber} 圈
                {isViewMode && (
                  <span className="text-sm text-yellow-600 ml-2">(查看中)</span>
                )}
              </h2>
              <p className="text-text-secondary">
                {isViewMode ? (
                  `總針數: ${totalStitchesInCurrentRound} 針`
                ) : (
                  `進度: ${currentStitchInRound} / ${totalStitchesInCurrentRound} 針`
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {isViewMode ? (
                  '100%'
                ) : (
                  `${Math.round((currentStitchInRound / Math.max(totalStitchesInCurrentRound, 1)) * 100)}%`
                )}
              </div>
              <div className="text-sm text-text-secondary">
                {isViewMode ? '圈數預覽' : '本圈完成度'}
              </div>
            </div>
          </div>

          {displayRound?.notes && (
            <div className="bg-background-tertiary rounded-lg p-3 mb-4">
              <div className="text-sm text-text-secondary mb-1">備註</div>
              <div className="text-text-primary">{displayRound.notes}</div>
            </div>
          )}

          {/* 完成此圈按鈕 - 只在非查看模式且當前圈有進度時顯示 */}
          {!isViewMode && displayRoundNumber === currentProject.currentRound && currentStitchInRound > 0 && (
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleCompleteRound}
                className="w-full btn btn-primary"
              >
                完成第 {displayRoundNumber} 圈
              </button>
            </div>
          )}
        </div>

        {/* 針目進度視覺化 - iOS風格 */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text-primary">針目進度</h3>
          </div>
          
          <div className="mb-6">
            {renderStitchProgress()}
          </div>
        </div>

        {/* 控制按鈕 */}
        <div className="card">
          {isViewMode ? (
            <div className="text-center py-8">
              <p className="text-text-tertiary mb-4">查看模式下無法編輯進度</p>
              <button
                onClick={handleExitViewMode}
                className="btn btn-primary"
              >
                返回編織進度
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePreviousStitch}
                disabled={currentProject.currentRound === 1 && currentProject.currentStitch === 0}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-lg py-4 flex items-center justify-center gap-2"
              >
                <span>←</span>
                上一針
              </button>
              <button
                onClick={handleNextStitch}
                className="btn btn-primary text-lg py-4 flex items-center justify-center gap-2"
              >
                下一針
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* 快速跳轉圈數 */}
        <div className="card">
          <h3 className="font-medium text-text-primary mb-3">快速跳轉</h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {Array.from({ length: getProjectTotalRounds(currentProject) }, (_, i) => i + 1).map(roundNumber => {
              const isCurrentRound = roundNumber === currentProject.currentRound
              const isViewingRound = roundNumber === displayRoundNumber && isViewMode
              const isCompletedRound = roundNumber < currentProject.currentRound
              
              return (
                <button
                  key={roundNumber}
                  onClick={() => handleJumpToRound(roundNumber)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    isCurrentRound && !isViewMode
                      ? 'bg-primary text-white shadow-md'
                      : isViewingRound
                      ? 'bg-yellow-500 text-white shadow-md'
                      : isCompletedRound
                      ? 'bg-text-secondary text-white'
                      : 'bg-background-tertiary text-text-secondary hover:bg-background-secondary'
                  }`}
                >
                  R{roundNumber}
                  {isViewingRound && <div className="text-xs">查看中</div>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 總體進度 */}
        <div className="card">
          <h3 className="font-medium text-text-primary mb-3">總體進度</h3>
          <div className="w-full bg-background-tertiary rounded-full h-3 mb-4">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage * 100}%` }}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">
                {Math.round(progressPercentage * 100)}%
              </div>
              <div className="text-text-secondary">總進度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">
                {completedStitches}
              </div>
              <div className="text-text-secondary">已完成針數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">
                {formatDuration(currentProject.sessions.reduce((sum, session) => sum + session.duration, 0))}
              </div>
              <div className="text-text-secondary">編織時間</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}