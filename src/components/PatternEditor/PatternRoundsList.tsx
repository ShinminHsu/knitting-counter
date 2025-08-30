import { Round, Project, StitchType, StitchInfo, StitchGroup, Chart } from '../../types'
import { FiEdit3 } from "react-icons/fi"
import RoundCard from './RoundCard'

interface PatternRoundsListProps {
  chartPattern: Round[]
  currentProject: Project
  currentChart: Chart | null
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
  onEditRound: (round: Round | null) => void
  onUpdateRoundNotes: (round: Round, notes: string) => Promise<void>
  onAddStitch: (roundNumber: number) => void
  onAddGroup: (roundNumber: number) => void
  onCopyRound: (roundNumber: number) => void
  onDeleteRound: (roundNumber: number) => Promise<void>
  onEditStitch: (roundNumber: number, stitch: StitchInfo) => void
  onUpdateStitch: () => Promise<void>
  onDeleteStitch: (roundNumber: number, stitchId: string) => Promise<void>
  onEditGroup: (roundNumber: number, group: StitchGroup) => void
  onUpdateGroup: (roundNumber: number, groupId: string) => Promise<void>
  onDeleteGroup: (roundNumber: number, groupId: string) => Promise<void>
  onEditGroupStitch: (roundNumber: number, groupId: string, stitch: StitchInfo) => void
  onUpdateGroupStitch: () => Promise<void>
  onDeleteGroupStitch: (roundNumber: number, groupId: string, stitchId: string) => Promise<void>
  onAddStitchToGroup: (roundNumber: number, groupId: string) => void
  onSaveAsTemplate: (group: StitchGroup) => void
  onStitchTypeChange: (newType: StitchType) => void
  onStitchCountChange: (newCount: string) => void
  onGroupStitchTypeChange: (newType: StitchType) => void
  onGroupStitchCountChange: (newCount: string) => void
  onGroupNameChange: (newName: string) => void
  onGroupRepeatCountChange: (newCount: string) => void
  onCancelEdit: () => void
  onMoveUp: (index: number, roundNumber: number) => void
  onMoveDown: (index: number, roundNumber: number) => void
  onMoveGroupStitchUp: (roundNumber: number, groupId: string, stitchIndex: number) => void
  onMoveGroupStitchDown: (roundNumber: number, groupId: string, stitchIndex: number) => void
  onMoveRoundUp: (roundNumber: number) => void
  onMoveRoundDown: (roundNumber: number) => void
  onAddRoundClick: () => void
}

export default function PatternRoundsList({
  chartPattern,
  currentProject,
  currentChart,
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
  onStitchTypeChange,
  onStitchCountChange,
  onGroupStitchTypeChange,
  onGroupStitchCountChange,
  onGroupNameChange,
  onGroupRepeatCountChange,
  onCancelEdit,
  onMoveUp,
  onMoveDown,
  onMoveGroupStitchUp,
  onMoveGroupStitchDown,
  onMoveRoundUp,
  onMoveRoundDown,
  onAddRoundClick
}: PatternRoundsListProps) {
  if (chartPattern.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="mb-4 flex justify-center">
          <FiEdit3 className="w-8 h-8 text-text-tertiary" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          還沒有織圖圈數
        </h3>
        <p className="text-text-secondary mb-6">
          開始建立你的第一個圈數
        </p>
        <button
          onClick={onAddRoundClick}
          className="btn btn-primary"
        >
          新增第一圈
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {chartPattern
        .sort((a: Round, b: Round) => a.roundNumber - b.roundNumber)
        .map((round) => (
          <RoundCard
            key={round.id}
            round={round}
            currentProject={currentProject}
            currentChart={currentChart}
            chartPattern={chartPattern}
            editingRound={editingRound}
            editingStitch={editingStitch}
            editingGroup={editingGroup}
            editingGroupStitch={editingGroupStitch}
            editStitchType={editStitchType}
            editStitchCount={editStitchCount}
            editGroupStitchType={editGroupStitchType}
            editGroupStitchCount={editGroupStitchCount}
            editGroupName={editGroupName}
            editGroupRepeatCount={editGroupRepeatCount}
            onEditRound={onEditRound}
            onUpdateRoundNotes={onUpdateRoundNotes}
            onAddStitch={onAddStitch}
            onAddGroup={onAddGroup}
            onCopyRound={onCopyRound}
            onDeleteRound={onDeleteRound}
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
            onStitchTypeChange={onStitchTypeChange}
            onStitchCountChange={onStitchCountChange}
            onGroupStitchTypeChange={onGroupStitchTypeChange}
            onGroupStitchCountChange={onGroupStitchCountChange}
            onGroupNameChange={onGroupNameChange}
            onGroupRepeatCountChange={onGroupRepeatCountChange}
            onCancelEdit={onCancelEdit}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onMoveGroupStitchUp={onMoveGroupStitchUp}
            onMoveGroupStitchDown={onMoveGroupStitchDown}
            onMoveRoundUp={onMoveRoundUp}
            onMoveRoundDown={onMoveRoundDown}
          />
        ))}
    </div>
  )
}