import { useState } from 'react'
import { useChartStore } from '../stores/useChartStore'
import { usePatternStore } from '../stores/usePatternStore'
import { Round, Chart } from '../types'
import { useDragState, DragType } from './useDragState'

interface DraggedRound {
  roundNumber: number
  roundId: string
}

export function useRoundDragAndDrop() {
  const [draggedRound, setDraggedRound] = useState<DraggedRound | null>(null)
  const [dragOverRound, setDragOverRound] = useState<number | null>(null)
  const { updateChart } = useChartStore()
  const { updateRound } = usePatternStore()
  const { setDragState, isDragging, clearDragState } = useDragState()

  const handleRoundDragStart = (e: React.DragEvent, round: Round) => {
    console.log('[ROUND_DRAG] Starting drag for Round:', { roundNumber: round.roundNumber, roundId: round.id })
    setDraggedRound({ roundNumber: round.roundNumber, roundId: round.id })
    setDragState(DragType.ROUND, { roundNumber: round.roundNumber, roundId: round.id })
    e.dataTransfer.effectAllowed = 'move'
    
    // Set specific round drag data
    e.dataTransfer.setData('application/x-round-drag', round.id)
  }

  const handleRoundDragOver = (e: React.DragEvent, targetRound: Round) => {
    e.preventDefault()
    
    // Only allow round drags
    if (!isDragging(DragType.ROUND)) {
      return
    }
    
    e.dataTransfer.dropEffect = 'move'
    
    if (draggedRound && draggedRound.roundNumber !== targetRound.roundNumber) {
      setDragOverRound(targetRound.roundNumber)
    }
  }

  const handleRoundDragLeave = () => {
    setDragOverRound(null)
  }

  const handleRoundDrop = async (e: React.DragEvent, targetRound: Round, currentChart: Chart | null, chartPattern: Round[]) => {
    e.preventDefault()
    setDragOverRound(null)
    
    // Check if this is a round drag
    if (!isDragging(DragType.ROUND)) {
      console.log('[ROUND_DRAG] Not a round drag, ignoring')
      setDraggedRound(null)
      clearDragState()
      return
    }
    
    if (!draggedRound || draggedRound.roundNumber === targetRound.roundNumber) {
      setDraggedRound(null)
      clearDragState()
      return
    }

    console.log('[ROUND_DRAG] Dropping Round:', {
      fromRound: draggedRound.roundNumber,
      toRound: targetRound.roundNumber
    })

    try {
      await reorderRounds(draggedRound.roundNumber, targetRound.roundNumber, currentChart, chartPattern)
    } catch (error) {
      console.error('Error reordering rounds:', error)
      alert('調整圈數順序時發生錯誤')
    }
    
    setDraggedRound(null)
    clearDragState()
  }

  const reorderRounds = async (fromRoundNumber: number, toRoundNumber: number, currentChart: Chart | null, chartPattern: Round[]) => {
    const rounds = currentChart ? currentChart.rounds : chartPattern
    const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber)
    
    // Find the dragged round
    const draggedRoundData = sortedRounds.find(r => r.roundNumber === fromRoundNumber)
    if (!draggedRoundData) return

    // Remove the dragged round from the array
    const withoutDragged = sortedRounds.filter(r => r.roundNumber !== fromRoundNumber)
    
    // Find insertion index
    const targetIndex = withoutDragged.findIndex(r => r.roundNumber === toRoundNumber)
    
    // Insert the dragged round at the target position
    const reorderedRounds = [...withoutDragged]
    reorderedRounds.splice(targetIndex, 0, draggedRoundData)
    
    // Reassign round numbers based on new order
    const updatedRounds = reorderedRounds.map((round, index) => ({
      ...round,
      roundNumber: index + 1
    }))

    // Update the chart or pattern
    if (currentChart) {
      await updateChart(currentChart.id, {
        ...currentChart,
        rounds: updatedRounds,
        lastModified: new Date()
      })
    } else {
      // Handle legacy project structure
      for (const updatedRound of updatedRounds) {
        await updateRound(updatedRound.roundNumber, updatedRound)
      }
    }
  }

  const resetRoundDrag = () => {
    setDraggedRound(null)
    setDragOverRound(null)
    clearDragState()
  }

  return {
    draggedRound,
    dragOverRound,
    handleRoundDragStart,
    handleRoundDragOver,
    handleRoundDragLeave,
    handleRoundDrop,
    resetRoundDrag
  }
}