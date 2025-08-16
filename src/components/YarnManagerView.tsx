import { useParams, Link } from 'react-router-dom'

export default function YarnManagerView() {
  const { projectId } = useParams()

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      <div className="bg-background-secondary border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to={`/project/${projectId}`}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              ← 返回
            </Link>
            <h1 className="text-xl font-semibold text-text-primary">毛線管理</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            毛線管理
          </h2>
          <p className="text-text-secondary">
            此功能正在開發中...
          </p>
        </div>
      </div>
    </div>
  )
}