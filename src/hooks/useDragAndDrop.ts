import { useState } from 'react'
import { useSyncedAppStore } from '../store/syncedAppStore'

interface DraggedItem {
  index: number
  roundNumber: number
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const { reorderPatternItemsInRound } = useSyncedAppStore()

  const handleDragStart = (_e: React.DragEvent, index: number, roundNumber: number) => {
    console.log('[DRAG] Starting drag for PatternItem:', { index, roundNumber })
    setDraggedItem({ index, roundNumber })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number, roundNumber: number) => {
    e.preventDefault()
    
    if (draggedItem && draggedItem.roundNumber === roundNumber) {
      console.log('[DRAG] Dropping PatternItem:', {
        fromIndex: draggedItem.index,
        toIndex: targetIndex,
        roundNumber
      })
      
      if (draggedItem.index !== targetIndex) {
        await reorderPatternItemsInRound(roundNumber, draggedItem.index, targetIndex)
      }
      setDraggedItem(null)
    } else {
      console.log('[DRAG] Invalid drop - different rounds or no dragged item')
    }
  }

  const resetDrag = () => {
    setDraggedItem(null)
  }

  return {
    draggedItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDrag
  }
}