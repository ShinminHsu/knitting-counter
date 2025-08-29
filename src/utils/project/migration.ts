import { Project, Chart, Round, ProjectMigrationResult } from '../../types'
import { generateId } from '../common/generators'
// 注意：為了避免循環依賴，這裡不直接導入 getCurrentChart
// 而是在函數內部實現相關邏輯

// 兼容性函數：獲取專案的織圖數據（支持新舊格式）
export function getProjectPattern(project: Project): Round[] {
  // 優先使用當前織圖的數據（避免循環依賴，直接實現邏輯）
  if (project.charts && project.charts.length > 0) {
    let currentChart = null
    if (project.currentChartId) {
      currentChart = project.charts.find(c => c.id === project.currentChartId)
    }
    if (!currentChart) {
      currentChart = project.charts[0]
    }
    if (currentChart && currentChart.rounds) {
      return currentChart.rounds
    }
  }
  
  // 回退到舊格式
  return project.pattern || []
}

// 兼容性函數：獲取專案的當前圈數
export function getProjectCurrentRound(project: Project): number {
  // 優先使用當前織圖的數據（避免循環依賴，直接實現邏輯）
  if (project.charts && project.charts.length > 0) {
    let currentChart = null
    if (project.currentChartId) {
      currentChart = project.charts.find(c => c.id === project.currentChartId)
    }
    if (!currentChart) {
      currentChart = project.charts[0]
    }
    if (currentChart) {
      return currentChart.currentRound
    }
  }
  
  // 回退到舊格式
  return project.currentRound || 1
}

// 兼容性函數：獲取專案的當前針數
export function getProjectCurrentStitch(project: Project): number {
  // 優先使用當前織圖的數據（避免循環依賴，直接實現邏輯）
  if (project.charts && project.charts.length > 0) {
    let currentChart = null
    if (project.currentChartId) {
      currentChart = project.charts.find(c => c.id === project.currentChartId)
    }
    if (!currentChart) {
      currentChart = project.charts[0]
    }
    if (currentChart) {
      return currentChart.currentStitch
    }
  }
  
  // 回退到舊格式
  return project.currentStitch || 0
}

// 檢查專案是否為舊格式（只有 pattern 沒有 charts）
export function isLegacyProject(project: Project): boolean {
  return !project.charts && !!project.pattern && Array.isArray(project.pattern) && project.pattern.length > 0
}

// 檢查專案是否為新格式（有 charts）
export function isMultiChartProject(project: Project): boolean {
  return !!project.charts && Array.isArray(project.charts) && project.charts.length > 0
}

// 將舊格式專案遷移為新格式（向後兼容）
export function migrateProjectToMultiChart(project: Project): ProjectMigrationResult {
  try {
    console.log('[MIGRATION-DEBUG] Starting migration for project:', {
      projectId: project.id,
      projectName: project.name,
      hasCharts: !!project.charts,
      hasPattern: !!project.pattern,
      chartsLength: project.charts?.length || 0,
      patternLength: project.pattern?.length || 0,
      projectKeys: Object.keys(project),
      isLegacy: isLegacyProject(project),
      isMultiChart: isMultiChartProject(project)
    })

    // 如果已經是新格式，直接返回
    if (isMultiChartProject(project)) {
      console.log('[MIGRATION-DEBUG] Project already in multi-chart format')
      return {
        success: true,
        migratedChartsCount: 0,
        errors: []
      }
    }

    // 如果是舊格式，進行遷移
    if (isLegacyProject(project)) {
      console.log('[MIGRATION-DEBUG] Migrating legacy project to multi-chart format')
      
      const defaultChart: Chart = {
        id: generateId(),
        name: '主織圖',
        description: '從舊版本遷移的織圖',
        rounds: project.pattern || [],
        currentRound: project.currentRound || 1,
        currentStitch: project.currentStitch || 0,
        createdDate: project.createdDate,
        lastModified: new Date(),
        isCompleted: project.isCompleted || false,
        notes: ''
      }

      console.log('[MIGRATION-DEBUG] Created default chart:', {
        chartId: defaultChart.id,
        roundsCount: defaultChart.rounds.length,
        currentRound: defaultChart.currentRound,
        currentStitch: defaultChart.currentStitch
      })

      // 更新專案結構
      const migratedProject: Project = {
        ...project,
        charts: [defaultChart],
        currentChartId: defaultChart.id,
        // 保留舊欄位以確保向後兼容
        pattern: project.pattern,
        currentRound: project.currentRound,
        currentStitch: project.currentStitch
      }

      console.log('[MIGRATION-DEBUG] About to assign migrated project with keys:', Object.keys(migratedProject))
      console.log('[MIGRATION-DEBUG] Original project before assignment:', {
        projectId: project.id,
        hasRequiredFields: {
          id: !!project.id,
          name: !!project.name,
          createdDate: project.createdDate instanceof Date,
          lastModified: project.lastModified instanceof Date,
          yarns: Array.isArray(project.yarns),
          sessions: Array.isArray(project.sessions)
        }
      })

      Object.assign(project, migratedProject)

      console.log('[MIGRATION-DEBUG] Project after assignment:', {
        projectId: project.id,
        hasCharts: !!project.charts,
        chartsLength: project.charts?.length || 0,
        currentChartId: project.currentChartId,
        hasRequiredFields: {
          id: !!project.id,
          name: !!project.name,
          createdDate: project.createdDate instanceof Date,
          lastModified: project.lastModified instanceof Date,
          yarns: Array.isArray(project.yarns),
          sessions: Array.isArray(project.sessions)
        },
        projectKeys: Object.keys(project)
      })

      return {
        success: true,
        migratedChartsCount: 1,
        errors: []
      }
    }

    // 如果沒有任何織圖資料，創建空的 charts 陣列
    if (!project.charts) {
      console.log('[MIGRATION-DEBUG] Creating empty charts array for project')
      project.charts = []
    }
    return {
      success: true,
      migratedChartsCount: 0,
      errors: []
    }

  } catch (error) {
    console.error('[MIGRATION-DEBUG] Migration failed:', error)
    return {
      success: false,
      migratedChartsCount: 0,
      errors: [error instanceof Error ? error.message : '未知錯誤']
    }
  }
}