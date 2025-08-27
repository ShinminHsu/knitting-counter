import { memo, useCallback } from 'react'
import { Project, Chart } from '../types'

interface ProgressActionButtonsProps {
  currentProject: Project | null
  currentChart: Chart | null
  isViewMode: boolean
  isCompleted: boolean
  currentStitchInRound: number
  totalStitchesInCurrentRound: number
  displayRoundNumber: number
  onNextStitch: () => void
  onPreviousStitch: () => void
  onCompleteRound: () => void
  onExitViewMode: () => void
  onResetProject: () => void
  onShareSuccess: () => void
}

/**
 * Component for stitch operations and round completion buttons
 * Chart-aware and optimized for multi-chart functionality
 */
export const ProgressActionButtons = memo<ProgressActionButtonsProps>(({
  currentProject,
  currentChart,
  isViewMode,
  isCompleted,
  currentStitchInRound,
  totalStitchesInCurrentRound,
  displayRoundNumber,
  onNextStitch,
  onPreviousStitch,
  onCompleteRound,
  onExitViewMode,
  onResetProject,
  onShareSuccess
}) => {
  
  // Check if we can go to previous stitch
  const canGoPrevious = useCallback(() => {
    if (!currentChart) return false
    return !(currentChart.currentRound === 1 && currentChart.currentStitch === 0)
  }, [currentChart])

  // Check if round can be completed
  const canCompleteRound = useCallback(() => {
    if (!currentChart || isViewMode) return false
    return displayRoundNumber === currentChart.currentRound
  }, [currentChart, isViewMode, displayRoundNumber])

  if (isViewMode) {
    return (
      <div className="text-center py-4">
        <p className="mb-4" style={{ color: 'rgb(217, 115, 152)' }}>
          此為查看模式，無法編輯進度
        </p>
        <button
          onClick={onExitViewMode}
          className="btn btn-primary"
        >
          返回編織進度
        </button>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          編織完成！
        </h2>
        <p className="text-text-secondary mb-6">
          恭喜您完成了「{currentProject?.name}」的編織！
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onResetProject}
            className="btn btn-secondary"
          >
            重新編織
          </button>
          <button
            onClick={onShareSuccess}
            className="btn btn-primary"
          >
            分享成果
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stitch Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onPreviousStitch}
          disabled={!canGoPrevious()}
          className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-lg py-4 flex items-center justify-center gap-2 flex-1"
        >
          <span>←</span>
          上一針
        </button>
        
        <div className="flex items-baseline px-6">
          <span className="text-4xl font-bold text-primary">
            {currentStitchInRound}
          </span>
          <span className="text-xl text-text-secondary">
            /{totalStitchesInCurrentRound}
          </span>
        </div>
        
        <button
          onClick={onNextStitch}
          className="btn btn-primary text-sm sm:text-lg py-4 flex items-center justify-center gap-2 flex-1"
        >
          下一針
          <span>→</span>
        </button>
      </div>

      {/* Complete Round Button */}
      {canCompleteRound() && (
        <button
          onClick={onCompleteRound}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          完成第 {displayRoundNumber} 圈
        </button>
      )}

      {/* Chart Progress Info */}
      {currentChart && (
        <div className="text-xs text-text-tertiary text-center border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-text-secondary">當前圈：</span>
              <span className="font-medium text-text-primary ml-1">
                {currentChart.currentRound}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">當前針：</span>
              <span className="font-medium text-text-primary ml-1">
                {currentChart.currentStitch}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">織圖：</span>
              <span className="font-medium text-text-primary ml-1">
                {currentChart.name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ProgressActionButtons.displayName = 'ProgressActionButtons'

export default ProgressActionButtons