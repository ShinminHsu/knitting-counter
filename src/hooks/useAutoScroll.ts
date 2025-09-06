import { useEffect, useCallback, useRef } from 'react'
import { Round, Project } from '../types'
import { getRoundTotalStitches } from '../utils'

interface UseAutoScrollProps {
  currentProject: Project | null
  currentChart: any | null
  displayRound: Round | undefined
  isViewMode: boolean
  patternContainerRef: React.RefObject<HTMLDivElement>
}

interface UseAutoScrollReturn {
  // No return values needed - this hook handles auto-scrolling internally
}

/**
 * Custom hook to handle automatic scrolling in the progress tracking view
 * Optimized for performance with large stitch counts
 */
export function useAutoScroll({
  currentProject,
  currentChart,
  displayRound,
  isViewMode,
  patternContainerRef
}: UseAutoScrollProps): UseAutoScrollReturn {
  
  // Use refs to store previous values to avoid unnecessary re-renders
  const previousStitchRef = useRef<number>(-1)
  
  // Memoized scroll calculation function
  const calculateScrollPosition = useCallback((
    currentStitch: number,
    totalStitches: number,
    container: HTMLElement
  ) => {
    const gridContainer = container.querySelector('.grid')
    if (!gridContainer) return 0
    
    const stitchElements = gridContainer.children
    if (stitchElements.length === 0) return 0
    
    // Get computed style to determine current grid columns
    const computedStyle = window.getComputedStyle(gridContainer)
    const gridTemplateColumns = computedStyle.gridTemplateColumns
    const stitchesPerRow = gridTemplateColumns.split(' ').length
    
    if (totalStitches === 0 || stitchesPerRow === 0) return 0
    
    // Calculate current row (0-based index)
    const currentRowIndex = Math.floor(currentStitch / stitchesPerRow)
    
    // Calculate row height from first stitch element
    const firstStitch = stitchElements[0] as HTMLElement
    const computedStyles = window.getComputedStyle(firstStitch)
    const rowHeight = firstStitch.offsetHeight + parseFloat(computedStyles.marginBottom || '0') + 8
    
    // Get container height to determine visible rows
    const containerHeight = container.clientHeight
    const visibleRows = Math.floor(containerHeight / rowHeight)
    
    // Calculate total rows
    const totalRows = Math.ceil(totalStitches / stitchesPerRow)
    
    // If all rows fit in container, no scrolling needed
    if (totalRows <= visibleRows) return 0
    
    // Keep current row in the middle of visible area if possible
    const targetMiddleRow = Math.floor(visibleRows / 2)
    let targetTopRow = currentRowIndex - targetMiddleRow
    
    // Ensure we don't scroll past the beginning or end
    targetTopRow = Math.max(0, Math.min(targetTopRow, totalRows - visibleRows))
    
    return targetTopRow * rowHeight
  }, [])
  
  // Simplified scroll function
  const performScroll = useCallback((targetScrollTop: number, container: HTMLElement) => {
    // Use smooth scrolling with behavior
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }, [])
  
  // Main auto-scroll effect
  useEffect(() => {
    if (!currentProject || !currentChart || isViewMode || !patternContainerRef.current || !displayRound) {
      return
    }
    
    const currentStitch = currentChart.currentStitch || 0
    const container = patternContainerRef.current
    
    // Performance optimization: Only scroll if stitch position actually changed
    if (previousStitchRef.current === currentStitch) {
      return
    }
    previousStitchRef.current = currentStitch
    
    // Calculate scroll position with a small delay to allow DOM updates
    const timeoutId = setTimeout(() => {
      const totalStitches = getRoundTotalStitches(displayRound)
      const targetScrollTop = calculateScrollPosition(currentStitch, totalStitches, container)
      
      // Always scroll to calculated position (removed threshold check)
      performScroll(targetScrollTop, container)
    }, 50) // Reduced debounce time
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      clearTimeout(timeoutId)
    }
  }, [
    currentChart?.currentStitch,
    isViewMode,
    currentProject,
    currentChart,
    displayRound,
    calculateScrollPosition,
    performScroll,
    patternContainerRef
  ])
  
  // No cleanup effect needed since we use local timeout variables
  
  return {}
}