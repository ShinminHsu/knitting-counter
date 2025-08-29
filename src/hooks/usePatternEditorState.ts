import { useState } from 'react'
import { StitchType, StitchInfo, Round } from '../types'

// Types for the hook
interface NewGroupState {
  roundNumber: number
}

interface EditNewGroupStitchState {
  stitchId: string
}

export function usePatternEditorState() {
  // Editing states
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [editingStitch, setEditingStitch] = useState<{ roundNumber: number, stitchId: string } | null>(null)
  const [editingGroup, setEditingGroup] = useState<{ roundNumber: number, groupId: string } | null>(null)
  const [editingGroupStitch, setEditingGroupStitch] = useState<{ roundNumber: number, groupId: string, stitchId: string } | null>(null)
  
  // Form states for editing
  const [newRoundNotes, setNewRoundNotes] = useState('')
  const [editStitchType, setEditStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [editStitchCount, setEditStitchCount] = useState<string>('1')
  const [editGroupStitchType, setEditGroupStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [editGroupStitchCount, setEditGroupStitchCount] = useState<string>('1')
  const [editGroupName, setEditGroupName] = useState<string>('')
  const [editGroupRepeatCount, setEditGroupRepeatCount] = useState<string>('1')

  // New group creation states
  const [newGroupStitches, setNewGroupStitches] = useState<StitchInfo[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRepeatCount, setNewGroupRepeatCount] = useState<number | string>(1)
  const [showAddGroupModal, setShowAddGroupModal] = useState<NewGroupState | null>(null)
  const [showEditNewGroupStitchModal, setShowEditNewGroupStitchModal] = useState<EditNewGroupStitchState | null>(null)

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Helper functions for form state updates
  const handleStitchTypeChange = (newType: StitchType) => setEditStitchType(newType)
  const handleStitchCountChange = (newCount: string) => setEditStitchCount(newCount)
  const handleGroupStitchTypeChange = (newType: StitchType) => setEditGroupStitchType(newType)
  const handleGroupStitchCountChange = (newCount: string) => setEditGroupStitchCount(newCount)
  const handleGroupNameChange = (newName: string) => setEditGroupName(newName)
  const handleGroupRepeatCountChange = (newCount: string) => setEditGroupRepeatCount(newCount)

  // Reset functions
  const resetEditingStates = () => {
    setEditingRound(null)
    setEditingStitch(null)
    setEditingGroup(null)
    setEditingGroupStitch(null)
  }

  const resetNewGroupForm = () => {
    setNewGroupName('')
    setNewGroupRepeatCount(1)
    setNewGroupStitches([])
    setShowAddGroupModal(null)
  }

  const handleRemoveStitchFromGroup = (stitchId: string) => {
    setNewGroupStitches(prevStitches => prevStitches.filter(s => s.id !== stitchId))
  }

  return {
    // Editing states
    editingRound,
    editingStitch,
    editingGroup,
    editingGroupStitch,
    setEditingRound,
    setEditingStitch,
    setEditingGroup,
    setEditingGroupStitch,

    // Form states
    newRoundNotes,
    editStitchType,
    editStitchCount,
    editGroupStitchType,
    editGroupStitchCount,
    editGroupName,
    editGroupRepeatCount,
    setNewRoundNotes,

    // New group creation states
    newGroupStitches,
    newGroupName,
    newGroupRepeatCount,
    showAddGroupModal,
    showEditNewGroupStitchModal,
    setNewGroupStitches,
    setNewGroupName,
    setNewGroupRepeatCount,
    setShowAddGroupModal,
    setShowEditNewGroupStitchModal,

    // Loading state
    isLoading,
    setIsLoading,

    // Helper functions
    handleStitchTypeChange,
    handleStitchCountChange,
    handleGroupStitchTypeChange,
    handleGroupStitchCountChange,
    handleGroupNameChange,
    handleGroupRepeatCountChange,
    resetEditingStates,
    resetNewGroupForm,
    handleRemoveStitchFromGroup
  }
}