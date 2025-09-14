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
  triggerScroll: () => void
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
  
  // Memoized scroll calculation function for new inline-block layout
  const calculateScrollPosition = useCallback((
    currentStitch: number,
    _totalStitches: number,
    container: HTMLElement
  ) => {
    // Special case: if currentStitch is 0, scroll to top
    if (currentStitch === 0) {
      return 0
    }
    
    // Find the element that contains the current stitch by data-stitch-index
    const currentElement = container.querySelector(`[data-stitch-index="${currentStitch}"]`) as HTMLElement
    
    if (currentElement) {
      // Get the inline-block container that contains this element (.inline-block)
      const blockContainer = currentElement.closest('.inline-block') as HTMLElement
      
      if (!blockContainer) {
        return container.scrollTop
      }
      
      // Get all inline-block sections to calculate rows
      const allBlocks = Array.from(container.querySelectorAll('.inline-block')) as HTMLElement[]
      
      if (allBlocks.length === 0) return container.scrollTop
      
      // Get container dimensions
      const containerHeight = container.clientHeight
      const containerScrollHeight = container.scrollHeight
      const topBottomPadding = Math.min(80, containerHeight * 0.15) // 15% of container height or 80px
      
      
      // Calculate which visual row each block is in based on their actual positions
      // Get position relative to the scrolling container
      const containerRect = container.getBoundingClientRect()
      const blockRect = blockContainer.getBoundingClientRect()
      const blockTop = blockRect.top - containerRect.top + container.scrollTop
      
      // Group blocks by their vertical position (allowing for small differences)
      const rowGroups: HTMLElement[][] = []
      const tolerance = 10 // pixels tolerance for same row
      
      allBlocks.forEach((block) => {
        const currentBlockRect = block.getBoundingClientRect()
        const blockY = currentBlockRect.top - containerRect.top + container.scrollTop
        
        const existingRowIndex = rowGroups.findIndex(row => {
          const firstBlockInRowRect = row[0].getBoundingClientRect()
          const firstBlockY = firstBlockInRowRect.top - containerRect.top + container.scrollTop
          return Math.abs(firstBlockY - blockY) <= tolerance
        })
        
        if (existingRowIndex >= 0) {
          rowGroups[existingRowIndex].push(block)
        } else {
          rowGroups.push([block])
        }
      })
      
      // Sort row groups by position
      rowGroups.sort((a, b) => {
        const aRect = a[0].getBoundingClientRect()
        const bRect = b[0].getBoundingClientRect()
        const aY = aRect.top - containerRect.top + container.scrollTop
        const bY = bRect.top - containerRect.top + container.scrollTop
        return aY - bY
      })
      
      // Find which row the current block is in
      const currentRow = rowGroups.findIndex(row => row.includes(blockContainer))
      const totalRows = rowGroups.length
      
      let targetScrollTop: number
      
      if (currentRow === 0) {
        // First row: stay at top
        targetScrollTop = 0
      } else if (currentRow === totalRows - 1) {
        // Last row: just scroll to the maximum position to show as much as possible
        const maxScroll = containerScrollHeight - containerHeight
        targetScrollTop = maxScroll
        
      } else {
        
        // Middle rows: ensure the row is visible with context
        const currentScrollTop = container.scrollTop
        const visibleTop = currentScrollTop
        const visibleBottom = currentScrollTop + containerHeight
        const blockBottom = blockTop + blockContainer.offsetHeight
        
        // Check if block is already fully visible with padding
        if (blockTop >= visibleTop + topBottomPadding && blockBottom <= visibleBottom - topBottomPadding) {
          // Already visible, don't scroll
          targetScrollTop = currentScrollTop
        } else {
          // Try to center the block in the container with padding
          const blockHeight = blockContainer.offsetHeight
          const blockBottom = blockTop + blockHeight
          const idealPosition = blockTop - (containerHeight - blockHeight) / 2
          
          // Ensure minimum top padding
          let targetPos = Math.max(topBottomPadding, idealPosition)
          
          // Ensure the entire block is visible with bottom padding
          const maxScrollToShowCompleteBlock = blockBottom - containerHeight + topBottomPadding
          if (targetPos < maxScrollToShowCompleteBlock) {
            targetPos = maxScrollToShowCompleteBlock
          }
          
          // Ensure we don't scroll past the content maximum
          const maxScrollForContent = containerScrollHeight - containerHeight
          targetScrollTop = Math.min(targetPos, maxScrollForContent)
        }
      }
      
      // Prevent unnecessary small scrolls that cause jitter
      const currentScrollTop = container.scrollTop
      if (Math.abs(targetScrollTop - currentScrollTop) < 20) {
        return currentScrollTop
      }
      
      return targetScrollTop
    }
    
    // If element not found, don't scroll
    return container.scrollTop
  }, [])
  
  // Scroll function to perform smooth scrolling
  const performScroll = useCallback((targetScrollTop: number, container: HTMLElement) => {
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }, [])
  
  // Manual trigger function that can be called externally
  const triggerScroll = useCallback(() => {
    if (!currentProject || !currentChart || isViewMode || !patternContainerRef.current || !displayRound) {
      return
    }
    
    const currentStitch = currentChart.currentStitch || 0
    const container = patternContainerRef.current
    
    // Force update the previous ref to ensure scroll happens
    previousStitchRef.current = -1
    
    // Trigger scroll with appropriate delay
    setTimeout(() => {
      const totalStitches = getRoundTotalStitches(displayRound)
      const targetScrollTop = calculateScrollPosition(currentStitch, totalStitches, container)
      
      performScroll(targetScrollTop, container)
      previousStitchRef.current = currentStitch
    }, 200) // Longer delay for skip operations to avoid oscillation
  }, [currentProject, currentChart, isViewMode, patternContainerRef, displayRound, calculateScrollPosition, performScroll])
  
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
    }, 150) // Increased delay to reduce oscillation
    
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
  
  return { triggerScroll }
}