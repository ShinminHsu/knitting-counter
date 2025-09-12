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
  
  // Memoized scroll calculation function for new row-based layout
  const calculateScrollPosition = useCallback((
    currentStitch: number,
    _totalStitches: number,
    container: HTMLElement
  ) => {
    // Find the element that contains the current stitch by data-stitch-index
    const currentElement = container.querySelector(`[data-stitch-index="${currentStitch}"]`) as HTMLElement
    
    if (currentElement) {
      // Get the row container that contains this element
      const rowContainer = currentElement.closest('.grid')?.parentElement as HTMLElement
      if (!rowContainer) return 0
      
      // Scroll to center the current row
      const rowTop = rowContainer.offsetTop
      const rowHeight = rowContainer.offsetHeight
      const containerHeight = container.clientHeight
      
      return Math.max(0, rowTop - (containerHeight / 2) + (rowHeight / 2))
    }
    
    // If direct match fails, find by position in the list
    // Get all stitch elements sorted by their data-stitch-index
    const allStitchElements = Array.from(container.querySelectorAll('[data-stitch-index]'))
      .map(el => ({
        element: el as HTMLElement,
        index: parseInt(el.getAttribute('data-stitch-index') || '0')
      }))
      .sort((a, b) => a.index - b.index)
    
    // Find the element at the current stitch position
    const targetElement = allStitchElements.find(item => item.index === currentStitch)
    
    if (targetElement) {
      const rowContainer = targetElement.element.closest('.grid')?.parentElement as HTMLElement
      if (!rowContainer) return 0
      
      const rowTop = rowContainer.offsetTop
      const rowHeight = rowContainer.offsetHeight
      const containerHeight = container.clientHeight
      
      return Math.max(0, rowTop - (containerHeight / 2) + (rowHeight / 2))
    }
    
    return 0
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
      
      // Only scroll if position is different enough to be meaningful
      if (Math.abs(container.scrollTop - targetScrollTop) > 10) {
        performScroll(targetScrollTop, container)
      }
    }, 100) // Slightly increased delay for new layout
    
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