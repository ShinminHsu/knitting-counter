import { useState } from 'react'
import { useChartStore } from '../stores/useChartStore'
import { usePatternStore } from '../stores/usePatternStore'
import { Round, Chart, StitchInfo, PatternItemType } from '../types'
import { useDragState, DragType } from './useDragState'

interface DraggedGroupStitch {
  stitchId: string
  stitchIndex: number
  groupId: string
  roundNumber: number
}

export function useGroupStitchDragAndDrop() {
  const [draggedGroupStitch, setDraggedGroupStitch] = useState<DraggedGroupStitch | null>(null)
  const [dragOverGroupStitch, setDragOverGroupStitch] = useState<string | null>(null)
  const { updateChart } = useChartStore()
  const { updateRound } = usePatternStore()
  const { setDragState, isDragging, clearDragState } = useDragState()

  const handleGroupStitchDragStart = (e: React.DragEvent, stitch: StitchInfo, stitchIndex: number, groupId: string, roundNumber: number) => {
    console.log('[GROUP_STITCH_DRAG] Starting drag:', { stitchId: stitch.id, stitchIndex, groupId, roundNumber })
    
    // Reset any existing drag state first
    setDraggedGroupStitch(null)
    setDragOverGroupStitch(null)
    
    // Set new drag state
    setDraggedGroupStitch({ stitchId: stitch.id, stitchIndex, groupId, roundNumber })
    setDragState(DragType.GROUP_STITCH, { stitchId: stitch.id, stitchIndex, groupId, roundNumber })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-group-stitch-drag', stitch.id)
    e.stopPropagation() // Prevent group drag from triggering
  }

  const handleGroupStitchDragOver = (e: React.DragEvent, targetStitch: StitchInfo, groupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only allow group stitch drags
    if (!isDragging(DragType.GROUP_STITCH)) {
      return
    }
    
    e.dataTransfer.dropEffect = 'move'
    
    if (draggedGroupStitch && 
        draggedGroupStitch.groupId === groupId && 
        draggedGroupStitch.stitchId !== targetStitch.id) {
      setDragOverGroupStitch(targetStitch.id)
    }
  }

  const handleGroupStitchDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the drop zone
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragOverGroupStitch(null)
    }
  }

  const handleGroupStitchDrop = async (
    e: React.DragEvent, 
    targetStitch: StitchInfo, 
    targetIndex: number,
    groupId: string,
    roundNumber: number,
    currentChart: Chart | null, 
    chartPattern: Round[]
  ) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if this is a group stitch drag
    if (!isDragging(DragType.GROUP_STITCH)) {
      console.log('[GROUP_STITCH_DRAG] Not a group stitch drag, ignoring')
      resetGroupStitchDrag()
      return
    }
    
    console.log('[GROUP_STITCH_DRAG] Drop event:', {
      draggedGroupStitch,
      targetStitch: targetStitch.id,
      targetIndex,
      groupId,
      roundNumber
    })
    
    if (!draggedGroupStitch || 
        draggedGroupStitch.groupId !== groupId ||
        draggedGroupStitch.roundNumber !== roundNumber ||
        draggedGroupStitch.stitchId === targetStitch.id) {
      console.log('[GROUP_STITCH_DRAG] Drop cancelled:', {
        noDraggedItem: !draggedGroupStitch,
        differentGroup: draggedGroupStitch?.groupId !== groupId,
        differentRound: draggedGroupStitch?.roundNumber !== roundNumber,
        sameStitch: draggedGroupStitch?.stitchId === targetStitch.id
      })
      resetGroupStitchDrag()
      return
    }

    console.log('[GROUP_STITCH_DRAG] Dropping stitch:', {
      from: draggedGroupStitch.stitchIndex,
      to: targetIndex,
      groupId,
      roundNumber
    })

    try {
      await reorderGroupStitches(
        draggedGroupStitch.stitchIndex,
        targetIndex,
        groupId,
        roundNumber,
        currentChart,
        chartPattern
      )
      console.log('[GROUP_STITCH_DRAG] Reorder successful')
    } catch (error) {
      console.error('Error reordering group stitches:', error)
      alert('調整群組針法順序時發生錯誤')
    } finally {
      // Always reset drag state
      resetGroupStitchDrag()
    }
  }

  const reorderGroupStitches = async (
    fromIndex: number,
    toIndex: number,
    groupId: string,
    roundNumber: number,
    currentChart: Chart | null,
    chartPattern: Round[]
  ) => {
    const rounds = currentChart ? currentChart.rounds : chartPattern
    const targetRound = rounds.find(r => r.roundNumber === roundNumber)
    
    if (!targetRound) return

    // Find the group in both legacy and new structures
    let targetGroup: any = null
    
    // Check in legacy stitchGroups
    if (targetRound.stitchGroups) {
      targetGroup = targetRound.stitchGroups.find(g => g.id === groupId)
    }
    
    // Check in new patternItems structure
    if (!targetGroup && targetRound.patternItems) {
      const groupItem = targetRound.patternItems.find(item => 
        item.type === PatternItemType.GROUP && item.data.id === groupId
      )
      if (groupItem) {
        targetGroup = groupItem.data
      }
    }

    if (!targetGroup || !targetGroup.stitches) return

    // Create new stitches array with reordered items
    const stitches = [...targetGroup.stitches]
    const [movedStitch] = stitches.splice(fromIndex, 1)
    stitches.splice(toIndex, 0, movedStitch)

    const updatedGroup = {
      ...targetGroup,
      stitches
    }

    // Update both legacy and new structures
    let updatedRound = { ...targetRound }

    // Update legacy structure
    if (updatedRound.stitchGroups) {
      updatedRound.stitchGroups = updatedRound.stitchGroups.map(g =>
        g.id === groupId ? updatedGroup : g
      )
    }

    // Update new structure
    if (updatedRound.patternItems) {
      updatedRound.patternItems = updatedRound.patternItems.map(item => {
        if (item.type === PatternItemType.GROUP && item.data.id === groupId) {
          return {
            ...item,
            data: updatedGroup
          }
        }
        return item
      })
    }

    // Update the chart or pattern
    if (currentChart) {
      await updateChart(currentChart.id, {
        ...currentChart,
        rounds: currentChart.rounds.map(r =>
          r.roundNumber === roundNumber ? updatedRound : r
        ),
        lastModified: new Date()
      })
    } else {
      // Handle legacy project structure
      await updateRound(roundNumber, updatedRound)
    }
  }

  const resetGroupStitchDrag = () => {
    setDraggedGroupStitch(null)
    setDragOverGroupStitch(null)
    clearDragState()
  }

  return {
    draggedGroupStitch,
    dragOverGroupStitch,
    handleGroupStitchDragStart,
    handleGroupStitchDragOver,
    handleGroupStitchDragLeave,
    handleGroupStitchDrop,
    resetGroupStitchDrag
  }
}