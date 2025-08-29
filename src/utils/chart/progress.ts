import { Project, Chart, ChartSummary } from '../../types'
import { getRoundTotalStitches } from '../pattern/operations'
import { migrateProjectToMultiChart } from '../project/migration'

// 獲取專案的所有織圖摘要
export function getProjectChartSummaries(project: Project): ChartSummary[] {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return []

  return project.charts.map(chart => ({
    id: chart.id,
    name: chart.name,
    description: chart.description,
    notes: chart.notes,
    roundCount: chart.rounds ? chart.rounds.length : 0,
    totalStitches: chart.rounds ? chart.rounds.reduce((sum, round) => sum + getRoundTotalStitches(round), 0) : 0,
    currentProgress: getChartProgressPercentage(chart),
    isCompleted: chart.isCompleted || false,
    lastModified: chart.lastModified
  }))
}

// 計算織圖進度百分比
export function getChartProgressPercentage(chart: Chart): number {
  if (!chart.rounds || chart.rounds.length === 0) return 0
  
  const totalStitches = chart.rounds.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
  if (totalStitches === 0) return 0
  
  let completedStitches = 0
  
  // 計算已完成的完整圈數
  for (let roundNumber = 1; roundNumber < chart.currentRound; roundNumber++) {
    const round = chart.rounds.find(r => r.roundNumber === roundNumber)
    if (round) {
      completedStitches += getRoundTotalStitches(round)
    }
  }
  
  // 添加當前圈的進度
  const currentRound = chart.rounds.find(r => r.roundNumber === chart.currentRound)
  if (currentRound) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRound)
    const validCurrentStitch = Math.min(Math.max(0, chart.currentStitch), maxStitchesInCurrentRound)
    completedStitches += validCurrentStitch
  }
  
  const progressRatio = completedStitches / totalStitches
  return Math.min(Math.max(0, progressRatio * 100), 100)
}

// 計算織圖已完成針數
export function getChartCompletedStitches(chart: Chart): number {
  if (!chart.rounds || chart.rounds.length === 0) return 0
  
  let completed = 0
  
  // 計算已完成的完整圈數
  for (let roundNumber = 1; roundNumber < chart.currentRound; roundNumber++) {
    const round = chart.rounds.find(r => r.roundNumber === roundNumber)
    if (round) {
      completed += getRoundTotalStitches(round)
    }
  }
  
  // 添加當前圈的進度
  const currentRound = chart.rounds.find(r => r.roundNumber === chart.currentRound)
  if (currentRound) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRound)
    const validCurrentStitch = Math.min(Math.max(0, chart.currentStitch), maxStitchesInCurrentRound)
    completed += validCurrentStitch
  }
  
  return completed
}

// 檢查織圖是否完成
export function isChartCompleted(chart: Chart): boolean {
  if (!chart.rounds || chart.rounds.length === 0) return false
  
  const totalRounds = Math.max(...chart.rounds.map(r => r.roundNumber))
  
  // 如果當前圈數超過總圈數，認為已完成
  if (chart.currentRound > totalRounds) return true
  
  // 如果在最後一圈且針數達到最後一針，也認為已完成
  if (chart.currentRound === totalRounds) {
    const lastRound = chart.rounds.find(r => r.roundNumber === totalRounds)
    if (lastRound) {
      const totalStitchesInLastRound = getRoundTotalStitches(lastRound)
      return chart.currentStitch >= totalStitchesInLastRound
    }
  }
  
  return false
}