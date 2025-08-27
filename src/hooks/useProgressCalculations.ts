import { useMemo } from 'react'
import { Project, Round, Chart, PatternItemType, StitchInfo, StitchGroup } from '../types'
import {
  getProjectProgressPercentage,
  getProjectTotalRoundsAllCharts,
  getProjectTotalStitchesAllCharts,
  getProjectCompletedStitchesAllCharts,
  getProjectCurrentRound,
  getProjectCurrentStitch,
  getProjectPattern,
  getRoundTotalStitches,
  getSortedPatternItems,
  getStitchDisplayInfo,
  getChartProgressPercentage,
  getChartCompletedStitches,
} from '../utils'

interface UseProgressCalculationsProps {
  currentProject: Project | null
  currentChart: Chart | null
  viewingRound?: number | null
}

interface UseProgressCalculationsReturn {
  // Overall progress
  progressPercentage: number
  totalRounds: number
  totalStitches: number
  completedStitches: number
  currentRound: number
  currentStitch: number
  isCompleted: boolean
  
  // Current round info
  displayRoundNumber: number
  displayRound: Round | undefined
  currentStitchInRound: number
  totalStitchesInCurrentRound: number
  isViewMode: boolean
  
  // Round description
  roundDescription: string
  
  // Chart info
  chartName: string
  hasMultipleCharts: boolean
}

/**
 * Custom hook that calculates all progress-related data and round descriptions
 * Optimized with memoization to prevent unnecessary recalculations
 */
export function useProgressCalculations({
  currentProject,
  currentChart,
  viewingRound
}: UseProgressCalculationsProps): UseProgressCalculationsReturn {
  
  // Memoized overall progress calculations
  const progressData = useMemo(() => {
    if (!currentProject) {
      return {
        progressPercentage: 0,
        totalRounds: 0,
        totalStitches: 0,
        completedStitches: 0,
        currentRound: 1,
        currentStitch: 0,
        isCompleted: false
      }
    }
    
    // Use chart data if available for current progress, but project data for overall stats
    const currentRound = currentChart ? currentChart.currentRound : getProjectCurrentRound(currentProject)
    const currentStitch = currentChart ? currentChart.currentStitch : getProjectCurrentStitch(currentProject)
    const isCompleted = currentChart ? (currentChart.isCompleted || false) : (currentProject.isCompleted || false)
    
    
    // Use current chart data if available, otherwise fall back to project data
    let progressPercentage, totalRounds, totalStitches, completedStitches
    
    if (currentChart) {
      // Calculate progress based on current chart only
      progressPercentage = getChartProgressPercentage(currentChart) / 100
      totalRounds = currentChart.rounds?.length || 0
      totalStitches = currentChart.rounds?.reduce((sum, round) => sum + getRoundTotalStitches(round), 0) || 0
      completedStitches = getChartCompletedStitches(currentChart)
    } else {
      // Fall back to project-wide calculations
      progressPercentage = getProjectProgressPercentage(currentProject)
      totalRounds = getProjectTotalRoundsAllCharts(currentProject)
      totalStitches = getProjectTotalStitchesAllCharts(currentProject)
      completedStitches = getProjectCompletedStitchesAllCharts(currentProject)
    }
    
    return {
      progressPercentage,
      totalRounds,
      totalStitches,
      completedStitches,
      currentRound,
      currentStitch,
      isCompleted
    }
  }, [currentProject, currentChart])
  
  // Memoized current round data
  const roundData = useMemo(() => {
    if (!currentProject) {
      return {
        displayRoundNumber: 1,
        displayRound: undefined,
        currentStitchInRound: 0,
        totalStitchesInCurrentRound: 0,
        isViewMode: false
      }
    }
    
    // Use chart data if available, fallback to project data
    const currentRound = currentChart ? currentChart.currentRound : getProjectCurrentRound(currentProject)
    const currentStitch = currentChart ? currentChart.currentStitch : getProjectCurrentStitch(currentProject)
    
    const isViewMode = viewingRound !== null && viewingRound !== currentRound
    const displayRoundNumber = viewingRound ?? currentRound
    
    // Get pattern from chart if available, fallback to project pattern
    const pattern = currentChart ? currentChart.rounds : getProjectPattern(currentProject)
    const displayRound = pattern.find((r: any) => r.roundNumber === displayRoundNumber)
    
    const currentStitchInRound = isViewMode ? 0 : currentStitch
    const totalStitchesInCurrentRound = displayRound ? getRoundTotalStitches(displayRound) : 0
    
    
    return {
      displayRoundNumber,
      displayRound,
      currentStitchInRound,
      totalStitchesInCurrentRound,
      isViewMode
    }
  }, [currentProject, currentChart, viewingRound])
  
  // Memoized round description
  const roundDescription = useMemo(() => {
    if (!roundData.displayRound || !currentProject) {
      return ''
    }
    
    return generateRoundDescription(roundData.displayRound)
  }, [roundData.displayRound, currentProject])
  
  // Memoized chart information
  const chartData = useMemo(() => {
    if (!currentProject) {
      return {
        chartName: '',
        hasMultipleCharts: false
      }
    }
    
    const hasMultipleCharts = !!(currentProject.charts && currentProject.charts.length > 1)
    const chartName = currentChart?.name || '主織圖'
    
    return {
      chartName,
      hasMultipleCharts
    }
  }, [currentProject, currentChart])
  
  return {
    ...progressData,
    ...roundData,
    roundDescription,
    ...chartData
  }
}

/**
 * Generate a description of the round's pattern
 * Optimized version of the original generateRoundDescription function
 */
function generateRoundDescription(round: Round): string {
  const descriptions: string[] = []
  
  // Use getSortedPatternItems for correct order
  const sortedPatternItems = getSortedPatternItems(round)
  
  if (sortedPatternItems.length > 0) {
    // Use new sorted format
    sortedPatternItems.forEach((item) => {
      if (item.type === PatternItemType.STITCH) {
        const stitch = item.data as StitchInfo
        const displayInfo = getStitchDisplayInfo(stitch)
        descriptions.push(`${displayInfo.rawValue} ${displayInfo.symbol} ${stitch.count}`)
      } else if (item.type === PatternItemType.GROUP) {
        const group = item.data as StitchGroup
        const groupDescriptions: string[] = []
        group.stitches.forEach((stitch: StitchInfo) => {
          const displayInfo = getStitchDisplayInfo(stitch)
          groupDescriptions.push(`${displayInfo.rawValue} ${displayInfo.symbol} ${stitch.count}`)
        })
        if (groupDescriptions.length > 0) {
          descriptions.push(`[${groupDescriptions.join(', ')}] * ${group.repeatCount}`)
        }
      }
    })
  } else {
    // Fallback to legacy format
    round.stitches.forEach((stitch: StitchInfo) => {
      const displayInfo = getStitchDisplayInfo(stitch)
      descriptions.push(`${displayInfo.rawValue} ${displayInfo.symbol} ${stitch.count}`)
    })
    
    round.stitchGroups.forEach((group: StitchGroup) => {
      const groupDescriptions: string[] = []
      group.stitches.forEach((stitch: StitchInfo) => {
        const displayInfo = getStitchDisplayInfo(stitch)
        groupDescriptions.push(`${displayInfo.rawValue} ${displayInfo.symbol} ${stitch.count}`)
      })
      if (groupDescriptions.length > 0) {
        descriptions.push(`[${groupDescriptions.join(', ')}] * ${group.repeatCount}`)
      }
    })
  }
  
  return descriptions.join(', ')
}