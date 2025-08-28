import { BsTrash } from 'react-icons/bs'
import { Round, Project, StitchInfo, StitchGroup, StitchType } from '../../types'
import { getSortedPatternItems, getRoundTotalStitches } from '../../utils'
import PatternItemDisplay from './PatternItemDisplay'

interface RoundCardProps {
  round: Round
  currentProject: Project | null
  editingRound: Round | null
  editingStitch: { roundNumber: number, stitchId: string } | null
  editingGroup: { roundNumber: number, groupId: string } | null
  editingGroupStitch: { roundNumber: number, groupId: string, stitchId: string } | null
  editStitchType: StitchType
  editStitchCount: string
  editGroupStitchType: StitchType
  editGroupStitchCount: string
  editGroupName: string
  editGroupRepeatCount: string
  onEditRound: (round: Round) => void
  onUpdateRoundNotes: (round: Round, notes: string) => void
  onAddStitch: (roundNumber: number) => void
  onAddGroup: (roundNumber: number) => void
  onCopyRound: (roundNumber: number) => void
  onDeleteRound: (roundNumber: number) => void
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
  onStitchTypeChange: (newType: StitchType) => void
  onStitchCountChange: (newCount: string) => void
  onGroupStitchTypeChange: (newType: StitchType) => void
  onGroupStitchCountChange: (newCount: string) => void
  onGroupNameChange: (newName: string) => void
  onGroupRepeatCountChange: (newCount: string) => void
  onSaveAsTemplate: (group: StitchGroup) => void
  onCancelEdit: () => void
  onDragStart: (e: React.DragEvent, index: number, roundNumber: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number, roundNumber: number) => void
}

export default function RoundCard({
  round,
  editingRound,
  editingStitch,
  editingGroup,
  editingGroupStitch,
  editStitchType,
  editStitchCount,
  editGroupStitchType,
  editGroupStitchCount,
  editGroupName,
  editGroupRepeatCount,
  onEditRound,
  onUpdateRoundNotes,
  onAddStitch,
  onAddGroup,
  onCopyRound,
  onDeleteRound,
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
}: RoundCardProps) {
  const sortedPatternItems = getSortedPatternItems(round)

  return (
    <div className="card" data-round-card={round.roundNumber}>
      <div className="mb-4">
        {/* 手機版：兩行佈局 */}
        <div className="block sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-text-primary">
              第 {round.roundNumber} 圈
            </h3>
            <button
              onClick={() => onDeleteRound(round.roundNumber)}
              className="text-text-tertiary hover:text-red-500 transition-colors p-2"
            >
              <BsTrash className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 text-sm">
            <button
              onClick={() => onAddStitch(round.roundNumber)}
              className="btn btn-ghost p-2 h-auto flex flex-col items-center"
            >
              <span className="font-medium text-sm">新增針目</span>
            </button>
            <button
              onClick={() => onAddGroup(round.roundNumber)}
              className="btn btn-ghost p-2 h-auto flex flex-col items-center"
            >
              <span className="font-medium text-sm">新增群組</span>
            </button>
            <button
              onClick={() => onCopyRound(round.roundNumber)}
              className="btn btn-ghost p-2 h-auto flex flex-col items-center"
            >
              <span className="font-medium text-sm">複製圈數</span>
            </button>
          </div>
        </div>

        {/* 電腦版：原本佈局 */}
        <div className="hidden sm:flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              第 {round.roundNumber} 圈
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddStitch(round.roundNumber)}
              className="btn btn-ghost text-sm"
            >
              新增針法
            </button>
            <button
              onClick={() => onAddGroup(round.roundNumber)}
              className="btn btn-ghost text-sm"
            >
              新增群組
            </button>
            <button
              onClick={() => onCopyRound(round.roundNumber)}
              className="btn btn-ghost text-sm"
            >
              複製圈數
            </button>
            <button
              onClick={() => onDeleteRound(round.roundNumber)}
              className="text-text-tertiary hover:text-red-500 transition-colors p-2"
            >
              <BsTrash className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 圈數備註 */}
      {editingRound?.id === round.id ? (
        <div className="mb-4">
          <input
            type="text"
            defaultValue={round.notes || ''}
            className="input text-sm"
            placeholder="輸入備註..."
            onBlur={(e) => onUpdateRoundNotes(round, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateRoundNotes(round, e.currentTarget.value)
              }
              if (e.key === 'Escape') {
                onCancelEdit()
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <div className="mb-4">
          {round.notes ? (
            <div 
              className="text-sm text-text-secondary cursor-pointer hover:text-text-primary"
              onClick={() => onEditRound(round)}
            >
              備註：{round.notes}
            </div>
          ) : (
            <div 
              className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary"
              onClick={() => onEditRound(round)}
            >
              點擊新增備註...
            </div>
          )}
        </div>
      )}

      {/* 織圖內容 - 按照新增順序顯示針法和群組 */}
      {sortedPatternItems.length > 0 && (
        <div className="mb-4">
          <div className="space-y-2">
            {sortedPatternItems.map((patternItem, index) => (
              <PatternItemDisplay
                key={patternItem.id}
                patternItem={patternItem}
                roundNumber={round.roundNumber}
                index={index}
                editingStitch={editingStitch}
                editingGroup={editingGroup}
                editingGroupStitch={editingGroupStitch}
                editStitchType={editStitchType}
                editStitchCount={editStitchCount}
                editGroupStitchType={editGroupStitchType}
                editGroupStitchCount={editGroupStitchCount}
                editGroupName={editGroupName}
                editGroupRepeatCount={editGroupRepeatCount}
                onEditStitch={onEditStitch}
                onUpdateStitch={onUpdateStitch}
                onDeleteStitch={onDeleteStitch}
                onEditGroup={onEditGroup}
                onUpdateGroup={onUpdateGroup}
                onDeleteGroup={onDeleteGroup}
                onEditGroupStitch={onEditGroupStitch}
                onUpdateGroupStitch={onUpdateGroupStitch}
                onDeleteGroupStitch={onDeleteGroupStitch}
                onAddStitchToGroup={onAddStitchToGroup}
                onSaveAsTemplate={onSaveAsTemplate}
                onCancelEdit={onCancelEdit}
                onStitchTypeChange={onStitchTypeChange}
                onStitchCountChange={onStitchCountChange}
                onGroupStitchTypeChange={onGroupStitchTypeChange}
                onGroupStitchCountChange={onGroupStitchCountChange}
                onGroupNameChange={onGroupNameChange}
                onGroupRepeatCountChange={onGroupRepeatCountChange}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
            ))}
          </div>
          <div className="mb-4 mt-4">
            <div className="text-sm text-text-primary">
              共 {getRoundTotalStitches(round)} 針
            </div>
          </div>
        </div>
      )}

      {/* 舊版針法顯示 (保留作為備用) */}
      {sortedPatternItems.length === 0 && round.stitches.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-text-secondary mb-2">
            舊格式針法 (建議升級到新格式)
          </div>
          <div className="text-sm text-text-primary">
            共 {getRoundTotalStitches(round)} 針
          </div>
        </div>
      )}

      {/* 舊版針目群組顯示 (保留作為備用) */}
      {sortedPatternItems.length === 0 && round.stitchGroups.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-text-secondary mb-2">
            舊格式群組 (建議升級到新格式)
          </div>
          <div className="text-sm text-text-primary">
            共 {getRoundTotalStitches(round)} 針
          </div>
        </div>
      )}
    </div>
  )
}