import { 
  Project, 
  ProjectExportData, 
  ExportType, 
  ImportResult, 
  ImportMode
} from '../types'
import { generateId } from '../utils'

import { logger } from '../utils/logger'
export class ImportExportService {
  private static readonly CURRENT_VERSION = '1.0.0'

  static exportProject(project: Project, exportType: ExportType): string {
    try {
      const exportData: ProjectExportData = {
        version: this.CURRENT_VERSION,
        exportType,
        exportDate: new Date(),
        project: {
          id: project.id,
          name: project.name,
          source: project.source,
          notes: project.notes,
          createdDate: project.createdDate,
          lastModified: project.lastModified,
          isCompleted: project.isCompleted
        },
        yarns: project.yarns
      }

      if (exportType === ExportType.FULL_PROJECT) {
        // 完整專案匯出，包含進度和工作記錄
        if (project.charts && project.charts.length > 0) {
          // 新的多織圖格式
          exportData.charts = project.charts
          exportData.currentChartId = project.currentChartId
          exportData.progress = {
            currentRound: project.currentRound || 1,
            currentStitch: project.currentStitch || 0,
            currentChartId: project.currentChartId
          }
        } else if (project.pattern) {
          // 向後兼容的舊格式
          exportData.pattern = project.pattern
          exportData.progress = {
            currentRound: project.currentRound || 1,
            currentStitch: project.currentStitch || 0
          }
        }
        exportData.sessions = project.sessions
      } else {
        // 僅織圖匯出，不包含進度
        if (project.charts && project.charts.length > 0) {
          // 清除進度資訊的織圖副本
          exportData.charts = project.charts.map(chart => ({
            ...chart,
            currentRound: 1,
            currentStitch: 0,
            isCompleted: false
          }))
        } else if (project.pattern) {
          exportData.pattern = project.pattern
        }
        // 不包含進度和工作記錄
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      logger.error('Export error:', error)
      throw new Error('匯出專案時發生錯誤')
    }
  }

  static exportProjectAsFile(project: Project, exportType: ExportType): void {
    try {
      const jsonData = this.exportProject(project, exportType)
      const blob = new Blob([jsonData], { type: 'application/json' })
      
      const fileName = `${project.name}_${exportType === ExportType.FULL_PROJECT ? 'complete' : 'pattern'}_${new Date().toISOString().split('T')[0]}.json`
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('Export file error:', error)
      throw new Error('匯出檔案時發生錯誤')
    }
  }

  static importProject(jsonData: string, importMode: ImportMode = ImportMode.CREATE_NEW): ImportResult {
    const result: ImportResult = {
      success: false,
      errors: [],
      warnings: []
    }

    try {
      const exportData: ProjectExportData = JSON.parse(jsonData)
      
      // 版本檢查
      if (!exportData.version) {
        result.warnings.push('檔案格式較舊，可能部分功能不完整')
      }

      // 驗證必要欄位
      const validationErrors = this.validateExportData(exportData)
      if (validationErrors.length > 0) {
        result.errors = validationErrors
        return result
      }

      // 轉換為專案格式
      const importedProject = this.convertToProject(exportData, importMode)
      
      result.success = true
      result.project = importedProject
      
      // 添加匯入提示
      if (exportData.exportType === ExportType.PATTERN_ONLY) {
        result.warnings.push('此檔案僅包含織圖內容，不包含編織進度')
      }
      
      if (exportData.sessions && exportData.sessions.length > 0) {
        result.warnings.push(`已匯入 ${exportData.sessions.length} 個工作記錄`)
      }

    } catch (error) {
      logger.error('Import error:', error)
      result.errors.push('檔案格式錯誤或已損壞')
    }

    return result
  }

  private static validateExportData(data: ProjectExportData): string[] {
    const errors: string[] = []

    if (!data.project) {
      errors.push('缺少專案基本資訊')
      return errors
    }

    if (!data.project.name) {
      errors.push('專案名稱不能為空')
    }

    if (!data.yarns || !Array.isArray(data.yarns)) {
      errors.push('毛線資訊格式錯誤')
    }

    // 檢查是否有織圖內容
    const hasCharts = data.charts && data.charts.length > 0
    const hasPattern = data.pattern && data.pattern.length > 0
    
    if (!hasCharts && !hasPattern) {
      errors.push('檔案中沒有找到織圖內容')
    }

    return errors
  }

  private static convertToProject(data: ProjectExportData, importMode: ImportMode): Project {
    const baseProject: Project = {
      id: importMode === ImportMode.CREATE_NEW ? generateId() : data.project.id,
      name: data.project.name,
      source: data.project.source,
      notes: data.project.notes,
      yarns: data.yarns || [],
      sessions: (data.sessions || []).map(session => ({
        ...session,
        startTime: new Date(session.startTime)
      })),
      createdDate: importMode === ImportMode.CREATE_NEW 
        ? new Date() 
        : new Date(data.project.createdDate),
      lastModified: new Date(),
      isCompleted: data.exportType === ExportType.PATTERN_ONLY 
        ? false 
        : (data.project.isCompleted || false)
    }

    // 處理織圖資料
    if (data.charts && data.charts.length > 0) {
      // 新的多織圖格式
      baseProject.charts = data.charts.map(chart => {
        // 安全處理日期轉換
        const parseDate = (dateValue: any): Date => {
          if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
            return dateValue
          }
          if (typeof dateValue === 'string' || typeof dateValue === 'number') {
            const parsed = new Date(dateValue)
            return !isNaN(parsed.getTime()) ? parsed : new Date()
          }
          return new Date()
        }

        return {
          ...chart,
          id: importMode === ImportMode.CREATE_NEW ? generateId() : chart.id,
          createdDate: parseDate(chart.createdDate),
          lastModified: parseDate(chart.lastModified),
          rounds: (chart.rounds || []).map(round => ({
            ...round,
            stitches: round.stitches || [],
            stitchGroups: round.stitchGroups || []
          })),
          // 如果是僅織圖匯入，重置進度
          currentRound: data.exportType === ExportType.PATTERN_ONLY ? 1 : chart.currentRound,
          currentStitch: data.exportType === ExportType.PATTERN_ONLY ? 0 : chart.currentStitch,
          isCompleted: data.exportType === ExportType.PATTERN_ONLY ? false : chart.isCompleted
        }
      })
      
      baseProject.currentChartId = data.exportType === ExportType.PATTERN_ONLY 
        ? baseProject.charts[0]?.id 
        : data.currentChartId || baseProject.charts[0]?.id
    } else if (data.pattern && data.pattern.length > 0) {
      // 向後兼容的舊格式
      baseProject.pattern = data.pattern
      baseProject.currentRound = data.exportType === ExportType.PATTERN_ONLY 
        ? 1 
        : (data.progress?.currentRound || 1)
      baseProject.currentStitch = data.exportType === ExportType.PATTERN_ONLY 
        ? 0 
        : (data.progress?.currentStitch || 0)
    }

    return baseProject
  }

  static async importProjectFromFile(file: File, importMode: ImportMode = ImportMode.CREATE_NEW): Promise<ImportResult> {
    return new Promise<ImportResult>((resolve) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const content = event.target?.result as string
        const result = this.importProject(content, importMode)
        resolve(result)
      }
      
      reader.onerror = () => {
        resolve({
          success: false,
          errors: ['讀取檔案時發生錯誤'],
          warnings: []
        })
      }
      
      reader.readAsText(file)
    })
  }

  // 批量匯出多個專案
  static exportMultipleProjects(projects: Project[], exportType: ExportType): string {
    try {
      const exportedProjects = projects.map(project => 
        JSON.parse(this.exportProject(project, exportType))
      )
      
      const batchExport = {
        version: this.CURRENT_VERSION,
        exportType,
        exportDate: new Date(),
        projectCount: projects.length,
        projects: exportedProjects
      }
      
      return JSON.stringify(batchExport, null, 2)
    } catch (error) {
      logger.error('Batch export error:', error)
      throw new Error('批量匯出時發生錯誤')
    }
  }

  // 取得支援的檔案類型
  static getSupportedFileTypes(): string {
    return '.json'
  }

  // 檢查檔案是否為有效的匯出格式
  static isValidExportFile(file: File): boolean {
    return file.type === 'application/json' || file.name.endsWith('.json')
  }
}