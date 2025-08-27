import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'
import { useSyncedAppStore } from '../store/syncedAppStore'
import SyncStatusIndicator from './SyncStatusIndicator'
import ChartSelectorHeader from './ChartSelectorHeader'
import StitchProgressRenderer from './StitchProgressRenderer'
import ProgressActionButtons from './ProgressActionButtons'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useProgressCalculations } from '../hooks/useProgressCalculations'
import {
  getProjectProgressPercentage,
  getProjectTotalRounds,
  getProjectTotalStitches,
  getProjectCompletedStitches
} from '../utils'
import { useRef } from 'react'

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
    getCurrentChart,
    getChartSummaries,
    setCurrentChart,
    migrateCurrentProjectToMultiChart
  } = useSyncedAppStore()

  const [viewingRound, setViewingRound] = useState<number | null>(null)
  const patternContainerRef = useRef<HTMLDivElement>(null)
  
  // Get current chart
  const currentChart = getCurrentChart()
  const chartSummaries = getChartSummaries()

  // Initialize project
  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        // Migrate project to multi-chart format if needed
        migrateCurrentProjectToMultiChart()
        setCurrentProject(projectId)
      } else {
        navigate('/404')
      }
    }
  }, [projectId, setCurrentProject, projects, navigate, migrateCurrentProjectToMultiChart])

  // Get progress calculations
  const {
    currentRound,
    currentStitchInRound,
    totalStitchesInCurrentRound,
    displayRound,
    roundDescription,
    isViewMode,
    displayRoundNumber
  } = useProgressCalculations({
    currentProject,
    currentChart,
    viewingRound
  })

  // Auto-scroll functionality
  useAutoScroll({
    currentProject,
    displayRound,
    isViewMode,
    patternContainerRef
  })

  // Handle chart selection
  const handleChartChange = useCallback(async (chartId: string) => {
    if (!currentProject) return
    await setCurrentChart(chartId)
  }, [currentProject, setCurrentChart])

  // Handle jump to round
  const handleJumpToRound = useCallback((roundNumber: number) => {
    if (roundNumber === currentRound) {
      // If jumping to current round, exit view mode
      setViewingRound(null)
    } else {
      // Enter view mode
      setViewingRound(roundNumber)
    }
  }, [currentRound])

  // Handle complete round
  const handleCompleteRound = useCallback(async () => {
    // For now, just move to next round by setting current round + 1
    if (currentChart && currentChart.rounds) {
      const maxRound = Math.max(...currentChart.rounds.map(r => r.roundNumber))
      if (displayRoundNumber < maxRound) {
        await setCurrentRound(displayRoundNumber + 1)
      }
    }
    setViewingRound(null) // Exit view mode
  }, [currentChart, displayRoundNumber, setCurrentRound])

  // Handle exit view mode
  const handleExitViewMode = useCallback(() => {
    setViewingRound(null)
  }, [])

  // Handle reset project
  const handleResetProject = useCallback(async () => {
    if (currentChart) {
      // Reset to first round
      await setCurrentRound(1)
    } else {
      console.warn('No current chart found for reset')
    }
  }, [currentChart, setCurrentRound])

  // Handle share success
  const handleShareSuccess = useCallback(() => {
    if (!currentProject) return
    
    const shareData = {
      title: `我完成了編織作品：${currentProject.name}`,
      text: `使用編織計數器完成了「${currentProject.name}」的編織！`,
    }

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        alert('編織完成！')
      })
    } else {
      alert('編織完成！')
    }
  }, [currentProject])

  // Loading state
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

  // Calculate overall project progress (across all charts if multi-chart)
  const progressPercentage = getProjectProgressPercentage(currentProject)
  const hasMultipleCharts = chartSummaries.length > 1

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* Header */}
      <div className="bg-background-secondary border-b border-border sticky top-0 z-10">
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
        {/* Chart Selector (only show if multiple charts) */}
        {hasMultipleCharts && (
          <ChartSelectorHeader
            currentChartId={currentChart?.id}
            chartSummaries={chartSummaries}
            hasMultipleCharts={hasMultipleCharts}
            onChartChange={handleChartChange}
            isViewMode={isViewMode}
            displayRoundNumber={displayRoundNumber}
          />
        )}

        {/* Overall Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-text-primary">
              {hasMultipleCharts ? '總體進度' : '專案進度'}
            </h2>
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
                {Math.max(0, currentRound - 1)} / {getProjectTotalRounds(currentProject)} 圈
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

        {/* Current Chart Progress & Controls */}
        {currentChart && (
          <>
            {/* Quick Round Navigation */}
            <div className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-3">快速跳轉</h2>
              <div className="flex items-center gap-4">
                <label className="text-sm text-text-secondary">跳轉到第</label>
                <select
                  value={displayRoundNumber}
                  onChange={(e) => handleJumpToRound(parseInt(e.target.value))}
                  className="input w-auto min-w-0 flex-shrink-0"
                >
                  {Array.from(
                    { length: Math.max(...(currentChart.rounds?.map(r => r.roundNumber) || [1])) }, 
                    (_, i) => i + 1
                  ).map(roundNumber => (
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

            {/* Stitch Progress & Controls */}
            <div className="card">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  {hasMultipleCharts ? `${currentChart.name} - 本圈織圖` : '本圈織圖'}
                </h2>
                <div className="mb-3">
                  <span className="text-base text-text-primary">
                    第 {displayRoundNumber} 圈
                    {isViewMode && (
                      <span className="text-sm ml-2" style={{ color: 'rgb(217, 115, 152)' }}>（查看中）</span>
                    )}
                  </span>
                  {displayRound && roundDescription && (
                    <div className="text-xs text-gray-500 mt-1">
                      {roundDescription}
                    </div>
                  )}
                </div>
                {displayRound?.notes && (
                  <div className="text-xs text-gray-500 mb-4">
                    備註：{displayRound.notes}
                  </div>
                )}
              </div>

              {/* Stitch Progress Visualization */}
              <div
                ref={patternContainerRef}
                className="mb-6 max-h-80 overflow-y-auto border border-border rounded-lg p-1 sm:p-3 bg-background-secondary"
              >
                <StitchProgressRenderer
                  displayRound={displayRound}
                  currentStitchInRound={currentStitchInRound}
                  totalStitchesInCurrentRound={totalStitchesInCurrentRound}
                  getYarnColor={(yarnId: string) => {
                    const yarn = currentProject?.yarns.find(y => y.id === yarnId)
                    return yarn?.color.hex || '#000000'
                  }}
                  isLightColor={(hex: string) => {
                    const color = hex.replace('#', '')
                    const r = parseInt(color.substring(0, 2), 16)
                    const g = parseInt(color.substring(2, 4), 16)
                    const b = parseInt(color.substring(4, 6), 16)
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000
                    return brightness > 200
                  }}
                />
              </div>

              {/* Action Buttons */}
              <ProgressActionButtons
                currentProject={currentProject}
                currentChart={currentChart}
                isViewMode={isViewMode}
                isCompleted={currentChart?.isCompleted || false}
                currentStitchInRound={currentStitchInRound}
                totalStitchesInCurrentRound={totalStitchesInCurrentRound}
                displayRoundNumber={displayRoundNumber}
                onNextStitch={nextStitch}
                onPreviousStitch={previousStitch}
                onCompleteRound={handleCompleteRound}
                onExitViewMode={handleExitViewMode}
                onResetProject={handleResetProject}
                onShareSuccess={handleShareSuccess}
              />
            </div>
          </>
        )}

        {/* No Chart Warning */}
        {!currentChart && (
          <div className="card">
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">
                此專案尚未包含任何織圖資料
              </p>
              <Link
                to={`/project/${projectId}`}
                className="btn btn-primary"
              >
                前往專案設定
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}