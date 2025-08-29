import { memo } from 'react'
import { Project, Chart } from '../../types'
import ProgressActionButtons from '../ProgressActionButtons'

interface ActionControlsProps {
  currentProject: Project | null
  currentChart: Chart | null
  isViewMode: boolean
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
 * Action controls component that wraps ProgressActionButtons
 * Handles all stitch navigation and project management actions
 */
export const ActionControls = memo<ActionControlsProps>(({
  currentProject,
  currentChart,
  isViewMode,
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
  if (!currentChart) {
    return null
  }

  return (
    <ProgressActionButtons
      currentProject={currentProject}
      currentChart={currentChart}
      isViewMode={isViewMode}
      isCompleted={currentChart?.isCompleted || false}
      currentStitchInRound={currentStitchInRound}
      totalStitchesInCurrentRound={totalStitchesInCurrentRound}
      displayRoundNumber={displayRoundNumber}
      onNextStitch={onNextStitch}
      onPreviousStitch={onPreviousStitch}
      onCompleteRound={onCompleteRound}
      onExitViewMode={onExitViewMode}
      onResetProject={onResetProject}
      onShareSuccess={onShareSuccess}
    />
  )
})

ActionControls.displayName = 'ActionControls'

export default ActionControls