import { memo } from 'react'
import { Project, Chart } from '../../types'
import ProgressActionButtons from '../ProgressActionButtons'

interface ActionControlsProps {
  currentProject: Project | null
  currentChart: Chart | null
  isViewMode: boolean
  currentStitchDisplayInRound: number
  totalStitchesInCurrentRound: number
  displayRoundNumber: number
  onNextStitch: () => void
  onPreviousStitch: () => void
  onCompleteRound: () => void
  onRestartCurrentRound: () => void
  onExitViewMode: () => void
  onResetProject: () => void
  onShareSuccess: () => void
}

/**
 * Action controls component that wraps ProgressActionButtons
 * Handles all stitch navigation and project management actions
 */
export const ActionControls = memo<ActionControlsProps>(({
  currentProject,
  currentChart,
  isViewMode,
  currentStitchDisplayInRound,
  totalStitchesInCurrentRound,
  displayRoundNumber,
  onNextStitch,
  onPreviousStitch,
  onCompleteRound,
  onRestartCurrentRound,
  onExitViewMode,
  onResetProject,
  onShareSuccess
}) => {
  if (!currentChart) {
    return null
  }

  return (
    <ProgressActionButtons
      currentProject={currentProject}
      currentChart={currentChart}
      isViewMode={isViewMode}
      isCompleted={currentChart?.isCompleted || false}
      currentStitchDisplayInRound={currentStitchDisplayInRound}
      totalStitchesInCurrentRound={totalStitchesInCurrentRound}
      displayRoundNumber={displayRoundNumber}
      onNextStitch={onNextStitch}
      onPreviousStitch={onPreviousStitch}
      onCompleteRound={onCompleteRound}
      onRestartCurrentRound={onRestartCurrentRound}
      onExitViewMode={onExitViewMode}
      onResetProject={onResetProject}
      onShareSuccess={onShareSuccess}
    />
  )
})

ActionControls.displayName = 'ActionControls'

export default ActionControls