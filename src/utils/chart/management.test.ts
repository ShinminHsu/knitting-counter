import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createChart,
  getCurrentChart,
  setCurrentChart,
  addChartToProject,
  removeChartFromProject,
  updateChartInProject
} from './management'
import { Project, Chart } from '../../types'
import { createMockProject, createMockChart } from '../../test/utils'
import * as migrationModule from '../project/migration'

// Mock the migration module
vi.mock('../project/migration', () => ({
  migrateProjectToMultiChart: vi.fn((project) => {
    // Simulate migration by ensuring charts array exists
    if (!project.charts) {
      project.charts = []
    }
    return {
      success: true,
      migratedChartsCount: 0,
      errors: []
    }
  })
}))

describe('Chart Management', () => {
  let mockProject: Project
  let mockChart1: Chart
  let mockChart2: Chart

  beforeEach(() => {
    mockProject = createMockProject()
    mockChart1 = createMockChart({ id: 'chart-1', name: '主織圖' })
    mockChart2 = createMockChart({ id: 'chart-2', name: '裝飾織圖' })
    
    // Reset project to have no charts initially
    mockProject.charts = []
    mockProject.currentChartId = undefined
  })

  describe('createChart', () => {
    it('should create a chart with required fields', () => {
      const chart = createChart('測試織圖')
      
      expect(chart).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: '測試織圖',
          description: '',
          rounds: [],
          currentRound: 1,
          currentStitch: 0,
          isCompleted: false,
          notes: '',
          createdDate: expect.any(Date),
          lastModified: expect.any(Date)
        })
      )
    })

    it('should create chart with optional fields', () => {
      const chart = createChart('測試織圖', '描述內容', '備註內容')
      
      expect(chart.description).toBe('描述內容')
      expect(chart.notes).toBe('備註內容')
    })

    it('should trim whitespace from name', () => {
      const chart = createChart('  測試織圖  ')
      expect(chart.name).toBe('測試織圖')
    })

    it('should use default name for empty input', () => {
      const chart = createChart('')
      expect(chart.name).toBe('新織圖')
    })

    it('should trim optional fields', () => {
      const chart = createChart('測試', '  描述  ', '  備註  ')
      expect(chart.description).toBe('描述')
      expect(chart.notes).toBe('備註')
    })
  })

  describe('getCurrentChart', () => {
    it('should return null when project has no charts', () => {
      const result = getCurrentChart(mockProject)
      expect(result).toBeNull()
    })

    it('should return chart by currentChartId when specified', () => {
      mockProject.charts = [mockChart1, mockChart2]
      mockProject.currentChartId = mockChart2.id

      const result = getCurrentChart(mockProject)
      expect(result?.id).toBe(mockChart2.id)
      expect(result?.name).toBe(mockChart2.name)
    })

    it('should return first chart when currentChartId not specified', () => {
      mockProject.charts = [mockChart1, mockChart2]
      mockProject.currentChartId = undefined

      const result = getCurrentChart(mockProject)
      expect(result).toBe(mockChart1)
    })

    it('should return first chart when currentChartId does not exist', () => {
      mockProject.charts = [mockChart1, mockChart2]
      mockProject.currentChartId = 'non-existent-id'

      const result = getCurrentChart(mockProject)
      expect(result).toBe(mockChart1)
    })

    it('should call migration function', () => {
      const mockedMigration = vi.mocked(migrationModule)
      getCurrentChart(mockProject)
      expect(mockedMigration.migrateProjectToMultiChart).toHaveBeenCalledWith(mockProject)
    })
  })

  describe('setCurrentChart', () => {
    beforeEach(() => {
      mockProject.charts = [mockChart1, mockChart2]
    })

    it('should set current chart ID when chart exists', () => {
      const result = setCurrentChart(mockProject, mockChart2.id)
      
      expect(result).toBe(true)
      expect(mockProject.currentChartId).toBe(mockChart2.id)
    })

    it('should return false when chart does not exist', () => {
      const result = setCurrentChart(mockProject, 'non-existent-id')
      
      expect(result).toBe(false)
      expect(mockProject.currentChartId).toBeUndefined()
    })

    it('should return false when project has no charts', () => {
      mockProject.charts = []
      const result = setCurrentChart(mockProject, mockChart1.id)
      
      expect(result).toBe(false)
    })

    it('should call migration function', () => {
      const mockedMigration = vi.mocked(migrationModule)
      setCurrentChart(mockProject, mockChart1.id)
      expect(mockedMigration.migrateProjectToMultiChart).toHaveBeenCalledWith(mockProject)
    })
  })

  describe('addChartToProject', () => {
    it('should add chart to empty project', () => {
      const result = addChartToProject(mockProject, mockChart1)
      
      expect(result).toBe(true)
      expect(mockProject.charts).toHaveLength(1)
      expect(mockProject.charts![0]).toBe(mockChart1)
      expect(mockProject.currentChartId).toBe(mockChart1.id)
    })

    it('should add chart to project with existing charts', () => {
      mockProject.charts = [mockChart1]
      mockProject.currentChartId = mockChart1.id

      const result = addChartToProject(mockProject, mockChart2)
      
      expect(result).toBe(true)
      expect(mockProject.charts).toHaveLength(2)
      expect(mockProject.charts[1]).toBe(mockChart2)
      expect(mockProject.currentChartId).toBe(mockChart1.id) // Should not change
    })

    it('should not add chart with duplicate ID', () => {
      mockProject.charts = [mockChart1]

      const duplicateChart = { ...mockChart2, id: mockChart1.id }
      const result = addChartToProject(mockProject, duplicateChart)
      
      expect(result).toBe(false)
      expect(mockProject.charts).toHaveLength(1)
    })

    it('should initialize charts array if not exists', () => {
      delete (mockProject as any).charts
      
      const result = addChartToProject(mockProject, mockChart1)
      
      expect(result).toBe(true)
      expect(mockProject.charts).toHaveLength(1)
      expect(mockProject.charts![0]).toBe(mockChart1)
    })
  })

  describe('removeChartFromProject', () => {
    beforeEach(() => {
      mockProject.charts = [mockChart1, mockChart2]
      mockProject.currentChartId = mockChart1.id
    })

    it('should remove chart from project', () => {
      const result = removeChartFromProject(mockProject, mockChart2.id)
      
      expect(result).toBe(true)
      expect(mockProject.charts).toHaveLength(1)
      expect(mockProject.charts![0]).toBe(mockChart1)
    })

    it('should switch current chart when removing current chart', () => {
      // Set up project with both charts
      mockProject.charts = [mockChart1, mockChart2]
      mockProject.currentChartId = mockChart1.id
      
      const result = removeChartFromProject(mockProject, mockChart1.id)
      
      expect(result).toBe(true)
      expect(mockProject.charts).toHaveLength(1)
      expect(mockProject.charts![0]).toBe(mockChart2)
      expect(mockProject.currentChartId).toBe(mockChart2.id)
    })

    it('should clear current chart ID when removing last chart', () => {
      mockProject.charts = [mockChart1]
      mockProject.currentChartId = mockChart1.id

      const result = removeChartFromProject(mockProject, mockChart1.id)
      
      expect(result).toBe(true)
      expect(mockProject.charts).toHaveLength(0)
      expect(mockProject.currentChartId).toBeUndefined()
    })

    it('should return false when chart does not exist', () => {
      const result = removeChartFromProject(mockProject, 'non-existent-id')
      
      expect(result).toBe(false)
      expect(mockProject.charts).toHaveLength(2)
    })

    it('should return false when project has no charts', () => {
      mockProject.charts = []
      const result = removeChartFromProject(mockProject, mockChart1.id)
      
      expect(result).toBe(false)
    })
  })

  describe('updateChartInProject', () => {
    beforeEach(() => {
      mockProject.charts = [mockChart1, mockChart2]
    })

    it('should update existing chart', () => {
      const originalLastModified = mockChart1.lastModified
      const updatedChart = { ...mockChart1, name: '更新的織圖名稱' }
      
      // Wait a bit to ensure different timestamp
      const result = updateChartInProject(mockProject, updatedChart)
      
      expect(result).toBe(true)
      expect(mockProject.charts![0].name).toBe('更新的織圖名稱')
      expect(mockProject.charts![0].lastModified).toBeInstanceOf(Date)
      expect(mockProject.charts![0].lastModified.getTime()).toBeGreaterThan(originalLastModified.getTime())
    })

    it('should preserve existing fields when updating', () => {
      const originalRounds = mockChart1.rounds
      const updatedChart = { ...mockChart1, name: '新名稱' }
      delete (updatedChart as any).rounds
      
      const result = updateChartInProject(mockProject, updatedChart)
      
      expect(result).toBe(true)
      expect(mockProject.charts![0].name).toBe('新名稱')
      expect(mockProject.charts![0].rounds).toBe(originalRounds)
    })

    it('should return false when chart does not exist', () => {
      const nonExistentChart = createMockChart({ id: 'non-existent-id' })
      const result = updateChartInProject(mockProject, nonExistentChart)
      
      expect(result).toBe(false)
    })

    it('should return false when project has no charts', () => {
      mockProject.charts = []
      const result = updateChartInProject(mockProject, mockChart1)
      
      expect(result).toBe(false)
    })
  })
})