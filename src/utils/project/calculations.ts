import { Project } from '../../types'
import { getRoundTotalStitches } from '../pattern/operations'
import { getProjectPattern, getProjectCurrentRound, getProjectCurrentStitch } from './migration'
import { getProjectChartSummaries, getChartCompletedStitches } from '../chart/progress'
import { isMultiChartProject, migrateProjectToMultiChart } from './migration'

// 計算專案總時間
export function getProjectTotalTime(project: Project): number {
  return project.sessions.reduce((sum, session) => sum + session.duration, 0)
}

// 計算專案總圈數
export function getProjectTotalRounds(project: Project): number {
  const pattern = getProjectPattern(project)
  return pattern.map(round => round.roundNumber).reduce((max, num) => Math.max(max, num), 0)
}

// 計算專案總針數
export function getProjectTotalStitches(project: Project): number {
  const pattern = getProjectPattern(project)
  return pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
}

// 計算專案已完成針數
export function getProjectCompletedStitches(project: Project): number {
  const pattern = getProjectPattern(project)
  if (!pattern || pattern.length === 0) return 0
  
  let completed = 0
  const currentRound = getProjectCurrentRound(project)
  const currentStitch = getProjectCurrentStitch(project)
  
  // 計算已完成的完整圈數
  for (let roundNumber = 1; roundNumber < currentRound; roundNumber++) {
    const round = pattern.find(r => r.roundNumber === roundNumber)
    if (round) {
      completed += getRoundTotalStitches(round)
    }
  }
  
  // 添加當前圈的進度，但要確保不超出範圍
  const currentRoundData = pattern.find(r => r.roundNumber === currentRound)
  if (currentRoundData) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRoundData)
    const validCurrentStitch = Math.min(Math.max(0, currentStitch), maxStitchesInCurrentRound)
    completed += validCurrentStitch
  }
  
  return completed
}

// 計算專案進度百分比
export function getProjectProgressPercentage(project: Project): number {
  const pattern = getProjectPattern(project)
  if (!pattern || pattern.length === 0) return 0
  
  const totalStitches = getProjectTotalStitches(project)
  if (totalStitches === 0) return 0
  
  const completedStitches = getProjectCompletedStitches(project)
  const progressRatio = completedStitches / totalStitches
  
  // 確保進度百分比在0-1之間
  return Math.min(Math.max(0, progressRatio), 1)
}

// ==================== 多織圖聚合計算函數 ====================

// 計算專案總圈數（所有織圖）
export function getProjectTotalRoundsAllCharts(project: Project): number {
  const chartSummaries = getProjectChartSummaries(project)
  return chartSummaries.reduce((sum, chart) => sum + chart.roundCount, 0)
}

// 計算專案總針數（所有織圖）
export function getProjectTotalStitchesAllCharts(project: Project): number {
  const chartSummaries = getProjectChartSummaries(project)
  return chartSummaries.reduce((sum, chart) => sum + chart.totalStitches, 0)
}

// 計算專案已完成針數（所有織圖）
export function getProjectCompletedStitchesAllCharts(project: Project): number {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  // 處理多織圖項目
  if (isMultiChartProject(project)) {
    return project.charts!.reduce((sum, chart) => {
      return sum + getChartCompletedStitches(chart)
    }, 0)
  }
  
  // 向後兼容：處理單織圖項目
  return getProjectCompletedStitches(project)
}

// 計算專案進度百分比（所有織圖）
export function getProjectProgressPercentageAllCharts(project: Project): number {
  const totalStitches = getProjectTotalStitchesAllCharts(project)
  if (totalStitches === 0) return 0
  
  const completedStitches = getProjectCompletedStitchesAllCharts(project)
  const progressRatio = completedStitches / totalStitches
  
  // 確保進度百分比在0-1之間
  return Math.min(Math.max(0, progressRatio), 1)
}

// 檢查專案是否完成
export function isProjectCompleted(project: Project): boolean {
  const pattern = getProjectPattern(project)
  if (!pattern || pattern.length === 0) return false
  
  const totalRounds = getProjectTotalRounds(project)
  const currentRound = getProjectCurrentRound(project)
  const currentStitch = getProjectCurrentStitch(project)
  
  // 如果當前圈數超過總圈數，認為已完成
  if (currentRound > totalRounds) return true
  
  // 如果在最後一圈且針數達到最後一針，也認為已完成
  if (currentRound === totalRounds) {
    const lastRound = pattern.find(r => r.roundNumber === totalRounds)
    if (lastRound) {
      const totalStitchesInLastRound = getRoundTotalStitches(lastRound)
      return currentStitch >= totalStitchesInLastRound
    }
  }
  
  return false
}

// 安全獲取專案當前圈數
export function getProjectCurrentRoundSafe(project: Project | null | undefined): number {
  if (!project) return 1
  return getProjectCurrentRound(project)
}

// 安全獲取專案當前針數
export function getProjectCurrentStitchSafe(project: Project | null | undefined): number {
  if (!project) return 0
  return getProjectCurrentStitch(project)
}

// 安全獲取專案織圖數據
export function getProjectPatternSafe(project: Project | null | undefined): any[] {
  if (!project) return []
  return getProjectPattern(project)
}