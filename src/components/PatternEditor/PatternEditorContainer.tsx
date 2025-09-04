
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useChartStore } from '../../stores/useChartStore'
import { usePatternStore } from '../../stores/usePatternStore'
import { useModalStates } from '../../hooks/useModalStates'
import { usePatternEditorState } from '../../hooks/usePatternEditorState'
import { usePatternOperations } from '../../hooks/usePatternOperations'
import { analyticsService } from '../../services/analyticsService'
import ChartSelectorHeader from '../ChartSelectorHeader'
import { Round, StitchType, StitchInfo, StitchGroup, PatternItemType } from '../../types'
import {
  generateId,
  getCurrentChart,
  getProjectPattern
} from '../../utils'
import { reorderPatternItems, getSortedPatternItems } from '../../utils/pattern/rendering'

// Components
import PatternEditorToolbar from './PatternEditorToolbar'
import PatternRoundsList from './PatternRoundsList'
import CustomGroupCreationModal from './CustomGroupCreationModal'
import PatternPreview from './PatternPreview'
import StitchSelectionModal from '../StitchSelectionModal'
import StitchGroupTemplateModal from '../StitchGroupTemplateModal'
import CopyRoundModal from '../CopyRoundModal'
import EditChartModal from '../ProjectDetail/modals/EditChartModal'

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
  const patternEditorState = usePatternEditorState()
  const patternOperations = usePatternOperations()

  const [currentChart, setCurrentChartLocal] = useState<any>(null)
  const [chartPattern, setChartPattern] = useState<Round[]>([])
  const [editingChart, setEditingChart] = useState<any>(null)
  
  // Get chart summaries for selector
  const chartSummaries = getChartSummaries()
  const hasMultipleCharts = chartSummaries.length > 1

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProjectById(projectId)
        
        // 記錄織圖編輯使用統計
        analyticsService.recordUsageEvent('pattern_edit', 'enter_pattern_editor', {
          projectId,
          projectName: project.name
        })
        
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

    // If no chart exists, create a default one automatically
    if (!targetChart) {
      const createDefaultChart = async () => {
        const { createChart } = useChartStore.getState()
        const newChart = await createChart({
          name: '主要織圖',
          description: '',
          notes: ''
        })
        
        if (newChart) {
          setCurrentChartLocal(newChart)
          setChartPattern(newChart.rounds || [])
        } else {
          // Fallback to legacy pattern if chart creation fails
          setCurrentChartLocal(null)
          setChartPattern(getProjectPattern(currentProject))
        }
      }
      
      createDefaultChart()
    } else {
      setCurrentChartLocal(targetChart)
      setChartPattern(targetChart.rounds || [])
    }
  }, [currentProject, searchParams])

  // 關鍵修復：強制監聽 currentProject 的所有變化，確保狀態同步
  useEffect(() => {
    if (!currentProject || !currentChart) return
    
    // 從最新的 currentProject 中獲取對應的 chart
    const updatedChart = currentProject.charts?.find(c => c.id === currentChart.id)
    if (updatedChart) {
      console.log('[PATTERN-EDITOR] Force sync - project updated, syncing local chart:', {
        chartId: updatedChart.id,
        roundsCount: updatedChart.rounds?.length || 0,
        firstRoundStitches: updatedChart.rounds?.[0]?.stitches?.length || 0,
        firstStitchCount: updatedChart.rounds?.[0]?.stitches?.[0]?.count || 'N/A',
        firstRoundGroups: updatedChart.rounds?.[0]?.stitchGroups?.length || 0,
        firstGroupRepeatCount: updatedChart.rounds?.[0]?.stitchGroups?.[0]?.repeatCount || 'N/A',
        projectLastModified: currentProject.lastModified instanceof Date ? currentProject.lastModified.toISOString() : currentProject.lastModified,
        chartLastModified: updatedChart.lastModified instanceof Date ? updatedChart.lastModified.toISOString() : updatedChart.lastModified,
        currentProjectId: currentProject.id,
        projectForceUpdateFlag: (currentProject as any)._forceUpdateFlag
      })
      
      // 檢查是否有實際變化
      const hasChanges = JSON.stringify(updatedChart) !== JSON.stringify(currentChart)
      console.log('[PATTERN-EDITOR] Chart comparison:', {
        hasChanges,
        currentChartModified: currentChart.lastModified instanceof Date ? currentChart.lastModified.toISOString() : currentChart.lastModified,
        updatedChartModified: updatedChart.lastModified instanceof Date ? updatedChart.lastModified.toISOString() : updatedChart.lastModified
      })
      
      // 強制更新本地狀態，確保 React 檢測到變化
      // 使用時間戳來強制 React 檢測差異
      const forceUpdatedChart = {
        ...updatedChart,
        _forceUpdateTimestamp: Date.now(),
        _patternEditorRenderKey: Math.random().toString(36)
      }
      setCurrentChartLocal(forceUpdatedChart)
      
      // 使用函數式更新和隨機 key 強制 React 重新渲染
      setChartPattern(prevPattern => {
        const newPattern = JSON.parse(JSON.stringify(updatedChart.rounds || []))
        // 為每個 round 添加一個隨機 key 來強制重新渲染
        const patternWithKeys = newPattern.map((round: any) => ({
          ...round,
          _renderKey: Math.random().toString(36),
          _forceUpdateTimestamp: Date.now(),
          stitches: round.stitches?.map((stitch: any) => ({
            ...stitch,
            _renderKey: Math.random().toString(36),
            _forceUpdateTimestamp: Date.now()
          })) || [],
          stitchGroups: round.stitchGroups?.map((group: any) => ({
            ...group,
            _renderKey: Math.random().toString(36),
            _forceUpdateTimestamp: Date.now(),
            stitches: group.stitches?.map((stitch: any) => ({
              ...stitch,
              _renderKey: Math.random().toString(36),
              _forceUpdateTimestamp: Date.now()
            })) || []
          })) || [],
          // 為 PatternItems 也添加強制更新標記
          patternItems: round.patternItems?.map((patternItem: any) => ({
            ...patternItem,
            _renderKey: Math.random().toString(36),
            _forceUpdateTimestamp: Date.now(),
            data: patternItem.type === 'GROUP' ? {
              ...patternItem.data,
              _renderKey: Math.random().toString(36),
              _forceUpdateTimestamp: Date.now(),
              stitches: patternItem.data.stitches?.map((stitch: any) => ({
                ...stitch,
                _renderKey: Math.random().toString(36),
                _forceUpdateTimestamp: Date.now()
              })) || []
            } : {
              ...patternItem.data,
              _renderKey: Math.random().toString(36),
              _forceUpdateTimestamp: Date.now()
            }
          })) || []
        }))
        console.log('[PATTERN-EDITOR] Forcing pattern re-render with enhanced keys:', {
          prevLength: prevPattern?.length || 0,
          newLength: patternWithKeys?.length || 0,
          hasNewKeys: patternWithKeys?.[0]?._renderKey ? 'yes' : 'no',
          hasPatternItemKeys: patternWithKeys?.[0]?.patternItems?.[0]?._renderKey ? 'yes' : 'no',
          forceRenderKey: forceUpdatedChart._patternEditorRenderKey,
          firstRoundFirstStitchForceTimestamp: patternWithKeys?.[0]?.stitches?.[0]?._forceUpdateTimestamp || 'N/A',
          firstRoundFirstGroupFirstStitchForceTimestamp: patternWithKeys?.[0]?.stitchGroups?.[0]?.stitches?.[0]?._forceUpdateTimestamp || 'N/A'
        })
        return patternWithKeys
      })
    }
  }, [currentProject, currentChart?.id]) // 監聽整個 currentProject，不只是 charts

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

  const handleAddRound = async (scrollToNew: boolean = false) => {
    const initialRoundsCount = chartPattern.length
    
    await patternOperations.handleAddRound(
      currentChart,
      chartPattern,
      '', // 不需要備註，直接傳空字串
      patternEditorState.isLoading,
      patternEditorState.setIsLoading
    )
    
    // 如果需要跳轉到新圈數，等待一小段時間讓新圈數渲染完成後再跳轉
    if (scrollToNew) {
      setTimeout(() => {
        const newRoundNumber = initialRoundsCount + 1
        const newRoundElement = document.querySelector(`[data-round-card="${newRoundNumber}"]`)
        if (newRoundElement) {
          newRoundElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
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

  const handleEditChart = () => {
    if (currentChart) {
      setEditingChart(currentChart)
      modalStates.setShowEditChartModal(true)
    }
  }

  const handleUpdateChart = async (name: string, description: string, notes: string) => {
    if (!editingChart) return

    await updateChart(editingChart.id, {
      name,
      description: description || undefined,
      notes: notes || undefined
    })
    
    setEditingChart(null)
    modalStates.setShowEditChartModal(false)
  }

  const handleCloseEditChartModal = () => {
    setEditingChart(null)
    modalStates.setShowEditChartModal(false)
  }

  const handleSelectTemplate = async (template: any) => {
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

  // Movement handlers for pattern items
  const handleMoveUp = async (index: number, roundNumber: number) => {
    if (index === 0) return // Already at top
    
    try {
      if (currentChart) {
        // Use imported reorderPatternItems
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = reorderPatternItems(targetRound, index, index - 1)
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
      console.error('Error moving item up:', error)
      alert('上移時發生錯誤')
    }
  }

  const handleMoveDown = async (index: number, roundNumber: number) => {
    try {
      if (currentChart) {
        // Use imported reorderPatternItems and getSortedPatternItems
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const sortedItems = getSortedPatternItems(targetRound)
          if (index >= sortedItems.length - 1) return // Already at bottom
          
          const updatedRound = reorderPatternItems(targetRound, index, index + 1)
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
      console.error('Error moving item down:', error)
      alert('下移時發生錯誤')
    }
  }

  // Movement handlers for group stitches
  const handleMoveGroupStitchUp = async (roundNumber: number, groupId: string, stitchIndex: number) => {
    if (stitchIndex === 0) return // Already at top
    
    try {
      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) => {
              if (g.id === groupId) {
                const newStitches = [...g.stitches]
                const [movedStitch] = newStitches.splice(stitchIndex, 1)
                newStitches.splice(stitchIndex - 1, 0, movedStitch)
                return { ...g, stitches: newStitches }
              }
              return g
            })
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
      console.error('Error moving group stitch up:', error)
      alert('上移群組針法時發生錯誤')
    }
  }

  const handleMoveGroupStitchDown = async (roundNumber: number, groupId: string, stitchIndex: number) => {
    try {
      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const targetGroup = targetRound.stitchGroups.find((g: StitchGroup) => g.id === groupId)
          if (!targetGroup || stitchIndex >= targetGroup.stitches.length - 1) return // Already at bottom
          
          const updatedRound = {
            ...targetRound,
            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) => {
              if (g.id === groupId) {
                const newStitches = [...g.stitches]
                const [movedStitch] = newStitches.splice(stitchIndex, 1)
                newStitches.splice(stitchIndex + 1, 0, movedStitch)
                return { ...g, stitches: newStitches }
              }
              return g
            })
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
      console.error('Error moving group stitch down:', error)
      alert('下移群組針法時發生錯誤')
    }
  }

  // Movement handlers for rounds
  const handleMoveRoundUp = async (roundNumber: number) => {
    if (roundNumber === 1) return // Already at top
    
    try {
      if (currentChart) {
        const rounds = [...currentChart.rounds].sort((a, b) => a.roundNumber - b.roundNumber)
        const currentIndex = rounds.findIndex(r => r.roundNumber === roundNumber)
        if (currentIndex > 0) {
          // Swap round numbers
          const updatedRounds = rounds.map((round, index) => {
            if (index === currentIndex) {
              return { ...round, roundNumber: roundNumber - 1 }
            } else if (index === currentIndex - 1) {
              return { ...round, roundNumber: roundNumber }
            }
            return round
          })
          
          await updateChart(currentChart.id, {
            ...currentChart,
            rounds: updatedRounds,
            lastModified: new Date()
          })
        }
      }
    } catch (error) {
      console.error('Error moving round up:', error)
      alert('上移圈數時發生錯誤')
    }
  }

  const handleMoveRoundDown = async (roundNumber: number) => {
    try {
      if (currentChart) {
        const rounds = [...currentChart.rounds].sort((a, b) => a.roundNumber - b.roundNumber)
        const currentIndex = rounds.findIndex(r => r.roundNumber === roundNumber)
        if (currentIndex < rounds.length - 1) {
          // Swap round numbers
          const updatedRounds = rounds.map((round, index) => {
            if (index === currentIndex) {
              return { ...round, roundNumber: roundNumber + 1 }
            } else if (index === currentIndex + 1) {
              return { ...round, roundNumber: roundNumber }
            }
            return round
          })
          
          await updateChart(currentChart.id, {
            ...currentChart,
            rounds: updatedRounds,
            lastModified: new Date()
          })
        }
      }
    } catch (error) {
      console.error('Error moving round down:', error)
      alert('下移圈數時發生錯誤')
    }
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
        onAddRound={() => handleAddRound(true)} // 右上角按鈕會跳轉到新圈數
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
          onAddRound={() => handleAddRound(false)} // Preview 中的按鈕不跳轉
          onEditChart={handleEditChart}
        />

        {/* Round List */}
        <PatternRoundsList
          key={`${currentChart?.id}-${(chartPattern?.[0] as any)?._renderKey || Date.now()}`}
          chartPattern={chartPattern}
          currentProject={currentProject}
          currentChart={currentChart}
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
            if (!patternEditorState.editingStitch) return
            
            const { roundNumber, stitchId } = patternEditorState.editingStitch
            const count = parseInt(patternEditorState.editStitchCount) || 1
            
            try {
              if (currentChart) {
                const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                if (targetRound) {
                  // 更新針法 - 需要同時更新 stitches (舊格式) 和 patternItems (新格式)
                  const updatedRound = {
                    ...targetRound,
                    // 更新舊格式的 stitches 陣列
                    stitches: targetRound.stitches.map((s: StitchInfo) =>
                      s.id === stitchId
                        ? { ...s, type: patternEditorState.editStitchType, count }
                        : s
                    ),
                    // 更新新格式的 patternItems 陣列
                    patternItems: targetRound.patternItems?.map((item: any) => {
                      if (item.type === PatternItemType.STITCH && item.data.id === stitchId) {
                        return {
                          ...item,
                          data: {
                            ...item.data,
                            type: patternEditorState.editStitchType,
                            count
                          }
                        }
                      }
                      return item
                    }) || []
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
                  
                  await updateRound(roundNumber, updatedRound)
                }
              }
            } catch (error) {
              console.error('Error updating stitch:', error)
              alert('更新針法時發生錯誤')
            }
            
            // 延遲重置編輯狀態，確保數據更新完成
            setTimeout(() => {
              patternEditorState.setEditingStitch(null)
            }, 100)
          }}
          onDeleteStitch={async (roundNumber, stitchId) => {
            if (confirm('確定要刪除這個針法嗎？')) {
              if (currentChart) {
                const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
                if (targetRound) {
                  // 刪除針法 - 需要同時更新 stitches (舊格式) 和 patternItems (新格式)
                  const updatedRound = {
                    ...targetRound,
                    // 更新舊格式的 stitches 陣列
                    stitches: targetRound.stitches.filter((s: StitchInfo) => s.id !== stitchId),
                    // 更新新格式的 patternItems 陣列
                    patternItems: targetRound.patternItems?.filter((item: any) =>
                      !(item.type === PatternItemType.STITCH && item.data.id === stitchId)
                    ) || []
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
                  // 更新群組重複次數 - 需要同時更新 stitchGroups (舊格式) 和 patternItems (新格式)
                  const updatedRound = {
                    ...targetRound,
                    // 更新舊格式的 stitchGroups 陣列
                    stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                      g.id === groupId
                        ? { ...g, name: trimmedName, repeatCount }
                        : g
                    ),
                    // 更新新格式的 patternItems 陣列中的群組
                    patternItems: targetRound.patternItems?.map((item: any) => {
                      if (item.type === PatternItemType.GROUP && item.data.id === groupId) {
                        return {
                          ...item,
                          data: {
                            ...item.data,
                            name: trimmedName,
                            repeatCount
                          }
                        }
                      }
                      return item
                    }) || []
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
                  // 刪除群組 - 需要同時更新 stitchGroups (舊格式) 和 patternItems (新格式)
                  const updatedRound = {
                    ...targetRound,
                    // 更新舊格式的 stitchGroups 陣列
                    stitchGroups: targetRound.stitchGroups.filter((g: StitchGroup) => g.id !== groupId),
                    // 更新新格式的 patternItems 陣列
                    patternItems: targetRound.patternItems?.filter((item: any) =>
                      !(item.type === PatternItemType.GROUP && item.data.id === groupId)
                    ) || []
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
            }
          }}
          onEditGroupStitch={(roundNumber, groupId, stitch) => {
            console.log('[DEBUG] onEditGroupStitch called:', { roundNumber, groupId, stitch })
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
                  // 更新群組針法 - 需要同時更新 stitchGroups (舊格式) 和 patternItems (新格式)
                  const updatedRound = {
                    ...targetRound,
                    // 更新舊格式的 stitchGroups 陣列
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
                    ),
                    // 更新新格式的 patternItems 陣列中的群組針法
                    patternItems: targetRound.patternItems?.map((item: any) => {
                      if (item.type === PatternItemType.GROUP && item.data.id === groupId) {
                        return {
                          ...item,
                          data: {
                            ...item.data,
                            stitches: item.data.stitches.map((s: StitchInfo) =>
                              s.id === stitchId
                                ? { ...s, type: patternEditorState.editGroupStitchType, count }
                                : s
                            )
                          }
                        }
                      }
                      return item
                    }) || []
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
                  // 刪除群組針法 - 需要同時更新 stitchGroups (舊格式) 和 patternItems (新格式)
                  const updatedRound = {
                    ...targetRound,
                    // 更新舊格式的 stitchGroups 陣列
                    stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
                      g.id === groupId
                        ? {
                            ...g,
                            stitches: g.stitches.filter((s: StitchInfo) => s.id !== stitchId)
                          }
                        : g
                    ),
                    // 更新新格式的 patternItems 陣列中的群組針法
                    patternItems: targetRound.patternItems?.map((item: any) => {
                      if (item.type === PatternItemType.GROUP && item.data.id === groupId) {
                        return {
                          ...item,
                          data: {
                            ...item.data,
                            stitches: item.data.stitches.filter((s: StitchInfo) => s.id !== stitchId)
                          }
                        }
                      }
                      return item
                    }) || []
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
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onMoveGroupStitchUp={handleMoveGroupStitchUp}
          onMoveGroupStitchDown={handleMoveGroupStitchDown}
          onMoveRoundUp={handleMoveRoundUp}
          onMoveRoundDown={handleMoveRoundDown}
          onAddRoundClick={() => handleAddRound(false)} // 底部按鈕不跳轉
        />
      </div>


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

      {/* Edit Chart Modal */}
      <EditChartModal
        isOpen={modalStates.showEditChartModal}
        chart={editingChart}
        onClose={handleCloseEditChartModal}
        onSave={handleUpdateChart}
      />
    </div>
  )
}