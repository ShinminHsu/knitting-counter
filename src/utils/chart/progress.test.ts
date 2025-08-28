import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getProjectChartSummaries,
  getChartProgressPercentage,
  getChartCompletedStitches,
  isChartCompleted
} from './progress'
import { Project, Chart, Round, StitchInfo, StitchGroup, StitchType } from '../../types'
import { createMockProject, createMockChart, createMockRound } from '../../test/utils'
import * as migrationModule from '../project/migration'

// Mock the migration and operations modules
vi.mock('../project/migration', () => ({
  migrateProjectToMultiChart: vi.fn((project) => {
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

vi.mock('../pattern/operations', () => ({
  getRoundTotalStitches: vi.fn((round) => {
    // Simple calculation: sum all stitch counts plus group totals
    const individualStitches = round.stitches?.reduce((sum: number, stitch: StitchInfo) => sum + stitch.count, 0) || 0
    const groupStitches = round.stitchGroups?.reduce((sum: number, group: StitchGroup) => {
      const groupStitchSum = group.stitches.reduce((gSum: number, stitch: StitchInfo) => gSum + stitch.count, 0)
      return sum + (groupStitchSum * group.repeatCount)
    }, 0) || 0
    return individualStitches + groupStitches
  })
}))

describe('Chart Progress', () => {
  let mockProject: Project
  let mockChart1: Chart
  let mockChart2: Chart
  let mockRound1: Round
  let mockRound2: Round

  beforeEach(() => {
    // Create mock stitches and rounds
    const mockStitch1: StitchInfo = {
      id: 'stitch-1',
      type: StitchType.SINGLE,
      yarnId: 'yarn-1',
      count: 6
    }

    const mockStitch2: StitchInfo = {
      id: 'stitch-2',
      type: StitchType.CHAIN,
      yarnId: 'yarn-1',
      count: 4
    }

    mockRound1 = createMockRound({
      id: 'round-1',
      roundNumber: 1,
      stitches: [mockStitch1],
      stitchGroups: []
    })

    mockRound2 = createMockRound({
      id: 'round-2',
      roundNumber: 2,
      stitches: [mockStitch2],
      stitchGroups: []
    })

    mockChart1 = createMockChart({
      id: 'chart-1',
      name: '主織圖',
      rounds: [mockRound1, mockRound2],
      currentRound: 1,
      currentStitch: 3
    })

    mockChart2 = createMockChart({
      id: 'chart-2',
      name: '裝飾織圖',
      rounds: [],
      currentRound: 1,
      currentStitch: 0
    })

    mockProject = createMockProject({
      charts: [mockChart1, mockChart2],
      currentChartId: 'chart-1'
    })
  })

  describe('getProjectChartSummaries', () => {
    it('should return empty array when project has no charts', () => {
      const emptyProject = createMockProject({ charts: [] })
      const summaries = getProjectChartSummaries(emptyProject)
      
      expect(summaries).toEqual([])
    })

    it('should return chart summaries for all charts', () => {
      const summaries = getProjectChartSummaries(mockProject)
      
      expect(summaries).toHaveLength(2)
      
      expect(summaries[0]).toEqual({
        id: 'chart-1',
        name: '主織圖',
        description: mockChart1.description,
        notes: mockChart1.notes,
        roundCount: 2,
        totalStitches: 10, // 6 + 4 stitches from rounds
        currentProgress: expect.any(Number),
        isCompleted: false,
        lastModified: expect.any(Date)
      })

      expect(summaries[1]).toEqual({
        id: 'chart-2',
        name: '裝飾織圖',
        description: mockChart2.description,
        notes: mockChart2.notes,
        roundCount: 0,
        totalStitches: 0,
        currentProgress: 0,
        isCompleted: false,
        lastModified: expect.any(Date)
      })
    })

    it('should call migration function', () => {
      const mockedMigration = vi.mocked(migrationModule)
      getProjectChartSummaries(mockProject)
      expect(mockedMigration.migrateProjectToMultiChart).toHaveBeenCalledWith(mockProject)
    })

    it('should handle projects without charts array', () => {
      const projectWithoutCharts = createMockProject()
      delete (projectWithoutCharts as any).charts
      
      const summaries = getProjectChartSummaries(projectWithoutCharts)
      expect(summaries).toEqual([])
    })
  })

  describe('getChartProgressPercentage', () => {
    it('should return 0 for chart with no rounds', () => {
      const emptyChart = createMockChart({ rounds: [] })
      const progress = getChartProgressPercentage(emptyChart)
      
      expect(progress).toBe(0)
    })

    it('should return 0 for chart with rounds but no stitches', () => {
      const emptyRound = createMockRound({ stitches: [], stitchGroups: [] })
      const chart = createMockChart({
        rounds: [emptyRound],
        currentRound: 1,
        currentStitch: 0
      })
      
      const progress = getChartProgressPercentage(chart)
      expect(progress).toBe(0)
    })

    it('should calculate progress correctly for partial completion', () => {
      // Chart has 2 rounds: 6 stitches + 4 stitches = 10 total
      // Current position: round 1, stitch 3 = 3 completed stitches
      // Progress should be 30%
      const progress = getChartProgressPercentage(mockChart1)
      
      expect(progress).toBe(30)
    })

    it('should calculate progress for completed rounds', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 2,
        currentStitch: 2
      })
      
      // Completed round 1 (6 stitches) + 2 stitches from round 2 = 8/10 = 80%
      const progress = getChartProgressPercentage(chart)
      expect(progress).toBe(80)
    })

    it('should cap progress at 100%', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 3,
        currentStitch: 0
      })
      
      const progress = getChartProgressPercentage(chart)
      expect(progress).toBe(100)
    })

    it('should handle currentStitch exceeding round stitches', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 1,
        currentStitch: 10 // More than the 6 stitches in round 1
      })
      
      // Should be capped at 6 stitches for round 1 = 60%
      const progress = getChartProgressPercentage(chart)
      expect(progress).toBe(60)
    })

    it('should handle negative currentStitch', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 1,
        currentStitch: -1
      })
      
      // Should be treated as 0 = 0%
      const progress = getChartProgressPercentage(chart)
      expect(progress).toBe(0)
    })
  })

  describe('getChartCompletedStitches', () => {
    it('should return 0 for chart with no rounds', () => {
      const emptyChart = createMockChart({ rounds: [] })
      const completed = getChartCompletedStitches(emptyChart)
      
      expect(completed).toBe(0)
    })

    it('should calculate completed stitches correctly', () => {
      // Current position: round 1, stitch 3 = 3 completed stitches
      const completed = getChartCompletedStitches(mockChart1)
      
      expect(completed).toBe(3)
    })

    it('should include completed full rounds', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 2,
        currentStitch: 2
      })
      
      // Completed round 1 (6 stitches) + 2 stitches from round 2 = 8
      const completed = getChartCompletedStitches(chart)
      expect(completed).toBe(8)
    })

    it('should handle currentStitch exceeding round stitches', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 1,
        currentStitch: 10
      })
      
      // Should be capped at 6 stitches for round 1
      const completed = getChartCompletedStitches(chart)
      expect(completed).toBe(6)
    })
  })

  describe('isChartCompleted', () => {
    it('should return false for chart with no rounds', () => {
      const emptyChart = createMockChart({ rounds: [] })
      const isCompleted = isChartCompleted(emptyChart)
      
      expect(isCompleted).toBe(false)
    })

    it('should return false for chart in progress', () => {
      const isCompleted = isChartCompleted(mockChart1)
      
      expect(isCompleted).toBe(false)
    })

    it('should return true when current round exceeds total rounds', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 3, // Exceeds the 2 rounds available
        currentStitch: 0
      })
      
      const isCompleted = isChartCompleted(chart)
      expect(isCompleted).toBe(true)
    })

    it('should return true when on last round and all stitches completed', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 2, // Last round
        currentStitch: 4 // All 4 stitches in round 2 completed
      })
      
      const isCompleted = isChartCompleted(chart)
      expect(isCompleted).toBe(true)
    })

    it('should return false when on last round but not all stitches completed', () => {
      const chart = createMockChart({
        ...mockChart1,
        currentRound: 2, // Last round
        currentStitch: 2 // Only 2 out of 4 stitches completed
      })
      
      const isCompleted = isChartCompleted(chart)
      expect(isCompleted).toBe(false)
    })

    it('should handle charts with single round', () => {
      const singleRoundChart = createMockChart({
        rounds: [mockRound1],
        currentRound: 1,
        currentStitch: 6 // All stitches completed
      })
      
      const isCompleted = isChartCompleted(singleRoundChart)
      expect(isCompleted).toBe(true)
    })

    it('should handle non-sequential round numbers', () => {
      const roundWithHighNumber = createMockRound({
        roundNumber: 10,
        stitches: [{ id: 'test', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 1 }],
        stitchGroups: []
      })
      
      const chart = createMockChart({
        rounds: [mockRound1, roundWithHighNumber], // rounds 1 and 10
        currentRound: 11, // Past the highest round number
        currentStitch: 0
      })
      
      const isCompleted = isChartCompleted(chart)
      expect(isCompleted).toBe(true)
    })
  })
})