import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTemplateStore, validateTemplate, getTemplateStitchCount, getTemplatePreview } from './useTemplateStore'
import { StitchGroupTemplate, StitchInfo, StitchGroup, StitchType } from '../types'

// Mock dependencies - fixed hoisting issue
vi.mock('../utils', () => ({
  generateId: vi.fn()
}))

vi.mock('./useBaseStore', () => ({
  handleAsyncError: vi.fn((error, context) => {
    console.error(`[${context}]`, error)
  })
}))

// Import the mocked function after vi.mock
import { generateId } from '../utils'
const mockGenerateId = vi.mocked(generateId)

describe('useTemplateStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTemplateStore.setState({
      templates: [],
      isLoading: false
    })
    
    // Reset the mock to return valid IDs by default
    mockGenerateId.mockImplementation(() => 'mock-id-' + Date.now() + '-' + Math.random().toString(36).substring(2))
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useTemplateStore.getState()
      expect(state.templates).toEqual([])
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Template Management', () => {
    it('should create template with all parameters', async () => {
      const { createTemplate } = useTemplateStore.getState()
      
      const stitches: StitchInfo[] = [
        { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 },
        { id: 'stitch-2', type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 3 }
      ]
      
      const result = await createTemplate('測試範本', '這是一個測試範本', stitches, '測試分類')
      
      expect(result).toEqual({
        id: expect.any(String),
        name: '測試範本',
        description: '這是一個測試範本',
        stitches: [
          { id: expect.any(String), type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 },
          { id: expect.any(String), type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 3 }
        ],
        repeatCount: 1,
        category: '測試分類',
        createdDate: expect.any(Date),
        useCount: 0
      })
      
      const state = useTemplateStore.getState()
      expect(state.templates).toHaveLength(1)
      expect(state.templates[0]).toBe(result)
    })

    it('should create template with default values', async () => {
      const { createTemplate } = useTemplateStore.getState()
      
      const result = await createTemplate('', '', [])
      
      expect(result).toEqual({
        id: expect.any(String),
        name: '新範本',
        description: '',
        stitches: [],
        repeatCount: 1,
        category: '一般',
        createdDate: expect.any(Date),
        useCount: 0
      })
    })

    it('should handle create template error', async () => {
      mockGenerateId.mockImplementation(() => {
        throw new Error('ID generation failed')
      })
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { createTemplate } = useTemplateStore.getState()
      
      const result = await createTemplate('Test', 'Test', [])
      
      expect(result).toBe(null)
      expect(consoleSpy).toHaveBeenCalled()
      expect(useTemplateStore.getState().isLoading).toBe(false)
      
      consoleSpy.mockRestore()
    })

    it('should update template', async () => {
      const { createTemplate, updateTemplate } = useTemplateStore.getState()
      
      const template = await createTemplate('原始範本', '原始描述', [])
      expect(template).not.toBe(null)
      
      const updates = {
        name: '更新的範本',
        description: '更新的描述',
        category: '新分類'
      }
      
      await updateTemplate(template!.id, updates)
      
      const state = useTemplateStore.getState()
      expect(state.templates[0]).toEqual({
        ...template,
        ...updates
      })
    })

    it('should delete template', async () => {
      const { createTemplate, deleteTemplate } = useTemplateStore.getState()
      
      const template1 = await createTemplate('範本1', '', [])
      const template2 = await createTemplate('範本2', '', [])
      
      expect(useTemplateStore.getState().templates).toHaveLength(2)
      
      await deleteTemplate(template1!.id)
      
      const state = useTemplateStore.getState()
      expect(state.templates).toHaveLength(1)
      expect(state.templates[0].id).toBe(template2!.id)
    })

    it('should duplicate template', async () => {
      const { createTemplate, duplicateTemplate } = useTemplateStore.getState()
      
      const stitches: StitchInfo[] = [
        { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 }
      ]
      
      const original = await createTemplate('原始範本', '原始描述', stitches, '原始分類')
      expect(original).not.toBe(null)
      
      // Increment use count to test reset
      await useTemplateStore.getState().incrementUseCount(original!.id)
      await useTemplateStore.getState().updateLastUsed(original!.id)
      
      const duplicate = await duplicateTemplate(original!.id)
      
      expect(duplicate).toEqual({
        id: expect.any(String),
        name: '原始範本 (複製)',
        description: '原始描述',
        stitches: [
          { id: expect.any(String), type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 }
        ],
        repeatCount: 1,
        category: '原始分類',
        createdDate: expect.any(Date),
        useCount: 0,
        lastUsed: undefined
      })
      
      expect(duplicate!.id).not.toBe(original!.id)
      expect(duplicate!.stitches[0].id).not.toBe(original!.stitches[0].id)
    })

    it('should handle duplicate non-existent template', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { duplicateTemplate } = useTemplateStore.getState()
      
      const result = await duplicateTemplate('non-existent-id')
      
      expect(result).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith('[TEMPLATE] duplicateTemplate: Source template not found:', 'non-existent-id')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Template Usage', () => {
    it('should use template and create stitch group', async () => {
      const { createTemplate, useTemplate } = useTemplateStore.getState()
      
      const stitches: StitchInfo[] = [
        { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 3 },
        { id: 'stitch-2', type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 2 }
      ]
      
      const template = await createTemplate('測試範本', '測試描述', stitches)
      expect(template).not.toBe(null)
      
      const stitchGroup = await useTemplate(template!.id)
      
      expect(stitchGroup).toEqual({
        id: expect.any(String),
        name: '測試範本',
        stitches: [
          { id: expect.any(String), type: StitchType.SINGLE, yarnId: 'yarn-1', count: 3 },
          { id: expect.any(String), type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 2 }
        ],
        repeatCount: 1
      })
      
      // Verify IDs are different from template
      expect(stitchGroup!.stitches[0].id).not.toBe(template!.stitches[0].id)
      expect(stitchGroup!.stitches[1].id).not.toBe(template!.stitches[1].id)
      
      // Verify use count and last used were updated
      const updatedState = useTemplateStore.getState()
      expect(updatedState.templates[0].useCount).toBe(1)
      expect(updatedState.templates[0].lastUsed).toBeInstanceOf(Date)
    })

    it('should handle use non-existent template', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { useTemplate } = useTemplateStore.getState()
      
      const result = await useTemplate('non-existent-id')
      
      expect(result).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith('[TEMPLATE] useTemplate: Template not found:', 'non-existent-id')
      
      consoleSpy.mockRestore()
    })

    it('should increment use count', async () => {
      const { createTemplate, incrementUseCount } = useTemplateStore.getState()
      
      const template = await createTemplate('測試範本', '', [])
      expect(template!.useCount).toBe(0)
      
      await incrementUseCount(template!.id)
      expect(useTemplateStore.getState().templates[0].useCount).toBe(1)
      
      await incrementUseCount(template!.id)
      expect(useTemplateStore.getState().templates[0].useCount).toBe(2)
    })

    it('should update last used', async () => {
      const { createTemplate, updateLastUsed } = useTemplateStore.getState()
      
      const template = await createTemplate('測試範本', '', [])
      expect(template!.lastUsed).toBeUndefined()
      
      await updateLastUsed(template!.id)
      expect(useTemplateStore.getState().templates[0].lastUsed).toBeInstanceOf(Date)
    })
  })

  describe('Template Queries', () => {
    beforeEach(async () => {
      const { createTemplate } = useTemplateStore.getState()
      
      await createTemplate('範本1', '描述1', [], '分類A')
      await createTemplate('範本2', '描述2', [], '分類B')
      await createTemplate('範本3', '描述3', [], '分類A')
    })

    it('should get template by ID', () => {
      const { getTemplateById } = useTemplateStore.getState()
      const templates = useTemplateStore.getState().templates
      
      const found = getTemplateById(templates[0].id)
      expect(found).toBe(templates[0])
      
      const notFound = getTemplateById('non-existent-id')
      expect(notFound).toBe(null)
    })

    it('should get templates by category', () => {
      const { getTemplatesByCategory } = useTemplateStore.getState()
      
      const categoryA = getTemplatesByCategory('分類A')
      expect(categoryA).toHaveLength(2)
      expect(categoryA.every(t => t.category === '分類A')).toBe(true)
      
      const categoryB = getTemplatesByCategory('分類B')
      expect(categoryB).toHaveLength(1)
      expect(categoryB[0].category).toBe('分類B')
      
      const nonExistent = getTemplatesByCategory('不存在的分類')
      expect(nonExistent).toHaveLength(0)
    })

    it('should get recently used templates', async () => {
      const { useTemplate, getRecentlyUsedTemplates } = useTemplateStore.getState()
      const templates = useTemplateStore.getState().templates
      
      // Use some templates with delays
      await useTemplate(templates[0].id)
      await new Promise(resolve => setTimeout(resolve, 10))
      await useTemplate(templates[2].id)
      
      const recentlyUsed = getRecentlyUsedTemplates()
      expect(recentlyUsed).toHaveLength(2)
      expect(recentlyUsed[0].id).toBe(templates[2].id) // Most recent first
      expect(recentlyUsed[1].id).toBe(templates[0].id)
    })

    it('should get popular templates', async () => {
      const { useTemplate, getPopularTemplates } = useTemplateStore.getState()
      const templates = useTemplateStore.getState().templates
      
      // Use templates different number of times
      await useTemplate(templates[0].id)
      await useTemplate(templates[0].id) // 2 times
      await useTemplate(templates[1].id) // 1 time
      
      const popular = getPopularTemplates()
      expect(popular).toHaveLength(2)
      expect(popular[0].id).toBe(templates[0].id) // Most popular first
      expect(popular[0].useCount).toBe(2)
      expect(popular[1].id).toBe(templates[1].id)
      expect(popular[1].useCount).toBe(1)
    })

    it('should search templates', () => {
      const { searchTemplates } = useTemplateStore.getState()
      
      const searchByName = searchTemplates('範本1')
      expect(searchByName).toHaveLength(1)
      expect(searchByName[0].name).toBe('範本1')
      
      const searchByDescription = searchTemplates('描述2')
      expect(searchByDescription).toHaveLength(1)
      expect(searchByDescription[0].description).toBe('描述2')
      
      const searchByCategory = searchTemplates('分類A')
      expect(searchByCategory).toHaveLength(2)
      
      const emptySearch = searchTemplates('')
      expect(emptySearch).toHaveLength(3) // All templates
      
      const noResults = searchTemplates('不存在的內容')
      expect(noResults).toHaveLength(0)
    })
  })

  describe('Template Organization', () => {
    beforeEach(async () => {
      const { createTemplate } = useTemplateStore.getState()
      
      await createTemplate('範本1', '', [], '花朵圖案')
      await createTemplate('範本2', '', [], '基本技法')
      await createTemplate('範本3', '', [], '花朵圖案')
      await createTemplate('範本4', '', [], '扇形圖案')
    })

    it('should get categories', () => {
      const { getCategories } = useTemplateStore.getState()
      
      const categories = getCategories()
      expect(categories).toEqual(['基本技法', '扇形圖案', '花朵圖案'])
    })

    it('should create template from stitch group', async () => {
      const { createFromStitchGroup } = useTemplateStore.getState()
      
      const stitchGroup: StitchGroup = {
        id: 'group-1',
        name: '測試群組',
        stitches: [
          { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 }
        ],
        repeatCount: 3
      }
      
      const template = await createFromStitchGroup(stitchGroup, '從群組創建', '從針法群組創建的範本', '自定義分類')
      
      expect(template).toEqual({
        id: expect.any(String),
        name: '從群組創建',
        description: '從針法群組創建的範本',
        stitches: [
          { id: expect.any(String), type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 }
        ],
        repeatCount: 1, // Should be 1, not 3 - the createFromStitchGroup doesn't preserve repeatCount
        category: '自定義分類',
        createdDate: expect.any(Date),
        useCount: 0
      })
    })
  })

  describe('Bulk Operations', () => {
    it('should import templates', async () => {
      const { importTemplates } = useTemplateStore.getState()
      
      const templatesToImport: StitchGroupTemplate[] = [
        {
          id: 'import-1',
          name: '導入範本1',
          description: '導入的範本',
          stitches: [{ id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 3 }],
          repeatCount: 1,
          category: '導入分類',
          createdDate: new Date('2023-01-01'),
          useCount: 5,
          lastUsed: new Date('2023-12-01')
        },
        {
          id: 'import-2',
          name: '導入範本2',
          description: '另一個導入的範本',
          stitches: [],
          repeatCount: 2,
          category: '導入分類',
          createdDate: new Date('2023-02-01'),
          useCount: 10
        }
      ]
      
      await importTemplates(templatesToImport)
      
      const state = useTemplateStore.getState()
      expect(state.templates).toHaveLength(2)
      
      // Verify new IDs and reset counts
      state.templates.forEach((template, index) => {
        expect(template.id).not.toBe(templatesToImport[index].id)
        expect(template.name).toBe(templatesToImport[index].name)
        expect(template.useCount).toBe(0)
        expect(template.lastUsed).toBeUndefined()
        expect(template.createdDate).toBeInstanceOf(Date)
        // Only check stitch ID if the template has stitches
        if (template.stitches.length > 0 && templatesToImport[index].stitches.length > 0) {
          expect(template.stitches[0].id).not.toBe(templatesToImport[index].stitches[0].id)
        }
      })
    })

    it('should export templates', async () => {
      const { createTemplate, exportTemplates } = useTemplateStore.getState()
      
      await createTemplate('範本1', '描述1', [])
      await createTemplate('範本2', '描述2', [])
      
      const exported = exportTemplates()
      const stored = useTemplateStore.getState().templates
      
      expect(exported).toEqual(stored)
      expect(exported).not.toBe(stored) // Should be a copy
      expect(exported[0]).not.toBe(stored[0]) // Deep copy
    })

    it('should clear all templates', async () => {
      const { createTemplate, clearAllTemplates } = useTemplateStore.getState()
      
      await createTemplate('範本1', '', [])
      await createTemplate('範本2', '', [])
      
      expect(useTemplateStore.getState().templates).toHaveLength(2)
      
      await clearAllTemplates()
      
      expect(useTemplateStore.getState().templates).toHaveLength(0)
    })
  })

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { setLoading } = useTemplateStore.getState()
      
      setLoading(true)
      expect(useTemplateStore.getState().isLoading).toBe(true)
      
      setLoading(false)
      expect(useTemplateStore.getState().isLoading).toBe(false)
    })

    it('should manage loading during operations', async () => {
      const { createTemplate } = useTemplateStore.getState()
      
      let loadingDuringOperation = false
      mockGenerateId.mockImplementation(() => {
        loadingDuringOperation = useTemplateStore.getState().isLoading
        return 'mock-id'
      })
      
      await createTemplate('測試', '', [])
      
      expect(loadingDuringOperation).toBe(true)
      expect(useTemplateStore.getState().isLoading).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    it('should validate template', () => {
      const validTemplate: StitchGroupTemplate = {
        id: 'valid-id',
        name: '有效範本',
        description: '這是有效的範本',
        stitches: [
          { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 }
        ],
        repeatCount: 2,
        category: '測試分類',
        createdDate: new Date(),
        useCount: 0
      }
      
      const validation = validateTemplate(validTemplate)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('should detect invalid template', () => {
      const invalidTemplate: StitchGroupTemplate = {
        id: '',
        name: '  ', // Empty name
        description: '',
        stitches: [
          { id: '', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 0 }, // No ID, zero count
          { id: 'stitch-2', type: StitchType.DOUBLE, yarnId: 'yarn-2', count: -1 } // Negative count
        ],
        repeatCount: 0, // Invalid repeat count
        category: '測試分類',
        createdDate: new Date(),
        useCount: 0
      }
      
      const validation = validateTemplate(invalidTemplate)
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('範本名稱不能為空')
      expect(validation.errors).toContain('重複次數必須大於0')
      expect(validation.errors).toContain('針法 1 缺少ID')
      expect(validation.errors).toContain('針法 1 的數量必須大於0')
      expect(validation.errors).toContain('針法 2 的數量必須大於0')
    })

    it('should calculate template stitch count', () => {
      const template: StitchGroupTemplate = {
        id: 'test-id',
        name: '測試範本',
        description: '',
        stitches: [
          { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 },
          { id: 'stitch-2', type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 3 }
        ],
        repeatCount: 2,
        category: '測試',
        createdDate: new Date(),
        useCount: 0
      }
      
      const stitchCount = getTemplateStitchCount(template)
      expect(stitchCount).toBe(16) // (5 + 3) * 2 = 16
    })

    it('should generate template preview', () => {
      const template: StitchGroupTemplate = {
        id: 'test-id',
        name: '測試範本',
        description: '',
        stitches: [
          { id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1', count: 5 },
          { id: 'stitch-2', type: StitchType.DOUBLE, yarnId: 'yarn-2', count: 3 }
        ],
        repeatCount: 1,
        category: '測試',
        createdDate: new Date(),
        useCount: 0
      }
      
      const preview = getTemplatePreview(template)
      expect(preview).toBe('single×5, double×3')
      
      const templateWithRepeat = { ...template, repeatCount: 2 }
      const previewWithRepeat = getTemplatePreview(templateWithRepeat)
      expect(previewWithRepeat).toBe('(single×5, double×3) ×2')
    })

    it('should truncate long template preview', () => {
      const longTemplate: StitchGroupTemplate = {
        id: 'test-id',
        name: '測試範本',
        description: '',
        stitches: Array(20).fill(null).map((_, i) => ({
          id: `stitch-${i}`,
          type: StitchType.SINGLE,
          yarnId: 'yarn-1',
          count: 1
        })),
        repeatCount: 1,
        category: '測試',
        createdDate: new Date(),
        useCount: 0
      }
      
      const preview = getTemplatePreview(longTemplate, 30)
      expect(preview.length).toBeLessThanOrEqual(30)
      expect(preview.endsWith('...')).toBe(true)
    })
  })
})