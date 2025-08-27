import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiEdit3 } from "react-icons/fi"
import { BsHouse, BsTrash } from 'react-icons/bs'
import { VscEdit } from 'react-icons/vsc'
import { useSyncedAppStore } from '../store/syncedAppStore'
import { useModalStates } from '../hooks/useModalStates'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import SyncStatusIndicator from './SyncStatusIndicator'
import PatternPreview from './PatternEditor/PatternPreview'
import AddRoundForm from './PatternEditor/AddRoundForm'
import RoundCard from './PatternEditor/RoundCard'
import StitchSelectionModal from './StitchSelectionModal'
import StitchGroupTemplateModal from './StitchGroupTemplateModal'
import CopyRoundModal from './CopyRoundModal'
import {
  generateId,
  getCurrentChart,
  getProjectPattern,
  isLegacyProject,
  getStitchDisplayInfo
} from '../utils'
import { Round, StitchInfo, StitchGroup, StitchType } from '../types'

export default function PatternEditorView() {
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const { 
    currentProject, 
    setCurrentProject, 
    projects, 
    addRound, 
    updateRound, 
    deleteRound,
    addStitchToRound,
    deleteStitchFromRound,
    deleteStitchGroupFromRound,
    updateChart,
    migrateCurrentProjectToMultiChart
  } = useSyncedAppStore()

  // Use extracted hooks
  const modalStates = useModalStates()
  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop()

  const [currentChart, setCurrentChart] = useState<any>(null)
  const [chartPattern, setChartPattern] = useState<Round[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Editing states (keeping these for now to maintain compatibility)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [editingStitch, setEditingStitch] = useState<{ roundNumber: number, stitchId: string } | null>(null)
  const [editingGroup, setEditingGroup] = useState<{ roundNumber: number, groupId: string } | null>(null)
  const [editingGroupStitch, setEditingGroupStitch] = useState<{ roundNumber: number, groupId: string, stitchId: string } | null>(null)
  
  // Form states
  const [newRoundNotes, setNewRoundNotes] = useState('')
  const [editStitchType, setEditStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [editStitchCount, setEditStitchCount] = useState<string>('1')
  const [editGroupStitchType, setEditGroupStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [editGroupStitchCount, setEditGroupStitchCount] = useState<string>('1')
  const [editGroupName, setEditGroupName] = useState<string>('')
  const [editGroupRepeatCount, setEditGroupRepeatCount] = useState<string>('1')

  // New group creation states (restored from original implementation)
  const [newGroupStitches, setNewGroupStitches] = useState<StitchInfo[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRepeatCount, setNewGroupRepeatCount] = useState<number | string>(1)
  const [showAddGroupModal, setShowAddGroupModal] = useState<{ roundNumber: number } | null>(null)
  const [showEditNewGroupStitchModal, setShowEditNewGroupStitchModal] = useState<{ stitchId: string } | null>(null)

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(projectId)
        
        if (isLegacyProject(project)) {
          console.log('Migrating legacy project to multi-chart format')
          migrateCurrentProjectToMultiChart()
        }
      } else {
        navigate('/404')
      }
    }
  }, [projectId, projects, navigate, setCurrentProject, migrateCurrentProjectToMultiChart])

  useEffect(() => {
    if (!currentProject) return

    const chartId = searchParams.get('chartId')
    let targetChart = null

    if (chartId && currentProject.charts) {
      targetChart = currentProject.charts.find(c => c.id === chartId)
      if (!targetChart) {
        targetChart = getCurrentChart(currentProject)
      }
    } else {
      targetChart = getCurrentChart(currentProject)
    }

    if (targetChart) {
      setCurrentChart(targetChart)
      setChartPattern(targetChart.rounds || [])
    } else {
      setCurrentChart(null)
      setChartPattern(getProjectPattern(currentProject))
    }
  }, [currentProject, searchParams])

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">載入中...</p>
        </div>
      </div>
    )
  }

  const handleAddRound = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const roundNumbers = chartPattern?.map(r => r.roundNumber) || []
      const nextRoundNumber = Math.max(0, ...roundNumbers) + 1
      
      const newRound: Round = {
        id: generateId(),
        roundNumber: nextRoundNumber,
        stitches: [],
        stitchGroups: [],
        notes: newRoundNotes.trim() || undefined
      }

      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: [...currentChart.rounds, newRound],
          lastModified: new Date()
        }
        await updateChart(updatedChart)
      } else {
        await addRound(newRound)
      }
      
      setNewRoundNotes('')
      modalStates.setShowAddRoundForm(false)
    } catch (error) {
      console.error('Error adding round:', error)
      alert('新增圈數時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRound = async (roundNumber: number) => {
    if (confirm(`確定要刪除第 ${roundNumber} 圈嗎？`)) {
      if (currentChart) {
        const updatedRounds = currentChart.rounds
          .filter((r: Round) => r.roundNumber !== roundNumber)
          .map((r: Round) => ({
            ...r,
            roundNumber: r.roundNumber > roundNumber ? r.roundNumber - 1 : r.roundNumber
          }))
          .sort((a: Round, b: Round) => a.roundNumber - b.roundNumber)
        
        const updatedChart = {
          ...currentChart,
          rounds: updatedRounds,
          lastModified: new Date()
        }
        await updateChart(updatedChart)
      } else {
        await deleteRound(roundNumber)
      }
    }
  }

  const handleStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (isLoading || !modalStates.showStitchModal) return
    
    setIsLoading(true)
    
    try {
      const newStitch: StitchInfo = {
        id: generateId(),
        type: stitchType,
        yarnId: yarnId || currentProject.yarns[0]?.id || '',
        count: count,
        ...(stitchType === StitchType.CUSTOM && {
          customName,
          customSymbol
        })
      }

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === modalStates.showStitchModal!.roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitches: [...targetRound.stitches, newStitch]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === modalStates.showStitchModal!.roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        await addStitchToRound(modalStates.showStitchModal.roundNumber, newStitch)
      }
      
      modalStates.setShowStitchModal(null)
    } catch (error) {
      console.error('Error adding stitch:', error)
      alert('新增針法時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGroupStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (isLoading || !modalStates.showEditGroupStitchModal) return
    
    setIsLoading(true)
    
    try {
      const newStitch: StitchInfo = {
        id: generateId(),
        type: stitchType,
        yarnId: yarnId || currentProject.yarns[0]?.id || '',
        count: count,
        ...(stitchType === StitchType.CUSTOM && {
          customName,
          customSymbol
        })
      }

      const { roundNumber, groupId } = modalStates.showEditGroupStitchModal

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
              g.id === groupId
                ? { ...g, stitches: [...g.stitches, newStitch] }
                : g
            )
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        // Handle legacy project structure
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
              g.id === groupId
                ? { ...g, stitches: [...g.stitches, newStitch] }
                : g
            )
          }
          await updateRound(updatedRound)
        }
      }
      
      modalStates.setShowEditGroupStitchModal(null)
    } catch (error) {
      console.error('Error adding group stitch:', error)
      alert('新增群組針法時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyRound = (roundNumber: number) => {
    if (!currentChart) return
    
    const sourceRound = chartPattern.find(r => r.roundNumber === roundNumber)
    if (sourceRound) {
      modalStates.setShowCopyRoundModal({ sourceRound })
    }
  }

  const handleCopyRoundConfirm = async (targetRoundNumber: number, insertPosition: 'before' | 'after') => {
    if (!modalStates.showCopyRoundModal?.sourceRound || !currentChart) return

    const sourceRound = modalStates.showCopyRoundModal.sourceRound
    let insertAfterRoundNumber: number
    
    if (insertPosition === 'before') {
      insertAfterRoundNumber = targetRoundNumber - 1
    } else {
      insertAfterRoundNumber = targetRoundNumber
    }

    const updatedRounds = currentChart.rounds.map((round: Round) => {
      if (round.roundNumber > insertAfterRoundNumber) {
        return {
          ...round,
          roundNumber: round.roundNumber + 1
        }
      }
      return round
    })

    const newRoundNumber = insertAfterRoundNumber + 1
    const newRound: Round = {
      id: generateId(),
      roundNumber: newRoundNumber,
      stitches: sourceRound.stitches.map(stitch => ({
        ...stitch,
        id: generateId()
      })),
      stitchGroups: sourceRound.stitchGroups.map(group => ({
        ...group,
        id: generateId(),
        stitches: group.stitches.map(stitch => ({
          ...stitch,
          id: generateId()
        }))
      })),
      notes: sourceRound.notes
    }

    const finalRounds = [...updatedRounds, newRound].sort((a, b) => a.roundNumber - b.roundNumber)
    const updatedChart = {
      ...currentChart,
      rounds: finalRounds,
      lastModified: new Date()
    }

    await updateChart(updatedChart)
    modalStates.setShowCopyRoundModal(null)
  }

  const handleSelectTemplate = async (template: any) => {
    console.log('🪲 DEBUG: handleSelectTemplate called', { template, customModalState: showAddGroupModal, oldModalState: modalStates.showAddGroupModal })
    
    // Check if we're in custom group creation mode
    if (showAddGroupModal) {
      // Load template into the new group creation form
      handleTemplateSelectInGroupCreation(template)
      return
    }
    
    // Legacy template selection (direct group creation)
    if (!modalStates.showAddGroupModal || !currentProject) return

    const roundNumber = modalStates.showAddGroupModal.roundNumber
    
    // Create a new group from the template
    const newGroup = {
      id: generateId(),
      name: template.name,
      stitches: template.stitches.map((stitch: any) => ({
        ...stitch,
        id: generateId()
      })),
      repeatCount: template.repeatCount || 1
    }

    console.log('🪲 DEBUG: New group created', { newGroup, roundNumber })

    try {
      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        // Handle legacy project structure if needed
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          await updateRound(updatedRound)
        }
      }
      modalStates.setShowAddGroupModal(null)
      console.log('🪲 DEBUG: Group added successfully, modal closed')
    } catch (error) {
      console.error('Error adding group:', error)
      alert('新增群組時發生錯誤')
    }
  }

  // Custom group creation handlers (restored from original implementation)
  const handleAddGroup = async () => {
    if (!showAddGroupModal) return
    
    const { roundNumber } = showAddGroupModal
    const trimmedName = newGroupName.trim() || '針目群組'
    const repeatCount = typeof newGroupRepeatCount === 'number' ? newGroupRepeatCount : parseInt(String(newGroupRepeatCount)) || 1
    
    if (newGroupStitches.length === 0) {
      alert('請至少新增一個針法到群組中')
      return
    }

    try {
      const newGroup: StitchGroup = {
        id: generateId(),
        name: trimmedName,
        stitches: newGroupStitches.map(stitch => ({
          ...stitch,
          id: generateId()
        })),
        repeatCount
      }

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          await updateRound(updatedRound)
        }
      }

      // Reset form
      setNewGroupName('')
      setNewGroupRepeatCount(1)
      setNewGroupStitches([])
      setShowAddGroupModal(null)
      
    } catch (error) {
      console.error('Error adding group:', error)
      alert('新增群組時發生錯誤')
    }
  }

  const handleRemoveStitchFromGroup = (stitchId: string) => {
    setNewGroupStitches(prevStitches => prevStitches.filter(s => s.id !== stitchId))
  }

  const handleEditNewGroupStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!showEditNewGroupStitchModal) return
    
    const { stitchId } = showEditNewGroupStitchModal
    
    setNewGroupStitches(prevStitches =>
      prevStitches.map(stitch =>
        stitch.id === stitchId
          ? {
              ...stitch,
              type: stitchType,
              count,
              yarnId: yarnId || currentProject?.yarns[0]?.id || '',
              ...(stitchType === StitchType.CUSTOM && { customName, customSymbol })
            }
          : stitch
      )
    )
    
    setShowEditNewGroupStitchModal(null)
  }

  const handleAddStitchToNewGroup = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    const newStitch: StitchInfo = {
      id: generateId(),
      type: stitchType,
      yarnId: yarnId || currentProject?.yarns[0]?.id || '',
      count: count,
      ...(stitchType === StitchType.CUSTOM && {
        customName,
        customSymbol
      })
    }

    setNewGroupStitches(prevStitches => [...prevStitches, newStitch])
    modalStates.setShowGroupStitchModal(false)
  }

  const handleSelectFromTemplate = (roundNumber: number) => {
    modalStates.setShowTemplateModal({ mode: 'select', roundNumber })
  }

  const handleTemplateSelectInGroupCreation = (template: any) => {
    // Load template into the new group creation form
    if (newGroupStitches.length === 0) {
      setNewGroupName(template.name)
    }
    
    setNewGroupRepeatCount(1)
    
    // Append template stitches to existing ones
    const templateStitches = template.stitches.map((stitch: any) => ({
      ...stitch,
      id: generateId()
    }))
    
    setNewGroupStitches(prevStitches => [...prevStitches, ...templateStitches])
    modalStates.setShowTemplateModal(null)
  }

  // Update functions for editing states
  const handleStitchTypeChange = (newType: StitchType) => setEditStitchType(newType)
  const handleStitchCountChange = (newCount: string) => setEditStitchCount(newCount)
  const handleGroupStitchTypeChange = (newType: StitchType) => setEditGroupStitchType(newType)
  const handleGroupStitchCountChange = (newCount: string) => setEditGroupStitchCount(newCount)
  const handleGroupNameChange = (newName: string) => setEditGroupName(newName)
  const handleGroupRepeatCountChange = (newCount: string) => setEditGroupRepeatCount(newCount)

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* Header */}
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
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-semibold text-text-primary">織圖編輯</h1>
                {currentChart && (
                  <span className="text-xs sm:text-sm text-text-secondary">
                    {currentChart.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => modalStates.setShowAddRoundForm(true)}
                className="btn btn-primary text-sm"
                disabled={isLoading}
              >
                {isLoading ? '處理中...' : '新增圈數'}
              </button>
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Pattern Preview - using extracted component */}
        <PatternPreview 
          currentChart={currentChart}
          chartPattern={chartPattern}
          currentProject={currentProject}
          onAddRound={() => modalStates.setShowAddRoundForm(true)}
          onEditChart={() => modalStates.setShowEditChartModal(true)}
        />

        {/* Round List */}
        {chartPattern.length === 0 ? (
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
              onClick={() => modalStates.setShowAddRoundForm(true)}
              className="btn btn-primary"
            >
              新增第一圈
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {chartPattern
              .sort((a: Round, b: Round) => a.roundNumber - b.roundNumber)
              .map((round) => (
                <RoundCard
                  key={round.id}
                  round={round}
                  currentProject={currentProject}
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
                  onEditRound={setEditingRound}
                  onUpdateRoundNotes={async (round, notes) => {
                    const updatedRound = { ...round, notes: notes.trim() || undefined }
                    if (currentChart) {
                      const updatedChart = {
                        ...currentChart,
                        rounds: currentChart.rounds.map((r: Round) =>
                          r.id === round.id ? updatedRound : r
                        ),
                        lastModified: new Date()
                      }
                      await updateChart(updatedChart)
                    } else {
                      await updateRound(updatedRound)
                    }
                    setEditingRound(null)
                  }}
                  onAddStitch={(roundNumber) => modalStates.setShowStitchModal({ roundNumber, mode: 'add' })}
                  onAddGroup={(roundNumber) => setShowAddGroupModal({ roundNumber })}
                  onCopyRound={handleCopyRound}
                  onDeleteRound={handleDeleteRound}
                  onEditStitch={(roundNumber, stitch) => {
                    setEditingStitch({ roundNumber, stitchId: stitch.id })
                    setEditStitchType(stitch.type)
                    setEditStitchCount(String(stitch.count))
                  }}
                  onUpdateStitch={async () => {
                    if (!editingStitch) return
                    
                    const { roundNumber, stitchId } = editingStitch
                    const count = parseInt(editStitchCount) || 1
                    
                    try {
                      if (currentChart) {
                        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitches: targetRound.stitches.map((s: StitchInfo) =>
                              s.id === stitchId
                                ? { ...s, type: editStitchType, count }
                                : s
                            )
                          }
                          const updatedChart = {
                            ...currentChart,
                            rounds: currentChart.rounds.map((r: Round) =>
                              r.roundNumber === roundNumber ? updatedRound : r
                            ),
                            lastModified: new Date()
                          }
                          await updateChart(updatedChart)
                        }
                      } else {
                        // Handle legacy project structure
                        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitches: targetRound.stitches.map((s: StitchInfo) =>
                              s.id === stitchId
                                ? { ...s, type: editStitchType, count }
                                : s
                            )
                          }
                          await updateRound(updatedRound)
                        }
                      }
                    } catch (error) {
                      console.error('Error updating stitch:', error)
                      alert('更新針法時發生錯誤')
                    }
                    
                    setEditingStitch(null)
                  }}
                  onDeleteStitch={async (roundNumber, stitchId) => {
                    if (confirm('確定要刪除這個針法嗎？')) {
                      if (currentChart) {
                        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitches: targetRound.stitches.filter((s: StitchInfo) => s.id !== stitchId)
                          }
                          const updatedChart = {
                            ...currentChart,
                            rounds: currentChart.rounds.map((r: Round) => 
                              r.roundNumber === roundNumber ? updatedRound : r
                            ),
                            lastModified: new Date()
                          }
                          await updateChart(updatedChart)
                        }
                      } else {
                        await deleteStitchFromRound(roundNumber, stitchId)
                      }
                    }
                  }}
                  onEditGroup={(roundNumber, group) => {
                    setEditingGroup({ roundNumber, groupId: group.id })
                    setEditGroupName(group.name)
                    setEditGroupRepeatCount(String(group.repeatCount))
                  }}
                  onUpdateGroup={async (roundNumber, groupId) => {
                    if (!editingGroup) return
                    
                    const repeatCount = parseInt(editGroupRepeatCount) || 1
                    const trimmedName = editGroupName.trim()
                    
                    if (!trimmedName) {
                      alert('群組名稱不能為空')
                      return
                    }
                    
                    try {
                      if (currentChart) {
                        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                              g.id === groupId
                                ? { ...g, name: trimmedName, repeatCount }
                                : g
                            )
                          }
                          const updatedChart = {
                            ...currentChart,
                            rounds: currentChart.rounds.map((r: Round) =>
                              r.roundNumber === roundNumber ? updatedRound : r
                            ),
                            lastModified: new Date()
                          }
                          await updateChart(updatedChart)
                        }
                      } else {
                        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                              g.id === groupId
                                ? { ...g, name: trimmedName, repeatCount }
                                : g
                            )
                          }
                          await updateRound(updatedRound)
                        }
                      }
                    } catch (error) {
                      console.error('Error updating group:', error)
                      alert('更新群組時發生錯誤')
                    }
                    
                    setEditingGroup(null)
                  }}
                  onDeleteGroup={async (roundNumber, groupId) => {
                    if (confirm('確定要刪除這個針目群組嗎？')) {
                      if (currentChart) {
                        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.filter((g: StitchGroup) => g.id !== groupId)
                          }
                          const updatedChart = {
                            ...currentChart,
                            rounds: currentChart.rounds.map((r: Round) => 
                              r.roundNumber === roundNumber ? updatedRound : r
                            ),
                            lastModified: new Date()
                          }
                          await updateChart(updatedChart)
                        }
                      } else {
                        await deleteStitchGroupFromRound(roundNumber, groupId)
                      }
                    }
                  }}
                  onEditGroupStitch={(roundNumber, groupId, stitch) => {
                    setEditingGroupStitch({ roundNumber, groupId, stitchId: stitch.id })
                    setEditGroupStitchType(stitch.type)
                    setEditGroupStitchCount(String(stitch.count))
                  }}
                  onUpdateGroupStitch={async () => {
                    if (!editingGroupStitch) return
                    
                    const { roundNumber, groupId, stitchId } = editingGroupStitch
                    const count = parseInt(editGroupStitchCount) || 1
                    
                    try {
                      if (currentChart) {
                        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                              g.id === groupId
                                ? {
                                    ...g,
                                    stitches: g.stitches.map((s: StitchInfo) =>
                                      s.id === stitchId
                                        ? { ...s, type: editGroupStitchType, count }
                                        : s
                                    )
                                  }
                                : g
                            )
                          }
                          const updatedChart = {
                            ...currentChart,
                            rounds: currentChart.rounds.map((r: Round) =>
                              r.roundNumber === roundNumber ? updatedRound : r
                            ),
                            lastModified: new Date()
                          }
                          await updateChart(updatedChart)
                        }
                      } else {
                        // Handle legacy project structure
                        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                              g.id === groupId
                                ? {
                                    ...g,
                                    stitches: g.stitches.map((s: StitchInfo) =>
                                      s.id === stitchId
                                        ? { ...s, type: editGroupStitchType, count }
                                        : s
                                    )
                                  }
                                : g
                            )
                          }
                          await updateRound(updatedRound)
                        }
                      }
                    } catch (error) {
                      console.error('Error updating group stitch:', error)
                      alert('更新群組針法時發生錯誤')
                    }
                    
                    setEditingGroupStitch(null)
                  }}
                  onDeleteGroupStitch={async (roundNumber: number, groupId: string, stitchId: string) => {
                    if (!confirm('確定要刪除這個針法嗎？')) return
                    
                    try {
                      if (currentChart) {
                        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                              g.id === groupId
                                ? {
                                    ...g,
                                    stitches: g.stitches.filter((s: StitchInfo) => s.id !== stitchId)
                                  }
                                : g
                            )
                          }
                          const updatedChart = {
                            ...currentChart,
                            rounds: currentChart.rounds.map((r: Round) =>
                              r.roundNumber === roundNumber ? updatedRound : r
                            ),
                            lastModified: new Date()
                          }
                          await updateChart(updatedChart)
                        }
                      } else {
                        // Handle legacy project structure
                        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
                        if (targetRound) {
                          const updatedRound = {
                            ...targetRound,
                            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                              g.id === groupId
                                ? {
                                    ...g,
                                    stitches: g.stitches.filter((s: StitchInfo) => s.id !== stitchId)
                                  }
                                : g
                            )
                          }
                          await updateRound(updatedRound)
                        }
                      }
                    } catch (error) {
                      console.error('Error deleting group stitch:', error)
                      alert('刪除群組針法時發生錯誤')
                    }
                  }}
                  onAddStitchToGroup={(roundNumber, groupId) => {
                    modalStates.setShowEditGroupStitchModal({ roundNumber, groupId })
                  }}
                  onSaveAsTemplate={(group) => {
                    modalStates.setShowTemplateModal({ mode: 'save', group })
                  }}
                  onStitchTypeChange={handleStitchTypeChange}
                  onStitchCountChange={handleStitchCountChange}
                  onGroupStitchTypeChange={handleGroupStitchTypeChange}
                  onGroupStitchCountChange={handleGroupStitchCountChange}
                  onGroupNameChange={handleGroupNameChange}
                  onGroupRepeatCountChange={handleGroupRepeatCountChange}
                  onCancelEdit={() => {
                    setEditingRound(null)
                    setEditingStitch(null)
                    setEditingGroup(null)
                    setEditingGroupStitch(null)
                  }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
          </div>
        )}
      </div>

      {/* AddRoundForm Modal - using extracted component */}
      <AddRoundForm
        isOpen={modalStates.showAddRoundForm}
        isLoading={isLoading}
        newRoundNotes={newRoundNotes}
        onNotesChange={setNewRoundNotes}
        onCancel={() => modalStates.setShowAddRoundForm(false)}
        onConfirm={handleAddRound}
      />

      {/* Stitch Selection Modal */}
      <StitchSelectionModal
        isOpen={modalStates.showStitchModal !== null}
        onClose={() => modalStates.setShowStitchModal(null)}
        onConfirm={handleStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="新增針法"
      />

      {/* Group Stitch Selection Modal */}
      <StitchSelectionModal
        isOpen={modalStates.showEditGroupStitchModal !== null}
        onClose={() => modalStates.setShowEditGroupStitchModal(null)}
        onConfirm={handleGroupStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="新增群組針法"
      />

      {/* Copy Round Modal */}
      <CopyRoundModal
        isOpen={modalStates.showCopyRoundModal !== null}
        onClose={() => modalStates.setShowCopyRoundModal(null)}
        onConfirm={handleCopyRoundConfirm}
        sourceRound={modalStates.showCopyRoundModal?.sourceRound || null}
        allRounds={chartPattern}
      />

      {/* Stitch Group Template Modal for adding groups */}
      <StitchGroupTemplateModal
        isOpen={modalStates.showAddGroupModal !== null}
        onClose={() => modalStates.setShowAddGroupModal(null)}
        onSelectTemplate={handleSelectTemplate}
        mode="select"
        title="選擇群組範本"
      />

      {/* Template Modal for saving/managing templates */}
      <StitchGroupTemplateModal
        isOpen={modalStates.showTemplateModal !== null}
        onClose={() => modalStates.setShowTemplateModal(null)}
        onSelectTemplate={handleSelectTemplate}
        groupToSave={modalStates.showTemplateModal?.group}
        mode={modalStates.showTemplateModal?.mode || 'select'}
        title={modalStates.showTemplateModal?.mode === 'save' ? '存為範本' : '選擇範本'}
      />

      {/* New Group Stitch Selection Modal */}
      <StitchSelectionModal
        isOpen={modalStates.showGroupStitchModal}
        onClose={() => modalStates.setShowGroupStitchModal(false)}
        onConfirm={handleAddStitchToNewGroup}
        availableYarns={currentProject?.yarns || []}
        title="新增針法到群組"
      />

      {/* Edit New Group Stitch Modal */}
      <StitchSelectionModal
        isOpen={showEditNewGroupStitchModal !== null}
        onClose={() => setShowEditNewGroupStitchModal(null)}
        onConfirm={handleEditNewGroupStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="編輯群組針法"
      />

      {/* Custom Group Creation Modal */}
      {showAddGroupModal && (
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
                          onClick={() => setShowEditNewGroupStitchModal({ stitchId: stitch.id })}
                          className="text-text-tertiary hover:text-primary transition-colors p-1 w-8 h-8 flex items-center justify-center"
                        >
                          <VscEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveStitchFromGroup(stitch.id)}
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
                  onClick={() => modalStates.setShowGroupStitchModal(true)}
                  className="btn btn-secondary text-sm"
                >
                  新增針法
                </button>
                <button
                  onClick={() => showAddGroupModal && handleSelectFromTemplate(showAddGroupModal.roundNumber)}
                  className="btn btn-secondary text-sm"
                >
                  從範本複製
                </button>
                <button
                  onClick={() => {
                    if (newGroupStitches.length > 0) {
                      const tempGroup = {
                        id: 'temp',
                        name: newGroupName || '針目群組',
                        stitches: newGroupStitches,
                        repeatCount: typeof newGroupRepeatCount === 'number' ? newGroupRepeatCount : parseInt(String(newGroupRepeatCount)) || 1
                      }
                      modalStates.setShowTemplateModal({ mode: 'save', group: tempGroup })
                    }
                  }}
                  className="btn btn-secondary text-sm"
                  disabled={newGroupStitches.length === 0}
                >
                  存成範本
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddGroupModal(null)
                  setNewGroupStitches([])
                  setNewGroupName('')
                  setNewGroupRepeatCount(1)
                }}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAddGroup}
                className="btn btn-primary flex-1"
                disabled={newGroupStitches.length === 0}
              >
                新增群組
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}