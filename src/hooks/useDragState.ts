import React, { useState } from 'react'

export enum DragType {
  NONE = 'none',
  ROUND = 'round',
  PATTERN_ITEM = 'pattern_item',
  GROUP_STITCH = 'group_stitch'
}

interface DragState {
  type: DragType
  data?: any
}

// Global drag state to prevent conflicts
let globalDragState: DragState = { type: DragType.NONE }
const listeners: Array<() => void> = []

function notifyListeners() {
  listeners.forEach(listener => listener())
}

export function useDragState() {
  const [, forceUpdate] = useState({})

  const subscribe = (listener: () => void) => {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  const setDragState = (type: DragType, data?: any) => {
    globalDragState = { type, data }
    notifyListeners()
  }

  const getDragState = () => globalDragState

  const isDragging = (type: DragType) => globalDragState.type === type

  const clearDragState = () => {
    globalDragState = { type: DragType.NONE }
    notifyListeners()
  }

  // Subscribe to changes
  React.useEffect(() => {
    const unsubscribe = subscribe(() => {
      forceUpdate({})
    })
    return unsubscribe
  }, [])

  return {
    dragState: globalDragState,
    setDragState,
    getDragState,
    isDragging,
    clearDragState
  }
}