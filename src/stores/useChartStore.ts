import { create } from 'zustand'
import { Chart, CreateChartRequest, ChartSummary, Project } from '../types'
import { generateId, createChart, getCurrentChart, getProjectChartSummaries, setCurrentChart, addChartToProject, removeChartFromProject, updateChartInProject, migrateProjectToMultiChart } from '../utils'
import { useProjectStore } from './useProjectStore'
import { handleAsyncError } from './useBaseStore'
import { debouncedSyncManager } from '../utils/debouncedSync'

// Common utility function for safe project updates with Timestamp cleaning
const createSafeUpdateProjectLocally = () => {
  const safeCreateDate = (dateValue: any, fallback: Date = new Date()): Date => {
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return new Date(dateValue)
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const parsed = new Date(dateValue)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
      try {
        // Convert Firestore Timestamp to Date
        const timestamp = dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000
        const date = new Date(timestamp)
        if (!isNaN(date.getTime())) {
          return date
        }
      } catch (e) {
      }
    }
    // Handle Firestore Timestamp objects with toDate method
    if (dateValue && typeof dateValue.toDate === 'function') {
      try {
        const date = dateValue.toDate()
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date
        }
      } catch (e) {
      }
    }
    return fallback
  }

  return async (project: Project, _context: string = 'unknown') => {
    const { setProjects, setCurrentProject, projects, currentProject } = useProjectStore.getState()
    

    const cleanedProject = {
      ...project,
      lastModified: new Date(),
      createdDate: safeCreateDate(project.createdDate, new Date()),
      sessions: project.sessions?.map(session => ({
        ...session,
        startTime: safeCreateDate(session.startTime)
      })) || [],
      charts: project.charts?.map((chart) => {
        return {
          ...chart,
          createdDate: safeCreateDate(chart.createdDate, project.createdDate),
          lastModified: safeCreateDate(chart.lastModified, new Date()),
          rounds: chart.rounds?.map(round => ({
            ...round,
            stitches: [...round.stitches],
            stitchGroups: round.stitchGroups?.map(group => ({
              ...group,
              stitches: [...group.stitches]
            })) || []
          })) || []
        }
      }) || []
    }

    // 只更新本地狀態，不同步到Firebase
    setProjects(projects.map(p => p.id === cleanedProject.id ? cleanedProject : p))
    if (currentProject?.id === cleanedProject.id) {
      setCurrentProject(cleanedProject)
    }
  }
}

// Export the safe update function for use in other stores (with immediate sync)
export const safeUpdateProjectLocally = createSafeUpdateProjectLocally()

// Create debounced version with reduced Firebase writes
const createDebouncedUpdateProjectLocally = () => {
  const safeCreateDate = (dateValue: any, fallback: Date = new Date()): Date => {
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return new Date(dateValue)
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const parsed = new Date(dateValue)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
      try {
        // Convert Firestore Timestamp to Date
        const timestamp = dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000
        const date = new Date(timestamp)
        if (!isNaN(date.getTime())) {
          return date
        }
      } catch (e) {
      }
    }
    // Handle Firestore Timestamp objects with toDate method
    if (dateValue && typeof dateValue.toDate === 'function') {
      try {
        const date = dateValue.toDate()
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date
        }
      } catch (e) {
      }
    }
    return fallback
  }

  return async (project: Project, context: string = 'unknown', isUrgent: boolean = false) => {
    console.log(`[DEBOUNCED-UPDATE] debouncedUpdateProjectLocally called:`, {
      projectId: project.id,
      context,
      isUrgent
    })
    
    const { setCurrentProject, setProjects, projects } = useProjectStore.getState()
    
    const cleanedProject = {
      ...project,
      lastModified: new Date(),
      createdDate: safeCreateDate(project.createdDate, new Date()),
      sessions: project.sessions?.map(session => ({
        ...session,
        startTime: safeCreateDate(session.startTime)
      })) || [],
      charts: project.charts?.map((chart) => {
        return {
          ...chart,
          createdDate: safeCreateDate(chart.createdDate, project.createdDate),
          lastModified: safeCreateDate(chart.lastModified, new Date()),
          rounds: chart.rounds?.map(round => ({
            ...round,
            stitches: [...round.stitches],
            stitchGroups: round.stitchGroups?.map(group => ({
              ...group,
              stitches: [...group.stitches]
            })) || []
          })) || []
        }
      }) || []
    }

    // 立即更新本地狀態
    const updatedProjects = projects.map(p =>
      p.id === cleanedProject.id ? cleanedProject : p
    )
    setProjects(updatedProjects)
    
    // 如果是當前項目，也更新當前項目狀態
    const currentProject = useProjectStore.getState().currentProject
    if (currentProject?.id === cleanedProject.id) {
      setCurrentProject(cleanedProject)
    }

    // 使用防抖同步到Firebase
    await debouncedSyncManager.debouncedSync(cleanedProject, context, isUrgent)
    
    console.log(`[DEBOUNCED-UPDATE] Local state updated immediately, Firebase sync scheduled (context: ${context})`)
  }
}

// Export the debounced version for high-frequency operations
export const debouncedUpdateProjectLocally = createDebouncedUpdateProjectLocally()

interface ChartStoreState {
  // No persistent state needed - charts are managed in projects
}

interface ChartStoreActions {
  // Chart management
  createChart: (chartData: CreateChartRequest) => Promise<Chart | null>
  duplicateChart: (chartId: string) => Promise<Chart | null>
  updateChart: (chartId: string, updates: Partial<Chart>) => Promise<void>
  updateChartProgress: (chartId: string, updates: Partial<Chart>) => Promise<void> // 新增：專門用於進度更新
  deleteChart: (chartId: string) => Promise<void>
  setCurrentChart: (chartId: string) => Promise<void>
  
  // Chart utilities
  getCurrentChart: () => Chart | null
  getChartSummaries: () => ChartSummary[]
  getChartById: (chartId: string) => Chart | null
  
  // Chart operations
  clearChart: (chartId: string) => Promise<void>
  resetChartProgress: (chartId: string) => Promise<void>
  markChartComplete: (chartId: string) => Promise<void>
  
  // Import/Export (placeholders for future implementation)
  exportChart: (chartId: string) => Promise<string>
  importChart: (chartData: string) => Promise<Chart | null>
}

interface ChartStore extends ChartStoreState, ChartStoreActions {}

export const useChartStore = create<ChartStore>(() => ({
  // Chart management
  createChart: async (chartData: CreateChartRequest) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] createChart: No current project')
      return null
    }

    try {
      // Ensure project is migrated to multi-chart format
      const migrationResult = migrateProjectToMultiChart(currentProject)
      if (!migrationResult.success) {
        console.error('[CHART] createChart: Migration failed:', migrationResult.errors)
        return null
      }

      const newChart = createChart(chartData.name, chartData.description, chartData.notes)
      
      const updatedProject = { ...currentProject }
      const success = addChartToProject(updatedProject, newChart)
      
      if (!success) {
        console.error('[CHART] createChart: Failed to add chart to project')
        return null
      }

      await safeUpdateProjectLocally(updatedProject, 'createChart')

      console.log('[CHART] Created chart:', newChart.name, 'with ID:', newChart.id)
      return newChart
    } catch (error) {
      handleAsyncError(error, 'Failed to create chart')
      return null
    }
  },

  duplicateChart: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] duplicateChart: No current project')
      return null
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        console.error('[CHART] duplicateChart: No charts found')
        return null
      }

      const sourceChart = currentProject.charts.find(c => c.id === chartId)
      if (!sourceChart) {
        console.error('[CHART] duplicateChart: Source chart not found:', chartId)
        return null
      }

      const duplicatedChart: Chart = {
        ...sourceChart,
        id: generateId(),
        name: `${sourceChart.name} (複製)`,
        createdDate: new Date(),
        lastModified: new Date(),
        // Reset progress for duplicated chart
        currentRound: 1,
        currentStitch: 0,
        isCompleted: false,
        // Deep copy rounds with new IDs
        rounds: sourceChart.rounds.map(round => ({
          ...round,
          id: generateId(),
          stitches: round.stitches.map(stitch => ({
            ...stitch,
            id: generateId()
          })),
          stitchGroups: round.stitchGroups.map(group => ({
            ...group,
            id: generateId(),
            stitches: group.stitches.map(stitch => ({
              ...stitch,
              id: generateId()
            }))
          }))
        }))
      }

      const updatedProject = { ...currentProject }
      const success = addChartToProject(updatedProject, duplicatedChart)
      
      if (!success) {
        console.error('[CHART] duplicateChart: Failed to add duplicated chart to project')
        return null
      }

      await safeUpdateProjectLocally(updatedProject, 'duplicateChart')

      console.log('[CHART] Duplicated chart:', sourceChart.name, 'as:', duplicatedChart.name)
      return duplicatedChart
    } catch (error) {
      handleAsyncError(error, 'Failed to duplicate chart')
      return null
    }
  },

  updateChart: async (chartId: string, updates: Partial<Chart>) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] updateChart: No current project')
      return
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        console.error('[CHART] updateChart: No charts found after migration')
        return
      }

      const existingChart = currentProject.charts.find(c => c.id === chartId)
      if (!existingChart) {
        console.error('[CHART] updateChart: Chart not found:', chartId)
        return
      }

      // Create updated chart with proper Date handling
      const updatedChart = {
        ...existingChart,
        ...updates,
        lastModified: new Date()
      }

      // Optimized: Only create shallow copy and update the specific chart
      const updatedProject = {
        ...currentProject,
        lastModified: new Date(),
        charts: currentProject.charts.map(chart =>
          chart.id === chartId ? updatedChart : chart
        )
      }
      
      const success = updateChartInProject(updatedProject, updatedChart)
      
      if (!success) {
        console.error('[CHART] updateChart: Failed to update chart in project')
        return
      }

      await debouncedUpdateProjectLocally(updatedProject, 'updateChart')

      console.log('[CHART] Updated chart:', chartId)
    } catch (error) {
      console.error('[CHART] Error in updateChart:', error)
      handleAsyncError(error, 'Failed to update chart')
    }
  },

  // 專門用於進度更新的函數，使用批次處理
  updateChartProgress: async (chartId: string, updates: Partial<Chart>) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] updateChartProgress: No current project')
      return
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        console.error('[CHART] updateChartProgress: No charts found after migration')
        return
      }

      const existingChart = currentProject.charts.find(c => c.id === chartId)
      if (!existingChart) {
        console.error('[CHART] updateChartProgress: Chart not found:', chartId)
        return
      }

      // Create updated chart with proper Date handling
      const updatedChart = {
        ...existingChart,
        ...updates,
        lastModified: new Date()
      }

      // Optimized: Only create shallow copy and update the specific chart
      const updatedProject = {
        ...currentProject,
        charts: currentProject.charts.map(chart =>
          chart.id === chartId ? updatedChart : chart
        ),
        lastModified: new Date()
      }

      await debouncedUpdateProjectLocally(updatedProject, 'updateChartProgress')

      console.log('[CHART] Updated chart progress:', chartId)
    } catch (error) {
      console.error('[CHART] Error in updateChartProgress:', error)
      handleAsyncError(error, 'Failed to update chart progress')
    }
  },

  deleteChart: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] deleteChart: No current project')
      return
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts || currentProject.charts.length <= 1) {
        console.error('[CHART] deleteChart: Cannot delete the last chart')
        return
      }

      const updatedProject = { ...currentProject }
      const success = removeChartFromProject(updatedProject, chartId)
      
      if (!success) {
        console.error('[CHART] deleteChart: Failed to remove chart from project')
        return
      }

      await safeUpdateProjectLocally(updatedProject, 'deleteChart')

      console.log('[CHART] Deleted chart:', chartId)
    } catch (error) {
      handleAsyncError(error, 'Failed to delete chart')
    }
  },

  setCurrentChart: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] setCurrentChart: No current project')
      return
    }

    try {
      console.log('[CHART-DEBUG] Starting setCurrentChart:', {
        chartId,
        projectId: currentProject.id,
        projectName: currentProject.name,
        hasCharts: !!currentProject.charts,
        chartsLength: currentProject.charts?.length || 0,
        currentChartId: currentProject.currentChartId
      })

      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      // Create a proper deep copy of the project while fixing broken Date objects
      const safeCreateDate = (dateValue: any, fallback: Date = new Date()): Date => {
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return new Date(dateValue)
        }
        if (typeof dateValue === 'string' || typeof dateValue === 'number') {
          const parsed = new Date(dateValue)
          if (!isNaN(parsed.getTime())) {
            return parsed
          }
        }
        // Handle Firestore Timestamp objects
        if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
          try {
            // Convert Firestore Timestamp to Date
            const timestamp = dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000
            const date = new Date(timestamp)
            if (!isNaN(date.getTime())) {
              console.log('[CHART-DEBUG] setCurrentChart - Successfully converted Firestore Timestamp to Date:', dateValue, '→', date)
              return date
            }
          } catch (e) {
            console.warn('[CHART-DEBUG] setCurrentChart - Failed to convert Firestore Timestamp:', dateValue, e)
          }
        }
        // Handle Firestore Timestamp objects with toDate method
        if (dateValue && typeof dateValue.toDate === 'function') {
          try {
            const date = dateValue.toDate()
            if (date instanceof Date && !isNaN(date.getTime())) {
              console.log('[CHART-DEBUG] setCurrentChart - Successfully converted Firestore Timestamp using toDate():', date)
              return date
            }
          } catch (e) {
            console.warn('[CHART-DEBUG] setCurrentChart - Failed to convert Firestore Timestamp using toDate():', e)
          }
        }
        console.warn('[CHART-DEBUG] setCurrentChart - Using fallback date for invalid date value:', dateValue)
        return fallback
      }

      const updatedProject = {
        ...currentProject,
        lastModified: new Date(),
        sessions: currentProject.sessions?.map(session => ({
          ...session,
          startTime: safeCreateDate(session.startTime)
        })) || [],
        charts: currentProject.charts?.map((chart, index) => {
          const hasTimestampCreatedDate = chart.createdDate && typeof chart.createdDate === 'object' && 'seconds' in chart.createdDate
          const hasTimestampLastModified = chart.lastModified && typeof chart.lastModified === 'object' && 'seconds' in chart.lastModified
          
          console.log('[CHART-DEBUG] setCurrentChart - Processing chart dates:', {
            chartIndex: index,
            chartId: chart.id,
            chartName: chart.name,
            originalCreatedDate: chart.createdDate,
            originalLastModified: chart.lastModified,
            createdDateValid: chart.createdDate instanceof Date && !isNaN(chart.createdDate.getTime()),
            lastModifiedValid: chart.lastModified instanceof Date && !isNaN(chart.lastModified.getTime()),
            hasTimestampCreatedDate,
            hasTimestampLastModified,
            chartKeys: Object.keys(chart)
          })

          // ALWAYS fix Timestamp objects for ALL charts
          const processedChart = {
            ...chart,
            createdDate: safeCreateDate(chart.createdDate, currentProject.createdDate),
            lastModified: safeCreateDate(chart.lastModified, new Date()),
            rounds: chart.rounds?.map(round => ({
              ...round,
              stitches: [...round.stitches],
              stitchGroups: round.stitchGroups?.map(group => ({
                ...group,
                stitches: [...group.stitches]
              })) || []
            })) || []
          }
          
          console.log('[CHART-DEBUG] setCurrentChart - After processing chart dates:', {
            chartIndex: index,
            chartId: chart.id,
            processedCreatedDate: processedChart.createdDate,
            processedLastModified: processedChart.lastModified,
            createdDateIsNowValid: processedChart.createdDate instanceof Date && !isNaN(processedChart.createdDate.getTime()),
            lastModifiedIsNowValid: processedChart.lastModified instanceof Date && !isNaN(processedChart.lastModified.getTime())
          })

          return processedChart
        }) || []
      }
      
      const success = setCurrentChart(updatedProject, chartId)
      
      if (!success) {
        console.error('[CHART] setCurrentChart: Failed to set current chart:', chartId)
        return
      }

      console.log('[CHART-DEBUG] setCurrentChart - About to call updateProjectLocally with cleaned project:', {
        projectId: updatedProject.id,
        projectName: updatedProject.name,
        chartsCount: updatedProject.charts?.length || 0,
        allChartsHaveValidDates: updatedProject.charts?.every(chart =>
          chart.createdDate instanceof Date && !isNaN(chart.createdDate.getTime()) &&
          chart.lastModified instanceof Date && !isNaN(chart.lastModified.getTime())
        )
      })

      await debouncedUpdateProjectLocally(updatedProject, 'setCurrentChart')

      console.log('[CHART] Set current chart to:', chartId)
    } catch (error) {
      console.error('[CHART-DEBUG] Error in setCurrentChart:', error)
      handleAsyncError(error, 'Failed to set current chart')
    }
  },

  // Chart utilities
  getCurrentChart: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return null
    
    return getCurrentChart(currentProject)
  },

  getChartSummaries: () => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return []
    
    return getProjectChartSummaries(currentProject)
  },

  getChartById: (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) return null
    
    // Ensure project is migrated to multi-chart format
    migrateProjectToMultiChart(currentProject)
    
    if (!currentProject.charts) return null
    
    return currentProject.charts.find(c => c.id === chartId) || null
  },

  // Chart operations
  clearChart: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] clearChart: No current project')
      return
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        console.error('[CHART] clearChart: No charts found')
        return
      }

      const chart = currentProject.charts.find(c => c.id === chartId)
      if (!chart) {
        console.error('[CHART] clearChart: Chart not found:', chartId)
        return
      }

      const clearedChart = {
        ...chart,
        rounds: [],
        currentRound: 1,
        currentStitch: 0,
        isCompleted: false,
        lastModified: new Date()
      }

      const updatedProject = { ...currentProject }
      const success = updateChartInProject(updatedProject, clearedChart)
      
      if (!success) {
        console.error('[CHART] clearChart: Failed to update chart in project')
        return
      }

      await safeUpdateProjectLocally(updatedProject, 'clearChart')

      console.log('[CHART] Cleared chart:', chartId)
    } catch (error) {
      handleAsyncError(error, 'Failed to clear chart')
    }
  },

  resetChartProgress: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] resetChartProgress: No current project')
      return
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        console.error('[CHART] resetChartProgress: No charts found')
        return
      }

      const chart = currentProject.charts.find(c => c.id === chartId)
      if (!chart) {
        console.error('[CHART] resetChartProgress: Chart not found:', chartId)
        return
      }

      const resetChart = {
        ...chart,
        currentRound: 1,
        currentStitch: 0,
        isCompleted: false,
        lastModified: new Date()
      }

      const updatedProject = { ...currentProject }
      const success = updateChartInProject(updatedProject, resetChart)
      
      if (!success) {
        console.error('[CHART] resetChartProgress: Failed to update chart in project')
        return
      }

      await safeUpdateProjectLocally(updatedProject, 'resetChartProgress')

      console.log('[CHART] Reset progress for chart:', chartId)
    } catch (error) {
      handleAsyncError(error, 'Failed to reset chart progress')
    }
  },

  markChartComplete: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] markChartComplete: No current project')
      return
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        console.error('[CHART] markChartComplete: No charts found')
        return
      }

      const chart = currentProject.charts.find(c => c.id === chartId)
      if (!chart) {
        console.error('[CHART] markChartComplete: Chart not found:', chartId)
        return
      }

      // Set to last round and last stitch
      let finalRound = 1
      let finalStitch = 0
      
      if (chart.rounds && chart.rounds.length > 0) {
        finalRound = Math.max(...chart.rounds.map(r => r.roundNumber))
        const lastRoundData = chart.rounds.find(r => r.roundNumber === finalRound)
        if (lastRoundData) {
          // Calculate total stitches in last round
          const totalStitches = lastRoundData.stitches.reduce((sum, stitch) => sum + stitch.count, 0) +
                               lastRoundData.stitchGroups.reduce((sum, group) => {
                                 const groupStitches = group.stitches.reduce((gSum, stitch) => gSum + stitch.count, 0)
                                 return sum + (groupStitches * group.repeatCount)
                               }, 0)
          finalStitch = totalStitches
        }
      }

      const completedChart = {
        ...chart,
        currentRound: finalRound,
        currentStitch: finalStitch,
        isCompleted: true,
        lastModified: new Date()
      }

      const updatedProject = { ...currentProject }
      const success = updateChartInProject(updatedProject, completedChart)
      
      if (!success) {
        console.error('[CHART] markChartComplete: Failed to update chart in project')
        return
      }

      await safeUpdateProjectLocally(updatedProject, 'markChartComplete')

      console.log('[CHART] Marked chart as complete:', chartId)
    } catch (error) {
      handleAsyncError(error, 'Failed to mark chart as complete')
    }
  },

  // Import/Export placeholders
  exportChart: async (chartId: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      throw new Error('No current project')
    }

    try {
      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      if (!currentProject.charts) {
        throw new Error('No charts found')
      }

      const chart = currentProject.charts.find(c => c.id === chartId)
      if (!chart) {
        throw new Error(`Chart not found: ${chartId}`)
      }

      // Create export data structure
      const exportData = {
        version: '1.0',
        exportDate: new Date(),
        chart: {
          ...chart,
          // Remove runtime properties that shouldn't be exported
          id: generateId(), // Generate new ID for imported chart
        }
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      handleAsyncError(error, 'Failed to export chart')
      throw error
    }
  },

  importChart: async (chartData: string) => {
    const { currentProject } = useProjectStore.getState()
    if (!currentProject) {
      console.error('[CHART] importChart: No current project')
      return null
    }

    try {
      const parsedData = JSON.parse(chartData)
      
      if (!parsedData.chart) {
        throw new Error('Invalid chart data format')
      }

      // Ensure project is migrated to multi-chart format
      migrateProjectToMultiChart(currentProject)
      
      const importedChart: Chart = {
        ...parsedData.chart,
        id: generateId(), // Generate new ID
        createdDate: new Date(),
        lastModified: new Date(),
        // Reset progress for imported chart
        currentRound: 1,
        currentStitch: 0,
        isCompleted: false
      }

      const updatedProject = { ...currentProject }
      const success = addChartToProject(updatedProject, importedChart)
      
      if (!success) {
        console.error('[CHART] importChart: Failed to add imported chart to project')
        return null
      }

      await safeUpdateProjectLocally(updatedProject, 'importChart')

      console.log('[CHART] Imported chart:', importedChart.name)
      return importedChart
    } catch (error) {
      handleAsyncError(error, 'Failed to import chart')
      return null
    }
  }
}))