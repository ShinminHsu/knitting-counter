import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useYarnStore, hexToRgb, rgbToHex, getColorBrightness, isLightColor, getContrastColor, getColorDistance, findSimilarColors } from './useYarnStore'
import { useProjectStore } from './useProjectStore'
import { Project, Yarn, YarnColor, StitchType } from '../types'
import { generateId } from '../utils'

// Mock dependencies
vi.mock('./useProjectStore')
vi.mock('../utils', () => ({
  generateId: vi.fn(() => 'mock-id-' + Date.now())
}))
vi.mock('./useBaseStore', () => ({
  handleAsyncError: vi.fn((error, context) => {
    console.error(`[${context}]`, error)
  })
}))

const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  source: '',
  pattern: [],
  currentRound: 1,
  currentStitch: 0,
  yarns: [
    {
      id: 'yarn-1',
      name: '白色毛線',
      color: { name: '白色', hex: '#FFFFFF' },
      brand: 'Test Brand'
    },
    {
      id: 'yarn-2',
      name: '紅色毛線',
      color: { name: '紅色', hex: '#FF0000' },
      brand: 'Another Brand'
    }
  ],
  sessions: [],
  createdDate: new Date(),
  lastModified: new Date(),
  isCompleted: false
}

describe('useYarnStore', () => {
  const mockUpdateProjectLocally = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useProjectStore
    const mockedUseProjectStore = vi.mocked(useProjectStore)
    mockedUseProjectStore.getState = vi.fn(() => ({
      currentProject: mockProject,
      updateProjectLocally: mockUpdateProjectLocally,
      projects: [mockProject],
      setProjects: vi.fn(),
      setCurrentProject: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      setCurrentProjectById: vi.fn(),
      loadProjects: vi.fn(),
      loadUserProjects: vi.fn(),
      clearUserData: vi.fn(),
      clearUserDataSilently: vi.fn()
    }))
  })

  describe('Yarn Management', () => {
    it('should add yarn to project', async () => {
      const { addYarn } = useYarnStore.getState()
      
      const yarnData = {
        name: '新毛線',
        color: { name: '藍色', hex: '#0000FF' },
        brand: 'Test Brand'
      }
      
      const result = await addYarn(yarnData)
      
      expect(result).toEqual({
        id: expect.any(String),
        name: '新毛線',
        color: { name: '藍色', hex: '#0000FF' },
        brand: 'Test Brand'
      })
      
      expect(mockUpdateProjectLocally).toHaveBeenCalledWith({
        ...mockProject,
        yarns: [...mockProject.yarns, result],
        lastModified: expect.any(Date)
      })
    })

    it('should add yarn with default values', async () => {
      const { addYarn } = useYarnStore.getState()
      
      const result = await addYarn({})
      
      expect(result).toEqual({
        id: expect.any(String),
        name: '新毛線',
        color: { name: '白色', hex: '#FFFFFF' }
      })
    })

    it('should handle add yarn when no current project', async () => {
      const mockedUseProjectStore = vi.mocked(useProjectStore)
      mockedUseProjectStore.getState = vi.fn(() => ({
        currentProject: null,
        updateProjectLocally: mockUpdateProjectLocally,
        projects: [],
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProjectById: vi.fn(),
        loadProjects: vi.fn(),
        loadUserProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      }))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { addYarn } = useYarnStore.getState()
      
      const result = await addYarn({ name: 'Test' })
      
      expect(result).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith('[YARN] addYarn: No current project')
      
      consoleSpy.mockRestore()
    })

    it('should update yarn', async () => {
      const { updateYarn } = useYarnStore.getState()
      
      const updates = {
        name: '更新的毛線名稱',
        color: { name: '綠色', hex: '#00FF00' }
      }
      
      await updateYarn('yarn-1', updates)
      
      expect(mockUpdateProjectLocally).toHaveBeenCalledWith({
        ...mockProject,
        yarns: [
          {
            id: 'yarn-1',
            name: '更新的毛線名稱',
            color: { name: '綠色', hex: '#00FF00' },
            brand: 'Test Brand'
          },
          mockProject.yarns[1]
        ],
        lastModified: expect.any(Date)
      })
    })

    it('should delete unused yarn', async () => {
      const { deleteYarn } = useYarnStore.getState()
      
      await deleteYarn('yarn-1')
      
      expect(mockUpdateProjectLocally).toHaveBeenCalledWith({
        ...mockProject,
        yarns: [mockProject.yarns[1]],
        lastModified: expect.any(Date)
      })
    })

    it('should not delete yarn that is in use', async () => {
      // Mock project with pattern using yarn
      const projectWithPattern = {
        ...mockProject,
        pattern: [{
          id: 'round-1',
          roundNumber: 1,
          stitches: [{
            id: 'stitch-1',
            type: StitchType.SINGLE,
            yarnId: 'yarn-1',
            count: 5
          }],
          stitchGroups: [],
          notes: ''
        }]
      }
      
      const mockedUseProjectStore = vi.mocked(useProjectStore)
      mockedUseProjectStore.getState = vi.fn(() => ({
        currentProject: projectWithPattern,
        updateProjectLocally: mockUpdateProjectLocally,
        projects: [projectWithPattern],
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProjectById: vi.fn(),
        loadProjects: vi.fn(),
        loadUserProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      }))
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { deleteYarn } = useYarnStore.getState()
      
      await deleteYarn('yarn-1')
      
      expect(consoleSpy).toHaveBeenCalledWith('[YARN] deleteYarn: Yarn is being used in pattern, cannot delete:', 'yarn-1')
      expect(mockUpdateProjectLocally).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should duplicate yarn', async () => {
      const { duplicateYarn } = useYarnStore.getState()
      
      const result = await duplicateYarn('yarn-1')
      
      expect(result).toEqual({
        id: expect.any(String),
        name: '白色毛線 (複製)',
        color: { name: '白色', hex: '#FFFFFF' },
        brand: 'Test Brand'
      })
      
      expect(mockUpdateProjectLocally).toHaveBeenCalledWith({
        ...mockProject,
        yarns: [...mockProject.yarns, result],
        lastModified: expect.any(Date)
      })
    })

    it('should handle duplicate non-existent yarn', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { duplicateYarn } = useYarnStore.getState()
      
      const result = await duplicateYarn('non-existent-yarn')
      
      expect(result).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith('[YARN] duplicateYarn: Source yarn not found:', 'non-existent-yarn')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Yarn Utilities', () => {
    it('should get yarn by ID', () => {
      const { getYarnById } = useYarnStore.getState()
      
      const yarn = getYarnById('yarn-1')
      expect(yarn).toEqual(mockProject.yarns[0])
      
      const nonExistent = getYarnById('non-existent')
      expect(nonExistent).toBe(null)
    })

    it('should get all yarns', () => {
      const { getAllYarns } = useYarnStore.getState()
      
      const yarns = getAllYarns()
      expect(yarns).toEqual(mockProject.yarns)
      expect(yarns).not.toBe(mockProject.yarns) // Should be a copy
    })

    it('should get yarns by color', () => {
      const { getYarnsByColor } = useYarnStore.getState()
      
      const whiteYarns = getYarnsByColor('#FFFFFF')
      expect(whiteYarns).toHaveLength(1)
      expect(whiteYarns[0]).toEqual(mockProject.yarns[0])
      
      const redYarns = getYarnsByColor('#ff0000') // Case insensitive
      expect(redYarns).toHaveLength(1)
      expect(redYarns[0]).toEqual(mockProject.yarns[1])
    })

    it('should get yarns by brand', () => {
      const { getYarnsByBrand } = useYarnStore.getState()
      
      const testBrandYarns = getYarnsByBrand('Test Brand')
      expect(testBrandYarns).toHaveLength(1)
      expect(testBrandYarns[0]).toEqual(mockProject.yarns[0])
      
      const partialMatchYarns = getYarnsByBrand('test') // Case insensitive partial match
      expect(partialMatchYarns).toHaveLength(1)
    })

    it('should handle queries when no current project', () => {
      const mockedUseProjectStore = vi.mocked(useProjectStore)
      mockedUseProjectStore.getState = vi.fn(() => ({
        currentProject: null,
        updateProjectLocally: mockUpdateProjectLocally,
        projects: [],
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProjectById: vi.fn(),
        loadProjects: vi.fn(),
        loadUserProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      }))
      
      const { getYarnById, getAllYarns, getYarnsByColor, getYarnsByBrand } = useYarnStore.getState()
      
      expect(getYarnById('yarn-1')).toBe(null)
      expect(getAllYarns()).toEqual([])
      expect(getYarnsByColor('#FFFFFF')).toEqual([])
      expect(getYarnsByBrand('Test')).toEqual([])
    })
  })

  describe('Color Management', () => {
    it('should create color with proper formatting', () => {
      const { createColor } = useYarnStore.getState()
      
      const color1 = createColor('紅色', '#FF0000')
      expect(color1).toEqual({ name: '紅色', hex: '#FF0000' })
      
      const color2 = createColor('藍色', 'FF0000') // Without #
      expect(color2).toEqual({ name: '藍色', hex: '#FF0000' })
      
      const color3 = createColor('  ', 'invalid')
      expect(color3).toEqual({ name: '未命名顏色', hex: '#INVALID' })
    })

    it('should provide common colors', () => {
      const { getCommonColors } = useYarnStore.getState()
      
      const colors = getCommonColors()
      expect(colors).toHaveLength(15)
      expect(colors[0]).toEqual({ name: '白色', hex: '#FFFFFF' })
      expect(colors[1]).toEqual({ name: '黑色', hex: '#000000' })
      
      // Verify all colors have proper structure
      colors.forEach(color => {
        expect(color).toHaveProperty('name')
        expect(color).toHaveProperty('hex')
        expect(color.hex).toMatch(/^#[0-9A-F]{6}$/)
      })
    })
  })

  describe('Yarn Usage Analysis', () => {
    it('should analyze yarn usage in pattern', () => {
      const projectWithPattern = {
        ...mockProject,
        pattern: [
          {
            id: 'round-1',
            roundNumber: 1,
            stitches: [
              { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 },
              { id: 'stitch-2', type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 3 }
            ],
            stitchGroups: [
              {
                id: 'group-1',
                name: 'Test Group',
                repeatCount: 2,
                stitches: [
                  { id: 'stitch-3', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 2 }
                ]
              }
            ],
            notes: ''
          },
          {
            id: 'round-2',
            roundNumber: 2,
            stitches: [
              { id: 'stitch-4', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 8 }
            ],
            stitchGroups: [],
            notes: ''
          }
        ]
      }
      
      const mockedUseProjectStore = vi.mocked(useProjectStore)
      mockedUseProjectStore.getState = vi.fn(() => ({
        currentProject: projectWithPattern,
        updateProjectLocally: mockUpdateProjectLocally,
        projects: [projectWithPattern],
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProjectById: vi.fn(),
        loadProjects: vi.fn(),
        loadUserProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      }))
      
      const { getYarnUsageInProject } = useYarnStore.getState()
      
      const yarn1Usage = getYarnUsageInProject('yarn-1')
      expect(yarn1Usage).toEqual({
        roundsUsed: [1, 2],
        totalStitches: 17 // 5 + (2*2) + 8 = 17
      })
      
      const yarn2Usage = getYarnUsageInProject('yarn-2')
      expect(yarn2Usage).toEqual({
        roundsUsed: [1],
        totalStitches: 3
      })
      
      const unusedYarnUsage = getYarnUsageInProject('unused-yarn')
      expect(unusedYarnUsage).toEqual({
        roundsUsed: [],
        totalStitches: 0
      })
    })

    it('should analyze usage with charts', () => {
      const projectWithCharts = {
        ...mockProject,
        currentChartId: 'chart-1',
        charts: [
          {
            id: 'chart-1',
            name: 'Test Chart',
            description: '',
            notes: '',
            rounds: [
              {
                id: 'round-1',
                roundNumber: 1,
                stitches: [
                  { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 10 }
                ],
                stitchGroups: [],
                notes: ''
              }
            ],
            currentRound: 1,
            currentStitch: 0,
            isCompleted: false,
            createdDate: new Date(),
            lastModified: new Date()
          }
        ]
      }
      
      const mockedUseProjectStore = vi.mocked(useProjectStore)
      mockedUseProjectStore.getState = vi.fn(() => ({
        currentProject: projectWithCharts,
        updateProjectLocally: mockUpdateProjectLocally,
        projects: [projectWithCharts],
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProjectById: vi.fn(),
        loadProjects: vi.fn(),
        loadUserProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      }))
      
      const { getYarnUsageInProject } = useYarnStore.getState()
      
      const usage = getYarnUsageInProject('yarn-1')
      expect(usage).toEqual({
        roundsUsed: [1],
        totalStitches: 10
      })
    })

    it('should get unused yarns', () => {
      const projectWithPattern = {
        ...mockProject,
        yarns: [
          ...mockProject.yarns,
          { id: 'yarn-3', name: '未使用毛線', color: { name: '藍色', hex: '#0000FF' } }
        ],
        pattern: [
          {
            id: 'round-1',
            roundNumber: 1,
            stitches: [
              { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 }
            ],
            stitchGroups: [],
            notes: ''
          }
        ]
      }
      
      const mockedUseProjectStore = vi.mocked(useProjectStore)
      mockedUseProjectStore.getState = vi.fn(() => ({
        currentProject: projectWithPattern,
        updateProjectLocally: mockUpdateProjectLocally,
        projects: [projectWithPattern],
        setProjects: vi.fn(),
        setCurrentProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        setCurrentProjectById: vi.fn(),
        loadProjects: vi.fn(),
        loadUserProjects: vi.fn(),
        clearUserData: vi.fn(),
        clearUserDataSilently: vi.fn()
      }))
      
      const { getUnusedYarns } = useYarnStore.getState()
      
      const unusedYarns = getUnusedYarns()
      expect(unusedYarns).toHaveLength(2)
      expect(unusedYarns.map(y => y.id)).toEqual(['yarn-2', 'yarn-3'])
    })
  })

  describe('Bulk Operations', () => {
    it('should import yarns', async () => {
      const { importYarns } = useYarnStore.getState()
      
      const yarnsToImport = [
        { id: 'import-1', name: '導入毛線1', color: { name: '紫色', hex: '#800080' } },
        { id: 'import-2', name: '導入毛線2', color: { name: '橙色', hex: '#FFA500' } }
      ]
      
      await importYarns(yarnsToImport)
      
      expect(mockUpdateProjectLocally).toHaveBeenCalledWith({
        ...mockProject,
        yarns: [
          ...mockProject.yarns,
          { id: expect.any(String), name: '導入毛線1', color: { name: '紫色', hex: '#800080' } },
          { id: expect.any(String), name: '導入毛線2', color: { name: '橙色', hex: '#FFA500' } }
        ],
        lastModified: expect.any(Date)
      })
    })

    it('should export yarns', () => {
      const { exportYarns } = useYarnStore.getState()
      
      const exportedYarns = exportYarns()
      expect(exportedYarns).toEqual(mockProject.yarns)
      expect(exportedYarns).not.toBe(mockProject.yarns) // Should be a copy
    })
  })

  describe('Color Utility Functions', () => {
    it('should convert hex to RGB', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 })
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 })
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 }) // Without #
      expect(hexToRgb('invalid')).toBe(null)
    })

    it('should convert RGB to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#FF0000')
      expect(rgbToHex(0, 255, 0)).toBe('#00FF00')
      expect(rgbToHex(0, 0, 255)).toBe('#0000FF')
      expect(rgbToHex(128, 128, 128)).toBe('#808080')
    })

    it('should calculate color brightness', () => {
      expect(getColorBrightness('#FFFFFF')).toBeCloseTo(1, 2)
      expect(getColorBrightness('#000000')).toBe(0)
      expect(getColorBrightness('#808080')).toBeCloseTo(0.502, 2)
      expect(getColorBrightness('invalid')).toBe(0)
    })

    it('should determine if color is light', () => {
      expect(isLightColor('#FFFFFF')).toBe(true)
      expect(isLightColor('#000000')).toBe(false)
      expect(isLightColor('#808080')).toBe(true)
      expect(isLightColor('#404040')).toBe(false)
    })

    it('should get contrast color', () => {
      expect(getContrastColor('#FFFFFF')).toBe('#000000')
      expect(getContrastColor('#000000')).toBe('#FFFFFF')
      expect(getContrastColor('#808080')).toBe('#000000')
      expect(getContrastColor('#404040')).toBe('#FFFFFF')
    })

    it('should calculate color distance', () => {
      expect(getColorDistance('#FF0000', '#FF0000')).toBe(0)
      expect(getColorDistance('#FF0000', '#00FF00')).toBeGreaterThan(0)
      expect(getColorDistance('#FFFFFF', '#000000')).toBeCloseTo(441.67, 1)
      expect(getColorDistance('invalid', '#FF0000')).toBe(Infinity)
      expect(getColorDistance('#FF0000', 'invalid')).toBe(Infinity)
    })

    it('should find similar colors', () => {
      const colors: YarnColor[] = [
        { name: '紅色', hex: '#FF0000' },
        { name: '深紅色', hex: '#CC0000' },
        { name: '藍色', hex: '#0000FF' },
        { name: '淺藍色', hex: '#3333FF' }
      ]
      
      const similarToRed = findSimilarColors('#FF0000', colors, 100)
      expect(similarToRed).toHaveLength(2)
      expect(similarToRed[0].name).toBe('紅色')
      expect(similarToRed[1].name).toBe('深紅色')
      
      const similarToBlue = findSimilarColors('#0000FF', colors, 100)
      expect(similarToBlue).toHaveLength(2)
      expect(similarToBlue[0].name).toBe('藍色')
      expect(similarToBlue[1].name).toBe('淺藍色')
    })
  })
})