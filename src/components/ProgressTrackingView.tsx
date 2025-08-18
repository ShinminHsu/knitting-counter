import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSyncedAppStore } from '../store/syncedAppStore'
import { 
  formatDuration, 
  getProjectProgressPercentage, 
  getProjectTotalRounds, 
  getProjectTotalStitches,
  getProjectCompletedStitches,
  getRoundTotalStitches
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
    endSession,
    updateProject
  } = useSyncedAppStore()

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
  
  const progressPercentage = getProjectProgressPercentage(currentProject)
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
    
    // 檢查是否為最後一圈
    const maxRoundNumber = Math.max(...currentProject.pattern.map(r => r.roundNumber))
    
    if (displayRoundNumber >= maxRoundNumber) {
      // 如果是最後一圈，標記為完成
      const updatedProject = {
        ...currentProject,
        isCompleted: true,
        currentStitch: getRoundTotalStitches(displayRound), // 設置到最後一針
        lastModified: new Date()
      }
      updateProject(updatedProject)
    } else {
      // 將進度設置到下一圈的開始
      const nextRoundNumber = displayRoundNumber + 1
      setCurrentRound(nextRoundNumber)
    }
    setViewingRound(null) // 退出查看模式
  }

  const handleExitViewMode = () => {
    setViewingRound(null)
  }

  // 獲取毛線顏色
  const getYarnColor = (yarnId: string): string => {
    const yarn = currentProject.yarns.find(y => y.id === yarnId)
    return yarn?.color.hex || '#000000'
  }

  // 檢查顏色是否為白色或淺色
  const isLightColor = (hex: string): boolean => {
    const color = hex.replace('#', '')
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 200
  }

  // 獲取當前針目使用的毛線
  /*
  const getCurrentStitchYarn = (): string | null => {
    if (isViewMode || !displayRound) return null
    
    let stitchIndex = 0
    
    // 檢查個別針法
    for (const stitch of displayRound.stitches) {
      if (stitchIndex <= currentStitchInRound && currentStitchInRound < stitchIndex + stitch.count) {
        return stitch.yarnId
      }
      stitchIndex += stitch.count
    }
    
    // 檢查群組針法
    for (const group of displayRound.stitchGroups) {
      for (let repeat = 0; repeat < group.repeatCount; repeat++) {
        for (const stitch of group.stitches) {
          if (stitchIndex <= currentStitchInRound && currentStitchInRound < stitchIndex + stitch.count) {
            return stitch.yarnId
          }
          stitchIndex += stitch.count
        }
      }
    }
    
    return null
  }
  */

  // const currentYarnId = getCurrentStitchYarn()
  // const currentYarnColor = currentYarnId ? getYarnColor(currentYarnId) : '#000000'

  // 渲染針目進度視覺化
  const renderStitchProgress = () => {
    if (!displayRound || totalStitchesInCurrentRound === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-text-tertiary">當前圈數沒有針法資料</p>
        </div>
      )
    }

    const stitchElements: JSX.Element[] = []
    let stitchIndex = 0

    // 渲染個別針法
    displayRound.stitches.forEach((stitch) => {
      const yarnColor = getYarnColor(stitch.yarnId)
      
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
            <div 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isCompleted || isCurrent
                  ? (isLightColor(yarnColor) ? 'border border-gray-400' : '')
                  : ''
              }`}
              style={{ 
                backgroundColor: isCompleted || isCurrent ? yarnColor : '#f3f4f6'
              }}
            />
          </div>
        )
        stitchIndex++
      }
    })

    // 渲染群組針法
    displayRound.stitchGroups.forEach((group) => {
      for (let repeat = 0; repeat < group.repeatCount; repeat++) {
        group.stitches.forEach((stitch) => {
          const yarnColor = getYarnColor(stitch.yarnId)
          
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
                <div 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted || isCurrent
                      ? (isLightColor(yarnColor) ? 'border border-gray-400' : '')
                      : ''
                  }`}
                  style={{ 
                    backgroundColor: isCompleted || isCurrent ? yarnColor : '#f3f4f6'
                  }}
                />
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
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to={`/project/${projectId}`}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-base"
              >
                ← 返回
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-text-primary truncate">
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

      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 總體進度 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-text-primary">總體進度</h2>
            <span className="text-sm text-text-secondary font-medium">
              {Math.round(progressPercentage * 100)}%
            </span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-3 mb-4">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-secondary">圈數進度</div>
              <div className="font-semibold text-text-primary">
                {Math.max(0, currentProject.currentRound - 1)} / {getProjectTotalRounds(currentProject)} 圈
              </div>
            </div>
            <div>
              <div className="text-text-secondary">針數進度</div>
              <div className="font-semibold text-text-primary">
                {getProjectCompletedStitches(currentProject)} / {getProjectTotalStitches(currentProject)} 針
              </div>
            </div>
          </div>
        </div>

        {/* 快速跳轉圈數 */}
        <div className="card">
          <h2 className="text-xl font-semibold text-text-primary mb-3">快速跳轉</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-secondary">跳轉到第</label>
            <select
              value={displayRoundNumber}
              onChange={(e) => handleJumpToRound(parseInt(e.target.value))}
              className="input w-auto min-w-0 flex-shrink-0"
            >
              {Array.from({ length: getProjectTotalRounds(currentProject) }, (_, i) => i + 1).map(roundNumber => (
                <option key={roundNumber} value={roundNumber}>
                  {roundNumber}
                </option>
              ))}
            </select>
            <label className="text-sm text-text-secondary">圈</label>
            {isViewMode && (
              <span className="text-sm" style={{ color: 'rgb(217, 115, 152)' }}>查看模式</span>
            )}
          </div>
        </div>

        {/* 針目進度與控制 */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary mb-3">本圈織圖</h2>
            <div className="mb-3">
              <span className="text-base text-text-primary">
                第 {displayRoundNumber} 圈
                {isViewMode && (
                  <span className="text-sm ml-2" style={{ color: 'rgb(217, 115, 152)' }}>（查看中）</span>
                )}
              </span>
            </div>
            {displayRound?.notes && (
              <div className="text-text-primary mb-4">
                <span className="text-text-secondary">備註：</span>{displayRound.notes}
              </div>
            )}
          </div>



          {/* 針目進度視覺化 */}
          <div className="mb-6">
            {renderStitchProgress()}
          </div>

          {/* 控制按鈕 */}
          {isViewMode ? (
            <div className="text-center py-4">
              <p className="mb-4" style={{ color: 'rgb(217, 115, 152)' }}>此為查看模式，無法編輯進度</p>
              <button
                onClick={handleExitViewMode}
                className="btn btn-primary"
              >
                返回編織進度
              </button>
            </div>
          ) : currentProject.isCompleted ? (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                編織完成！
              </h2>
              <p className="text-text-secondary mb-6">
                恭喜您完成了「{currentProject.name}」的編織！
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    const updatedProject = {
                      ...currentProject,
                      isCompleted: false,
                      currentRound: 1,
                      currentStitch: 0,
                      lastModified: new Date()
                    }
                    updateProject(updatedProject)
                  }}
                  className="btn btn-secondary"
                >
                  重新編織
                </button>
                <button
                  onClick={() => {
                    navigator.share?.({
                      title: `我完成了編織作品：${currentProject.name}`,
                      text: `使用編織計數器完成了「${currentProject.name}」的編織！`,
                    }).catch(() => {
                      alert('編織完成！')
                    })
                  }}
                  className="btn btn-primary"
                >
                  分享成果
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handlePreviousStitch}
                  disabled={currentProject.currentRound === 1 && currentProject.currentStitch === 0}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-lg py-4 flex items-center justify-center gap-2 flex-1"
                >
                  <span>←</span>
                  上一針
                </button>
                
                <div className="flex items-baseline px-6">
                  <span className="text-4xl font-bold text-primary">{currentStitchInRound}</span>
                  <span className="text-xl text-text-secondary">/{totalStitchesInCurrentRound}</span>
                </div>
                
                <button
                  onClick={handleNextStitch}
                  className="btn btn-primary text-lg py-4 flex items-center justify-center gap-2 flex-1"
                >
                  下一針
                  <span>→</span>
                </button>
              </div>

              {/* 完成此圈按鈕 - 只在非查看模式且為當前圈時顯示 */}
              {displayRoundNumber === currentProject.currentRound && (
                <button
                  onClick={handleCompleteRound}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  完成第 {displayRoundNumber} 圈
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}