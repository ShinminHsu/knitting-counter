import { CustomStitchPattern, StitchGroupTemplate } from '../../types'
import { StorageStrategy } from './types'
import { logger } from '../../utils/logger'

export class LocalStorageStrategy implements StorageStrategy {
  private customStitchesKey: string
  private templatesKey: string

  constructor(userType: 'guest' | 'authenticated' | 'uninitialized', userId?: string) {
    // Use the same keys as the original stores for compatibility
    if (userType === 'guest' || userType === 'uninitialized') {
      this.customStitchesKey = 'custom-stitch-store-guest'
      this.templatesKey = 'template-store'
    } else if (userId) {
      this.customStitchesKey = `custom-stitch-store-${userId}`
      this.templatesKey = `template-store-${userId}`
    } else {
      this.customStitchesKey = 'custom-stitch-store-temp'
      this.templatesKey = 'template-store'
    }
  }

  async initialize(): Promise<void> {
    // LocalStorage doesn't need initialization
    logger.debug('LocalStorage strategy initialized with keys:', {
      customStitches: this.customStitchesKey,
      templates: this.templatesKey
    })
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = 'test-storage'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  private serializeCustomStitches(stitches: CustomStitchPattern[]): string {
    return JSON.stringify({
      state: {
        customStitches: stitches.map(stitch => ({
          ...stitch,
          createdDate: stitch.createdDate.toISOString(),
          lastUsed: stitch.lastUsed?.toISOString()
        }))
      },
      version: 0
    })
  }

  private deserializeCustomStitches(data: string): CustomStitchPattern[] {
    try {
      const parsed = JSON.parse(data)
      if (parsed.state?.customStitches) {
        return parsed.state.customStitches.map((stitch: any) => ({
          ...stitch,
          createdDate: new Date(stitch.createdDate),
          lastUsed: stitch.lastUsed ? new Date(stitch.lastUsed) : undefined
        }))
      }
      return []
    } catch (error) {
      logger.error('Failed to deserialize custom stitches:', error)
      return []
    }
  }

  private serializeTemplates(templates: StitchGroupTemplate[]): string {
    return JSON.stringify({
      state: {
        templates: templates.map(template => ({
          ...template,
          createdDate: template.createdDate.toISOString(),
          lastUsed: template.lastUsed?.toISOString()
        }))
      },
      version: 0
    })
  }

  private deserializeTemplates(data: string): StitchGroupTemplate[] {
    try {
      const parsed = JSON.parse(data)
      if (parsed.state?.templates) {
        return parsed.state.templates.map((template: any) => ({
          ...template,
          createdDate: new Date(template.createdDate),
          lastUsed: template.lastUsed ? new Date(template.lastUsed) : undefined
        }))
      }
      return []
    } catch (error) {
      logger.error('Failed to deserialize templates:', error)
      return []
    }
  }

  // Custom Stitches
  async loadCustomStitches(): Promise<CustomStitchPattern[]> {
    try {
      const data = localStorage.getItem(this.customStitchesKey)
      if (!data) return []
      return this.deserializeCustomStitches(data)
    } catch (error) {
      logger.error('Failed to load custom stitches from localStorage:', error)
      return []
    }
  }

  async saveCustomStitch(stitch: CustomStitchPattern): Promise<void> {
    try {
      const stitches = await this.loadCustomStitches()
      const index = stitches.findIndex(s => s.id === stitch.id)
      
      if (index >= 0) {
        stitches[index] = stitch
      } else {
        stitches.push(stitch)
      }

      const serialized = this.serializeCustomStitches(stitches)
      localStorage.setItem(this.customStitchesKey, serialized)
    } catch (error) {
      logger.error('Failed to save custom stitch to localStorage:', error)
      throw error
    }
  }

  async updateCustomStitch(id: string, updates: Partial<CustomStitchPattern>): Promise<void> {
    try {
      const stitches = await this.loadCustomStitches()
      const index = stitches.findIndex(s => s.id === id)
      
      if (index >= 0) {
        stitches[index] = { ...stitches[index], ...updates }
        const serialized = this.serializeCustomStitches(stitches)
        localStorage.setItem(this.customStitchesKey, serialized)
      } else {
        throw new Error(`Custom stitch with id ${id} not found`)
      }
    } catch (error) {
      logger.error('Failed to update custom stitch in localStorage:', error)
      throw error
    }
  }

  async deleteCustomStitch(id: string): Promise<void> {
    try {
      const stitches = await this.loadCustomStitches()
      const filtered = stitches.filter(s => s.id !== id)
      const serialized = this.serializeCustomStitches(filtered)
      localStorage.setItem(this.customStitchesKey, serialized)
    } catch (error) {
      logger.error('Failed to delete custom stitch from localStorage:', error)
      throw error
    }
  }

  async clearAllCustomStitches(): Promise<void> {
    try {
      localStorage.removeItem(this.customStitchesKey)
    } catch (error) {
      logger.error('Failed to clear custom stitches from localStorage:', error)
      throw error
    }
  }

  // Templates
  async loadTemplates(): Promise<StitchGroupTemplate[]> {
    try {
      const data = localStorage.getItem(this.templatesKey)
      if (!data) return []
      return this.deserializeTemplates(data)
    } catch (error) {
      logger.error('Failed to load templates from localStorage:', error)
      return []
    }
  }

  async saveTemplate(template: StitchGroupTemplate): Promise<void> {
    try {
      const templates = await this.loadTemplates()
      const index = templates.findIndex(t => t.id === template.id)
      
      if (index >= 0) {
        templates[index] = template
      } else {
        templates.push(template)
      }

      const serialized = this.serializeTemplates(templates)
      localStorage.setItem(this.templatesKey, serialized)
    } catch (error) {
      logger.error('Failed to save template to localStorage:', error)
      throw error
    }
  }

  async updateTemplate(id: string, updates: Partial<StitchGroupTemplate>): Promise<void> {
    try {
      const templates = await this.loadTemplates()
      const index = templates.findIndex(t => t.id === id)
      
      if (index >= 0) {
        templates[index] = { ...templates[index], ...updates }
        const serialized = this.serializeTemplates(templates)
        localStorage.setItem(this.templatesKey, serialized)
      } else {
        throw new Error(`Template with id ${id} not found`)
      }
    } catch (error) {
      logger.error('Failed to update template in localStorage:', error)
      throw error
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const templates = await this.loadTemplates()
      const filtered = templates.filter(t => t.id !== id)
      const serialized = this.serializeTemplates(filtered)
      localStorage.setItem(this.templatesKey, serialized)
    } catch (error) {
      logger.error('Failed to delete template from localStorage:', error)
      throw error
    }
  }

  async clearAllTemplates(): Promise<void> {
    try {
      localStorage.removeItem(this.templatesKey)
    } catch (error) {
      logger.error('Failed to clear templates from localStorage:', error)
      throw error
    }
  }
}