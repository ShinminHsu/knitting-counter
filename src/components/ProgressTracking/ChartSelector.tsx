import { memo, useCallback } from 'react'
import { Chart, ChartSummary } from '../../types'
import ChartSelectorHeader from '../ChartSelectorHeader'

interface ChartSelectorProps {
  currentChart: Chart | null
  chartSummaries: ChartSummary[]
  hasMultipleCharts: boolean
  isViewMode: boolean
  displayRoundNumber: number
  onChartChange: (chartId: string) => void
}

/**
 * Chart selection component for multi-chart projects
 * Wraps ChartSelectorHeader with additional logic and optimization
 */
export const ChartSelector = memo<ChartSelectorProps>(({
  currentChart,
  chartSummaries,
  hasMultipleCharts,
  isViewMode,
  displayRoundNumber,
  onChartChange
}) => {
  // Memoized chart change handler
  const handleChartChange = useCallback(async (chartId: string) => {
    if (!currentChart) return
    await onChartChange(chartId)
  }, [currentChart, onChartChange])

  // Only render if there are multiple charts
  if (!hasMultipleCharts) {
    return null
  }

  return (
    <ChartSelectorHeader
      currentChartId={currentChart?.id}
      chartSummaries={chartSummaries}
      hasMultipleCharts={hasMultipleCharts}
      onChartChange={handleChartChange}
      isViewMode={isViewMode}
      displayRoundNumber={displayRoundNumber}
    />
  )
})

ChartSelector.displayName = 'ChartSelector'

export default ChartSelector