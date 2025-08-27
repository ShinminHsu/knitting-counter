// Import all individual stores
import { useBaseStore } from './useBaseStore'
import { useSyncStore } from './useSyncStore'
import { useProjectStore } from './useProjectStore'
import { usePatternStore } from './usePatternStore'
import { useChartStore } from './useChartStore'
import { useYarnStore } from './useYarnStore'
import { useTemplateStore } from './useTemplateStore'
import { useProgressStore } from './useProgressStore'

// Re-export all individual stores
export { 
  useBaseStore, 
  useSyncStore, 
  useProjectStore, 
  usePatternStore, 
  useChartStore, 
  useYarnStore, 
  useTemplateStore, 
  useProgressStore 
}

// Export utility functions from template store
export { 
  createDefaultTemplates, 
  validateTemplate, 
  getTemplateStitchCount, 
  getTemplatePreview 
} from './useTemplateStore'

// Export utility functions from yarn store
export { 
  hexToRgb, 
  rgbToHex, 
  getColorBrightness, 
  isLightColor, 
  getContrastColor, 
  getColorDistance, 
  findSimilarColors 
} from './useYarnStore'

// Export utility functions from progress store
export { 
  getProgressPercentage, 
  getCompletedStitches, 
  getTotalStitches, 
  isProjectCompleted 
} from './useProgressStore'

// Hook for accessing all stores with type safety
export const useAppState = () => {
  const base = useBaseStore()
  const sync = useSyncStore()
  const project = useProjectStore()
  const pattern = usePatternStore()
  const chart = useChartStore()
  const yarn = useYarnStore()
  const template = useTemplateStore()
  const progress = useProgressStore()

  return {
    base,
    sync,
    project,
    pattern,
    chart,
    yarn,
    template,
    progress,
    
    // Computed values - only use properties that exist
    isLoading: base.isLoading || template.isLoading,
    hasError: !!base.error,
    error: base.error,
    
    // Quick access to commonly used values
    currentProject: project.currentProject,
    projects: project.projects,
    templates: template.templates
  }
}

// Simple combined actions that work with the actual store interfaces
export const useAppActions = () => {
  return {
    // Initialize app
    initializeApp: async () => {
      try {
        const { setLoading } = useBaseStore.getState()
        const { loadProjects } = useProjectStore.getState()
        const { templates } = useTemplateStore.getState()
        
        setLoading(true)
        
        // Load projects from localStorage
        await loadProjects()
        
        // Load templates if none exist
        if (templates.length === 0) {
          const { createDefaultTemplates } = await import('./useTemplateStore')
          await createDefaultTemplates()
        }
        
        setLoading(false)
        console.log('[APP] App initialized successfully')
      } catch (error) {
        const { setLoading, setError } = useBaseStore.getState()
        setLoading(false)
        setError(error instanceof Error ? error.message : 'Failed to initialize app')
        console.error('[APP] Initialization failed:', error)
      }
    },

    // Create new project with optional chart
    createNewProject: async (projectName: string, chartName?: string) => {
      try {
        const { createProject } = useProjectStore.getState()
        const { createChart } = useChartStore.getState()
        
        // Create new project
        await createProject(projectName)
        
        if (chartName) {
          // Create initial chart if name provided
          await createChart({
            name: chartName,
            description: `${projectName} 的主要織圖`
          })
        }

        console.log('[APP] Created new project:', projectName)
      } catch (error) {
        const { setError } = useBaseStore.getState()
        setError(error instanceof Error ? error.message : 'Failed to create project')
        throw error
      }
    },

    // Delete project
    deleteProject: async (projectId: string) => {
      try {
        const { currentProject, setCurrentProject, deleteProject } = useProjectStore.getState()
        const { setLoading } = useBaseStore.getState()
        
        setLoading(true)
        
        // If it's the current project, clear it first
        if (currentProject?.id === projectId) {
          await setCurrentProject(null)
        }
        
        // Delete the project
        await deleteProject(projectId)
        
        setLoading(false)
        console.log('[APP] Deleted project:', projectId)
      } catch (error) {
        const { setLoading, setError } = useBaseStore.getState()
        setLoading(false)
        setError(error instanceof Error ? error.message : 'Failed to delete project')
        throw error
      }
    },

    // Switch to a project
    switchProject: async (projectId: string) => {
      try {
        const { projects, setCurrentProject } = useProjectStore.getState()
        const { setLoading } = useBaseStore.getState()
        
        setLoading(true)
        
        // Find and set the project
        const project = projects.find(p => p.id === projectId)
        if (project) {
          await setCurrentProject(project)
        }
        
        setLoading(false)
        console.log('[APP] Switched to project:', projectId)
      } catch (error) {
        const { setLoading, setError } = useBaseStore.getState()
        setLoading(false)
        setError(error instanceof Error ? error.message : 'Failed to switch project')
        throw error
      }
    },

    // Add stitch to current round
    addStitchToCurrentRound: async (stitchData: any) => {
      try {
        const { currentProject } = useProjectStore.getState()
        const { addStitch } = usePatternStore.getState()
        
        if (!currentProject) {
          throw new Error('No current project')
        }

        // Get current round from project or default to 1
        const currentRound = currentProject.currentRound || 1
        await addStitch(currentRound, stitchData)
        
        console.log('[APP] Added stitch to current round:', currentRound)
      } catch (error) {
        const { setError } = useBaseStore.getState()
        setError(error instanceof Error ? error.message : 'Failed to add stitch')
        throw error
      }
    },

    // Mark project as complete
    markProjectComplete: async () => {
      try {
        const { currentProject } = useProjectStore.getState()
        const { markProjectComplete } = useProgressStore.getState()
        const { setLoading } = useBaseStore.getState()
        
        if (!currentProject) {
          throw new Error('No current project')
        }

        setLoading(true)
        await markProjectComplete()
        setLoading(false)
        
        console.log('[APP] Marked project as complete')
      } catch (error) {
        const { setLoading, setError } = useBaseStore.getState()
        setLoading(false)
        setError(error instanceof Error ? error.message : 'Failed to complete project')
        throw error
      }
    }
  }
}