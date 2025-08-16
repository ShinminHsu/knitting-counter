import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import UserProfile from './UserProfile'
import { formatDate, getProjectProgressPercentage, getProjectTotalRounds, getProjectTotalStitches, getProjectCompletedStitches } from '../utils'

export default function ProjectListView() {
  const { projects, createProject, deleteProject } = useAppStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectSource, setNewProjectSource] = useState('')
  
  console.log('ProjectListView 渲染，專案數量:', projects.length)

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    createProject(newProjectName.trim(), newProjectSource.trim() || undefined)
    setNewProjectName('')
    setNewProjectSource('')
    setShowCreateForm(false)
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">編織專案</h1>
            <div className="flex items-center gap-4">
              <UserProfile />
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary"
              >
                新增專案
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 專案列表 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🧶</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              還沒有編織專案
            </h2>
            <p className="text-text-secondary mb-6">
              建立你的第一個編織專案開始記錄進度
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              建立新專案
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-text-primary truncate">
                    {project.name}
                  </h3>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="text-text-tertiary hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">進度</span>
                    <span className="text-text-primary">
                      {Math.round(getProjectProgressPercentage(project) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-background-tertiary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProjectProgressPercentage(project) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 mb-4 text-sm text-text-secondary">
                  <div>圈數: {project.currentRound}/{getProjectTotalRounds(project)}</div>
                  <div>針數: {getProjectCompletedStitches(project)}/{getProjectTotalStitches(project)}</div>
                  <div>更新: {formatDate(project.lastModified)}</div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/project/${project.id}/progress`}
                    className="btn btn-primary flex-1"
                  >
                    開始編織
                  </Link>
                  <Link
                    to={`/project/${project.id}`}
                    className="btn btn-secondary"
                  >
                    詳情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 建立專案彈窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              建立新專案
            </h2>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  專案名稱 *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input"
                  placeholder="輸入專案名稱"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  來源網址（選填）
                </label>
                <input
                  type="url"
                  value={newProjectSource}
                  onChange={(e) => setNewProjectSource(e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}