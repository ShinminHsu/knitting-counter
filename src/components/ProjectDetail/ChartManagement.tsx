import { Link } from 'react-router-dom'
import { FiEdit3 } from "react-icons/fi"
import { useChartStore } from '../../stores/useChartStore'

export interface ChartManagementProps {
  project: any
  currentChart: any
  onCreateChart: () => void
  onEditChart: (chart: any) => void
  onSetCurrentChart: (chartId: string) => void
  onDeleteChart: (chartId: string, chartName: string) => void
}

export default function ChartManagement({
  project,
  currentChart,
  onCreateChart,
  onEditChart,
  onSetCurrentChart,
  onDeleteChart
}: ChartManagementProps) {
  const { getChartSummaries } = useChartStore()
  
  const chartSummaries = getChartSummaries()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text-primary">織圖管理</h2>
        <button
          onClick={onCreateChart}
          className="btn btn-primary text-sm"
        >
          新增織圖
        </button>
      </div>
      
      {chartSummaries.length === 0 ? (
        <div className="text-center py-8">
          <div className="mb-3 flex justify-center">
            <FiEdit3 className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-tertiary mb-3">尚未建立織圖</p>
          <button
            onClick={onCreateChart}
            className="text-primary hover:underline text-sm"
          >
            點擊這裡建立第一個織圖
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 織圖列表 */}
          <div className="space-y-3">
            {chartSummaries.map((chart) => {
              const isActive = currentChart?.id === chart.id
              
              return (
                <div 
                  key={chart.id} 
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isActive 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-background-secondary border-border hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-text-primary truncate">
                          {chart.name}
                        </h3>
                        {isActive && (
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                            當前
                          </span>
                        )}
                        {chart.isCompleted && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                            完成
                          </span>
                        )}
                      </div>
                      
                      {chart.description && (
                        <p className="text-sm text-text-secondary mb-2 truncate">
                          {chart.description}
                        </p>
                      )}
                      
                      {chart.notes && (
                        <p className="text-xs text-text-tertiary mb-2 line-clamp-2">
                          {chart.notes}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4 text-xs text-text-secondary">
                        <div>圈數: {chart.roundCount}</div>
                        <div>針數: {chart.totalStitches}</div>
                        <div>進度: {Math.round(chart.currentProgress)}%</div>
                      </div>
                      
                      {chart.currentProgress > 0 && (
                        <div className="w-full bg-background-tertiary rounded-full h-1.5 mt-2">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300 bg-primary"
                            style={{ width: `${chart.currentProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {!isActive && (
                        <button
                          onClick={() => onSetCurrentChart(chart.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          設為當前
                        </button>
                      )}
                      <button
                        onClick={() => onEditChart(chart)}
                        className="text-xs text-primary hover:underline"
                      >
                        編輯資訊
                      </button>
                      <Link
                        to={`/project/${project.id}/pattern?chartId=${chart.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        編輯圖樣
                      </Link>
                      {chartSummaries.length > 1 && (
                        <button
                          onClick={() => onDeleteChart(chart.id, chart.name)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          刪除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 總計資訊 */}
          <div className="flex items-center justify-between pt-3 border-t border-border text-sm text-text-secondary">
            <div>織圖總數: {chartSummaries.length}</div>
            <div>總針數: {chartSummaries.reduce((sum, chart) => sum + chart.totalStitches, 0)}</div>
          </div>
        </div>
      )}
    </div>
  )
}