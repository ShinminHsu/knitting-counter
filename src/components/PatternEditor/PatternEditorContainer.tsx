
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useChartStore } from '../../stores/useChartStore'
import { usePatternStore } from '../../stores/usePatternStore'
import { useModalStates } from '../../hooks/useModalStates'
import { usePatternEditorState } from '../../hooks/usePatternEditorState'
import { usePatternOperations } from '../../hooks/usePatternOperations'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'
import ChartSelectorHeader from '../ChartSelectorHeader'
import { Round, StitchType, StitchInfo, StitchGroup } from '../../types'
import {
  generateId,
  getCurrentChart,
  getProjectPattern
} from '../../utils'

// Components
import PatternEditorToolbar from './PatternEditorToolbar'
import PatternRoundsList from './PatternRoundsList'
import CustomGroupCreationModal from './CustomGroupCreationModal'
import PatternPreview from './PatternPreview'
import AddRoundForm from './AddRoundForm'
import StitchSelectionModal from '../StitchSelectionModal'
import StitchGroupTemplateModal from '../StitchGroupTemplateModal'
import CopyRoundModal from '../CopyRoundModal'

export default function PatternEditorContainer() {
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const {
    currentProject,
    setCurrentProjectById,
    projects
  } = useProjectStore()
  
  const {
    updateChart,
    getChartSummaries,
    setCurrentChart
  } = useChartStore()
  
  const {
    updateRound
  } = usePatternStore()

  // Use extracted hooks
  const modalStates = useModalStates()
  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop()
  const patternEditorState = usePatternEditorState()
  const patternOperations = usePatternOperations()

  const [currentChart, setCurrentChartLocal] = useState<any>(null)
  const [chartPattern, setChartPattern] = useState<Round[]>([])
  
  // Get chart summaries for selector
  const chartSummaries = getChartSummaries()
  const hasMultipleCharts = chartSummaries.length > 1

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProjectById(projectId)
        
        // 舊格式專案的自動遷移已在 store 層處理
      } else {
        navigate('/404')
      }
    }
  }, [projectId, projects, navigate, setCurrentProjectById])

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
      setCurrentChartLocal(targetChart)
      setChartPattern(targetChart.rounds || [])
    } else {
      setCurrentChartLocal(null)
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
    await patternOperations.handleAddRound(
      currentChart,
      chartPattern,
      patternEditorState.newRoundNotes,
      patternEditorState.isLoading,
      patternEditorState.setIsLoading
    )
    
    patternEditorState.setNewRoundNotes('')
    modalStates.setShowAddRoundForm(false)
  }

  const handleStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!modalStates.showStitchModal) return
    
    await patternOperations.handleStitchModalConfirm(
      stitchType,
      count,
      yarnId,
      customName,
      customSymbol,
      currentChart,
      modalStates.showStitchModal.roundNumber,
      patternEditorState.isLoading,
      patternEditorState.setIsLoading
    )
    
    modalStates.setShowStitchModal(null)
  }

  const handleGroupStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!modalStates.showEditGroupStitchModal) return
    
    const { roundNumber, groupId } = modalStates.showEditGroupStitchModal
    
    await patternOperations.handleGroupStitchModalConfirm(
      stitchType,
      count,
      yarnId,
      customName,
      customSymbol,
      currentChart,
      chartPattern,
      roundNumber,
      groupId,
      patternEditorState.isLoading,
      patternEditorState.setIsLoading
    )
    
    modalStates.setShowEditGroupStitchModal(null)
  }

  const handleAddGroup = async () => {
    if (!patternEditorState.showAddGroupModal) return
    
    try {
      await patternOperations.handleAddGroup(
        patternEditorState.showAddGroupModal.roundNumber,
        patternEditorState.newGroupName,
        patternEditorState.newGroupRepeatCount,
        patternEditorState.newGroupStitches,
        currentChart,
        chartPattern
      )
      
      // 成功時重置表單
      patternEditorState.resetNewGroupForm()
    } catch (error) {
      console.error('Error adding group:', error)
      alert('新增群組時發生錯誤，請重試')
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

    await updateChart(currentChart.id, {
      ...currentChart,
      rounds: finalRounds,
      lastModified: new Date()
    })
    modalStates.setShowCopyRoundModal(null)
  }

  const handleSelectTemplate = async (template: any) => {
    console.log('🪲 DEBUG: handleSelectTemplate called', { template, customModalState: patternEditorState.showAddGroupModal, oldModalState: modalStates.showAddGroupModal })
    
    // Check if we're in custom group creation mode
    if (patternEditorState.showAddGroupModal) {
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
          await updateChart(currentChart.id, {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          })
        }
      } else {
        // Handle legacy project structure if needed
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          await updateRound(roundNumber, updatedRound)
        }
      }
      modalStates.setShowAddGroupModal(null)
      console.log('🪲 DEBUG: Group added successfully, modal closed')
    } catch (error) {
      console.error('Error adding group:', error)
      alert('新增群組時發生錯誤')
    }
  }

  const handleTemplateSelectInGroupCreation = (template: any) => {
    // Load template into the new group creation form
    if (patternEditorState.newGroupStitches.length === 0) {
      patternEditorState.setNewGroupName(template.name)
    }
    
    patternEditorState.setNewGroupRepeatCount(1)
    
    // Append template stitches to existing ones
    const templateStitches = template.stitches.map((stitch: any) => ({
      ...stitch,
      id: generateId()
    }))
    
    patternEditorState.setNewGroupStitches(prevStitches => [...prevStitches, ...templateStitches])
    modalStates.setShowTemplateModal(null)
  }

  const handleSelectFromTemplate = (roundNumber: number) => {
    modalStates.setShowTemplateModal({ mode: 'select', roundNumber })
  }

  const handleEditNewGroupStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!patternEditorState.showEditNewGroupStitchModal) return
    
    const { stitchId } = patternEditorState.showEditNewGroupStitchModal
    
    patternEditorState.setNewGroupStitches(prevStitches =>
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
    
    patternEditorState.setShowEditNewGroupStitchModal(null)
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

    patternEditorState.setNewGroupStitches(prevStitches => [...prevStitches, newStitch])
    modalStates.setShowGroupStitchModal(false)
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* Header */}
      <PatternEditorToolbar
        projectId={projectId!}
        currentChart={currentChart}
        isLoading={patternEditorState.isLoading}
        onAddRound={() => modalStates.setShowAddRoundForm(true)}
      />

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Chart Selector for Pattern Editor */}
        {hasMultipleCharts && (
          <ChartSelectorHeader
            currentChartId={currentChart?.id}
            chartSummaries={chartSummaries}
            hasMultipleCharts={hasMultipleCharts}
            onChartChange={async (chartId: string) => {
              await setCurrentChart(chartId)
              // Update URL to reflect chart selection
              const searchParams = new URLSearchParams(window.location.search)
              searchParams.set('chartId', chartId)
              window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`)
            }}
            isViewMode={false}
            displayRoundNumber={currentChart?.currentRound || 1}
          />
        )}
        {/* Pattern Preview - using extracted component */}
        <PatternPreview 
          currentChart={currentChart}
          chartPattern={chartPattern}
          currentProject={currentProject}
          onAddRound={() => modalStates.setShowAddRoundForm(true)}
          onEditChart={() => modalStates.setShowEditChartModal(true)}
        />

        {/* Round List */}
        <PatternRoundsList
          chartPattern={chartPattern}
          currentProject={currentProject}
          editingRound={patternEditorState.editingRound}
          editingStitch={patternEditorState.editingStitch}
          editingGroup={patternEditorState.editingGroup}
          editingGroupStitch={patternEditorState.editingGroupStitch}
          editStitchType={patternEditorState.editStitchType}
          editStitchCount={patternEditorState.editStitchCount}
          editGroupStitchType={patternEditorState.editGroupStitchType}
          editGroupStitchCount={patternEditorState.editGroupStitchCount}
          editGroupName={patternEditorState.editGroupName}
          editGroupRepeatCount={patternEditorState.editGroupRepeatCount}
          onEditRound={patternEditorState.setEditingRound}
          onUpdateRoundNotes={async (round, notes) => {
            const updatedRound = { ...round, notes: notes.trim() || undefined }
            if (currentChart) {
              await updateChart(currentChart.id, {
                rounds: currentChart.rounds.map((r: Round) =>
                  r.id === round.id ? updatedRound : r
                )
              })
            } else {
              await updateRound(round.roundNumber, updatedRound)
            }
            patternEditorState.setEditingRound(null)
          }}
          onAddStitch={(roundNumber) => modalStates.setShowStitchModal({ roundNumber, mode: 'add' })}
          onAddGroup={(roundNumber) => patternEditorState.setShowAddGroupModal({ roundNumber })}
          onCopyRound={handleCopyRound}
          onDeleteRound={(roundNumber) => patternOperations.handleDeleteRound(currentChart, roundNumber)}
          onEditStitch={(roundNumber, stitch) => {
            patternEditorState.setEditingStitch({ roundNumber, stitchId: stitch.id })
            patternEditorState.handleStitchTypeChange(stitch.type)
            patternEditorState.handleStitchCountChange(String(stitch.count))
          }}
          onUpdateStitch={async () => {
            console.log('🪲 DEBUG onUpdateStitch started at:', new Date().toISOString())
            const updateStartTime = performance.now()
            
            if (!patternEditorState.editingStitch) return
            
            const { roundNumber, stitchId } = patternEditorState.editingStitch
            const count = parseInt(patternEditorState.editStitchCount) || 1
            
            console.log('🪲 DEBUG onUpdateStitch processing data:', { roundNumber, stitchId, count })
            
            try {
              const beforeDataUpdate = performance.now()
              
              if (currentChart) {
                console.log('🪲 DEBUG updating current chart')
                const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                if (targetRound) {
                  const updatedRound = {
                    ...targetRound,
                    stitches: targetRound.stitches.map((s: StitchInfo) =>
                      s.id === stitchId
                        ? { ...s, type: patternEditorState.editStitchType, count }
                        : s
                    )
                  }
                  
                  const beforeUpdateChart = performance.now()
                  await updateChart(currentChart.id, {
                    rounds: currentChart.rounds.map((r: Round) =>
                      r.roundNumber === roundNumber ? updatedRound : r
                    )
                  })
                  const afterUpdateChart = performance.now()
                  console.log('🪲 DEBUG updateChart took:', afterUpdateChart - beforeUpdateChart, 'ms')
                }
              } else {
                console.log('🪲 DEBUG updating legacy pattern')
                // Handle legacy project structure
                const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
                if (targetRound) {
                  const updatedRound = {
                    ...targetRound,
                    stitches: targetRound.stitches.map((s: StitchInfo) =>
                      s.id === stitchId
                        ? { ...s, type: patternEditorState.editStitchType, count }
                        : s
                    )
                  }
                  
                  const beforeUpdateRound = performance.now()
                  await updateRound(roundNumber, updatedRound)
                  const afterUpdateRound = performance.now()
                  console.log('🪲 DEBUG updateRound took:', afterUpdateRound - beforeUpdateRound, 'ms')
                }
              }
              
              const afterDataUpdate = performance.now()
              console.log('🪲 DEBUG total data update took:', afterDataUpdate - beforeDataUpdate, 'ms')
            } catch (error) {
              console.error('Error updating stitch:', error)
              alert('更新針法時發生錯誤')
            }
            
            const beforeStateReset = performance.now()
            patternEditorState.setEditingStitch(null)
            const afterStateReset = performance.now()
            
            const updateEndTime = performance.now()
            console.log('🪲 DEBUG onUpdateStitch performance:', {
              totalTime: updateEndTime - updateStartTime,
              stateResetTime: afterStateReset - beforeStateReset,
              timestamp: new Date().toISOString()
            })
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
                  await updateChart(currentChart.id, {
                    rounds: currentChart.rounds.map((r: Round) =>
                      r.roundNumber === roundNumber ? updatedRound : r
                    )
                  })
                }
              } else {
                // Handle legacy deletion
              }
            }
          }}
          onEditGroup={(roundNumber, group) => {
            patternEditorState.setEditingGroup({ roundNumber, groupId: group.id })
            patternEditorState.handleGroupNameChange(group.name)
            patternEditorState.handleGroupRepeatCountChange(String(group.repeatCount))
          }}
          onUpdateGroup={async (roundNumber, groupId) => {
            if (!patternEditorState.editingGroup) return
            
            const repeatCount = parseInt(patternEditorState.editGroupRepeatCount) || 1
            const trimmedName = patternEditorState.editGroupName.trim()
            
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
                  await updateChart(currentChart.id, {
                    rounds: currentChart.rounds.map((r: Round) =>
                      r.roundNumber === roundNumber ? updatedRound : r
                    )
                  })
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
                  await updateRound(roundNumber, updatedRound)
                }
              }
            } catch (error) {
              console.error('Error updating group:', error)
              alert('更新群組時發生錯誤')
            }
            
            patternEditorState.setEditingGroup(null)
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
                  await updateChart(currentChart.id, {
                    rounds: currentChart.rounds.map((r: Round) =>
                      r.roundNumber === roundNumber ? updatedRound : r
                    )
                  })
                }
              }
            }
          }}
          onEditGroupStitch={(roundNumber, groupId, stitch) => {
            patternEditorState.setEditingGroupStitch({ roundNumber, groupId, stitchId: stitch.id })
            patternEditorState.handleGroupStitchTypeChange(stitch.type)
            patternEditorState.handleGroupStitchCountChange(String(stitch.count))
          }}
          onUpdateGroupStitch={async () => {
            if (!patternEditorState.editingGroupStitch) return
            
            const { roundNumber, groupId, stitchId } = patternEditorState.editingGroupStitch
            const count = parseInt(patternEditorState.editGroupStitchCount) || 1
            
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
                                ? { ...s, type: patternEditorState.editGroupStitchType, count }
                                : s
                            )
                          }
                        : g
                    )
                  }
                  await updateChart(currentChart.id, {
                    rounds: currentChart.rounds.map((r: Round) =>
                      r.roundNumber === roundNumber ? updatedRound : r
                    )
                  })
                }
              }
            } catch (error) {
              console.error('Error updating group stitch:', error)
              alert('更新群組針法時發生錯誤')
            }
            
            patternEditorState.setEditingGroupStitch(null)
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
                  await updateChart(currentChart.id, {
                    ...currentChart,
                    rounds: currentChart.rounds.map((r: Round) =>
                      r.roundNumber === roundNumber ? updatedRound : r
                    ),
                    lastModified: new Date()
                  })
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
          onStitchTypeChange={patternEditorState.handleStitchTypeChange}
          onStitchCountChange={patternEditorState.handleStitchCountChange}
          onGroupStitchTypeChange={patternEditorState.handleGroupStitchTypeChange}
          onGroupStitchCountChange={patternEditorState.handleGroupStitchCountChange}
          onGroupNameChange={patternEditorState.handleGroupNameChange}
          onGroupRepeatCountChange={patternEditorState.handleGroupRepeatCountChange}
          onCancelEdit={patternEditorState.resetEditingStates}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onAddRoundClick={() => modalStates.setShowAddRoundForm(true)}
        />
      </div>

      {/* AddRoundForm Modal - using extracted component */}
      <AddRoundForm
        isOpen={modalStates.showAddRoundForm}
        isLoading={patternEditorState.isLoading}
        newRoundNotes={patternEditorState.newRoundNotes}
        onNotesChange={patternEditorState.setNewRoundNotes}
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
        isOpen={patternEditorState.showEditNewGroupStitchModal !== null}
        onClose={() => patternEditorState.setShowEditNewGroupStitchModal(null)}
        onConfirm={handleEditNewGroupStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="編輯群組針法"
      />

      {/* Custom Group Creation Modal */}
      <CustomGroupCreationModal
        isOpen={patternEditorState.showAddGroupModal !== null}
        onClose={() => {
          patternEditorState.resetNewGroupForm()
        }}
        onConfirm={handleAddGroup}
        newGroupName={patternEditorState.newGroupName}
        setNewGroupName={patternEditorState.setNewGroupName}
        newGroupRepeatCount={patternEditorState.newGroupRepeatCount}
        setNewGroupRepeatCount={patternEditorState.setNewGroupRepeatCount}
        newGroupStitches={patternEditorState.newGroupStitches}
        onAddStitch={() => modalStates.setShowGroupStitchModal(true)}
        onSelectFromTemplate={() => {
          if (patternEditorState.showAddGroupModal) {
            handleSelectFromTemplate(patternEditorState.showAddGroupModal.roundNumber)
          }
        }}
        onSaveAsTemplate={() => {
          if (patternEditorState.newGroupStitches.length > 0) {
            const tempGroup = {
              id: 'temp',
              name: patternEditorState.newGroupName || '針目群組',
              stitches: patternEditorState.newGroupStitches,
              repeatCount: typeof patternEditorState.newGroupRepeatCount === 'number'
                ? patternEditorState.newGroupRepeatCount
                : parseInt(String(patternEditorState.newGroupRepeatCount)) || 1
            }
            modalStates.setShowTemplateModal({ mode: 'save', group: tempGroup })
          }
        }}
        onEditStitch={(stitchId) => patternEditorState.setShowEditNewGroupStitchModal({ stitchId })}
        onRemoveStitch={patternEditorState.handleRemoveStitchFromGroup}
        canSaveAsTemplate={patternEditorState.newGroupStitches.length > 0}
      />
    </div>
  )
}