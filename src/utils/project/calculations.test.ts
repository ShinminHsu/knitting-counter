import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getProjectTotalTime,
  getProjectTotalRounds,
  getProjectTotalStitches,
  getProjectCompletedStitches,
  getProjectProgressPercentage,
  getProjectTotalRoundsAllCharts,
  getProjectTotalStitchesAllCharts,
  getProjectCompletedStitchesAllCharts,
  getProjectProgressPercentageAllCharts,
  isProjectCompleted,
  getProjectCurrentRoundSafe,
  getProjectCurrentStitchSafe,
  getProjectPatternSafe
} from './calculations'
import { Project, WorkSession, Round, StitchType, Chart } from '../../types'
import * as migrationModule from './migration'
import * as chartProgress from '../chart/progress'

// Mock dependencies
vi.mock('../pattern/operations', () => ({
  getRoundTotalStitches: vi.fn((round: Round) => {
    // Simple mock: return the sum of all stitch counts
    return round.stitches.reduce((sum, stitch) => sum + stitch.count, 0)
  })
}))

vi.mock('./migration', () => ({
  getProjectPattern: vi.fn((project: Project) => project.pattern || []),
  getProjectCurrentRound: vi.fn((project: Project) => project.currentRound || 1),
  getProjectCurrentStitch: vi.fn((project: Project) => project.currentStitch || 0),
  isMultiChartProject: vi.fn((project: Project) => !!project.charts && project.charts.length > 0),
  migrateProjectToMultiChart: vi.fn()
}))

vi.mock('../chart/progress', () => ({
  getProjectChartSummaries: vi.fn(),
  getChartCompletedStitches: vi.fn()
}))

describe('Project Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    name: 'Test Project',
    yarns: [],
    sessions: [],
    createdDate: new Date(),
    lastModified: new Date(),
    currentRound: 1,
    currentStitch: 0,
    pattern: [
      {
        id: 'round-1',
        roundNumber: 1,
        stitches: [
          { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 10 }
        ],
        stitchGroups: []
      },
      {
        id: 'round-2',
        roundNumber: 2,
        stitches: [
          { id: 'stitch-2', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 20 }
        ],
        stitchGroups: []
      }
    ],
    ...overrides
  })

  const createMockSession = (duration: number): WorkSession => ({
    id: `session-${Date.now()}`,
    startTime: new Date(),
    duration,
    roundsCompleted: 0,
    stitchesCompleted: 0
  })

  describe('getProjectTotalTime', () => {
    it('should calculate total time from sessions', () => {
      const project = createMockProject({
        sessions: [
          createMockSession(3600), // 1 hour
          createMockSession(1800), // 30 minutes
          createMockSession(600)   // 10 minutes
        ]
      })

      const result = getProjectTotalTime(project)
      expect(result).toBe(6000) // 100 minutes total
    })

    it('should return 0 for project with no sessions', () => {
      const project = createMockProject({ sessions: [] })
      const result = getProjectTotalTime(project)
      expect(result).toBe(0)
    })

    it('should handle sessions with zero duration', () => {
      const project = createMockProject({
        sessions: [
          createMockSession(0),
          createMockSession(1800),
          createMockSession(0)
        ]
      })

      const result = getProjectTotalTime(project)
      expect(result).toBe(1800)
    })
  })

  describe('getProjectTotalRounds', () => {
    it('should return the maximum round number', () => {
      const project = createMockProject()
      const result = getProjectTotalRounds(project)
      expect(result).toBe(2)
    })

    it('should handle empty pattern', () => {
      const project = createMockProject({ pattern: [] })
      const result = getProjectTotalRounds(project)
      expect(result).toBe(0)
    })

    it('should handle pattern with non-sequential round numbers', () => {
      const project = createMockProject({
        pattern: [
          {
            id: 'round-1',
            roundNumber: 1,
            stitches: [],
            stitchGroups: []
          },
          {
            id: 'round-3',
            roundNumber: 3,
            stitches: [],
            stitchGroups: []
          },
          {
            id: 'round-5',
            roundNumber: 5,
            stitches: [],
            stitchGroups: []
          }
        ]
      })

      const result = getProjectTotalRounds(project)
      expect(result).toBe(5)
    })
  })

  describe('getProjectTotalStitches', () => {
    it('should calculate total stitches across all rounds', () => {
      const project = createMockProject()
      const result = getProjectTotalStitches(project)
      expect(result).toBe(30) // 10 + 20 from mock rounds
    })

    it('should handle empty pattern', () => {
      const project = createMockProject({ pattern: [] })
      const result = getProjectTotalStitches(project)
      expect(result).toBe(0)
    })

    it('should handle rounds with no stitches', () => {
      const project = createMockProject({
        pattern: [
          {
            id: 'round-1',
            roundNumber: 1,
            stitches: [],
            stitchGroups: []
          }
        ]
      })

      const result = getProjectTotalStitches(project)
      expect(result).toBe(0)
    })
  })

  describe('getProjectCompletedStitches', () => {
    it('should calculate completed stitches based on current position', () => {
      const project = createMockProject({
        currentRound: 2,
        currentStitch: 5
      })

      const result = getProjectCompletedStitches(project)
      expect(result).toBe(15) // Round 1 complete (10) + 5 from round 2
    })

    it('should handle project at the beginning', () => {
      const project = createMockProject({
        currentRound: 1,
        currentStitch: 0
      })

      const result = getProjectCompletedStitches(project)
      expect(result).toBe(0)
    })

    it('should handle project with completed rounds', () => {
      const project = createMockProject({
        currentRound: 3,
        currentStitch: 0
      })

      const result = getProjectCompletedStitches(project)
      expect(result).toBe(30) // Both rounds completed
    })

    it('should clamp current stitch to valid range', () => {
      const project = createMockProject({
        currentRound: 2,
        currentStitch: 100 // More than available in round 2 (20)
      })

      const result = getProjectCompletedStitches(project)
      expect(result).toBe(30) // Round 1 (10) + max from round 2 (20)
    })

    it('should handle negative current stitch', () => {
      const project = createMockProject({
        currentRound: 2,
        currentStitch: -5
      })

      const result = getProjectCompletedStitches(project)
      expect(result).toBe(10) // Round 1 (10) + 0 from round 2
    })

    it('should handle empty pattern', () => {
      const project = createMockProject({
        pattern: [],
        currentRound: 1,
        currentStitch: 5
      })

      const result = getProjectCompletedStitches(project)
      expect(result).toBe(0)
    })
  })

  describe('getProjectProgressPercentage', () => {
    it('should calculate progress percentage', () => {
      const project = createMockProject({
        currentRound: 2,
        currentStitch: 5
      })

      const result = getProjectProgressPercentage(project)
      expect(result).toBe(0.5) // 15/30 = 0.5
    })

    it('should return 0 for empty pattern', () => {
      const project = createMockProject({ pattern: [] })
      const result = getProjectProgressPercentage(project)
      expect(result).toBe(0)
    })

    it('should return 0 for pattern with no stitches', () => {
      const project = createMockProject({
        pattern: [
          {
            id: 'round-1',
            roundNumber: 1,
            stitches: [],
            stitchGroups: []
          }
        ]
      })

      const result = getProjectProgressPercentage(project)
      expect(result).toBe(0)
    })

    it('should clamp progress to maximum of 1', () => {
      const project = createMockProject({
        currentRound: 10, // Beyond available rounds
        currentStitch: 100
      })

      const result = getProjectProgressPercentage(project)
      expect(result).toBe(1)
    })

    it('should handle completed project', () => {
      const project = createMockProject({
        currentRound: 3,
        currentStitch: 0
      })

      const result = getProjectProgressPercentage(project)
      expect(result).toBe(1) // 30/30 = 1
    })
  })

  describe('isProjectCompleted', () => {
    it('should return true when current round exceeds total rounds', () => {
      const project = createMockProject({
        currentRound: 3, // Beyond the 2 available rounds
        currentStitch: 0
      })

      const result = isProjectCompleted(project)
      expect(result).toBe(true)
    })

    it('should return true when at last round and all stitches completed', () => {
      const project = createMockProject({
        currentRound: 2, // Last round
        currentStitch: 20 // All stitches in last round
      })

      const result = isProjectCompleted(project)
      expect(result).toBe(true)
    })

    it('should return false when in progress', () => {
      const project = createMockProject({
        currentRound: 2,
        currentStitch: 10 // Half way through last round
      })

      const result = isProjectCompleted(project)
      expect(result).toBe(false)
    })

    it('should return false for empty pattern', () => {
      const project = createMockProject({ pattern: [] })
      const result = isProjectCompleted(project)
      expect(result).toBe(false)
    })

    it('should return false when at beginning', () => {
      const project = createMockProject({
        currentRound: 1,
        currentStitch: 0
      })

      const result = isProjectCompleted(project)
      expect(result).toBe(false)
    })
  })

  describe('Multi-chart functions', () => {
    beforeEach(() => {
      // Access the already-mocked functions via vi.mocked
      const { getProjectChartSummaries, getChartCompletedStitches } = vi.mocked(chartProgress)
      const { isMultiChartProject } = vi.mocked(migrationModule)

      // Mock chart summaries
      getProjectChartSummaries.mockReturnValue([
        {
          id: 'chart-1',
          name: 'Chart 1',
          description: 'Test chart 1',
          notes: '',
          roundCount: 5,
          totalStitches: 100,
          currentProgress: 50,
          isCompleted: false,
          lastModified: new Date()
        },
        {
          id: 'chart-2',
          name: 'Chart 2',
          description: 'Test chart 2',
          notes: '',
          roundCount: 3,
          totalStitches: 60,
          currentProgress: 30,
          isCompleted: false,
          lastModified: new Date()
        }
      ])

      // Mock chart completed stitches
      getChartCompletedStitches.mockImplementation((chart: Chart) => {
        if (chart.id === 'chart-1') return 50
        if (chart.id === 'chart-2') return 18
        return 0
      })

      // Mock multi-chart detection
      isMultiChartProject.mockImplementation((project: Project) => {
        return !!project.charts && project.charts.length > 0
      })
    })

    describe('getProjectTotalRoundsAllCharts', () => {
      it('should sum rounds from all charts', () => {
        const project = createMockProject()
        const result = getProjectTotalRoundsAllCharts(project)
        expect(result).toBe(8) // 5 + 3
      })
    })

    describe('getProjectTotalStitchesAllCharts', () => {
      it('should sum stitches from all charts', () => {
        const project = createMockProject()
        const result = getProjectTotalStitchesAllCharts(project)
        expect(result).toBe(160) // 100 + 60
      })
    })

    describe('getProjectCompletedStitchesAllCharts', () => {
      it('should sum completed stitches from all charts for multi-chart project', () => {
        const project = createMockProject({
          charts: [
            { id: 'chart-1' } as Chart,
            { id: 'chart-2' } as Chart
          ]
        })

        const result = getProjectCompletedStitchesAllCharts(project)
        expect(result).toBe(68) // 50 + 18
      })

      it('should fall back to single chart calculation for legacy projects', () => {
        const { isMultiChartProject } = vi.mocked(migrationModule)
        isMultiChartProject.mockReturnValue(false)

        const project = createMockProject({
          currentRound: 2,
          currentStitch: 5
        })

        const result = getProjectCompletedStitchesAllCharts(project)
        expect(result).toBe(15) // Single chart calculation
      })
    })

    describe('getProjectProgressPercentageAllCharts', () => {
      it('should calculate progress across all charts', () => {
        const project = createMockProject({
          charts: [
            { id: 'chart-1' } as Chart,
            { id: 'chart-2' } as Chart
          ]
        })
        const result = getProjectProgressPercentageAllCharts(project)
        expect(result).toBe(0.425) // 68/160 = 0.425
      })

      it('should return 0 for project with no stitches', () => {
        const { getProjectChartSummaries } = vi.mocked(chartProgress)
        getProjectChartSummaries.mockReturnValue([])

        const project = createMockProject()
        const result = getProjectProgressPercentageAllCharts(project)
        expect(result).toBe(0)
      })
    })
  })

  describe('Safe functions', () => {
    describe('getProjectCurrentRoundSafe', () => {
      it('should return current round for valid project', () => {
        const project = createMockProject({ currentRound: 5 })
        const result = getProjectCurrentRoundSafe(project)
        expect(result).toBe(5)
      })

      it('should return 1 for null project', () => {
        const result = getProjectCurrentRoundSafe(null)
        expect(result).toBe(1)
      })

      it('should return 1 for undefined project', () => {
        const result = getProjectCurrentRoundSafe(undefined)
        expect(result).toBe(1)
      })
    })

    describe('getProjectCurrentStitchSafe', () => {
      it('should return current stitch for valid project', () => {
        const project = createMockProject({ currentStitch: 10 })
        const result = getProjectCurrentStitchSafe(project)
        expect(result).toBe(10)
      })

      it('should return 0 for null project', () => {
        const result = getProjectCurrentStitchSafe(null)
        expect(result).toBe(0)
      })

      it('should return 0 for undefined project', () => {
        const result = getProjectCurrentStitchSafe(undefined)
        expect(result).toBe(0)
      })
    })

    describe('getProjectPatternSafe', () => {
      it('should return pattern for valid project', () => {
        const project = createMockProject()
        const result = getProjectPatternSafe(project)
        expect(result).toEqual(project.pattern)
      })

      it('should return empty array for null project', () => {
        const result = getProjectPatternSafe(null)
        expect(result).toEqual([])
      })

      it('should return empty array for undefined project', () => {
        const result = getProjectPatternSafe(undefined)
        expect(result).toEqual([])
      })
    })
  })
})