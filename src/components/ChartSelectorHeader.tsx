import { memo } from 'react'
import { ChartSummary } from '../types'

interface ChartSelectorHeaderProps {
  currentChartId: string | undefined
  chartSummaries: ChartSummary[]
  hasMultipleCharts: boolean
  onChartChange: (chartId: string) => void
  isViewMode: boolean
  displayRoundNumber: number
}

/**
 * Header component for chart selection and display
 * Shows current chart info and allows switching between charts
 */
export const ChartSelectorHeader = memo<ChartSelectorHeaderProps>(({
  currentChartId,
  chartSummaries,
  hasMultipleCharts,
  onChartChange,
  isViewMode,
  displayRoundNumber
}) => {
  const currentChart = chartSummaries.find(chart => chart.id === currentChartId)
  
  if (!hasMultipleCharts) {
    // Single chart - just show the chart name
    return (
      <div className="bg-background-secondary border-b border-border px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">織圖：</span>
            <span className="font-medium text-text-primary">
              {currentChart?.name || '主織圖'}
            </span>
          </div>
          <div className="text-sm text-text-secondary">
            第 {displayRoundNumber} 圈
            {isViewMode && (
              <span className="ml-2 text-primary">（查看中）</span>
            )}
          </div>
        </div>
        {currentChart?.description && (
          <div className="text-xs text-text-tertiary mt-1">
            {currentChart.description}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-background-secondary border-b border-border px-3 sm:px-4 py-3">
      {/* Chart Selection */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm text-text-secondary flex-shrink-0">
            當前織圖：
          </label>
          <select
            value={currentChartId || ''}
            onChange={(e) => onChartChange(e.target.value)}
            className="input flex-1 max-w-xs text-sm sm:text-sm text-base"
            style={{ fontSize: '16px' }}
            disabled={isViewMode}
          >
            {chartSummaries.map(chart => (
              <option key={chart.id} value={chart.id}>
                {chart.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-text-secondary">
          {/* 第 {displayRoundNumber} 圈 */}
          {isViewMode && (
            <span className="ml-2 text-primary">（查看中）</span>
          )}
        </div>
      </div>

      {/* Chart Info */}
      {/* {currentChart && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-text-secondary">總圈數：</span>
            <span className="font-medium text-text-primary ml-1">
              {currentChart.roundCount}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">總針數：</span>
            <span className="font-medium text-text-primary ml-1">
              {currentChart.totalStitches}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">進度：</span>
            <span className="font-medium text-text-primary ml-1">
              {Math.round(currentChart.currentProgress)}%
            </span>
          </div>
          <div>
            <span className="text-text-secondary">狀態：</span>
            <span className={`font-medium ml-1 ${
              currentChart.isCompleted ? 'text-green-600' : 'text-primary'
            }`}>
              {currentChart.isCompleted ? '已完成' : '進行中'}
            </span>
          </div>
        </div>
      )} */}

      {/* Chart Description */}
      {/* {currentChart?.description && (
        <div className="text-xs text-text-tertiary mt-2 border-t border-border-light pt-2">
          <span className="text-text-secondary">說明：</span>
          {currentChart.description}
        </div>
      )} */}

      {/* Chart Notes */}
      {/* {currentChart?.notes && (
        <div className="text-xs text-text-tertiary mt-1">
          <span className="text-text-secondary">備註：</span>
          {currentChart.notes}
        </div>
      )} */}

      {/* Disabled state message */}
      {isViewMode && hasMultipleCharts && (
        <div className="text-xs text-primary mt-2 text-center">
          查看模式下無法切換織圖
        </div>
      )}
    </div>
  )
})

ChartSelectorHeader.displayName = 'ChartSelectorHeader'

export default ChartSelectorHeader