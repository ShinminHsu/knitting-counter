import { Link } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'
import SyncStatusIndicator from '../SyncStatusIndicator'

interface PatternEditorToolbarProps {
  projectId: string
  currentChart: any
  isLoading: boolean
  onAddRound: () => void
}

export default function PatternEditorToolbar({
  projectId,
  currentChart,
  isLoading,
  onAddRound
}: PatternEditorToolbarProps) {
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