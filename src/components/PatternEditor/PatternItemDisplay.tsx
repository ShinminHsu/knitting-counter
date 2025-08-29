import { VscEdit } from 'react-icons/vsc'
import { BsTrash } from 'react-icons/bs'
import { StitchInfo, StitchGroup, PatternItemType, PatternItem, StitchType } from '../../types'
import { getStitchDisplayInfo, getStitchGroupTotalStitches } from '../../utils'
import StitchEditor from './StitchEditor'
import GroupEditor from './GroupEditor'

interface PatternItemDisplayProps {
  patternItem: PatternItem
  roundNumber: number
  index: number
  editingStitch: { roundNumber: number, stitchId: string } | null
  editingGroup: { roundNumber: number, groupId: string } | null
  editingGroupStitch: { roundNumber: number, groupId: string, stitchId: string } | null
  editStitchType: StitchType
  editStitchCount: string
  editGroupStitchType: StitchType
  editGroupStitchCount: string
  editGroupName: string
  editGroupRepeatCount: string
  onEditStitch: (roundNumber: number, stitch: StitchInfo) => void
  onUpdateStitch: () => void
  onDeleteStitch: (roundNumber: number, stitchId: string) => void
  onEditGroup: (roundNumber: number, group: StitchGroup) => void
  onUpdateGroup: (roundNumber: number, groupId: string) => void
  onDeleteGroup: (roundNumber: number, groupId: string) => void
  onEditGroupStitch: (roundNumber: number, groupId: string, stitch: StitchInfo) => void
  onUpdateGroupStitch: () => void
  onDeleteGroupStitch: (roundNumber: number, groupId: string, stitchId: string) => void
  onAddStitchToGroup: (roundNumber: number, groupId: string) => void
  onSaveAsTemplate: (group: StitchGroup) => void
  onCancelEdit: () => void
  onStitchTypeChange: (newType: StitchType) => void
  onStitchCountChange: (newCount: string) => void
  onGroupStitchTypeChange: (newType: StitchType) => void
  onGroupStitchCountChange: (newCount: string) => void
  onGroupNameChange: (newName: string) => void
  onGroupRepeatCountChange: (newCount: string) => void
  onDragStart: (e: React.DragEvent, index: number, roundNumber: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number, roundNumber: number) => void
}

export default function PatternItemDisplay({
  patternItem,
  roundNumber,
  index,
  editingStitch,
  editingGroup,
  editingGroupStitch,
  editStitchType,
  editStitchCount,
  editGroupStitchType,
  editGroupStitchCount,
  editGroupName,
  editGroupRepeatCount,
  onEditStitch,
  onUpdateStitch,
  onDeleteStitch,
  onEditGroup,
  onUpdateGroup,
  onDeleteGroup,
  onEditGroupStitch,
  onUpdateGroupStitch,
  onDeleteGroupStitch,
  onAddStitchToGroup,
  onSaveAsTemplate,
  onCancelEdit,
  onStitchTypeChange,
  onStitchCountChange,
  onGroupStitchTypeChange,
  onGroupStitchCountChange,
  onGroupNameChange,
  onGroupRepeatCountChange,
  onDragStart,
  onDragOver,
  onDrop
}: PatternItemDisplayProps) {
  if (patternItem.type === PatternItemType.STITCH) {
    const stitch = patternItem.data as StitchInfo
    const isEditing = editingStitch?.stitchId === stitch.id

    return (
      <div
        key={patternItem.id}
        className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded cursor-move"
        draggable
        onDragStart={(e) => onDragStart(e, index, roundNumber)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index, roundNumber)}
        tabIndex={0}
        onKeyDown={(e) => {
          // 編輯模式時完全不處理父容器的鍵盤事件，讓輸入框正常處理
          if (isEditing) {
            return
          }
          
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            onDeleteStitch(roundNumber, stitch.id)
          }
        }}
        onFocus={(e) => {
          // 編輯模式時不顯示外框
          if (!isEditing) {
            e.currentTarget.style.outline = '2px solid #3b82f6'
            e.currentTarget.style.outlineOffset = '2px'
          }
        }}
        onBlur={(e) => {
          // Remove visual feedback when unfocused
          e.currentTarget.style.outline = 'none'
        }}
      >
        {/* 針目圖標 */}
        <div className="text-lg flex items-center justify-center">
          {getStitchDisplayInfo(stitch).symbol}
        </div>
        
        {/* 針目資訊 */}
        {isEditing ? (
          <div className="col-span-2 min-w-0">
            <StitchEditor
              stitchType={editStitchType}
              stitchCount={editStitchCount}
              onTypeChange={onStitchTypeChange}
              onCountChange={onStitchCountChange}
              onConfirm={() => onUpdateStitch()}
              onCancel={onCancelEdit}
            />
          </div>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">
                {getStitchDisplayInfo(stitch).rawValue}
              </span>
              <span className="text-sm text-text-secondary">
                ×{stitch.count}
              </span>
            </div>
          </div>
        )}
        
        {/* 操作按鈕 */}
        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            <div className="flex gap-1">
              {/* Already handled in StitchEditor */}
            </div>
          ) : (
            <>
              <button
                onClick={() => onEditStitch(roundNumber, stitch)}
                className="text-text-tertiary hover:text-primary p-1 w-8 h-8 flex items-center justify-center"
              >
                <VscEdit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteStitch(roundNumber, stitch.id)}
                className="text-text-tertiary hover:text-red-500 p-1 w-8 h-8 flex items-center justify-center"
              >
                <BsTrash className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (patternItem.type === PatternItemType.GROUP) {
    const group = patternItem.data as StitchGroup
    const isEditingGroup = editingGroup?.groupId === group.id

    return (
      <div
        key={patternItem.id}
        className="border border-border rounded-lg p-3 cursor-move focus:outline-none"
        data-group-id={group.id}
        draggable
        onDragStart={(e) => onDragStart(e, index, roundNumber)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index, roundNumber)}
        tabIndex={0}
        onKeyDown={(e) => {
          // 檢查是否有任何群組內的針目正在編輯
          const hasEditingGroupStitch = group.stitches.some(stitch =>
            editingGroupStitch?.stitchId === stitch.id &&
            editingGroupStitch?.groupId === group.id
          )
          
          if (e.key === 'Delete' || e.key === 'Backspace') {
            // 編輯模式時（包括群組本身編輯或群組內針目編輯）完全阻止事件傳播，讓輸入框正常處理
            if (isEditingGroup || hasEditingGroupStitch) {
              e.stopPropagation()
              return
            }
            
            // 只有在非編輯模式時才處理刪除
            e.preventDefault()
            onDeleteGroup(roundNumber, group.id)
          }
        }}
      >
        {/* Group Header */}
        <div className="flex items-center justify-between mb-2">
          {isEditingGroup ? (
            <GroupEditor
              groupName={editGroupName}
              groupRepeatCount={editGroupRepeatCount}
              onNameChange={onGroupNameChange}
              onRepeatCountChange={onGroupRepeatCountChange}
              onConfirm={() => onUpdateGroup(roundNumber, group.id)}
              onCancel={onCancelEdit}
              onAddStitch={() => onAddStitchToGroup(roundNumber, group.id)}
            />
          ) : (
            <>
              <div className="font-medium text-text-primary">
                {group.name}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditGroup(roundNumber, group)}
                  className="text-text-tertiary hover:text-primary p-2"
                >
                  <VscEdit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDeleteGroup(roundNumber, group.id)}
                  className="text-text-tertiary hover:text-red-500 p-2"
                >
                  <BsTrash className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Group Stitches */}
        <div className="space-y-2">
          {group.stitches.map((stitch) => {
            const isEditingGroupStitch = editingGroupStitch?.stitchId === stitch.id && 
                                       editingGroupStitch?.groupId === group.id

            return (
              <div
                key={stitch.id}
                className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded ml-4 focus:outline-none"
                tabIndex={0}
                onKeyDown={(e) => {
                  // 編輯模式時完全不處理父容器的鍵盤事件，讓輸入框正常處理
                  if (isEditingGroupStitch) {
                    return
                  }
                  
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault()
                    onDeleteGroupStitch(roundNumber, group.id, stitch.id)
                  }
                }}
              >
                {/* 針目圖標 */}
                <div className="text-lg flex items-center justify-center">
                  {getStitchDisplayInfo(stitch).symbol}
                </div>
                
                {/* 針目資訊 */}
                {isEditingGroupStitch ? (
                  <div className="col-span-2 min-w-0">
                    <StitchEditor
                      stitchType={editGroupStitchType}
                      stitchCount={editGroupStitchCount}
                      onTypeChange={onGroupStitchTypeChange}
                      onCountChange={onGroupStitchCountChange}
                      onConfirm={() => onUpdateGroupStitch()}
                      onCancel={onCancelEdit}
                    />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {getStitchDisplayInfo(stitch).rawValue}
                      </span>
                      <span className="text-sm text-text-secondary">
                        ×{stitch.count}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 操作按鈕 */}
                <div className="flex items-center justify-end gap-1">
                  {isEditingGroupStitch ? (
                    <div className="flex gap-1">
                      {/* Already handled in StitchEditor */}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onEditGroupStitch(roundNumber, group.id, stitch)}
                        className="text-text-tertiary hover:text-primary p-1 w-8 h-8 flex items-center justify-center"
                      >
                        <VscEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGroupStitch(roundNumber, group.id, stitch.id)}
                        className="text-text-tertiary hover:text-red-500 p-1 w-8 h-8 flex items-center justify-center"
                      >
                        <BsTrash className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 範本按鈕和針數統計 */}
        {!isEditingGroup && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => onSaveAsTemplate(group)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              title="存成範本"
            >
              存成範本
            </button>
            <div className="text-sm text-text-secondary">
              重複 {group.repeatCount} 次 (共 {getStitchGroupTotalStitches(group)} 針)
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}