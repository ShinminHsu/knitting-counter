import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'
import { useProjectStore } from '../../stores/useProjectStore'
import { useChartStore } from '../../stores/useChartStore'
import SyncStatusIndicator from '../SyncStatusIndicator'
import { getCurrentChart } from '../../utils'

// Import extracted components
import ProjectInfo from './ProjectInfo'
import QuickActions from './QuickActions'
import YarnDisplay from './YarnDisplay'
import ChartManagement from './ChartManagement'
import EditProjectModal from './modals/EditProjectModal'
import CreateChartModal from './modals/CreateChartModal'
import EditChartModal from './modals/EditChartModal'

export default function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const {
    currentProject,
    setCurrentProjectById,
    projects,
    updateProjectLocally
  } = useProjectStore()
  
  const {
    createChart,
    updateChart,
    setCurrentChart: setActiveChart,
    deleteChart
  } = useChartStore()
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateChartModal, setShowCreateChartModal] = useState(false)
  const [showEditChartModal, setShowEditChartModal] = useState(false)
  const [editingChart, setEditingChart] = useState<any>(null)
  const [currentChart, setCurrentChart] = useState(() => currentProject ? getCurrentChart(currentProject) : null)

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProjectById(projectId)
      } else {
        navigate('/404')
      }
    }
  }, [projectId, setCurrentProjectById, projects, navigate])

  // Update current chart when project changes
  useEffect(() => {
    if (currentProject) {
      setCurrentChart(getCurrentChart(currentProject))
    }
  }, [currentProject])

  // Project edit handlers
  const handleOpenEditModal = () => {
    setShowEditModal(true)
  }

  const handleUpdateProject = async (name: string, source: string, notes: string) => {
    if (!currentProject) return
    
    const updatedProject = {
      ...currentProject,
      name,
      source: source || undefined,
      notes: notes || undefined,
      lastModified: new Date()
    }
    
    await updateProjectLocally(updatedProject)
    setShowEditModal(false)
  }

  // Chart management handlers
  const handleCreateChart = async (name: string, description: string, notes: string) => {
    await createChart({
      name,
      description: description || undefined,
      notes: notes || undefined
    })
    setShowCreateChartModal(false)
  }

  const handleSetCurrentChart = async (chartId: string) => {
    await setActiveChart(chartId)
  }

  const handleOpenEditChart = (chart: any) => {
    setEditingChart(chart)
    setShowEditChartModal(true)
  }

  const handleUpdateChart = async (name: string, description: string, notes: string) => {
    if (!editingChart) return

    await updateChart(editingChart.id, {
      name,
      description: description || undefined,
      notes: notes || undefined
    })
    
    setEditingChart(null)
    setShowEditChartModal(false)
  }

  const handleDeleteChart = async (chartId: string, chartName: string) => {
    if (confirm(`確定要刪除織圖「${chartName}」嗎？此操作無法復原。`)) {
      await deleteChart(chartId)
    }
  }

  const handleCloseEditChartModal = () => {
    setEditingChart(null)
    setShowEditChartModal(false)
  }

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

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* Header */}
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="返回"
              >
                ←
              </Link>
              <Link
                to="/"
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="首頁"
              >
                <BsHouse className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-text-primary truncate">
                {currentProject.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Project Information */}
        <ProjectInfo 
          project={currentProject} 
          onEditClick={handleOpenEditModal}
        />

        {/* Quick Actions */}
        <QuickActions projectId={currentProject.id} />

        {/* Yarn Display */}
        <YarnDisplay project={currentProject} />

        {/* Chart Management */}
        <ChartManagement
          project={currentProject}
          currentChart={currentChart}
          onCreateChart={() => setShowCreateChartModal(true)}
          onEditChart={handleOpenEditChart}
          onSetCurrentChart={handleSetCurrentChart}
          onDeleteChart={handleDeleteChart}
        />
      </div>

      {/* Modals */}
      <EditProjectModal
        isOpen={showEditModal}
        project={currentProject}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdateProject}
      />

      <CreateChartModal
        isOpen={showCreateChartModal}
        onClose={() => setShowCreateChartModal(false)}
        onCreate={handleCreateChart}
      />

      <EditChartModal
        isOpen={showEditChartModal}
        chart={editingChart}
        onClose={handleCloseEditChartModal}
        onSave={handleUpdateChart}
      />
    </div>
  )
}