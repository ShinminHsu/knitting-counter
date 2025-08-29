import { Project, Chart } from '../../types'
import { generateId } from '../common/generators'
import { migrateProjectToMultiChart } from '../project/migration'

// 創建新織圖
export function createChart(name: string, description?: string, notes?: string): Chart {
  return {
    id: generateId(),
    name: name.trim() || '新織圖',
    description: description?.trim() || '',
    rounds: [],
    currentRound: 1,
    currentStitch: 0,
    createdDate: new Date(),
    lastModified: new Date(),
    isCompleted: false,
    notes: notes?.trim() || ''
  }
}

// 獲取專案的當前織圖
export function getCurrentChart(project: Project): Chart | null {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts || project.charts.length === 0) {
    return null
  }

  // 如果有指定的當前織圖ID，優先使用
  if (project.currentChartId) {
    const chart = project.charts.find(c => c.id === project.currentChartId)
    if (chart) return chart
  }

  // 否則返回第一個織圖
  return project.charts[0]
}

// 更新專案的當前織圖
export function setCurrentChart(project: Project, chartId: string): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return false
  
  const chart = project.charts.find(c => c.id === chartId)
  if (!chart) return false
  
  project.currentChartId = chartId
  return true
}

// 添加織圖到專案
export function addChartToProject(project: Project, chart: Chart): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) {
    project.charts = []
  }
  
  // 檢查是否已存在相同ID的織圖
  if (project.charts.some(c => c.id === chart.id)) {
    return false
  }
  
  project.charts.push(chart)
  
  // 如果這是第一個織圖，設為當前織圖
  if (project.charts.length === 1) {
    project.currentChartId = chart.id
  }
  
  return true
}

// 從專案中移除織圖
export function removeChartFromProject(project: Project, chartId: string): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return false
  
  const initialLength = project.charts.length
  project.charts = project.charts.filter(c => c.id !== chartId)
  
  // 如果移除的是當前織圖，切換到第一個可用的織圖
  if (project.currentChartId === chartId && project.charts.length > 0) {
    project.currentChartId = project.charts[0].id
  } else if (project.charts.length === 0) {
    project.currentChartId = undefined
  }
  
  return project.charts.length < initialLength
}

// 更新專案中的織圖
export function updateChartInProject(project: Project, updatedChart: Chart): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return false
  
  const index = project.charts.findIndex(c => c.id === updatedChart.id)
  if (index === -1) return false
  
  // CRITICAL FIX: Use the updatedChart directly to avoid reintroducing Timestamp objects
  // The updatedChart should already contain all necessary fields with proper Date objects
  
  // Use updatedChart as the primary source, only preserve essential fields if missing
  project.charts[index] = {
    ...updatedChart,
    // Always ensure lastModified is current
    lastModified: new Date()
  }
  
  
  return true
}