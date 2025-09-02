import { Link } from 'react-router-dom'
import { IoPlayCircleOutline } from 'react-icons/io5'
import { FiEdit3, FiUploadCloud } from "react-icons/fi"
import { LiaVolleyballBallSolid } from 'react-icons/lia'

export interface QuickActionsProps {
  projectId: string
}

export default function QuickActions({ projectId }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Link
        to={`/project/${projectId}/progress`}
        className="card hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <IoPlayCircleOutline className="w-8 h-8 text-text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">開始編織</h3>
            <p className="text-sm text-text-secondary">追蹤編織進度</p>
          </div>
        </div>
      </Link>

      <Link
        to={`/project/${projectId}/pattern`}
        className="card hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <FiEdit3 className="w-7 h-7 text-text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">編輯織圖</h3>
            <p className="text-sm text-text-secondary">管理圈數和針法</p>
          </div>
        </div>
      </Link>

      <Link
        to={`/project/${projectId}/yarns`}
        className="card hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <LiaVolleyballBallSolid className="w-8 h-8 text-text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">毛線管理</h3>
            <p className="text-sm text-text-secondary">管理專案毛線</p>
          </div>
        </div>
      </Link>

      <Link
        to={`/project/${projectId}/import-export`}
        className="card hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <FiUploadCloud className="w-7 h-7 text-text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">匯出專案</h3>
            <p className="text-sm text-text-secondary">備份和分享</p>
          </div>
        </div>
      </Link>
    </div>
  )
}