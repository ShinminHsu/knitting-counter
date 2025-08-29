import { memo, useMemo } from 'react'
import { Project, Chart } from '../../types'
import {
  getProjectTotalRoundsAllCharts,
  getProjectTotalStitchesAllCharts,
  getProjectCompletedStitchesAllCharts,
  getChartProgressPercentage,
  getChartCompletedStitches,
  getRoundTotalStitches
} from '../../utils'

interface ProgressDisplayProps {
  currentProject: Project
  currentChart: Chart | null
  currentRound: number
  hasMultipleCharts: boolean
}

/**
 * Component for displaying overall progress bars and statistics
 * Shows both project-wide and chart-specific progress
 */
export const ProgressDisplay = memo<ProgressDisplayProps>(({
  currentProject,
  currentChart,
  currentRound,
  hasMultipleCharts
}) => {
  // Memoized progress calculations
  const progressData = useMemo(() => {
    // Calculate current chart progress (not overall project progress)
    const progressPercentage = currentChart ?
      (getChartProgressPercentage(currentChart) / 100) : 0

    // Round and stitch statistics
    const roundsProgress = currentChart ?
      `${Math.max(0, currentChart.currentRound - 1)} / ${currentChart.rounds?.length || 0} 圈` :
      `${Math.max(0, currentRound - 1)} / ${getProjectTotalRoundsAllCharts(currentProject)} 圈`

    const stitchesProgress = currentChart ?
      `${getChartCompletedStitches(currentChart)} / ${currentChart.rounds?.reduce((sum, round) => sum + getRoundTotalStitches(round), 0) || 0} 針` :
      `${getProjectCompletedStitchesAllCharts(currentProject)} / ${getProjectTotalStitchesAllCharts(currentProject)} 針`

    return {
      progressPercentage,
      roundsProgress,
      stitchesProgress
    }
  }, [currentProject, currentChart, currentRound])

  const { progressPercentage, roundsProgress, stitchesProgress } = progressData

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-text-primary">
          {hasMultipleCharts ? `${currentChart?.name || '當前織圖'} 進度` : '專案進度'}
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
            {roundsProgress}
          </div>
        </div>
        <div>
          <div className="text-text-secondary">針數進度</div>
          <div className="font-semibold text-text-primary">
            {stitchesProgress}
          </div>
        </div>
      </div>
    </div>
  )
})

ProgressDisplay.displayName = 'ProgressDisplay'

export default ProgressDisplay