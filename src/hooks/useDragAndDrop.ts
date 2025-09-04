import { useState } from 'react'
import { usePatternStore } from '../stores/usePatternStore'
import { useDragState, DragType } from './useDragState'

import { logger } from '../utils/logger'
interface DraggedItem {
  index: number
  roundNumber: number
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const { reorderPatternItemsInRound } = usePatternStore()
  const { setDragState, isDragging, clearDragState } = useDragState()

  const handleDragStart = (e: React.DragEvent, index: number, roundNumber: number) => {
    logger.debug('Starting drag for PatternItem:', { index, roundNumber })
    
    // Reset any existing drag state first
    setDraggedItem(null)
    
    // Set new drag state
    setDraggedItem({ index, roundNumber })
    setDragState(DragType.PATTERN_ITEM, { index, roundNumber })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-pattern-item-drag', `${index}-${roundNumber}`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    
    // Only allow pattern item drags
    if (!isDragging(DragType.PATTERN_ITEM)) {
      return
    }
    
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number, roundNumber: number) => {
    e.preventDefault()
    
    // Check if this is a pattern item drag
    if (!isDragging(DragType.PATTERN_ITEM)) {
      logger.debug('Not a pattern item drag, ignoring')
      return
    }
    
    logger.debug('Drop event:', {
      draggedItem,
      targetIndex,
      roundNumber
    })
    
    if (draggedItem && draggedItem.roundNumber === roundNumber) {
      logger.debug('Dropping PatternItem:', {
        fromIndex: draggedItem.index,
        toIndex: targetIndex,
        roundNumber
      })
      
      if (draggedItem.index !== targetIndex) {
        try {
          await reorderPatternItemsInRound(roundNumber, draggedItem.index, targetIndex)
          logger.debug('Reorder successful')
        } catch (error) {
          logger.error('Error reordering pattern items:', error)
          alert('調整針法順序時發生錯誤')
        }
      }
    } else {
      logger.debug('Invalid drop - different rounds or no dragged item:', {
        hasDraggedItem: !!draggedItem,
        sameRound: draggedItem?.roundNumber === roundNumber
      })
    }
    
    // Always reset drag state
    setDraggedItem(null)
    clearDragState()
  }

  const resetDrag = () => {
    setDraggedItem(null)
    clearDragState()
  }

  return {
    draggedItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDrag
  }
}