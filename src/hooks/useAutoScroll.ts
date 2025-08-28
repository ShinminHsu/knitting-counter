import { useEffect, useCallback, useRef } from 'react'
import { Round, Project } from '../types'
import { getRoundTotalStitches } from '../utils'

interface UseAutoScrollProps {
  currentProject: Project | null
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
  displayRound,
  isViewMode,
  patternContainerRef
}: UseAutoScrollProps): UseAutoScrollReturn {
  
  // Use refs to store previous values to avoid unnecessary re-renders
  const previousStitchRef = useRef<number>(-1)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Memoized scroll calculation function
  const calculateScrollPosition = useCallback((
    currentStitch: number,
    totalStitches: number,
    container: HTMLElement
  ) => {
    const stitchesPerRow = 12 // Desktop shows 12 stitches per row
    const maxVisibleRows = 4 // Maximum 4 rows visible at once
    
    if (totalStitches === 0) return 0
    
    // Calculate current row (1-based)
    const currentRow = Math.ceil((currentStitch + 1) / stitchesPerRow)
    
    // Calculate total rows
    const totalRows = Math.ceil(totalStitches / stitchesPerRow)
    
    // If total rows <= max visible rows, no scrolling needed
    if (totalRows <= maxVisibleRows) return 0
    
    // Calculate target start row
    let startRow = 1
    
    // Start scrolling when user reaches 3rd row
    if (currentRow >= 3) {
      // Keep current row in 2nd position
      startRow = currentRow - 1
      
      // Special handling when approaching the end
      const isNearEnd = currentRow > totalRows - maxVisibleRows + 1
      if (isNearEnd) {
        // When near end, keep current row visible
        startRow = Math.max(1, currentRow - 1)
      } else {
        // In middle section, use standard range limiting
        startRow = Math.max(1, Math.min(startRow, totalRows - maxVisibleRows + 1))
      }
    }
    
    // Calculate stitch height dynamically
    const stitchElements = container.querySelectorAll('.grid > div')
    if (stitchElements.length === 0) return 0
    
    const firstStitch = stitchElements[0] as HTMLElement
    const stitchHeight = firstStitch.offsetHeight + 8 // Include gap
    
    // Calculate scroll position
    return (startRow - 1) * stitchHeight
  }, [])
  
  // Optimized scroll function with debouncing
  const performScroll = useCallback((targetScrollTop: number, container: HTMLElement) => {
    // Clear any existing pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Use RAF for smooth animation
    const startScrollTop = container.scrollTop
    const distance = targetScrollTop - startScrollTop
    const duration = 300 // ms
    const startTime = performance.now()
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      
      container.scrollTop = startScrollTop + distance * easeOutCubic
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }
    
    requestAnimationFrame(animateScroll)
  }, [])
  
  // Main auto-scroll effect
  useEffect(() => {
    if (!currentProject || isViewMode || !patternContainerRef.current || !displayRound) {
      return
    }
    
    const currentStitch = currentProject.currentStitch || 0
    const container = patternContainerRef.current
    
    // Performance optimization: Only scroll if stitch position actually changed
    if (previousStitchRef.current === currentStitch) {
      return
    }
    previousStitchRef.current = currentStitch
    
    // Debounce the scroll calculation to avoid excessive calculations
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (!container) return
      
      const totalStitches = getRoundTotalStitches(displayRound)
      const targetScrollTop = calculateScrollPosition(currentStitch, totalStitches, container)
      
      // Only scroll if there's a meaningful difference
      const currentScrollTop = container.scrollTop
      const scrollThreshold = 10 // pixels
      
      if (Math.abs(targetScrollTop - currentScrollTop) > scrollThreshold) {
        performScroll(targetScrollTop, container)
      }
    }, 100) // 100ms debounce
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [
    currentProject?.currentStitch,
    isViewMode,
    currentProject,
    displayRound,
    calculateScrollPosition,
    performScroll,
    patternContainerRef
  ])
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])
  
  return {}
}