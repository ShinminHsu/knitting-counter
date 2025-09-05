import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../stores/useProjectStore'
import { useChartStore } from '../stores/useChartStore'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useProgressCalculations } from '../hooks/useProgressCalculations'
import ProgressHeader from './ProgressTracking/ProgressHeader'
import ChartSelector from './ProgressTracking/ChartSelector'
import ProgressDisplay from './ProgressTracking/ProgressDisplay'
import StitchRenderer from './ProgressTracking/StitchRenderer'
import ActionControls from './ProgressTracking/ActionControls'
import { googleAnalytics } from '../services/googleAnalytics'

export default function ProgressTrackingView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  // Use separate stores for projects and charts
  const {
    projects,
    currentProject,
    setCurrentProjectById
  } = useProjectStore()
  
  const {
    getChartSummaries,
    setCurrentChart,
    getCurrentChart,
    updateChartProgress
  } = useChartStore()
  
  // Get current chart
  const currentChart = getCurrentChart()

  const [viewingRound, setViewingRound] = useState<number | null>(null)
  const patternContainerRef = useRef<HTMLDivElement>(null)
  
  // Get chart data
  const chartSummaries = getChartSummaries()

  // Initialize project
  useEffect(() => {
    if (projectId) {
      const project = projects.find((p: any) => p.id === projectId)
      
      if (project) {
        setCurrentProjectById(projectId)
        
        // Track page view
        googleAnalytics.trackPageView(`/project/${projectId}/progress`, 'Progress Tracking')
        
        // Track progress start
        googleAnalytics.trackProgressEvent('start', {
          project_id: projectId,
          project_name: project.name
        })
      } else {
        navigate('/404')
      }
    }
  }, [projectId, setCurrentProjectById, projects, navigate])

  // Get progress calculations
  const {
    currentRound,
    currentStitchInRound,
    currentStitchDisplayInRound,
    totalStitchesInCurrentRound,
    displayRound,
    roundDescription,
    isViewMode,
    displayRoundNumber
  } = useProgressCalculations({
    currentProject,
    currentChart,
    viewingRound
  })

  // Auto-scroll functionality
  useAutoScroll({
    currentProject,
    currentChart,
    displayRound,
    isViewMode,
    patternContainerRef
  })

  // Handle chart selection
  const handleChartChange = useCallback(async (chartId: string) => {
    if (!currentProject) return
    await setCurrentChart(chartId)
    
    // Track chart selection
    googleAnalytics.trackChartEvent('select', {
      project_id: currentProject.id,
      chart_id: chartId
    })
  }, [currentProject, setCurrentChart])

  // Handle jump to round
  const handleJumpToRound = useCallback((roundNumber: number) => {
    if (currentChart && roundNumber === currentChart.currentRound) {
      // If jumping to current round, exit view mode
      setViewingRound(null)
    } else {
      // Enter view mode
      setViewingRound(roundNumber)
    }
  }, [currentChart])

  // Handle next stitch using direct store operations
  const handleNextStitch = useCallback(async () => {
    if (!currentProject || !currentChart) {
      return
    }

    const pattern = currentChart.rounds || []
    if (pattern.length === 0) {
      return
    }

    const currentRound = pattern.find(r => r.roundNumber === currentChart.currentRound)
    if (!currentRound) {
      return
    }

    const totalStitchesInRound = currentRound.stitches.reduce((sum, stitch) => sum + stitch.count, 0) +
                                currentRound.stitchGroups.reduce((sum, group) => {
                                  const groupStitches = group.stitches.reduce((gSum, stitch) => gSum + stitch.count, 0)
                                  return sum + (groupStitches * group.repeatCount)
                                }, 0)
    
    let newStitch = currentChart.currentStitch + 1
    let newRound = currentChart.currentRound
    let isCompleted = false

    if (newStitch >= totalStitchesInRound) {
      const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
      
      if (currentChart.currentRound >= maxRoundNumber) {
        isCompleted = true
        newStitch = totalStitchesInRound
      } else {
        // Move to next round
        newStitch = 0
        newRound = currentChart.currentRound + 1
      }
    }

    await updateChartProgress(currentChart.id, {
      currentRound: newRound,
      currentStitch: newStitch,
      isCompleted
    })
    
    // Track progress events
    googleAnalytics.trackProgressEvent('next_stitch', {
      project_id: currentProject.id,
      chart_id: currentChart.id,
      round_number: newRound,
      stitch_number: newStitch
    })
    
    if (newRound > currentChart.currentRound) {
      googleAnalytics.trackProgressEvent('complete_round', {
        project_id: currentProject.id,
        chart_id: currentChart.id,
        round_number: currentChart.currentRound
      })
    }
    
    if (isCompleted) {
      googleAnalytics.trackProjectEvent('complete', {
        project_id: currentProject.id,
        project_name: currentProject.name
      })
    }
  }, [currentProject, currentChart, updateChartProgress])

  // Handle previous stitch using direct store operations
  const handlePreviousStitch = useCallback(async () => {
    if (!currentProject || !currentChart) {
      return
    }

    const pattern = currentChart.rounds || []
    if (pattern.length === 0) {
      return
    }

    let newStitch = currentChart.currentStitch - 1
    let newRound = currentChart.currentRound

    if (newStitch < 0 && newRound > 1) {
      // Move to previous round
      const previousRound = pattern.find(r => r.roundNumber === newRound - 1)
      if (previousRound) {
        const totalStitchesInPrevRound = previousRound.stitches.reduce((sum, stitch) => sum + stitch.count, 0) +
                                       previousRound.stitchGroups.reduce((sum, group) => {
                                         const groupStitches = group.stitches.reduce((gSum, stitch) => gSum + stitch.count, 0)
                                         return sum + (groupStitches * group.repeatCount)
                                       }, 0)
        newRound = newRound - 1
        newStitch = totalStitchesInPrevRound - 1
      } else {
        newStitch = 0
      }
    } else if (newStitch < 0) {
      newStitch = 0
    }

    await updateChartProgress(currentChart.id, {
      currentRound: newRound,
      currentStitch: newStitch,
      isCompleted: false
    })
    
    // Track previous stitch event
    googleAnalytics.trackProgressEvent('previous_stitch', {
      project_id: currentProject.id,
      chart_id: currentChart.id,
      round_number: newRound,
      stitch_number: newStitch
    })
  }, [currentProject, currentChart, updateChartProgress])

  // Handle complete round using direct store operations
  const handleCompleteRound = useCallback(async () => {
    if (!currentProject || !currentChart) {
      return
    }
    
    const pattern = currentChart.rounds || []
    const maxRoundNumber = Math.max(...pattern.map(r => r.roundNumber))
    
    if (currentChart.currentRound >= maxRoundNumber) {
      // Mark chart as completed
      const lastRound = pattern.find(r => r.roundNumber === maxRoundNumber)
      const totalStitches = lastRound ?
        lastRound.stitches.reduce((sum, stitch) => sum + stitch.count, 0) +
        lastRound.stitchGroups.reduce((sum, group) => {
          const groupStitches = group.stitches.reduce((gSum, stitch) => gSum + stitch.count, 0)
          return sum + (groupStitches * group.repeatCount)
        }, 0) : 0
      
      await updateChartProgress(currentChart.id, {
        currentStitch: totalStitches,
        isCompleted: true
      })
    } else {
      // Move to next round
      await updateChartProgress(currentChart.id, {
        currentRound: currentChart.currentRound + 1,
        currentStitch: 0,
        isCompleted: false
      })
    }
    
    setViewingRound(null) // Exit view mode
  }, [currentProject, currentChart, updateChartProgress])

  // Handle exit view mode
  const handleExitViewMode = useCallback(() => {
    setViewingRound(null)
  }, [])

  // Handle reset project
  const handleResetProject = useCallback(async () => {
    if (!currentProject || !currentChart) {
      return
    }
    
    // Reset chart progress to beginning
    await updateChartProgress(currentChart.id, {
      currentRound: 1,
      currentStitch: 0,
      isCompleted: false
    })
  }, [currentProject, currentChart, updateChartProgress])

  // Handle restart current round
  const handleRestartCurrentRound = useCallback(async () => {
    if (!currentProject || !currentChart) {
      return
    }
    
    // Reset current stitch to 0 for the current round
    await updateChartProgress(currentChart.id, {
      currentRound: currentChart.currentRound,
      currentStitch: 0,
      isCompleted: false
    })
    
    // Track restart round event
    googleAnalytics.trackProgressEvent('restart_round', {
      project_id: currentProject.id,
      chart_id: currentChart.id,
      round_number: currentChart.currentRound
    })
  }, [currentProject, currentChart, updateChartProgress])

  // Handle share success
  const handleShareSuccess = useCallback(() => {
    if (!currentProject) return
    
    const shareData = {
      title: `我完成了編織作品：${currentProject.name}`,
      text: `使用編織計數器完成了「${currentProject.name}」的編織！`,
    }

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        alert('編織完成！')
      })
    } else {
      alert('編織完成！')
    }
  }, [currentProject])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle keyboard events when not in view mode and chart exists
      if (isViewMode || !currentChart) {
        return
      }

      // Prevent default behavior for arrow keys
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
      }

      switch (event.key) {
        case 'ArrowLeft':
          // Check if we can go to previous stitch
          if (!(currentChart.currentRound === 1 && currentChart.currentStitch === 0)) {
            handlePreviousStitch()
          }
          break
        case 'ArrowRight':
          handleNextStitch()
          break
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyPress)

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isViewMode, currentChart, handleNextStitch, handlePreviousStitch])

  // Loading state
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">載入中...</p>
        </div>
      </div>
    )
  }

  const hasMultipleCharts = chartSummaries.length > 1

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* Header */}
      <ProgressHeader 
        project={currentProject}
        projectId={projectId!}
      />

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Chart Selector (only show if multiple charts) */}
        <ChartSelector
          currentChart={currentChart}
          chartSummaries={chartSummaries}
          hasMultipleCharts={hasMultipleCharts}
          isViewMode={isViewMode}
          displayRoundNumber={displayRoundNumber}
          onChartChange={handleChartChange}
        />

        {/* Overall Progress */}
        <ProgressDisplay
          currentProject={currentProject}
          currentChart={currentChart}
          currentRound={currentRound}
          hasMultipleCharts={hasMultipleCharts}
        />

        {/* Current Chart Progress & Controls */}
        {currentChart && (
          <>
            {/* Stitch Progress & Controls */}
            <StitchRenderer
              currentProject={currentProject}
              currentChart={currentChart}
              displayRound={displayRound}
              displayRoundNumber={displayRoundNumber}
              currentStitchInRound={currentStitchInRound}
              totalStitchesInCurrentRound={totalStitchesInCurrentRound}
              roundDescription={roundDescription}
              isViewMode={isViewMode}
              hasMultipleCharts={hasMultipleCharts}
              onJumpToRound={handleJumpToRound}
              patternContainerRef={patternContainerRef}
            />

            {/* Action Buttons */}
            <ActionControls
              currentProject={currentProject}
              currentChart={currentChart}
              isViewMode={isViewMode}
              currentStitchDisplayInRound={currentStitchDisplayInRound}
              totalStitchesInCurrentRound={totalStitchesInCurrentRound}
              displayRoundNumber={displayRoundNumber}
              onNextStitch={handleNextStitch}
              onPreviousStitch={handlePreviousStitch}
              onCompleteRound={handleCompleteRound}
              onRestartCurrentRound={handleRestartCurrentRound}
              onExitViewMode={handleExitViewMode}
              onResetProject={handleResetProject}
              onShareSuccess={handleShareSuccess}
            />
          </>
        )}

        {/* No Chart Warning */}
        {!currentChart && (
          <div className="card">
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">
                此專案尚未包含任何織圖資料
              </p>
              <Link
                to={`/project/${projectId}`}
                className="btn btn-primary"
              >
                前往專案設定
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}