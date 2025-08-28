import { memo } from 'react'
import { Project, Chart, Round } from '../../types'
import StitchProgressRenderer from '../StitchProgressRenderer'

interface StitchRendererProps {
  currentProject: Project
  currentChart: Chart | null
  displayRound: Round | undefined
  displayRoundNumber: number
  currentStitchInRound: number
  totalStitchesInCurrentRound: number
  roundDescription: string
  isViewMode: boolean
  hasMultipleCharts: boolean
  onJumpToRound: (roundNumber: number) => void
  patternContainerRef: React.RefObject<HTMLDivElement>
}

/**
 * Component for stitch visualization and round navigation
 * Handles the visual display of stitches and quick round jumping
 */
export const StitchRenderer = memo<StitchRendererProps>(({
  currentProject,
  currentChart,
  displayRound,
  displayRoundNumber,
  currentStitchInRound,
  totalStitchesInCurrentRound,
  roundDescription,
  isViewMode,
  hasMultipleCharts,
  onJumpToRound,
  patternContainerRef
}) => {
  if (!currentChart) {
    return null
  }

  return (
    <>
      {/* Quick Round Navigation */}
      <div className="card">
        <h2 className="text-xl font-semibold text-text-primary mb-3">快速跳轉</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-text-secondary">跳轉到第</label>
          <select
            value={displayRoundNumber}
            onChange={(e) => onJumpToRound(parseInt(e.target.value))}
            className="input w-auto min-w-0 flex-shrink-0"
          >
            {Array.from(
              { length: Math.max(...(currentChart.rounds?.map((r: any) => r.roundNumber) || [1])) },
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
              const yarn = currentProject?.yarns.find((y: any) => y.id === yarnId)
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
      </div>
    </>
  )
})

StitchRenderer.displayName = 'StitchRenderer'

export default StitchRenderer