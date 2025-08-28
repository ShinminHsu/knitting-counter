import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateId, createSampleYarns, createSampleProject } from './generators'
import { StitchType } from '../../types'

// Mock crypto.randomUUID
const mockUUID = vi.fn()
vi.stubGlobal('crypto', {
  randomUUID: mockUUID
})

describe('Generators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateId', () => {
    it('should generate a unique ID using crypto.randomUUID', () => {
      const mockId = 'test-uuid-123'
      mockUUID.mockReturnValue(mockId)
      
      const result = generateId()
      
      expect(mockUUID).toHaveBeenCalledOnce()
      expect(result).toBe(mockId)
    })

    it('should return different IDs on multiple calls', () => {
      mockUUID
        .mockReturnValueOnce('id-1')
        .mockReturnValueOnce('id-2')
        .mockReturnValueOnce('id-3')
      
      const id1 = generateId()
      const id2 = generateId()
      const id3 = generateId()
      
      expect(id1).toBe('id-1')
      expect(id2).toBe('id-2')
      expect(id3).toBe('id-3')
      expect(mockUUID).toHaveBeenCalledTimes(3)
    })
  })

  describe('createSampleYarns', () => {
    beforeEach(() => {
      mockUUID
        .mockReturnValueOnce('yarn-1')
        .mockReturnValueOnce('yarn-2')
        .mockReturnValueOnce('yarn-3')
    })

    it('should create an array of 3 sample yarns', () => {
      const yarns = createSampleYarns()
      
      expect(yarns).toHaveLength(3)
      expect(mockUUID).toHaveBeenCalledTimes(3)
    })

    it('should create yarns with correct structure and data', () => {
      const yarns = createSampleYarns()
      
      expect(yarns[0]).toEqual({
        id: 'yarn-1',
        name: '白色棉線',
        brand: '樣本品牌',
        color: { name: '白色', hex: '#FFFFFF' }
      })
      
      expect(yarns[1]).toEqual({
        id: 'yarn-2',
        name: '粉色棉線',
        brand: '樣本品牌',
        color: { name: '粉色', hex: '#FFB3E6' }
      })
      
      expect(yarns[2]).toEqual({
        id: 'yarn-3',
        name: '藍色棉線',
        brand: '樣本品牌',
        color: { name: '藍色', hex: '#87CEEB' }
      })
    })

    it('should have unique IDs for each yarn', () => {
      const yarns = createSampleYarns()
      const ids = yarns.map(yarn => yarn.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(yarns.length)
    })

    it('should have valid hex colors', () => {
      const yarns = createSampleYarns()
      
      yarns.forEach(yarn => {
        expect(yarn.color.hex).toMatch(/^#[0-9A-F]{6}$/i)
      })
    })
  })

  describe('createSampleProject', () => {
    beforeEach(() => {
      // Mock multiple UUIDs for the project creation
      const mockIds = [
        'yarn-1', 'yarn-2', 'yarn-3', // for yarns
        'round-1', 'stitch-1', 'stitch-2', // for round 1
        'round-2', 'stitch-3', // for round 2
        'round-3', 'stitch-4', // for round 3
        'project-1' // for project
      ]
      mockIds.forEach(id => mockUUID.mockReturnValueOnce(id))
    })

    it('should create a complete project with all required fields', () => {
      const project = createSampleProject()
      
      expect(project).toHaveProperty('id', 'project-1')
      expect(project).toHaveProperty('name', '範例杯墊')
      expect(project).toHaveProperty('source', 'https://www.youtube.com/watch?v=example')
      expect(project).toHaveProperty('currentRound', 1)
      expect(project).toHaveProperty('currentStitch', 0)
      expect(project).toHaveProperty('isCompleted', false)
      expect(project).toHaveProperty('sessions', [])
      expect(project.createdDate).toBeInstanceOf(Date)
      expect(project.lastModified).toBeInstanceOf(Date)
    })

    it('should include sample yarns', () => {
      const project = createSampleProject()
      
      expect(project.yarns).toHaveLength(3)
      expect(project.yarns[0].name).toBe('白色棉線')
      expect(project.yarns[1].name).toBe('粉色棉線')
      expect(project.yarns[2].name).toBe('藍色棉線')
    })

    it('should create 3 rounds with correct structure', () => {
      const project = createSampleProject()
      
      expect(project.pattern).toBeDefined()
      expect(project.pattern).toHaveLength(3)
      
      // Round 1
      expect(project.pattern![0]).toEqual({
        id: 'round-1',
        roundNumber: 1,
        stitches: [
          {
            id: 'stitch-1',
            type: StitchType.CHAIN,
            yarnId: 'yarn-1',
            count: 4
          },
          {
            id: 'stitch-2',
            type: StitchType.SLIP,
            yarnId: 'yarn-1',
            count: 1
          }
        ],
        stitchGroups: [],
        notes: '起始魔術環'
      })
      
      // Round 2
      expect(project.pattern![1]).toEqual({
        id: 'round-2',
        roundNumber: 2,
        stitches: [
          {
            id: 'stitch-3',
            type: StitchType.SINGLE,
            yarnId: 'yarn-1',
            count: 8
          }
        ],
        stitchGroups: [],
        notes: '短針增加'
      })
      
      // Round 3
      expect(project.pattern![2]).toEqual({
        id: 'round-3',
        roundNumber: 3,
        stitches: [
          {
            id: 'stitch-4',
            type: StitchType.SINGLE,
            yarnId: 'yarn-2', // Uses second yarn (color change)
            count: 16
          }
        ],
        stitchGroups: [],
        notes: '換色，繼續增加'
      })
    })

    it('should use different yarns across rounds', () => {
      const project = createSampleProject()
      
      expect(project.pattern).toBeDefined()
      // Round 1 and 2 use first yarn
      expect(project.pattern![0].stitches[0].yarnId).toBe('yarn-1')
      expect(project.pattern![0].stitches[1].yarnId).toBe('yarn-1')
      expect(project.pattern![1].stitches[0].yarnId).toBe('yarn-1')
      
      // Round 3 uses second yarn (color change)
      expect(project.pattern![2].stitches[0].yarnId).toBe('yarn-2')
    })

    it('should have valid stitch types', () => {
      const project = createSampleProject()
      
      expect(project.pattern).toBeDefined()
      project.pattern!.forEach(round => {
        round.stitches.forEach(stitch => {
          expect(Object.values(StitchType)).toContain(stitch.type)
        })
      })
    })

    it('should have increasing stitch counts across rounds', () => {
      const project = createSampleProject()
      
      expect(project.pattern).toBeDefined()
      // Round 1: 4 + 1 = 5 stitches
      const round1Total = project.pattern![0].stitches.reduce((sum, s) => sum + s.count, 0)
      expect(round1Total).toBe(5)
      
      // Round 2: 8 stitches
      const round2Total = project.pattern![1].stitches.reduce((sum, s) => sum + s.count, 0)
      expect(round2Total).toBe(8)
      
      // Round 3: 16 stitches
      const round3Total = project.pattern![2].stitches.reduce((sum, s) => sum + s.count, 0)
      expect(round3Total).toBe(16)
    })

    it('should create timestamps close to current time', () => {
      const beforeCreate = Date.now()
      const project = createSampleProject()
      const afterCreate = Date.now()
      
      expect(project.createdDate.getTime()).toBeGreaterThanOrEqual(beforeCreate)
      expect(project.createdDate.getTime()).toBeLessThanOrEqual(afterCreate)
      expect(project.lastModified.getTime()).toBeGreaterThanOrEqual(beforeCreate)
      expect(project.lastModified.getTime()).toBeLessThanOrEqual(afterCreate)
    })
  })
})