import { memo } from 'react'
import { Link } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'
import { Project } from '../../types'
import SyncStatusIndicator from '../SyncStatusIndicator'

interface ProgressHeaderProps {
  project: Project
  projectId: string
}

/**
 * Header component for progress tracking view
 * Handles navigation, project title, and sync status
 */
export const ProgressHeader = memo<ProgressHeaderProps>(({
  project,
  projectId
}) => {
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
            <h1 className="text-base sm:text-xl font-semibold text-text-primary truncate">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncStatusIndicator />
          </div>
        </div>
      </div>
    </div>
  )
})

ProgressHeader.displayName = 'ProgressHeader'

export default ProgressHeader