import { create } from 'zustand'
import { Yarn, YarnColor } from '../types'
import { generateId } from '../utils'
import { useProjectStore } from './useProjectStore'
import { handleAsyncError } from './useBaseStore'

interface YarnStoreState {
  // No persistent state needed - yarns are managed in projects
}

interface YarnStoreActions {
  // Yarn management
  addYarn: (yarnData: Partial<Yarn>) => Promise<Yarn | null>
  updateYarn: (yarnId: string, updates: Partial<Yarn>) => Promise<void>
  deleteYarn: (yarnId: string) => Promise<void>
  duplicateYarn: (yarnId: string) => Promise<Yarn | null>
  
  // Yarn utilities
  getYarnById: (yarnId: string) => Yarn | null
  getAllYarns: () => Yarn[]
  getYarnsByColor: (hexColor: string) => Yarn[]
  getYarnsByBrand: (brand: string) => Yarn[]
  
  // Color management
  createColor: (name: string, hex: string) => YarnColor
  getCommonColors: () => YarnColor[]
  
  // Yarn usage analysis
  getYarnUsageInProject: (yarnId: string) => { roundsUsed: number[]; totalStitches: number }
  getUnusedYarns: () => Yarn[]
  
  // Bulk operations
  importYarns: (yarns: Yarn[]) => Promise<void>
  exportYarns: () => Yarn[]
}

interface YarnStore extends YarnStoreState, YarnStoreActions {}

export const useYarnStore = create<YarnStore>((set, get) => ({
  // Yarn management
  addYarn: async (yarnData) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[YARN] addYarn: No current project')
      return null
    }

    try {
      const newYarn: Yarn = {
        id: generateId(),
        name: '新毛線',
        color: { name: '白色', hex: '#FFFFFF' },
        ...yarnData
      }

      const updatedProject = {
        ...currentProject,
        yarns: [...currentProject.yarns, newYarn],
        lastModified: new Date()
      }

      await updateProjectLocally(updatedProject)
      console.log('[YARN] Added yarn:', newYarn.name)
      return newYarn
    } catch (error) {
      handleAsyncError(error, 'Failed to add yarn')
      return null
    }
  },

  updateYarn: async (yarnId, updates) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[YARN] updateYarn: No current project')
      return
    }

    try {
      const updatedYarns = currentProject.yarns.map(yarn =>
        yarn.id === yarnId ? { ...yarn, ...updates } : yarn
      )

      const updatedProject = {
        ...currentProject,
        yarns: updatedYarns,
        lastModified: new Date()
      }

      await updateProjectLocally(updatedProject)
      console.log('[YARN] Updated yarn:', yarnId)
    } catch (error) {
      handleAsyncError(error, 'Failed to update yarn')
    }
  },

  deleteYarn: async (yarnId) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[YARN] deleteYarn: No current project')
      return
    }

    try {
      // Check if yarn is being used in the pattern
      const usage = get().getYarnUsageInProject(yarnId)
      if (usage.totalStitches > 0) {
        console.warn('[YARN] deleteYarn: Yarn is being used in pattern, cannot delete:', yarnId)
        throw new Error('Cannot delete yarn that is being used in the pattern')
      }

      const updatedYarns = currentProject.yarns.filter(yarn => yarn.id !== yarnId)

      const updatedProject = {
        ...currentProject,
        yarns: updatedYarns,
        lastModified: new Date()
      }

      await updateProjectLocally(updatedProject)
      console.log('[YARN] Deleted yarn:', yarnId)
    } catch (error) {
      handleAsyncError(error, 'Failed to delete yarn')
    }
  },

  duplicateYarn: async (yarnId) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[YARN] duplicateYarn: No current project')
      return null
    }

    try {
      const sourceYarn = currentProject.yarns.find(yarn => yarn.id === yarnId)
      if (!sourceYarn) {
        console.error('[YARN] duplicateYarn: Source yarn not found:', yarnId)
        return null
      }

      const duplicatedYarn: Yarn = {
        ...sourceYarn,
        id: generateId(),
        name: `${sourceYarn.name} (複製)`
      }

      const updatedProject = {
        ...currentProject,
        yarns: [...currentProject.yarns, duplicatedYarn],
        lastModified: new Date()
      }

      await updateProjectLocally(updatedProject)
      console.log('[YARN] Duplicated yarn:', sourceYarn.name)
      return duplicatedYarn
    } catch (error) {
      handleAsyncError(error, 'Failed to duplicate yarn')
      return null
    }
  },

  // Yarn utilities
  getYarnById: (yarnId) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return null
    
    return currentProject.yarns.find(yarn => yarn.id === yarnId) || null
  },

  getAllYarns: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return []
    
    return [...currentProject.yarns]
  },

  getYarnsByColor: (hexColor) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return []
    
    return currentProject.yarns.filter(yarn => 
      yarn.color.hex.toLowerCase() === hexColor.toLowerCase()
    )
  },

  getYarnsByBrand: (brand) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return []
    
    return currentProject.yarns.filter(yarn => 
      yarn.brand?.toLowerCase().includes(brand.toLowerCase())
    )
  },

  // Color management
  createColor: (name, hex) => {
    // Ensure hex color is properly formatted
    const formattedHex = hex.startsWith('#') ? hex : `#${hex}`
    return {
      name: name.trim() || '未命名顏色',
      hex: formattedHex.toUpperCase()
    }
  },

  getCommonColors: () => {
    return [
      { name: '白色', hex: '#FFFFFF' },
      { name: '黑色', hex: '#000000' },
      { name: '紅色', hex: '#FF0000' },
      { name: '綠色', hex: '#00FF00' },
      { name: '藍色', hex: '#0000FF' },
      { name: '黃色', hex: '#FFFF00' },
      { name: '紫色', hex: '#800080' },
      { name: '粉色', hex: '#FFC0CB' },
      { name: '橙色', hex: '#FFA500' },
      { name: '棕色', hex: '#A52A2A' },
      { name: '灰色', hex: '#808080' },
      { name: '海軍藍', hex: '#000080' },
      { name: '青綠色', hex: '#008080' },
      { name: '橄欖綠', hex: '#808000' },
      { name: '栗色', hex: '#800000' }
    ]
  },

  // Yarn usage analysis
  getYarnUsageInProject: (yarnId) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      return { roundsUsed: [], totalStitches: 0 }
    }

    // Get pattern from current chart or legacy pattern
    let pattern = []
    if (currentProject.charts && currentProject.charts.length > 0) {
      const currentChart = currentProject.charts.find(c => c.id === currentProject.currentChartId) || currentProject.charts[0]
      pattern = currentChart.rounds || []
    } else {
      pattern = currentProject.pattern || []
    }

    const roundsUsed: number[] = []
    let totalStitches = 0

    pattern.forEach(round => {
      let roundUsesYarn = false
      let roundStitches = 0

      // Check individual stitches
      round.stitches.forEach(stitch => {
        if (stitch.yarnId === yarnId) {
          roundUsesYarn = true
          roundStitches += stitch.count
        }
      })

      // Check stitch groups
      round.stitchGroups.forEach(group => {
        group.stitches.forEach(stitch => {
          if (stitch.yarnId === yarnId) {
            roundUsesYarn = true
            roundStitches += stitch.count * group.repeatCount
          }
        })
      })

      if (roundUsesYarn) {
        roundsUsed.push(round.roundNumber)
        totalStitches += roundStitches
      }
    })

    return { roundsUsed, totalStitches }
  },

  getUnusedYarns: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return []

    const allYarns = currentProject.yarns
    const usedYarnIds = new Set<string>()

    // Get pattern from current chart or legacy pattern
    let pattern = []
    if (currentProject.charts && currentProject.charts.length > 0) {
      const currentChart = currentProject.charts.find(c => c.id === currentProject.currentChartId) || currentProject.charts[0]
      pattern = currentChart.rounds || []
    } else {
      pattern = currentProject.pattern || []
    }

    // Collect all used yarn IDs
    pattern.forEach(round => {
      round.stitches.forEach(stitch => {
        if (stitch.yarnId) {
          usedYarnIds.add(stitch.yarnId)
        }
      })

      round.stitchGroups.forEach(group => {
        group.stitches.forEach(stitch => {
          if (stitch.yarnId) {
            usedYarnIds.add(stitch.yarnId)
          }
        })
      })
    })

    return allYarns.filter(yarn => !usedYarnIds.has(yarn.id))
  },

  // Bulk operations
  importYarns: async (yarns) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[YARN] importYarns: No current project')
      return
    }

    try {
      // Generate new IDs for imported yarns to avoid conflicts
      const importedYarns = yarns.map(yarn => ({
        ...yarn,
        id: generateId()
      }))

      const updatedProject = {
        ...currentProject,
        yarns: [...currentProject.yarns, ...importedYarns],
        lastModified: new Date()
      }

      await updateProjectLocally(updatedProject)
      console.log('[YARN] Imported', importedYarns.length, 'yarns')
    } catch (error) {
      handleAsyncError(error, 'Failed to import yarns')
    }
  },

  exportYarns: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return []
    
    // Return a deep copy to prevent modifications to the original data
    return currentProject.yarns.map(yarn => ({ ...yarn }))
  }
}))

// Utility functions for yarn color operations
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

export const getColorBrightness = (hex: string): number => {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  
  // Calculate relative luminance
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
}

export const isLightColor = (hex: string): boolean => {
  return getColorBrightness(hex) > 0.5
}

export const getContrastColor = (hex: string): string => {
  return isLightColor(hex) ? '#000000' : '#FFFFFF'
}

// Color distance calculation for finding similar colors
export const getColorDistance = (hex1: string, hex2: string): number => {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  
  if (!rgb1 || !rgb2) return Infinity
  
  return Math.sqrt(
    Math.pow(rgb2.r - rgb1.r, 2) +
    Math.pow(rgb2.g - rgb1.g, 2) +
    Math.pow(rgb2.b - rgb1.b, 2)
  )
}

export const findSimilarColors = (targetHex: string, availableColors: YarnColor[], maxDistance: number = 50): YarnColor[] => {
  return availableColors
    .map(color => ({
      ...color,
      distance: getColorDistance(targetHex, color.hex)
    }))
    .filter(color => color.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...color }) => color)
}