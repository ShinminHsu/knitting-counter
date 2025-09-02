import { useCallback } from 'react'
import { useChartStore } from '../stores/useChartStore'
import { useProjectStore } from '../stores/useProjectStore'
import { getRoundTotalStitches } from '../utils'

/**
 * Chart-aware progress operations hook
 * Provides operations that work with the currently selected chart
 */
export const useChartProgressOperations = () => {
  const { getCurrentChart: getStoreCurrentChart, updateChart, updateChartProgress } = useChartStore()
  const { currentProject } = useProjectStore()

  // Get current chart
  const currentChart = getStoreCurrentChart()
  

  // Chart-aware next stitch operation
  const nextStitch = useCallback(async () => {
    if (!currentProject || !currentChart || currentChart.isCompleted) {
      console.log('[CHART_PROGRESS] nextStitch: No current project/chart or already completed')
      return
    }

    const pattern = currentChart.rounds || []
    if (pattern.length === 0) {
      console.log('[CHART_PROGRESS] nextStitch: No pattern available in current chart')
      return
    }

    const currentRound = pattern.find(r => r.roundNumber === currentChart.currentRound)
    if (!currentRound) {
      console.log('[CHART_PROGRESS] nextStitch: Current round not found', currentChart.currentRound)
      // Try to adjust to valid round
      const minRoundNumber = Math.min(...pattern.map(r => r.roundNumber))
      await updateChartProgress(currentChart.id, {
        currentRound: minRoundNumber,
        currentStitch: 0
      })
      return
    }

    const totalStitchesInRound = getRoundTotalStitches(currentRound)
    let newStitch = currentChart.currentStitch + 1
    let newRound = currentChart.currentRound
    let isCompleted = false

    if (newStitch >= totalStitchesInRound) {
      const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
      
      if (currentChart.currentRound >= maxRoundNumber) {
        isCompleted = true
        newStitch = totalStitchesInRound
        newRound = currentChart.currentRound
      } else {
        // Find next available round
        const nextRoundNumber = currentChart.currentRound + 1
        const nextRound = pattern.find(r => r.roundNumber === nextRoundNumber)
        if (nextRound) {
          newStitch = 0
          newRound = nextRoundNumber
        } else {
          // If next round doesn't exist, stay at current round end
          newStitch = totalStitchesInRound
          newRound = currentChart.currentRound
          isCompleted = true
        }
      }
    }

    await updateChartProgress(currentChart.id, {
      currentRound: newRound,
      currentStitch: newStitch,
      isCompleted
    })
  }, [currentProject, currentChart, updateChart])

  // Chart-aware previous stitch operation
  const previousStitch = useCallback(async () => {
    if (!currentProject || !currentChart) {
      console.log('[CHART_PROGRESS] previousStitch: No current project/chart')
      return
    }

    const pattern = currentChart.rounds || []
    if (pattern.length === 0) {
      console.log('[CHART_PROGRESS] previousStitch: No pattern available in current chart')
      return
    }

    let newStitch = currentChart.currentStitch - 1
    let newRound = currentChart.currentRound

    if (newStitch < 0 && newRound > 1) {
      // Try to find previous available round
      for (let roundNum = currentChart.currentRound - 1; roundNum >= 1; roundNum--) {
        const previousRound = pattern.find(r => r.roundNumber === roundNum)
        if (previousRound) {
          newRound = roundNum
          newStitch = getRoundTotalStitches(previousRound) - 1
          break
        }
      }
      
      // If can't find previous round, stay at position
      if (newStitch < 0) {
        newStitch = 0
        newRound = currentChart.currentRound
      }
    } else if (newStitch < 0) {
      newStitch = 0
    }

    // Ensure round is valid
    const targetRound = pattern.find(r => r.roundNumber === newRound)
    if (!targetRound) {
      console.log('[CHART_PROGRESS] previousStitch: Target round not found', newRound)
      // Adjust to minimum available round
      const minRoundNumber = Math.min(...pattern.map(r => r.roundNumber))
      newRound = minRoundNumber
      newStitch = 0
    }

    await updateChartProgress(currentChart.id, {
      currentRound: newRound,
      currentStitch: newStitch,
      isCompleted: false // Reset completion status when going back
    })
  }, [currentProject, currentChart, updateChart])

  // Chart-aware round completion
  const completeRound = useCallback(async (roundNumber?: number) => {
    if (!currentProject || !currentChart) {
      console.log('[CHART_PROGRESS] completeRound: No current project/chart')
      return
    }

    const targetRoundNumber = roundNumber || currentChart.currentRound
    const pattern = currentChart.rounds || []
    const targetRound = pattern.find(r => r.roundNumber === targetRoundNumber)
    
    if (!targetRound) {
      console.log('[CHART_PROGRESS] completeRound: Target round not found', targetRoundNumber)
      return
    }

    console.log('[CHART_PROGRESS] completeRound: Completing round', targetRoundNumber)
    
    // Check if it's the last round
    const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
    
    if (targetRoundNumber >= maxRoundNumber) {
      // If it's the last round, mark chart as completed
      await updateChartProgress(currentChart.id, {
        currentRound: targetRoundNumber,
        currentStitch: getRoundTotalStitches(targetRound),
        isCompleted: true
      })
      console.log('[CHART_PROGRESS] completeRound: Marking chart as completed')
    } else {
      // Move to next round
      const nextRoundNumber = targetRoundNumber + 1
      await updateChartProgress(currentChart.id, {
        currentRound: nextRoundNumber,
        currentStitch: 0,
        isCompleted: false
      })
      console.log('[CHART_PROGRESS] completeRound: Moving to next round', nextRoundNumber)
    }
  }, [currentProject, currentChart, updateChart])

  // Chart-aware reset progress
  const resetChartProgress = useCallback(async () => {
    if (!currentProject || !currentChart) return

    const pattern = currentChart.rounds || []
    const minRoundNumber = pattern.length > 0 ? Math.min(...pattern.map(r => r.roundNumber)) : 1

    await updateChartProgress(currentChart.id, {
      currentRound: minRoundNumber,
      currentStitch: 0,
      isCompleted: false
    })
    console.log('[CHART_PROGRESS] Reset progress for chart:', currentChart.id)
  }, [currentProject, currentChart, updateChart])

  // Set current round for current chart
  const setCurrentRound = useCallback(async (roundNumber: number) => {
    if (!currentProject || !currentChart) {
      console.log('[CHART_PROGRESS] setCurrentRound: No current project/chart')
      return
    }

    // Validate round number
    const pattern = currentChart.rounds || []
    const targetRound = pattern.find(r => r.roundNumber === roundNumber)
    if (!targetRound) {
      console.error('[CHART_PROGRESS] setCurrentRound: Invalid round number', roundNumber)
      return
    }

    console.log('[CHART_PROGRESS] setCurrentRound: Updating from round', currentChart.currentRound, 'to', roundNumber)

    await updateChartProgress(currentChart.id, {
      currentRound: roundNumber,
      currentStitch: 0,
      isCompleted: false
    })
  }, [currentProject, currentChart, updateChart])

  // Check if we can go to previous stitch
  const canGoPrevious = useCallback(() => {
    if (!currentChart) return false
    return !(currentChart.currentRound === 1 && currentChart.currentStitch === 0)
  }, [currentChart])

  // Check if round can be completed
  const canCompleteRound = useCallback((roundNumber?: number) => {
    if (!currentChart) return false
    const targetRound = roundNumber || currentChart.currentRound
    return targetRound === currentChart.currentRound
  }, [currentChart])

  return {
    // Current chart info
    currentChart,
    
    // Progress operations
    nextStitch,
    previousStitch,
    completeRound,
    resetChartProgress,
    setCurrentRound,
    
    // State checks
    canGoPrevious,
    canCompleteRound,
    
    // Legacy compatibility for projects without charts
    isChartMode: !!currentChart
  }
}

export default useChartProgressOperations