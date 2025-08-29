import { FiEdit3 } from "react-icons/fi"
import { formatDate, getProjectTotalStitchesAllCharts } from '../../utils'
import { useChartStore } from '../../stores/useChartStore'
import { Project } from '../../types'

export interface ProjectInfoProps {
  project: Project
  onEditClick: () => void
}

export default function ProjectInfo({ project, onEditClick }: ProjectInfoProps) {
  const { getChartSummaries } = useChartStore()

  return (
    <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={onEditClick}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text-primary">專案資訊</h2>
        <button className="text-text-tertiary hover:text-text-primary p-2">
          <FiEdit3 className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        {project.source && (
          <div>
            <div className="text-sm text-text-secondary mb-1">來源</div>
            <a
              href={project.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {project.source}
            </a>
          </div>
        )}
        
        {project.notes && (
          <div>
            <div className="text-sm text-text-secondary mb-1">備註</div>
            <div className="text-sm text-text-primary whitespace-pre-wrap">{project.notes}</div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-text-secondary mb-1">建立日期</div>
            <div className="text-text-primary text-sm">
              {formatDate(project.createdDate)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-text-secondary mb-1">最後修改</div>
            <div className="text-text-primary text-sm">
              {formatDate(project.lastModified)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
          <div className="text-center">
            <div className="text-sm text-text-secondary">使用毛線</div>
            <div className="text-lg font-semibold text-text-primary">
              {project.yarns.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-secondary">織圖數量</div>
            <div className="text-lg font-semibold text-text-primary">
              {getChartSummaries().length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-secondary">總針數</div>
            <div className="text-lg font-semibold text-text-primary">
              {getProjectTotalStitchesAllCharts(project)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}