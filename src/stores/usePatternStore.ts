
import { create } from 'zustand'
import { Round, StitchInfo, StitchGroup, StitchType } from '../types'
import { generateId, getProjectPattern, getProjectCurrentRound, getRoundTotalStitches, updateChartInProject, getCurrentChart } from '../utils'
import { useProjectStore } from './useProjectStore'
import { handleAsyncError } from './useBaseStore'
import { safeUpdateProjectLocally } from './useChartStore'

import { logger } from '../utils/logger'
interface PatternStoreState {
  // No persistent state needed - patterns are managed in projects
}

interface PatternStoreActions {
  // Round management
  addRound: (roundData?: Partial<Round>) => Promise<void>
  deleteRound: (roundNumber: number) => Promise<void>
  updateRound: (roundNumber: number, updates: Partial<Round>) => Promise<void>
  duplicateRound: (roundNumber: number) => Promise<void>
  reorderRounds: (fromIndex: number, toIndex: number) => Promise<void>
  
  // Stitch management
  addStitch: (roundNumber: number, stitchData: Partial<StitchInfo>) => Promise<void>
  updateStitch: (roundNumber: number, stitchIndex: number, updates: Partial<StitchInfo>) => Promise<void>
  deleteStitch: (roundNumber: number, stitchIndex: number) => Promise<void>
  duplicateStitch: (roundNumber: number, stitchIndex: number) => Promise<void>
  
  // Group management
  addGroup: (roundNumber: number, groupData: Partial<StitchGroup>) => Promise<void>
  updateGroup: (roundNumber: number, groupIndex: number, updates: Partial<StitchGroup>) => Promise<void>
  deleteGroup: (roundNumber: number, groupIndex: number) => Promise<void>
  duplicateGroup: (roundNumber: number, groupIndex: number) => Promise<void>
  
  // Pattern item reordering
  reorderPatternItemsInRound: (roundNumber: number, fromIndex: number, toIndex: number) => Promise<void>
  
  // Pattern utilities
  getPatternStats: () => { totalRounds: number; totalStitches: number; averageStitchesPerRound: number }
  validatePattern: () => { isValid: boolean; errors: string[] }
  optimizePattern: () => Promise<void>
}

interface PatternStore extends PatternStoreState, PatternStoreActions {}

export const usePatternStore = create<PatternStore>(() => ({
  // Round management
  addRound: async (roundData = {}) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      logger.error('addRound: No current project')
      return
    }

    try {
      const pattern = getProjectPattern(currentProject)
      const nextRoundNumber = pattern.length > 0 ? Math.max(...pattern.map(r => r.roundNumber)) + 1 : 1

      const newRound: Round = {
        id: generateId(),
        roundNumber: nextRoundNumber,
        stitches: [],
        stitchGroups: [],
        notes: '',
        ...roundData
      }

      const updatedPattern = [...pattern, newRound].sort((a, b) => a.roundNumber - b.roundNumber)
      
      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'addRound')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'addRound')
      }

      logger.debug('Added round:', nextRoundNumber)
    } catch (error) {
      handleAsyncError(error, 'Failed to add round')
    }
  },

  deleteRound: async (roundNumber) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const updatedPattern = pattern.filter(r => r.roundNumber !== roundNumber)
      
      // Renumber rounds to maintain sequence
      const renumberedPattern = updatedPattern.map((round, index) => ({
        ...round,
        roundNumber: index + 1
      }))

      // Adjust current round if necessary
      const currentRound = getProjectCurrentRound(currentProject)
      let newCurrentRound = currentRound
      
      if (currentRound >= roundNumber) {
        newCurrentRound = Math.max(1, currentRound - 1)
      }
      
      // Ensure current round doesn't exceed available rounds
      if (renumberedPattern.length > 0) {
        newCurrentRound = Math.min(newCurrentRound, Math.max(...renumberedPattern.map(r => r.roundNumber)))
      } else {
        newCurrentRound = 1
      }

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: renumberedPattern,
          currentRound: newCurrentRound,
          currentStitch: 0,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'deleteRound')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: renumberedPattern,
          currentRound: newCurrentRound,
          currentStitch: 0,
          lastModified: new Date()
        }, 'deleteRound')
      }

      logger.debug('Deleted round:', roundNumber, 'Adjusted current round to:', newCurrentRound)
    } catch (error) {
      handleAsyncError(error, 'Failed to delete round')
    }
  },

  updateRound: async (roundNumber, updates) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const updatedPattern = pattern.map(round => 
        round.roundNumber === roundNumber 
          ? { ...round, ...updates }
          : round
      )

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'updateRound')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'updateRound')
      }

      logger.debug('Updated round:', roundNumber)
    } catch (error) {
      handleAsyncError(error, 'Failed to update round')
    }
  },

  duplicateRound: async (roundNumber) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const sourceRound = pattern.find(r => r.roundNumber === roundNumber)
      if (!sourceRound) {
        logger.error('duplicateRound: Source round not found:', roundNumber)
        return
      }

      const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
      const duplicatedRound: Round = {
        ...sourceRound,
        id: generateId(),
        roundNumber: maxRoundNumber + 1,
        stitches: sourceRound.stitches.map(stitch => ({ ...stitch, id: generateId() })),
        stitchGroups: sourceRound.stitchGroups.map(group => ({ 
          ...group,
          id: generateId(),
          stitches: group.stitches.map(stitch => ({ ...stitch, id: generateId() }))
        }))
      }

      const updatedPattern = [...pattern, duplicatedRound].sort((a, b) => a.roundNumber - b.roundNumber)
      
      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'duplicateRound')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'duplicateRound')
      }

      logger.debug('Duplicated round:', roundNumber, 'as round:', duplicatedRound.roundNumber)
    } catch (error) {
      handleAsyncError(error, 'Failed to duplicate round')
    }
  },

  reorderRounds: async (fromIndex, toIndex) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const sortedPattern = [...pattern].sort((a, b) => a.roundNumber - b.roundNumber)
      
      if (fromIndex < 0 || fromIndex >= sortedPattern.length || toIndex < 0 || toIndex >= sortedPattern.length) {
        logger.error('reorderRounds: Invalid indices', fromIndex, toIndex)
        return
      }

      const reorderedPattern = [...sortedPattern]
      const [movedRound] = reorderedPattern.splice(fromIndex, 1)
      reorderedPattern.splice(toIndex, 0, movedRound)

      // Renumber rounds to maintain sequence
      const renumberedPattern = reorderedPattern.map((round, index) => ({
        ...round,
        roundNumber: index + 1
      }))

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: renumberedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'reorderRounds')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: renumberedPattern,
          lastModified: new Date()
        }, 'reorderRounds')
      }

      logger.debug('Reordered rounds from index', fromIndex, 'to', toIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to reorder rounds')
    }
  },

  // Stitch management
  addStitch: async (roundNumber, stitchData) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const targetRound = pattern.find(r => r.roundNumber === roundNumber)
      if (!targetRound) {
        logger.error('addStitch: Round not found:', roundNumber)
        return
      }

      const newStitch: StitchInfo = {
        id: generateId(),
        type: StitchType.KNIT,
        yarnId: '',
        count: 1,
        ...stitchData
      }

      // Use the new PatternItem adding utility
      const { addStitchToPatternItems } = await import('../utils/pattern/rendering')
      const updatedRound = addStitchToPatternItems(targetRound, newStitch)

      const updatedPattern = pattern.map(round =>
        round.roundNumber === roundNumber ? updatedRound : round
      )

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'addStitch')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'addStitch')
      }

      logger.debug('Added stitch to round:', roundNumber)
    } catch (error) {
      handleAsyncError(error, 'Failed to add stitch')
    }
  },

  updateStitch: async (roundNumber, stitchIndex, updates) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const updatedPattern = pattern.map(round => {
        if (round.roundNumber === roundNumber) {
          const updatedStitches = round.stitches.map((stitch, index) =>
            index === stitchIndex ? { ...stitch, ...updates } : stitch
          )
          return { ...round, stitches: updatedStitches }
        }
        return round
      })

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'updateStitch')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'updateStitch')
      }

      logger.debug('Updated stitch in round:', roundNumber, 'at index:', stitchIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to update stitch')
    }
  },

  deleteStitch: async (roundNumber, stitchIndex) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const updatedPattern = pattern.map(round => {
        if (round.roundNumber === roundNumber) {
          const updatedStitches = round.stitches.filter((_, index) => index !== stitchIndex)
          return { ...round, stitches: updatedStitches }
        }
        return round
      })

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'deleteStitch')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'deleteStitch')
      }

      logger.debug('Deleted stitch from round:', roundNumber, 'at index:', stitchIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to delete stitch')
    }
  },

  duplicateStitch: async (roundNumber, stitchIndex) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const targetRound = pattern.find(r => r.roundNumber === roundNumber)
      if (!targetRound || stitchIndex >= targetRound.stitches.length) {
        logger.error('duplicateStitch: Invalid round or stitch index')
        return
      }

      const sourceStitch = targetRound.stitches[stitchIndex]
      const duplicatedStitch = { ...sourceStitch, id: generateId() }

      const updatedPattern = pattern.map(round => {
        if (round.roundNumber === roundNumber) {
          const updatedStitches = [...round.stitches]
          updatedStitches.splice(stitchIndex + 1, 0, duplicatedStitch)
          return { ...round, stitches: updatedStitches }
        }
        return round
      })

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'duplicateStitch')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'duplicateStitch')
      }

      logger.debug('Duplicated stitch in round:', roundNumber, 'at index:', stitchIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to duplicate stitch')
    }
  },

  // Group management
  addGroup: async (roundNumber, groupData) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const targetRound = pattern.find(r => r.roundNumber === roundNumber)
      if (!targetRound) {
        logger.error('addGroup: Round not found:', roundNumber)
        return
      }

      const newGroup: StitchGroup = {
        id: generateId(),
        name: 'New Group',
        repeatCount: 1,
        stitches: [],
        ...groupData
      }

      // Use the new PatternItem adding utility
      const { addGroupToPatternItems } = await import('../utils/pattern/rendering')
      const updatedRound = addGroupToPatternItems(targetRound, newGroup)

      const updatedPattern = pattern.map(round =>
        round.roundNumber === roundNumber ? updatedRound : round
      )

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'addGroup')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'addGroup')
      }

      logger.debug('Added group to round:', roundNumber)
    } catch (error) {
      handleAsyncError(error, 'Failed to add group')
    }
  },

  updateGroup: async (roundNumber, groupIndex, updates) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const updatedPattern = pattern.map(round => {
        if (round.roundNumber === roundNumber) {
          const updatedGroups = round.stitchGroups.map((group, index) =>
            index === groupIndex ? { ...group, ...updates } : group
          )
          return { ...round, stitchGroups: updatedGroups }
        }
        return round
      })

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'updateGroup')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'updateGroup')
      }

      logger.debug('Updated group in round:', roundNumber, 'at index:', groupIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to update group')
    }
  },

  deleteGroup: async (roundNumber, groupIndex) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const updatedPattern = pattern.map(round => {
        if (round.roundNumber === roundNumber) {
          const updatedGroups = round.stitchGroups.filter((_, index) => index !== groupIndex)
          return { ...round, stitchGroups: updatedGroups }
        }
        return round
      })

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'deleteGroup')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'deleteGroup')
      }

      logger.debug('Deleted group from round:', roundNumber, 'at index:', groupIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to delete group')
    }
  },

  duplicateGroup: async (roundNumber, groupIndex) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const targetRound = pattern.find(r => r.roundNumber === roundNumber)
      if (!targetRound || groupIndex >= targetRound.stitchGroups.length) {
        logger.error('duplicateGroup: Invalid round or group index')
        return
      }

      const sourceGroup = targetRound.stitchGroups[groupIndex]
      const duplicatedGroup: StitchGroup = {
        ...sourceGroup,
        id: generateId(),
        stitches: sourceGroup.stitches.map(stitch => ({ ...stitch, id: generateId() }))
      }

      const updatedPattern = pattern.map(round => {
        if (round.roundNumber === roundNumber) {
          const updatedGroups = [...round.stitchGroups]
          updatedGroups.splice(groupIndex + 1, 0, duplicatedGroup)
          return { ...round, stitchGroups: updatedGroups }
        }
        return round
      })

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'duplicateGroup')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'duplicateGroup')
      }

      logger.debug('Duplicated group in round:', roundNumber, 'at index:', groupIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to duplicate group')
    }
  },

  // Pattern item reordering
  reorderPatternItemsInRound: async (roundNumber, fromIndex, toIndex) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      const targetRound = pattern.find(r => r.roundNumber === roundNumber)
      if (!targetRound) {
        logger.error('reorderPatternItemsInRound: Round not found:', roundNumber)
        return
      }

      // Use the new PatternItem reordering utility
      const { reorderPatternItems } = await import('../utils/pattern/rendering')
      const updatedRound = reorderPatternItems(targetRound, fromIndex, toIndex)

      const updatedPattern = pattern.map(round =>
        round.roundNumber === roundNumber ? updatedRound : round
      )

      // Update the current chart with new pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: updatedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'reorderPatternItemsInRound')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }, 'reorderPatternItemsInRound')
      }

      logger.debug('Reordered pattern items in round:', roundNumber, 'from index', fromIndex, 'to', toIndex)
    } catch (error) {
      handleAsyncError(error, 'Failed to reorder pattern items')
    }
  },

  // Pattern utilities
  getPatternStats: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      return { totalRounds: 0, totalStitches: 0, averageStitchesPerRound: 0 }
    }

    const pattern = getProjectPattern(currentProject)
    const totalRounds = pattern.length
    const totalStitches = pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
    const averageStitchesPerRound = totalRounds > 0 ? Math.round(totalStitches / totalRounds) : 0

    return {
      totalRounds,
      totalStitches,
      averageStitchesPerRound
    }
  },

  validatePattern: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      return { isValid: false, errors: ['No current project'] }
    }

    const pattern = getProjectPattern(currentProject)
    const errors: string[] = []

    if (pattern.length === 0) {
      errors.push('Pattern has no rounds')
    }

    // Check for duplicate round numbers
    const roundNumbers = pattern.map(r => r.roundNumber)
    const duplicateRounds = roundNumbers.filter((num, index) => roundNumbers.indexOf(num) !== index)
    if (duplicateRounds.length > 0) {
      errors.push(`Duplicate round numbers: ${duplicateRounds.join(', ')}`)
    }

    // Check for missing round numbers in sequence
    const sortedNumbers = [...new Set(roundNumbers)].sort((a, b) => a - b)
    for (let i = 0; i < sortedNumbers.length - 1; i++) {
      if (sortedNumbers[i + 1] - sortedNumbers[i] > 1) {
        errors.push(`Missing round numbers between ${sortedNumbers[i]} and ${sortedNumbers[i + 1]}`)
      }
    }

    // Check each round for issues
    pattern.forEach(round => {
      if (!round.id) {
        errors.push(`Round ${round.roundNumber} missing ID`)
      }

      if (round.stitches.length === 0 && round.stitchGroups.length === 0) {
        errors.push(`Round ${round.roundNumber} has no stitches or groups`)
      }

      // Validate stitches
      round.stitches.forEach((stitch, index) => {
        if (!stitch.id) {
          errors.push(`Round ${round.roundNumber}, stitch ${index + 1} missing ID`)
        }
        if (!stitch.yarnId) {
          errors.push(`Round ${round.roundNumber}, stitch ${index + 1} missing yarn ID`)
        }
        if (stitch.count <= 0) {
          errors.push(`Round ${round.roundNumber}, stitch ${index + 1} has invalid count`)
        }
      })

      // Validate stitch groups
      round.stitchGroups.forEach((group, groupIndex) => {
        if (!group.id) {
          errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1} missing ID`)
        }
        if (!group.name) {
          errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1} missing name`)
        }
        if (group.repeatCount <= 0) {
          errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1} has invalid repeat count`)
        }
        if (group.stitches.length === 0) {
          errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1} has no stitches`)
        }

        group.stitches.forEach((stitch, stitchIndex) => {
          if (!stitch.id) {
            errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1}, stitch ${stitchIndex + 1} missing ID`)
          }
          if (!stitch.yarnId) {
            errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1}, stitch ${stitchIndex + 1} missing yarn ID`)
          }
          if (stitch.count <= 0) {
            errors.push(`Round ${round.roundNumber}, group ${groupIndex + 1}, stitch ${stitchIndex + 1} has invalid count`)
          }
        })
      })
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  optimizePattern: async () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return

    try {
      const pattern = getProjectPattern(currentProject)
      
      // Optimize by consolidating consecutive identical stitches
      const optimizedPattern = pattern.map(round => {
        const optimizedStitches: StitchInfo[] = []
        
        round.stitches.forEach(stitch => {
          const lastStitch = optimizedStitches[optimizedStitches.length - 1]
          if (lastStitch &&
              lastStitch.type === stitch.type &&
              lastStitch.yarnId === stitch.yarnId &&
              lastStitch.customName === stitch.customName &&
              lastStitch.customSymbol === stitch.customSymbol) {
            // Merge with previous stitch
            lastStitch.count += stitch.count
          } else {
            // Add as new stitch
            optimizedStitches.push({ ...stitch })
          }
        })

        return {
          ...round,
          stitches: optimizedStitches
        }
      })

      // Update the current chart with optimized pattern
      const currentChart = getCurrentChart(currentProject)
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: optimizedPattern,
          lastModified: new Date()
        }
        const updatedProject = { ...currentProject }
        updateChartInProject(updatedProject, updatedChart)
        await safeUpdateProjectLocally(updatedProject, 'optimizePattern')
      } else {
        // Fallback to legacy pattern update
        await safeUpdateProjectLocally({
          ...currentProject,
          pattern: optimizedPattern,
          lastModified: new Date()
        }, 'optimizePattern')
      }

      logger.debug('Pattern optimized successfully')
    } catch (error) {
      handleAsyncError(error, 'Failed to optimize pattern')
    }
  }
}))