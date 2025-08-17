import { useParams, Link } from 'react-router-dom'

export default function ImportExportView() {
  const { projectId } = useParams()

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to={`/project/${projectId}`}
              className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-base"
            >
              ← 返回
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-text-primary">匯入匯出</h1>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            匯入匯出
          </h2>
          <p className="text-text-secondary">
            此功能正在開發中...
          </p>
        </div>
      </div>
    </div>
  )
}