import { useState } from 'react'
import { Round, StitchGroup } from '../types'

interface StitchModalState {
  roundNumber: number
  mode: 'add' | 'edit'
  stitchId?: string
}

interface EditNewGroupStitchModalState {
  stitchId: string
}

interface GroupStitchModalState {
  show: boolean
}

interface EditGroupStitchModalState {
  roundNumber: number
  groupId: string
}

interface TemplateModalState {
  mode: 'save' | 'select'
  group?: StitchGroup
  roundNumber?: number
}

interface CopyRoundModalState {
  sourceRound: Round
}

interface AddGroupModalState {
  roundNumber: number
}

export function useModalStates() {
  // 各種模態視窗狀態
  const [showAddRoundForm, setShowAddRoundForm] = useState(false)
  const [showStitchModal, setShowStitchModal] = useState<StitchModalState | null>(null)
  const [showGroupStitchModal, setShowGroupStitchModal] = useState(false)
  const [showEditNewGroupStitchModal, setShowEditNewGroupStitchModal] = useState<EditNewGroupStitchModalState | null>(null)
  const [showEditGroupStitchModal, setShowEditGroupStitchModal] = useState<EditGroupStitchModalState | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState<TemplateModalState | null>(null)
  const [showCopyRoundModal, setShowCopyRoundModal] = useState<CopyRoundModalState | null>(null)
  const [showAddGroupModal, setShowAddGroupModal] = useState<AddGroupModalState | null>(null)
  const [showEditChartModal, setShowEditChartModal] = useState(false)

  // 關閉所有模態視窗的便利函數
  const closeAllModals = () => {
    setShowAddRoundForm(false)
    setShowStitchModal(null)
    setShowGroupStitchModal(false)
    setShowEditNewGroupStitchModal(null)
    setShowEditGroupStitchModal(null)
    setShowTemplateModal(null)
    setShowCopyRoundModal(null)
    setShowAddGroupModal(null)
    setShowEditChartModal(false)
  }

  return {
    // 狀態
    showAddRoundForm,
    showStitchModal,
    showGroupStitchModal,
    showEditNewGroupStitchModal,
    showEditGroupStitchModal,
    showTemplateModal,
    showCopyRoundModal,
    showAddGroupModal,
    showEditChartModal,
    
    // Setters
    setShowAddRoundForm,
    setShowStitchModal,
    setShowGroupStitchModal,
    setShowEditNewGroupStitchModal,
    setShowEditGroupStitchModal,
    setShowTemplateModal,
    setShowCopyRoundModal,
    setShowAddGroupModal,
    setShowEditChartModal,
    
    // 便利函數
    closeAllModals
  }
}