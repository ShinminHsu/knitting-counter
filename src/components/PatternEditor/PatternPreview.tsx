import { FiEdit3 } from 'react-icons/fi'
import { Chart, Project, Round } from '../../types'
import { getRoundTotalStitches, describeRound } from '../../utils'

interface PatternPreviewProps {
  currentChart: Chart | null
  chartPattern: Round[]
  currentProject: Project | null
  onEditChart: () => void
  onAddRound: () => void
}

export default function PatternPreview({
  currentChart,
  chartPattern,
  currentProject,
  onEditChart,
  onAddRound
}: PatternPreviewProps) {
  if (chartPattern.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-text-primary">
              {currentChart ? currentChart.name : '織圖預覽'}
            </h2>
          </div>
          {currentChart && (
            <button
              onClick={onEditChart}
              className="text-text-tertiary hover:text-text-primary p-2"
            >
              <FiEdit3 className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="text-center py-8">
          <div className="mb-3 flex justify-center">
            <FiEdit3 className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-tertiary mb-3">尚未建立織圖</p>
          <button
            onClick={onAddRound}
            className="text-primary hover:underline text-sm"
          >
            點擊這裡開始編輯織圖
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-text-primary">
            {currentChart ? currentChart.name : '織圖預覽'}
          </h2>
          {currentChart && (currentChart.description || currentChart.notes) && (
            <div className="mt-2 space-y-1">
              {currentChart.description && (
                <p className="text-sm text-text-secondary">{currentChart.description}</p>
              )}
              {currentChart.notes && (
                <p className="text-xs text-text-tertiary whitespace-pre-wrap">{currentChart.notes}</p>
              )}
            </div>
          )}
        </div>
        {currentChart && (
          <button
            onClick={onEditChart}
            className="text-text-tertiary hover:text-text-primary p-2"
          >
            <FiEdit3 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* 織圖列表 */}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {chartPattern
            .sort((a, b) => a.roundNumber - b.roundNumber)
            .map((round) => {
              const roundStitches = getRoundTotalStitches(round)
              const roundDescription = currentProject ? describeRound(round) : '載入中...'
              
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
          <div className="grid grid-cols-2 gap-4 text-sm w-full">
            <div>
              <span className="text-text-secondary">總圈數: </span>
              <span className="font-medium text-text-primary">{chartPattern.length}</span>
            </div>
            <div>
              <span className="text-text-secondary">總針數: </span>
              <span className="font-medium text-text-primary">
                {chartPattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}