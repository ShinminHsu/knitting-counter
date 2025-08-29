
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  migrateRoundToPatternItems,
  syncPatternItemsToLegacyFormat,
  getSortedPatternItems,
  addStitchToPatternItems,
  addGroupToPatternItems,
  reorderPatternItems,
  updateStitchInPatternItems,
  deleteStitchFromPatternItems,
  updateGroupInPatternItems,
  deleteGroupFromPatternItems,
  updateStitchInGroupPatternItems,
  updateGroupCompletedRepeatsInPatternItems
} from './rendering'
import {
  Round,
  StitchInfo,
  StitchGroup,
  PatternItem,
  PatternItemType,
  StitchType
} from '../../types'
import { createMockRound, createMockStitchInfo } from '../../test/utils'

// Mock the generators module
vi.mock('../common/generators', () => ({
  generateId: vi.fn(() => `mock-id-${Math.random().toString(36).substr(2, 9)}`)
}))

describe('Pattern Rendering', () => {
  let mockStitch1: StitchInfo
  let mockStitch2: StitchInfo
  let mockGroup: StitchGroup
  let mockRound: Round

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockStitch1 = createMockStitchInfo({
      id: 'stitch-1',
      type: StitchType.SINGLE,
      yarnId: 'yarn-1',
      count: 3
    })

    mockStitch2 = createMockStitchInfo({
      id: 'stitch-2',
      type: StitchType.CHAIN,
      yarnId: 'yarn-1',
      count: 2
    })

    mockGroup = {
      id: 'group-1',
      name: '測試群組',
      stitches: [mockStitch1],
      repeatCount: 2
    }

    mockRound = createMockRound({
      id: 'round-1',
      roundNumber: 1,
      stitches: [mockStitch1, mockStitch2],
      stitchGroups: [mockGroup]
    })
  })

  describe('migrateRoundToPatternItems', () => {
    it('should convert legacy format to pattern items', () => {
      const result = migrateRoundToPatternItems(mockRound)
      
      expect(result.patternItems).toHaveLength(3) // 2 stitches + 1 group
      
      // Check stitch items
      expect(result.patternItems![0]).toEqual({
        id: expect.any(String),
        type: PatternItemType.STITCH,
        order: 0,
        createdAt: expect.any(Date),
        data: mockStitch1
      })

      expect(result.patternItems![1]).toEqual({
        id: expect.any(String),
        type: PatternItemType.STITCH,
        order: 1,
        createdAt: expect.any(Date),
        data: mockStitch2
      })

      // Check group item
      expect(result.patternItems![2]).toEqual({
        id: expect.any(String),
        type: PatternItemType.GROUP,
        order: 2,
        createdAt: expect.any(Date),
        data: mockGroup
      })
    })

    it('should preserve existing pattern items if already present', () => {
      const existingPatternItems: PatternItem[] = [
        {
          id: 'existing-1',
          type: PatternItemType.STITCH,
          order: 0,
          createdAt: new Date('2023-01-01'),
          data: mockStitch1
        }
      ]

      const roundWithPatternItems = {
        ...mockRound,
        patternItems: existingPatternItems
      }

      const result = migrateRoundToPatternItems(roundWithPatternItems)
      
      expect(result.patternItems).toHaveLength(1)
      expect(result.patternItems![0].id).toBe('existing-1')
    })

    it('should reorder existing pattern items correctly', () => {
      const unorderedPatternItems: PatternItem[] = [
        {
          id: 'item-2',
          type: PatternItemType.STITCH,
          order: 2,
          createdAt: new Date('2023-01-02'),
          data: mockStitch2
        },
        {
          id: 'item-1',
          type: PatternItemType.STITCH,
          order: 1,
          createdAt: new Date('2023-01-01'),
          data: mockStitch1
        }
      ]

      const roundWithPatternItems = {
        ...mockRound,
        patternItems: unorderedPatternItems
      }

      const result = migrateRoundToPatternItems(roundWithPatternItems)
      
      expect(result.patternItems![0].order).toBe(0)
      expect(result.patternItems![1].order).toBe(1)
      expect(result.patternItems![0].id).toBe('item-1')
      expect(result.patternItems![1].id).toBe('item-2')
    })

    it('should handle empty round', () => {
      const emptyRound = createMockRound({
        stitches: [],
        stitchGroups: []
      })

      const result = migrateRoundToPatternItems(emptyRound)
      
      expect(result.patternItems).toHaveLength(0)
    })
  })

  describe('syncPatternItemsToLegacyFormat', () => {
    it('should convert pattern items back to legacy format', () => {
      const patternItems: PatternItem[] = [
        {
          id: 'item-1',
          type: PatternItemType.STITCH,
          order: 0,
          createdAt: new Date(),
          data: mockStitch1
        },
        {
          id: 'item-2',
          type: PatternItemType.GROUP,
          order: 1,
          createdAt: new Date(),
          data: mockGroup
        }
      ]

      const round = {
        ...mockRound,
        patternItems
      }

      const result = syncPatternItemsToLegacyFormat(round)
      
      expect(result.stitches).toHaveLength(1)
      expect(result.stitches[0]).toBe(mockStitch1)
      expect(result.stitchGroups).toHaveLength(1)
      expect(result.stitchGroups[0]).toBe(mockGroup)
    })

    it('should return round unchanged when no pattern items', () => {
      const roundWithoutPatternItems = {
        ...mockRound,
        patternItems: undefined
      }

      const result = syncPatternItemsToLegacyFormat(roundWithoutPatternItems)
      
      expect(result).toBe(roundWithoutPatternItems)
    })

    it('should sort items by order and createdAt', () => {
      const patternItems: PatternItem[] = [
        {
          id: 'item-2',
          type: PatternItemType.STITCH,
          order: 1,
          createdAt: new Date('2023-01-02'),
          data: mockStitch2
        },
        {
          id: 'item-1',
          type: PatternItemType.STITCH,
          order: 1,
          createdAt: new Date('2023-01-01'),
          data: mockStitch1
        }
      ]

      const round = {
        ...mockRound,
        patternItems
      }

      const result = syncPatternItemsToLegacyFormat(round)
      
      expect(result.stitches[0]).toBe(mockStitch1) // Earlier createdAt should come first
      expect(result.stitches[1]).toBe(mockStitch2)
    })
  })

  describe('getSortedPatternItems', () => {
    it('should return sorted pattern items', () => {
      const result = getSortedPatternItems(mockRound)
      
      expect(result).toHaveLength(3)
      expect(result[0].order).toBe(0)
      expect(result[1].order).toBe(1)
      expect(result[2].order).toBe(2)
    })

    it('should handle round with no pattern items', () => {
      const emptyRound = createMockRound({
        stitches: [],
        stitchGroups: []
      })

      const result = getSortedPatternItems(emptyRound)
      
      expect(result).toHaveLength(0)
    })
  })

  describe('addStitchToPatternItems', () => {
    it('should add stitch to pattern items', () => {
      const newStitch = createMockStitchInfo({
        id: 'new-stitch',
        type: StitchType.DOUBLE,
        yarnId: 'yarn-1',
        count: 1
      })

      const result = addStitchToPatternItems(mockRound, newStitch)
      
      expect(result.patternItems).toHaveLength(4) // 3 existing + 1 new
      expect(result.patternItems![3].type).toBe(PatternItemType.STITCH)
      expect(result.patternItems![3].data).toBe(newStitch)
      expect(result.patternItems![3].order).toBe(3)
    })

    it('should sync to legacy format', () => {
      const newStitch = createMockStitchInfo({ id: 'new-stitch' })
      const result = addStitchToPatternItems(mockRound, newStitch)
      
      expect(result.stitches).toContain(newStitch)
    })
  })

  describe('addGroupToPatternItems', () => {
    it('should add group to pattern items', () => {
      const newGroup: StitchGroup = {
        id: 'new-group',
        name: '新群組',
        stitches: [mockStitch1],
        repeatCount: 1
      }

      const result = addGroupToPatternItems(mockRound, newGroup)
      
      expect(result.patternItems).toHaveLength(4) // 3 existing + 1 new
      expect(result.patternItems![3].type).toBe(PatternItemType.GROUP)
      expect(result.patternItems![3].data).toBe(newGroup)
    })
  })

  describe('reorderPatternItems', () => {
    it('should reorder pattern items correctly', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      // Move item from index 0 to index 2
      const result = reorderPatternItems(migratedRound, 0, 2)
      
      expect(result.patternItems![0].order).toBe(0)
      expect(result.patternItems![1].order).toBe(1)
      expect(result.patternItems![2].order).toBe(2)
      
      // The original first item should now be last
      expect((result.patternItems![2].data as StitchInfo).id).toBe('stitch-1')
    })

    it('should handle moving to beginning', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      // Move last item to beginning
      const result = reorderPatternItems(migratedRound, 2, 0)
      
      expect((result.patternItems![0].data as StitchGroup).id).toBe('group-1')
    })
  })

  describe('updateStitchInPatternItems', () => {
    it('should update existing stitch', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      const updatedStitch = { ...mockStitch1, count: 5 }
      
      const result = updateStitchInPatternItems(migratedRound, 'stitch-1', updatedStitch)
      
      const stitchItem = result.patternItems!.find(
        item => item.type === PatternItemType.STITCH && (item.data as StitchInfo).id === 'stitch-1'
      )
      
      expect((stitchItem!.data as StitchInfo).count).toBe(5)
    })

    it('should not affect other items when updating', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      const updatedStitch = { ...mockStitch1, count: 5 }
      
      const result = updateStitchInPatternItems(migratedRound, 'stitch-1', updatedStitch)
      
      const otherStitchItem = result.patternItems!.find(
        item => item.type === PatternItemType.STITCH && (item.data as StitchInfo).id === 'stitch-2'
      )
      
      expect((otherStitchItem!.data as StitchInfo).count).toBe(2) // Unchanged
    })
  })

  describe('deleteStitchFromPatternItems', () => {
    it('should remove stitch from pattern items', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = deleteStitchFromPatternItems(migratedRound, 'stitch-1')
      
      expect(result.patternItems).toHaveLength(2) // 3 - 1 = 2
      
      const hasDeletedStitch = result.patternItems!.some(
        item => item.type === PatternItemType.STITCH && (item.data as StitchInfo).id === 'stitch-1'
      )
      
      expect(hasDeletedStitch).toBe(false)
    })

    it('should reorder remaining items', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = deleteStitchFromPatternItems(migratedRound, 'stitch-1')
      
      // Orders should be 0, 1 after deletion
      expect(result.patternItems![0].order).toBe(0)
      expect(result.patternItems![1].order).toBe(1)
    })
  })

  describe('updateGroupInPatternItems', () => {
    it('should update existing group', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      const updatedGroup = { ...mockGroup, name: '更新的群組', repeatCount: 3 }
      
      const result = updateGroupInPatternItems(migratedRound, 'group-1', updatedGroup)
      
      const groupItem = result.patternItems!.find(
        item => item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === 'group-1'
      )
      
      expect((groupItem!.data as StitchGroup).name).toBe('更新的群組')
      expect((groupItem!.data as StitchGroup).repeatCount).toBe(3)
    })
  })

  describe('updateStitchInGroupPatternItems', () => {
    it('should update stitch within a group', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      const updatedStitch = { ...mockStitch1, count: 8 }
      
      const result = updateStitchInGroupPatternItems(migratedRound, 'group-1', 'stitch-1', updatedStitch)
      
      const groupItem = result.patternItems!.find(
        item => item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === 'group-1'
      )
      
      const updatedStitchInGroup = (groupItem!.data as StitchGroup).stitches.find(s => s.id === 'stitch-1')
      expect(updatedStitchInGroup!.count).toBe(8)
    })

    it('should not affect other groups', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      const updatedStitch = { ...mockStitch1, count: 8 }
      
      const result = updateStitchInGroupPatternItems(migratedRound, 'group-1', 'stitch-1', updatedStitch)
      
      // Check that individual stitches are not affected
      const individualStitchItem = result.patternItems!.find(
        item => item.type === PatternItemType.STITCH && (item.data as StitchInfo).id === 'stitch-1'
      )
      
      expect((individualStitchItem!.data as StitchInfo).count).toBe(3) // Original value
    })
  })

  describe('updateGroupCompletedRepeatsInPatternItems', () => {
    it('should update completed repeats for group', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = updateGroupCompletedRepeatsInPatternItems(migratedRound, 'group-1', 1)
      
      const groupItem = result.patternItems!.find(
        item => item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === 'group-1'
      )
      
      expect((groupItem!.data as StitchGroup).completedRepeats).toBe(1)
    })

    it('should cap completed repeats at repeat count', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = updateGroupCompletedRepeatsInPatternItems(migratedRound, 'group-1', 5) // More than repeatCount of 2
      
      const groupItem = result.patternItems!.find(
        item => item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === 'group-1'
      )
      
      expect((groupItem!.data as StitchGroup).completedRepeats).toBe(2) // Capped at repeatCount
    })

    it('should not allow negative completed repeats', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = updateGroupCompletedRepeatsInPatternItems(migratedRound, 'group-1', -1)
      
      const groupItem = result.patternItems!.find(
        item => item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === 'group-1'
      )
      
      expect((groupItem!.data as StitchGroup).completedRepeats).toBe(0) // Minimum 0
    })
  })

  describe('deleteGroupFromPatternItems', () => {
    it('should remove group from pattern items', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = deleteGroupFromPatternItems(migratedRound, 'group-1')
      
      expect(result.patternItems).toHaveLength(2) // 3 - 1 = 2
      
      const hasDeletedGroup = result.patternItems!.some(
        item => item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === 'group-1'
      )
      
      expect(hasDeletedGroup).toBe(false)
    })

    it('should reorder remaining items after deletion', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = deleteGroupFromPatternItems(migratedRound, 'group-1')
      
      // Orders should be sequential after deletion
      expect(result.patternItems![0].order).toBe(0)
      expect(result.patternItems![1].order).toBe(1)
    })

    it('should sync to legacy format', () => {
      const migratedRound = migrateRoundToPatternItems(mockRound)
      
      const result = deleteGroupFromPatternItems(migratedRound, 'group-1')
      
      expect(result.stitchGroups).toHaveLength(0)
      expect(result.stitches).toHaveLength(2) // Individual stitches remain
    })
  })
})