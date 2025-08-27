import { StitchInfo } from '../../types'
import { getStitchDisplayInfo } from '../../utils'
import { VscEdit } from 'react-icons/vsc'
import { BsTrash } from 'react-icons/bs'

interface CustomGroupCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  newGroupName: string
  setNewGroupName: (name: string) => void
  newGroupRepeatCount: number | string
  setNewGroupRepeatCount: (count: number | string) => void
  newGroupStitches: StitchInfo[]
  onAddStitch: () => void
  onSelectFromTemplate: () => void
  onSaveAsTemplate: () => void
  onEditStitch: (stitchId: string) => void
  onRemoveStitch: (stitchId: string) => void
  canSaveAsTemplate: boolean
}

export default function CustomGroupCreationModal({
  isOpen,
  onClose,
  onConfirm,
  newGroupName,
  setNewGroupName,
  newGroupRepeatCount,
  setNewGroupRepeatCount,
  newGroupStitches,
  onAddStitch,
  onSelectFromTemplate,
  onSaveAsTemplate,
  onEditStitch,
  onRemoveStitch,
  canSaveAsTemplate
}: CustomGroupCreationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          新增針目群組
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              群組名稱
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="input"
              placeholder="針目群組"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              重複次數
            </label>
            <input
              type="number"
              min="1"
              value={newGroupRepeatCount}
              onChange={(e) => setNewGroupRepeatCount(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* 群組中的針法 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-text-secondary">
              群組針法
            </label>
          </div>
          
          <div className="space-y-2 mb-4">
            {newGroupStitches.map((stitch) => {
              const displayInfo = getStitchDisplayInfo(stitch)
              return (
                <div key={stitch.id} className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded">
                  {/* 針目圖標 - 固定寬度40px，居中對齊 */}
                  <div className="text-lg flex items-center justify-center">
                    {displayInfo.symbol}
                  </div>
                  
                  {/* 針目資訊 - 彈性寬度 */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {displayInfo.rawValue}
                      </span>
                      <span className="text-sm text-text-secondary">
                        ×{stitch.count}
                      </span>
                    </div>
                  </div>
                  
                  {/* 編輯和刪除按鈕 - 固定寬度100px，右對齊 */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEditStitch(stitch.id)}
                      className="text-text-tertiary hover:text-primary transition-colors p-1 w-8 h-8 flex items-center justify-center"
                    >
                      <VscEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveStitch(stitch.id)}
                      className="text-text-tertiary hover:text-red-500 transition-colors p-1 w-8 h-8 flex items-center justify-center"
                    >
                      <BsTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={onAddStitch}
              className="btn btn-secondary text-sm"
            >
              新增針法
            </button>
            <button
              onClick={onSelectFromTemplate}
              className="btn btn-secondary text-sm"
            >
              從範本複製
            </button>
            <button
              onClick={onSaveAsTemplate}
              className="btn btn-secondary text-sm"
              disabled={!canSaveAsTemplate}
            >
              存成範本
            </button>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary flex-1"
            disabled={newGroupStitches.length === 0}
          >
            新增群組
          </button>
        </div>
      </div>
    </div>
  )
}