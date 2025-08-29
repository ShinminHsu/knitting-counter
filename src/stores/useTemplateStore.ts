import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { StitchGroupTemplate, StitchInfo, StitchGroup } from '../types'
import { generateId } from '../utils'
import { handleAsyncError } from './useBaseStore'

interface TemplateStoreState {
  templates: StitchGroupTemplate[]
  isLoading: boolean
}

interface TemplateStoreActions {
  // Template management
  createTemplate: (name: string, description: string, stitches: StitchInfo[], category?: string) => Promise<StitchGroupTemplate | null>
  updateTemplate: (templateId: string, updates: Partial<StitchGroupTemplate>) => Promise<void>
  deleteTemplate: (templateId: string) => Promise<void>
  duplicateTemplate: (templateId: string) => Promise<StitchGroupTemplate | null>
  
  // Template usage
  useTemplate: (templateId: string) => Promise<StitchGroup | null>
  incrementUseCount: (templateId: string) => Promise<void>
  updateLastUsed: (templateId: string) => Promise<void>
  
  // Template queries
  getTemplateById: (templateId: string) => StitchGroupTemplate | null
  getTemplatesByCategory: (category: string) => StitchGroupTemplate[]
  getRecentlyUsedTemplates: (limit?: number) => StitchGroupTemplate[]
  getPopularTemplates: (limit?: number) => StitchGroupTemplate[]
  searchTemplates: (query: string) => StitchGroupTemplate[]
  
  // Template organization
  getCategories: () => string[]
  createFromStitchGroup: (group: StitchGroup, name: string, description?: string, category?: string) => Promise<StitchGroupTemplate | null>
  
  // Bulk operations
  importTemplates: (templates: StitchGroupTemplate[]) => Promise<void>
  exportTemplates: () => StitchGroupTemplate[]
  clearAllTemplates: () => Promise<void>
  
  // Loading state
  setLoading: (loading: boolean) => void
}

interface TemplateStore extends TemplateStoreState, TemplateStoreActions {}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: [],
      isLoading: false,

      // Template management
      createTemplate: async (name, description, stitches, category = '一般') => {
        try {
          set({ isLoading: true })
          
          const newTemplate: StitchGroupTemplate = {
            id: generateId(),
            name: name.trim() || '新範本',
            description: description.trim() || '',
            stitches: stitches.map(stitch => ({ ...stitch, id: generateId() })),
            repeatCount: 1,
            category: category.trim() || '一般',
            createdDate: new Date(),
            useCount: 0
          }

          set(state => ({
            templates: [...state.templates, newTemplate],
            isLoading: false
          }))

          console.log('[TEMPLATE] Created template:', newTemplate.name)
          return newTemplate
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to create template')
          return null
        }
      },

      updateTemplate: async (templateId, updates) => {
        try {
          set({ isLoading: true })
          
          set(state => ({
            templates: state.templates.map(template =>
              template.id === templateId
                ? { ...template, ...updates }
                : template
            ),
            isLoading: false
          }))

          console.log('[TEMPLATE] Updated template:', templateId)
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to update template')
        }
      },

      deleteTemplate: async (templateId) => {
        try {
          set({ isLoading: true })
          
          set(state => ({
            templates: state.templates.filter(template => template.id !== templateId),
            isLoading: false
          }))

          console.log('[TEMPLATE] Deleted template:', templateId)
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to delete template')
        }
      },

      duplicateTemplate: async (templateId) => {
        try {
          set({ isLoading: true })
          
          const sourceTemplate = get().templates.find(t => t.id === templateId)
          if (!sourceTemplate) {
            console.error('[TEMPLATE] duplicateTemplate: Source template not found:', templateId)
            set({ isLoading: false })
            return null
          }

          const duplicatedTemplate: StitchGroupTemplate = {
            ...sourceTemplate,
            id: generateId(),
            name: `${sourceTemplate.name} (複製)`,
            createdDate: new Date(),
            useCount: 0,
            lastUsed: undefined,
            // Deep copy stitches with new IDs
            stitches: sourceTemplate.stitches.map(stitch => ({
              ...stitch,
              id: generateId()
            }))
          }

          set(state => ({
            templates: [...state.templates, duplicatedTemplate],
            isLoading: false
          }))

          console.log('[TEMPLATE] Duplicated template:', sourceTemplate.name)
          return duplicatedTemplate
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to duplicate template')
          return null
        }
      },

      // Template usage
      useTemplate: async (templateId) => {
        try {
          const template = get().templates.find(t => t.id === templateId)
          if (!template) {
            console.error('[TEMPLATE] useTemplate: Template not found:', templateId)
            return null
          }

          // Increment use count and update last used
          await get().incrementUseCount(templateId)
          await get().updateLastUsed(templateId)

          // Create a StitchGroup from the template
          const stitchGroup: StitchGroup = {
            id: generateId(),
            name: template.name,
            stitches: template.stitches.map(stitch => ({
              ...stitch,
              id: generateId() // Generate new IDs for the actual usage
            })),
            repeatCount: template.repeatCount
          }

          console.log('[TEMPLATE] Used template:', template.name)
          return stitchGroup
        } catch (error) {
          handleAsyncError(error, 'Failed to use template')
          return null
        }
      },

      incrementUseCount: async (templateId) => {
        try {
          set(state => ({
            templates: state.templates.map(template =>
              template.id === templateId
                ? { ...template, useCount: template.useCount + 1 }
                : template
            )
          }))
        } catch (error) {
          handleAsyncError(error, 'Failed to increment use count')
        }
      },

      updateLastUsed: async (templateId) => {
        try {
          set(state => ({
            templates: state.templates.map(template =>
              template.id === templateId
                ? { ...template, lastUsed: new Date() }
                : template
            )
          }))
        } catch (error) {
          handleAsyncError(error, 'Failed to update last used')
        }
      },

      // Template queries
      getTemplateById: (templateId) => {
        return get().templates.find(template => template.id === templateId) || null
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter(template =>
          template.category?.toLowerCase() === category.toLowerCase()
        )
      },

      getRecentlyUsedTemplates: (limit = 10) => {
        return get().templates
          .filter(template => template.lastUsed)
          .sort((a, b) => {
            const aDate = a.lastUsed ? a.lastUsed.getTime() : 0
            const bDate = b.lastUsed ? b.lastUsed.getTime() : 0
            return bDate - aDate
          })
          .slice(0, limit)
      },

      getPopularTemplates: (limit = 10) => {
        return get().templates
          .filter(template => template.useCount > 0)
          .sort((a, b) => b.useCount - a.useCount)
          .slice(0, limit)
      },

      searchTemplates: (query) => {
        const lowercaseQuery = query.toLowerCase().trim()
        if (!lowercaseQuery) return get().templates

        return get().templates.filter(template =>
          template.name.toLowerCase().includes(lowercaseQuery) ||
          template.description?.toLowerCase().includes(lowercaseQuery) ||
          template.category?.toLowerCase().includes(lowercaseQuery)
        )
      },

      // Template organization
      getCategories: () => {
        const categories = new Set(get().templates.map(template => template.category).filter((category): category is string => Boolean(category)))
        return Array.from(categories).sort()
      },

      createFromStitchGroup: async (group, name, description = '', category = '一般') => {
        try {
          const template = await get().createTemplate(
            name,
            description,
            group.stitches,
            category
          )

          if (template) {
            // Update the template with the repeat count from the group
            await get().updateTemplate(template.id, {
              repeatCount: group.repeatCount
            })
          }

          return template
        } catch (error) {
          handleAsyncError(error, 'Failed to create template from stitch group')
          return null
        }
      },

      // Bulk operations
      importTemplates: async (templates) => {
        try {
          set({ isLoading: true })
          
          // Generate new IDs for imported templates to avoid conflicts
          const importedTemplates = templates.map(template => ({
            ...template,
            id: generateId(),
            createdDate: new Date(),
            useCount: 0,
            lastUsed: undefined,
            stitches: template.stitches.map(stitch => ({
              ...stitch,
              id: generateId()
            }))
          }))

          set(state => ({
            templates: [...state.templates, ...importedTemplates],
            isLoading: false
          }))

          console.log('[TEMPLATE] Imported', importedTemplates.length, 'templates')
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to import templates')
        }
      },

      exportTemplates: () => {
        // Return a deep copy to prevent modifications to the original data
        return get().templates.map(template => ({
          ...template,
          stitches: template.stitches.map(stitch => ({ ...stitch }))
        }))
      },

      clearAllTemplates: async () => {
        try {
          set({ isLoading: true })
          
          set({
            templates: [],
            isLoading: false
          })

          console.log('[TEMPLATE] Cleared all templates')
        } catch (error) {
          set({ isLoading: false })
          handleAsyncError(error, 'Failed to clear templates')
        }
      },

      // Loading state
      setLoading: (loading) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'template-store',
      version: 1,
      // Custom serialization for Date objects
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          state: {
            ...state.state,
            templates: state.state.templates.map(template => ({
              ...template,
              createdDate: template.createdDate.toISOString(),
              lastUsed: template.lastUsed?.toISOString()
            }))
          }
        })
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str)
        return {
          ...parsed,
          state: {
            ...parsed.state,
            templates: parsed.state.templates.map((template: {
              id: string
              name: string
              description: string
              stitches: Array<{
                id: string
                type: string
                yarnId: string
                count: number
                customName?: string
                customSymbol?: string
              }>
              repeatCount: number
              category: string
              createdDate: string
              lastUsed?: string
              useCount: number
            }) => ({
              ...template,
              createdDate: new Date(template.createdDate),
              lastUsed: template.lastUsed ? new Date(template.lastUsed) : undefined
            }))
          }
        }
      }
    }
  )
)

// Default templates for common stitch patterns
export const createDefaultTemplates = async (): Promise<void> => {
  const { createTemplate } = useTemplateStore.getState()

  const defaultTemplates = [
    {
      name: '增針 (加針)',
      description: '在同一針目中鉤兩針短針',
      category: '基本技法',
      stitches: [
        { id: generateId(), type: 'single', yarnId: '', count: 2 }
      ]
    },
    {
      name: '減針',
      description: '將兩針合併為一針',
      category: '基本技法',
      stitches: [
        { id: generateId(), type: 'decrease', yarnId: '', count: 1 }
      ]
    },
    {
      name: '花瓣 (5針)',
      description: '5針長針的花瓣圖案',
      category: '花朵圖案',
      stitches: [
        { id: generateId(), type: 'double', yarnId: '', count: 5 }
      ]
    },
    {
      name: '扇形 (7針)',
      description: '7針長針的扇形圖案',
      category: '扇形圖案',
      stitches: [
        { id: generateId(), type: 'double', yarnId: '', count: 7 }
      ]
    }
  ]

  for (const template of defaultTemplates) {
    await createTemplate(
      template.name,
      template.description,
      template.stitches as StitchInfo[],
      template.category
    )
  }

  console.log('[TEMPLATE] Created default templates')
}

// Utility functions for template operations
export const validateTemplate = (template: StitchGroupTemplate): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!template.name.trim()) {
    errors.push('範本名稱不能為空')
  }

  if (template.stitches.length === 0) {
    errors.push('範本必須包含至少一個針法')
  }

  if (template.repeatCount <= 0) {
    errors.push('重複次數必須大於0')
  }

  template.stitches.forEach((stitch, index) => {
    if (!stitch.id) {
      errors.push(`針法 ${index + 1} 缺少ID`)
    }
    if (stitch.count <= 0) {
      errors.push(`針法 ${index + 1} 的數量必須大於0`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

export const getTemplateStitchCount = (template: StitchGroupTemplate): number => {
  return template.stitches.reduce((sum, stitch) => sum + stitch.count, 0) * template.repeatCount
}

export const getTemplatePreview = (template: StitchGroupTemplate, maxLength = 50): string => {
  const description = template.stitches
    .map(stitch => `${stitch.type}×${stitch.count}`)
    .join(', ')
  
  const withRepeat = template.repeatCount > 1 
    ? `(${description}) ×${template.repeatCount}`
    : description

  return withRepeat.length > maxLength 
    ? withRepeat.substring(0, maxLength - 3) + '...'
    : withRepeat
}