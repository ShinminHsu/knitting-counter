import { Link } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'
import { FiEdit3 } from 'react-icons/fi'
import SyncStatusIndicator from '../SyncStatusIndicator'
import { Chart } from '../../types'

interface ChartHeaderProps {
  projectId: string
  currentChart: Chart | null
  isLoading: boolean
  onEditChart: () => void
  onAddRound: () => void
}

export default function ChartHeader({
  projectId,
  currentChart,
  isLoading,
  onEditChart,
  onAddRound
}: ChartHeaderProps) {
  return (
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
            <div className="flex flex-col">
              <h1 className="text-base sm:text-xl font-semibold text-text-primary">織圖編輯</h1>
              {currentChart && (
                <span className="text-xs sm:text-sm text-text-secondary">
                  {currentChart.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {currentChart && (
              <button
                onClick={onEditChart}
                className="text-text-secondary hover:text-text-primary p-2 transition-colors"
                title="編輯織圖資訊"
              >
                <FiEdit3 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onAddRound}
              className="btn btn-primary text-sm"
              disabled={isLoading}
            >
              {isLoading ? '處理中...' : '新增圈數'}
            </button>
            <SyncStatusIndicator />
          </div>
        </div>
      </div>
    </div>
  )
}