import { Link } from 'react-router-dom'
import { LiaVolleyballBallSolid } from 'react-icons/lia'
import { Project, Yarn } from '../../types'

export interface YarnDisplayProps {
  project: Project
}

export default function YarnDisplay({ project }: YarnDisplayProps) {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-text-primary mb-4">使用的毛線</h2>
      
      {project.yarns.length === 0 ? (
        <div className="text-center py-8">
          <div className="mb-3 flex justify-center">
            <LiaVolleyballBallSolid className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-tertiary mb-3">尚未添加毛線</p>
          <Link
            to={`/project/${project.id}/yarns`}
            className="text-primary hover:underline text-sm"
          >
            點擊這裡管理毛線
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {project.yarns.map((yarn: Yarn) => (
            <div key={yarn.id} className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
              <div
                className="w-8 h-8 rounded-full shadow-sm flex-shrink-0 border border-gray-400"
                style={{ backgroundColor: yarn.color.hex }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary truncate">{yarn.name}</h3>
                {yarn.brand && (
                  <p className="text-sm text-text-secondary truncate">{yarn.brand}</p>
                )}
                <p className="text-xs text-text-tertiary">{yarn.color.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}