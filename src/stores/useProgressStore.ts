
import { create } from 'zustand'
import { WorkSession, Project } from '../types'
import { generateId, getProjectPattern, getProjectCurrentRound, getProjectCurrentStitch, getRoundTotalStitches } from '../utils'
import { useProjectStore } from './useProjectStore'
import { safeUpdateProjectLocally } from './useChartStore'

interface ProgressStoreState {
  // No persistent state needed - progress is managed in projects
}

interface ProgressStoreActions {
  // Navigation
  nextStitch: () => Promise<void>
  previousStitch: () => Promise<void>
  setCurrentRound: (roundNumber: number) => Promise<void>
  setCurrentStitch: (stitchNumber: number) => Promise<void>
  
  // Session management
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  
  // Progress utilities
  goToRoundStart: (roundNumber: number) => Promise<void>
  goToRoundEnd: (roundNumber: number) => Promise<void>
  markProjectComplete: () => Promise<void>
  resetProgress: () => Promise<void>
}

interface ProgressStore extends ProgressStoreState, ProgressStoreActions {}

export const useProgressStore = create<ProgressStore>(() => ({
  // Navigation actions
  nextStitch: async () => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject || currentProject.isCompleted) {
      console.log('[PROGRESS] nextStitch: No current project or already completed')
      return
    }

    const pattern = getProjectPattern(currentProject)
    if (!pattern || pattern.length === 0) {
      console.log('[PROGRESS] nextStitch: No pattern available')
      return
    }

    const currentRound = pattern.find(r => r.roundNumber === getProjectCurrentRound(currentProject))
    if (!currentRound) {
      console.log('[PROGRESS] nextStitch: Current round not found', getProjectCurrentRound(currentProject))
      // Try to adjust to valid round
      const minRoundNumber = Math.min(...pattern.map(r => r.roundNumber))
      const updatedProject = {
        ...currentProject,
        currentRound: minRoundNumber,
        currentStitch: 0,
        lastModified: new Date()
      }
      await safeUpdateProjectLocally(updatedProject, 'nextStitch')
      return
    }

    const totalStitchesInRound = getRoundTotalStitches(currentRound)
    let newStitch = getProjectCurrentStitch(currentProject) + 1
    let newRound = getProjectCurrentRound(currentProject)
    let isCompleted = false

    if (newStitch >= totalStitchesInRound) {
      const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
      
      if (getProjectCurrentRound(currentProject) >= maxRoundNumber) {
        isCompleted = true
        newStitch = totalStitchesInRound
        newRound = getProjectCurrentRound(currentProject)
      } else {
        // Find next available round
        const nextRoundNumber = getProjectCurrentRound(currentProject) + 1
        const nextRound = pattern.find(r => r.roundNumber === nextRoundNumber)
        if (nextRound) {
          newStitch = 0
          newRound = nextRoundNumber
        } else {
          // If next round doesn't exist, stay at current round end
          newStitch = totalStitchesInRound
          newRound = getProjectCurrentRound(currentProject)
          isCompleted = true
        }
      }
    }

    const updatedProject = {
      ...currentProject,
      currentRound: newRound,
      currentStitch: newStitch,
      isCompleted,
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'nextStitch')
  },

  previousStitch: async () => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    const pattern = getProjectPattern(currentProject)
    if (!pattern || pattern.length === 0) {
      console.log('[PROGRESS] previousStitch: No pattern available')
      return
    }

    let newStitch = getProjectCurrentStitch(currentProject) - 1
    let newRound = getProjectCurrentRound(currentProject)

    if (newStitch < 0 && newRound > 1) {
      // Try to find previous available round
      for (let roundNum = getProjectCurrentRound(currentProject) - 1; roundNum >= 1; roundNum--) {
        const previousRound = pattern.find(r => r.roundNumber === roundNum)
        if (previousRound) {
          newRound = roundNum
          newStitch = getRoundTotalStitches(previousRound) - 1
          break
        }
      }
      
      // If can't find previous round, stay at position
      if (newStitch < 0) {
        newStitch = 0
        newRound = getProjectCurrentRound(currentProject)
      }
    } else if (newStitch < 0) {
      newStitch = 0
    }

    // Ensure round is valid
    const targetRound = pattern.find(r => r.roundNumber === newRound)
    if (!targetRound) {
      console.log('[PROGRESS] previousStitch: Target round not found', newRound)
      // Adjust to minimum available round
      const minRoundNumber = Math.min(...pattern.map(r => r.roundNumber))
      newRound = minRoundNumber
      newStitch = 0
    }

    const updatedProject = {
      ...currentProject,
      currentRound: newRound,
      currentStitch: newStitch,
      isCompleted: false, // Reset completion status when going back
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'previousStitch')
  },

  setCurrentRound: async (roundNumber) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) {
      console.log('[PROGRESS] setCurrentRound: No current project')
      return
    }

    // Validate round number
    const pattern = getProjectPattern(currentProject)
    const targetRound = pattern.find(r => r.roundNumber === roundNumber)
    if (!targetRound) {
      console.error('[PROGRESS] setCurrentRound: Invalid round number', roundNumber)
      return
    }

    console.log('[PROGRESS] setCurrentRound: Updating from round', getProjectCurrentRound(currentProject), 'to', roundNumber)

    const updatedProject = {
      ...currentProject,
      currentRound: roundNumber,
      currentStitch: 0,
      isCompleted: false, // Reset completion status
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'setCurrentRound')
  },

  setCurrentStitch: async (stitchNumber) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      currentStitch: stitchNumber,
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'setCurrentStitch')
  },

  // Session management
  startSession: async () => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    const newSession: WorkSession = {
      id: generateId(),
      startTime: new Date(),
      duration: 0,
      roundsCompleted: 0,
      stitchesCompleted: 0
    }

    const updatedProject = {
      ...currentProject,
      sessions: [...currentProject.sessions, newSession],
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'startSession')
    console.log('[PROGRESS] Started new session:', newSession.id)
  },

  endSession: async () => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject || currentProject.sessions.length === 0) return

    const lastSession = currentProject.sessions[currentProject.sessions.length - 1]
    if (lastSession.duration > 0) return // Session already ended

    const now = new Date()
    const duration = Math.floor((now.getTime() - lastSession.startTime.getTime()) / 1000)

    const updatedSession = {
      ...lastSession,
      duration
    }

    const updatedProject = {
      ...currentProject,
      sessions: [
        ...currentProject.sessions.slice(0, -1),
        updatedSession
      ],
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'endSession')
    console.log('[PROGRESS] Ended session:', lastSession.id, 'Duration:', duration, 'seconds')
  },

  // Progress utilities
  goToRoundStart: async (roundNumber) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    // Validate round exists
    const pattern = getProjectPattern(currentProject)
    const targetRound = pattern.find(r => r.roundNumber === roundNumber)
    if (!targetRound) {
      console.error('[PROGRESS] goToRoundStart: Round not found', roundNumber)
      return
    }

    const updatedProject = {
      ...currentProject,
      currentRound: roundNumber,
      currentStitch: 0,
      isCompleted: false,
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'goToRoundStart')
    console.log('[PROGRESS] Moved to start of round', roundNumber)
  },

  goToRoundEnd: async (roundNumber) => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    // Validate round exists
    const pattern = getProjectPattern(currentProject)
    const targetRound = pattern.find(r => r.roundNumber === roundNumber)
    if (!targetRound) {
      console.error('[PROGRESS] goToRoundEnd: Round not found', roundNumber)
      return
    }

    const totalStitches = getRoundTotalStitches(targetRound)
    const updatedProject = {
      ...currentProject,
      currentRound: roundNumber,
      currentStitch: totalStitches,
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'goToRoundEnd')
    console.log('[PROGRESS] Moved to end of round', roundNumber)
  },

  markProjectComplete: async () => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    const pattern = getProjectPattern(currentProject)
    if (pattern.length === 0) return

    const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
    const lastRound = pattern.find(r => r.roundNumber === maxRoundNumber)
    const totalStitches = lastRound ? getRoundTotalStitches(lastRound) : 0

    const updatedProject = {
      ...currentProject,
      currentRound: maxRoundNumber,
      currentStitch: totalStitches,
      isCompleted: true,
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'markProjectComplete')
    console.log('[PROGRESS] Project marked as complete:', currentProject.name)
  },

  resetProgress: async () => {
    const { currentProject, updateProjectLocally } = useProjectStore.getState()
    if (!currentProject) return

    const pattern = getProjectPattern(currentProject)
    const minRoundNumber = pattern.length > 0 ? Math.min(...pattern.map(r => r.roundNumber)) : 1

    const updatedProject = {
      ...currentProject,
      currentRound: minRoundNumber,
      currentStitch: 0,
      isCompleted: false,
      lastModified: new Date()
    }

    await safeUpdateProjectLocally(updatedProject, 'resetProgress')
    console.log('[PROGRESS] Progress reset for project:', currentProject.name)
  }
}))

// Utility functions for progress calculations
export const getProgressPercentage = (currentProject: Project | null): number => {
  if (!currentProject) return 0
  
  const pattern = getProjectPattern(currentProject)
  if (!pattern || pattern.length === 0) return 0
  
  const totalStitches = pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
  if (totalStitches === 0) return 0
  
  let completedStitches = 0
  const currentRound = getProjectCurrentRound(currentProject)
  const currentStitch = getProjectCurrentStitch(currentProject)
  
  // Calculate completed stitches from previous rounds
  for (let roundNumber = 1; roundNumber < currentRound; roundNumber++) {
    const round = pattern.find(r => r.roundNumber === roundNumber)
    if (round) {
      completedStitches += getRoundTotalStitches(round)
    }
  }
  
  // Add current round progress
  const currentRoundData = pattern.find(r => r.roundNumber === currentRound)
  if (currentRoundData) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRoundData)
    const validCurrentStitch = Math.min(Math.max(0, currentStitch), maxStitchesInCurrentRound)
    completedStitches += validCurrentStitch
  }
  
  const progressRatio = completedStitches / totalStitches
  return Math.min(Math.max(0, progressRatio * 100), 100)
}

export const getCompletedStitches = (currentProject: Project | null): number => {
  if (!currentProject) return 0
  
  const pattern = getProjectPattern(currentProject)
  if (!pattern || pattern.length === 0) return 0
  
  let completed = 0
  const currentRound = getProjectCurrentRound(currentProject)
  const currentStitch = getProjectCurrentStitch(currentProject)
  
  // Calculate completed stitches from previous rounds
  for (let roundNumber = 1; roundNumber < currentRound; roundNumber++) {
    const round = pattern.find(r => r.roundNumber === roundNumber)
    if (round) {
      completed += getRoundTotalStitches(round)
    }
  }
  
  // Add current round progress
  const currentRoundData = pattern.find(r => r.roundNumber === currentRound)
  if (currentRoundData) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRoundData)
    const validCurrentStitch = Math.min(Math.max(0, currentStitch), maxStitchesInCurrentRound)
    completed += validCurrentStitch
  }
  
  return completed
}

export const getTotalStitches = (currentProject: Project | null): number => {
  if (!currentProject) return 0
  
  const pattern = getProjectPattern(currentProject)
  if (!pattern || pattern.length === 0) return 0
  
  return pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
}

export const isProjectCompleted = (currentProject: Project | null): boolean => {
  if (!currentProject) return false
  
  const pattern = getProjectPattern(currentProject)
  if (!pattern || pattern.length === 0) return false
  
  const totalRounds = Math.max(...pattern.map(r => r.roundNumber))
  const currentRound = getProjectCurrentRound(currentProject)
  const currentStitch = getProjectCurrentStitch(currentProject)
  
  // If current round exceeds total rounds, consider completed
  if (currentRound > totalRounds) return true
  
  // If in last round and stitch count reaches the end, consider completed
  if (currentRound === totalRounds) {
    const lastRound = pattern.find(r => r.roundNumber === totalRounds)
    if (lastRound) {
      const totalStitchesInLastRound = getRoundTotalStitches(lastRound)
      return currentStitch >= totalStitchesInLastRound
    }
  }
  
  return false
}