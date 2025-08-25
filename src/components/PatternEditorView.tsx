import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
// import { FaRegEdit } from 'react-icons/fa'
import { FiEdit3 } from "react-icons/fi"
import { VscEdit } from 'react-icons/vsc'
import { BsTrash, BsHouse } from 'react-icons/bs'
import { CiCircleCheck } from 'react-icons/ci'
import { RxCrossCircled } from 'react-icons/rx'
import { useSyncedAppStore } from '../store/syncedAppStore'
import SyncStatusIndicator from './SyncStatusIndicator'
import StitchSelectionModal from './StitchSelectionModal'
import StitchGroupTemplateModal from './StitchGroupTemplateModal'
import CopyRoundModal from './CopyRoundModal'
import { 
  generateId,
  getRoundTotalStitches,
  getStitchGroupTotalStitches,
  getSortedPatternItems,
  getStitchDisplayInfo,
  getCurrentChart,
  getProjectPattern,
  isLegacyProject,
  describeRound
} from '../utils'
import { Round, StitchInfo, StitchGroup, StitchType, StitchTypeInfo, PatternItemType } from '../types'

export default function PatternEditorView() {
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { 
    currentProject, 
    setCurrentProject, 
    projects, 
    addRound, 
    updateRound, 
    deleteRound,
    addStitchToRound,
    addStitchGroupToRound,
    updateStitchInRound,
    deleteStitchFromRound,
    updateStitchGroupInRound,
    updateStitchInGroup,
    deleteStitchGroupFromRound,
    reorderPatternItemsInRound,
    createStitchGroupFromTemplate,
    copyRound,
    updateChart,
    migrateCurrentProjectToMultiChart
  } = useSyncedAppStore()

  const [currentChart, setCurrentChart] = useState<any>(null)
  const [chartPattern, setChartPattern] = useState<Round[]>([])
  const [showAddRoundForm, setShowAddRoundForm] = useState(false)
  const [showStitchModal, setShowStitchModal] = useState<{ roundNumber: number, mode: 'add' | 'edit', stitchId?: string } | null>(null)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [editingStitch, setEditingStitch] = useState<{ roundNumber: number, stitchId: string } | null>(null)
  const [editingGroup, setEditingGroup] = useState<{ roundNumber: number, groupId: string } | null>(null)
  const [editingGroupStitch, setEditingGroupStitch] = useState<{ roundNumber: number, groupId: string, stitchId: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 新增圈數表單狀態
  const [newRoundNotes, setNewRoundNotes] = useState('')

  // 群組中新增針法的modal狀態
  const [showGroupStitchModal, setShowGroupStitchModal] = useState(false)
  
  // 編輯新增群組中針法的modal狀態
  const [showEditNewGroupStitchModal, setShowEditNewGroupStitchModal] = useState<{ stitchId: string } | null>(null)
  
  // 編輯群組時新增針法的modal狀態
  const [showEditGroupStitchModal, setShowEditGroupStitchModal] = useState<{ roundNumber: number, groupId: string } | null>(null)
  
  // 範本管理模態狀態
  const [showTemplateModal, setShowTemplateModal] = useState<{ 
    mode: 'save' | 'select', 
    group?: StitchGroup, 
    roundNumber?: number 
  } | null>(null)
  
  // 複製圈數模態狀態
  const [showCopyRoundModal, setShowCopyRoundModal] = useState<{
    sourceRound: Round
  } | null>(null)
  
  // 新增群組模態狀態
  const [showAddGroupModal, setShowAddGroupModal] = useState<{ roundNumber: number } | null>(null)

  // 新增群組表單狀態
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRepeatCount, setNewGroupRepeatCount] = useState<number | string>(1)
  const [newGroupStitches, setNewGroupStitches] = useState<StitchInfo[]>([])

  // 編輯針法狀態
  const [editStitchType, setEditStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [editStitchCount, setEditStitchCount] = useState<number | string>(1)

  // 編輯群組狀態
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupRepeatCount, setEditGroupRepeatCount] = useState<number | string>(1)
  
  // 編輯群組內針法狀態
  const [editGroupStitchType, setEditGroupStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [editGroupStitchCount, setEditGroupStitchCount] = useState<number | string>(1)

  // 編輯織圖資訊狀態
  const [showEditChartModal, setShowEditChartModal] = useState(false)
  const [editChartName, setEditChartName] = useState('')
  const [editChartDescription, setEditChartDescription] = useState('')
  const [editChartNotes, setEditChartNotes] = useState('')

  // 拖拽狀態
  const [draggedItem, setDraggedItem] = useState<{ index: number, roundNumber: number } | null>(null)

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(projectId)
        
        // 如果是舊格式專案，自動遷移
        if (isLegacyProject(project)) {
          console.log('Migrating legacy project to multi-chart format')
          migrateCurrentProjectToMultiChart()
        }
      } else {
        navigate('/404')
      }
    }
  }, [projectId, projects, navigate, migrateCurrentProjectToMultiChart])

  // 處理織圖選擇和數據
  useEffect(() => {
    if (!currentProject) return

    const chartId = searchParams.get('chartId')
    let targetChart = null

    if (chartId && currentProject.charts) {
      // 查找指定的織圖
      targetChart = currentProject.charts.find(c => c.id === chartId)
      if (!targetChart) {
        console.warn('指定的織圖不存在，使用當前織圖')
        targetChart = getCurrentChart(currentProject)
      }
    } else {
      // 使用當前織圖
      targetChart = getCurrentChart(currentProject)
    }

    if (targetChart) {
      setCurrentChart(targetChart)
      setChartPattern(targetChart.rounds || [])
    } else {
      // 回退到舊格式
      setCurrentChart(null)
      setChartPattern(getProjectPattern(currentProject))
    }
  }, [currentProject, searchParams])

  // 處理數字輸入的輔助函數
  const handleNumberInputChange = (setValue: (value: number | string) => void, minValue: number = 1) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (value === '') {
        setValue('')
      } else {
        const numValue = parseInt(value)
        setValue(isNaN(numValue) ? minValue : Math.max(minValue, numValue))
      }
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value === '') {
        setValue(minValue)
      }
    }
  })

  // 確保數字值的輔助函數
  const ensureNumber = (value: number | string, defaultValue: number = 1): number => {
    if (typeof value === 'number') return value
    const parsed = parseInt(value)
    return isNaN(parsed) ? defaultValue : Math.max(defaultValue, parsed)
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

  const handleAddRound = async () => {
    console.log('[UI-ADD-ROUND] Button clicked:', {
      isLoading,
      timestamp: new Date().toISOString()
    })
    
    if (isLoading) {
      console.log('[UI-ADD-ROUND] Already loading, returning')
      return
    }
    
    setIsLoading(true)
    console.log('[UI-ADD-ROUND] Set loading to true')
    
    try {
      if (!currentProject) {
        console.error('[UI-ADD-ROUND] No current project')
        return
      }
      
      const roundNumbers = chartPattern?.map(r => r.roundNumber) || []
      const nextRoundNumber = Math.max(0, ...roundNumbers) + 1
      
      const newRound: Round = {
        id: generateId(),
        roundNumber: nextRoundNumber,
        stitches: [],
        stitchGroups: [],
        notes: newRoundNotes.trim() || undefined
      }

      console.log('[UI-ADD-ROUND] About to call addRound with:', {
        newRound,
        currentProjectId: currentProject.id,
        currentPatternLength: chartPattern.length
      })

      // 如果有特定織圖，更新織圖；否則使用原有的 addRound
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: [...currentChart.rounds, newRound],
          lastModified: new Date()
        }
        await updateChart(updatedChart)
      } else {
        await addRound(newRound)
      }
      
      console.log('[UI-ADD-ROUND] Successfully added round, cleaning up UI state')
      setNewRoundNotes('')
      setShowAddRoundForm(false)
      
      // 新增圈數後自動滾動到最後一個圈數
      const scrollToNewRound = () => {
        // 尋找所有圈數的卡片元素
        const roundCards = document.querySelectorAll('[data-round-card]')
        if (roundCards.length > 0) {
          const lastRoundCard = roundCards[roundCards.length - 1]
          lastRoundCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          })
        } else {
          // 如果找不到圈數卡片，回退到滾動到底部
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          })
        }
      }
      
      // 延遲滾動，確保新圈數已經渲染到 DOM
      setTimeout(scrollToNewRound, 200)
      setTimeout(scrollToNewRound, 500) // 再次嘗試確保成功
    } catch (error) {
      console.error('[UI-ADD-ROUND] Error adding round:', error)
      alert('新增圈數時發生錯誤，請查看控制台了解詳情')
    } finally {
      console.log('[UI-ADD-ROUND] Setting loading to false')
      setIsLoading(false)
    }
  }

  const handleDeleteRound = async (roundNumber: number) => {
    if (confirm(`確定要刪除第 ${roundNumber} 圈嗎？`)) {
      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: currentChart.rounds.filter((r: Round) => r.roundNumber !== roundNumber),
          lastModified: new Date()
        }
        await updateChart(updatedChart)
      } else {
        await deleteRound(roundNumber)
      }
    }
  }

  const handleStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    console.log('[UI-ADD-STITCH] Modal confirmed:', {
      stitchType,
      count,
      yarnId,
      roundNumber: showStitchModal?.roundNumber,
      timestamp: new Date().toISOString()
    })
    
    if (isLoading || !showStitchModal) {
      console.log('[UI-ADD-STITCH] Already loading or no modal state, returning')
      return
    }
    
    setIsLoading(true)
    console.log('[UI-ADD-STITCH] Set loading to true')
    
    try {
      if (!currentProject) {
        console.error('[UI-ADD-STITCH] No current project')
        return
      }
      
      const newStitch: StitchInfo = {
        id: generateId(),
        type: stitchType,
        yarnId: yarnId || currentProject.yarns[0]?.id || '',
        count: count,
        ...(stitchType === StitchType.CUSTOM && {
          customName,
          customSymbol
        })
      }

      console.log('[UI-ADD-STITCH] About to call addStitchToRound with:', {
        roundNumber: showStitchModal.roundNumber,
        newStitch,
        currentProjectId: currentProject.id
      })

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === showStitchModal.roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitches: [...targetRound.stitches, newStitch]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) => 
              r.roundNumber === showStitchModal.roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        await addStitchToRound(showStitchModal.roundNumber, newStitch)
      }
      
      console.log('[UI-ADD-STITCH] Successfully added stitch')
      setShowStitchModal(null) // 關閉 modal
    } catch (error) {
      console.error('[UI-ADD-STITCH] Error adding stitch:', error)
      alert('新增針法時發生錯誤，請查看控制台了解詳情')
    } finally {
      console.log('[UI-ADD-STITCH] Setting loading to false')
      setIsLoading(false)
    }
  }

  const handleAddGroup = async () => {
    if (!showAddGroupModal) return
    const { roundNumber } = showAddGroupModal
    console.log('[UI-ADD-GROUP] Starting handleAddGroup:', {
      roundNumber,
      newGroupStitches: newGroupStitches.length,
      newGroupStitchesData: newGroupStitches
    })

    if (newGroupStitches.length === 0) {
      alert('請先新增群組中的針法')
      return
    }

    if (isLoading) {
      console.log('[UI-ADD-GROUP] Already loading, returning')
      return
    }

    setIsLoading(true)

    const newGroup: StitchGroup = {
      id: generateId(),
      name: newGroupName.trim() || '針目群組',
      stitches: [...newGroupStitches],
      repeatCount: ensureNumber(newGroupRepeatCount)
    }

    console.log('[UI-ADD-GROUP] Created new group:', newGroup)

    try {
      console.log('[UI-ADD-GROUP] About to add stitch group to round')
      
      if (currentChart) {
        // 多織圖模式：更新織圖
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) => 
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        // 舊格式模式
        await addStitchGroupToRound(roundNumber, newGroup)
      }
      
      console.log('[UI-ADD-GROUP] Successfully added group')
      
      // 延遲檢查更新後的狀態，確保狀態已更新
      setTimeout(() => {
        const pattern = currentChart ? currentChart.rounds : getProjectPattern(currentProject)
        const updatedRound = pattern.find((r: Round) => r.roundNumber === roundNumber)
        console.log('[UI-ADD-GROUP] Updated round after addition:', {
          roundNumber,
          stitchGroups: updatedRound?.stitchGroups?.length,
          patternItems: updatedRound?.patternItems?.length,
          sortedPatternItems: updatedRound ? getSortedPatternItems(updatedRound).length : null
        })
      }, 100)

      // 成功後才重置表單狀態
      setNewGroupName('')
      setNewGroupRepeatCount(1)
      setNewGroupStitches([])
      setShowAddGroupModal(null)
      
      // 顯示成功提示
      alert('群組新增成功！')
      
    } catch (error) {
      console.error('[UI-ADD-GROUP] Error adding group:', error)
      alert('新增群組失敗，請重試')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGroupStitchModalConfirm = (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    const newStitch: StitchInfo = {
      id: generateId(),
      type: stitchType,
      yarnId: yarnId || currentProject?.yarns[0]?.id || '',
      count: count,
      ...(stitchType === StitchType.CUSTOM && {
        customName,
        customSymbol
      })
    }

    setNewGroupStitches([...newGroupStitches, newStitch])
    setShowGroupStitchModal(false) // 關閉 modal
  }

  const handleEditNewGroupStitchModalConfirm = (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!showEditNewGroupStitchModal) return

    const { stitchId } = showEditNewGroupStitchModal
    const updatedStitch: StitchInfo = {
      id: stitchId,
      type: stitchType,
      yarnId: yarnId || currentProject?.yarns[0]?.id || '',
      count: count,
      ...(stitchType === StitchType.CUSTOM && {
        customName,
        customSymbol
      })
    }

    setNewGroupStitches(newGroupStitches.map(stitch => 
      stitch.id === stitchId ? updatedStitch : stitch
    ))
    setShowEditNewGroupStitchModal(null) // 關閉 modal
  }

  const handleEditGroupStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!showEditGroupStitchModal) return

    const { roundNumber, groupId } = showEditGroupStitchModal
    const pattern = getProjectPattern(currentProject)
    const round = pattern.find(r => r.roundNumber === roundNumber)
    const group = round?.stitchGroups.find(g => g.id === groupId)
    
    if (group) {
      const newStitch: StitchInfo = {
        id: generateId(),
        type: stitchType,
        yarnId: yarnId || currentProject?.yarns[0]?.id || '',
        count: count,
        ...(stitchType === StitchType.CUSTOM && {
          customName,
          customSymbol
        })
      }

      const updatedGroup = {
        ...group,
        stitches: [...group.stitches, newStitch]
      }
      
      await updateStitchGroupInRound(roundNumber, groupId, updatedGroup)
      setShowEditGroupStitchModal(null) // 關閉 modal
    }
  }

  const handleRemoveStitchFromGroup = (stitchId: string) => {
    setNewGroupStitches(newGroupStitches.filter(s => s.id !== stitchId))
  }

  const handleUpdateRoundNotes = async (round: Round, notes: string) => {
    const updatedRound = { ...round, notes: notes.trim() || undefined }
    await updateRound(updatedRound)
    setEditingRound(null)
  }

  const handleEditStitch = (roundNumber: number, stitch: StitchInfo) => {
    setEditingStitch({ roundNumber, stitchId: stitch.id })
    setEditStitchType(stitch.type)
    setEditStitchCount(stitch.count)
  }

  const handleUpdateStitch = async (roundNumber: number, stitchId: string) => {
    // 獲取原始針法資料
    const pattern = getProjectPattern(currentProject)
    const round = pattern.find(r => r.roundNumber === roundNumber)
    const originalStitch = round?.stitches.find(s => s.id === stitchId)
    
    const updatedStitch: StitchInfo = {
      id: stitchId,
      type: editStitchType,
      yarnId: originalStitch?.yarnId || currentProject!.yarns[0]?.id || '',
      count: ensureNumber(editStitchCount),
      // 保留原有的自定義針法屬性，或者如果針法類型變更則清除
      ...(editStitchType === StitchType.CUSTOM 
        ? {
            customName: originalStitch?.customName || '',
            customSymbol: originalStitch?.customSymbol || ''
          }
        : {})
    }

    await updateStitchInRound(roundNumber, stitchId, updatedStitch)
    setEditingStitch(null)
  }

  const handleDeleteStitch = async (roundNumber: number, stitchId: string) => {
    if (confirm('確定要刪除這個針法嗎？')) {
      await deleteStitchFromRound(roundNumber, stitchId)
    }
  }

  const handleEditGroup = (roundNumber: number, group: StitchGroup) => {
    setEditingGroup({ roundNumber, groupId: group.id })
    setEditGroupName(group.name)
    setEditGroupRepeatCount(group.repeatCount)
  }

  const handleUpdateGroup = async (roundNumber: number, groupId: string, originalGroup: StitchGroup) => {
    const updatedGroup: StitchGroup = {
      ...originalGroup,
      name: editGroupName.trim() || '針目群組',
      repeatCount: ensureNumber(editGroupRepeatCount)
    }

    await updateStitchGroupInRound(roundNumber, groupId, updatedGroup)
    setEditingGroup(null)
  }

  const handleDeleteGroup = async (roundNumber: number, groupId: string) => {
    if (confirm('確定要刪除這個針目群組嗎？')) {
      await deleteStitchGroupFromRound(roundNumber, groupId)
    }
  }

  const handleEditGroupStitch = (roundNumber: number, groupId: string, stitch: StitchInfo) => {
    setEditingGroupStitch({ roundNumber, groupId, stitchId: stitch.id })
    setEditGroupStitchType(stitch.type)
    setEditGroupStitchCount(stitch.count)
  }

  const handleUpdateGroupStitch = async (roundNumber: number, groupId: string, stitchId: string) => {
    // 獲取原始針法資料
    const pattern = getProjectPattern(currentProject)
    const round = pattern.find(r => r.roundNumber === roundNumber)
    const group = round?.stitchGroups.find(g => g.id === groupId)
    const originalStitch = group?.stitches.find(s => s.id === stitchId)
    
    const updatedStitch: StitchInfo = {
      id: stitchId,
      type: editGroupStitchType,
      yarnId: originalStitch?.yarnId || currentProject!.yarns[0]?.id || '',
      count: ensureNumber(editGroupStitchCount),
      // 保留原有的自定義針法屬性，或者如果針法類型變更則清除
      ...(editGroupStitchType === StitchType.CUSTOM 
        ? {
            customName: originalStitch?.customName || '',
            customSymbol: originalStitch?.customSymbol || ''
          }
        : {})
    }

    await updateStitchInGroup(roundNumber, groupId, stitchId, updatedStitch)
    setEditingGroupStitch(null)
  }

  const handleDeleteGroupStitch = async (roundNumber: number, groupId: string, stitchId: string) => {
    if (confirm('確定要刪除這個針法嗎？')) {
      const pattern = getProjectPattern(currentProject)
      const round = pattern.find(r => r.roundNumber === roundNumber)
      const group = round?.stitchGroups.find(g => g.id === groupId)
      
      if (group) {
        const updatedGroup = {
          ...group,
          stitches: group.stitches.filter(s => s.id !== stitchId)
        }
        await updateStitchGroupInRound(roundNumber, groupId, updatedGroup)
      }
    }
  }

  const handleDragStart = (_e: React.DragEvent, index: number, roundNumber: number) => {
    console.log('[DRAG] Starting drag for PatternItem:', { index, roundNumber })
    setDraggedItem({ index, roundNumber })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number, roundNumber: number) => {
    e.preventDefault()
    
    if (draggedItem && draggedItem.roundNumber === roundNumber) {
      console.log('[DRAG] Dropping PatternItem:', {
        fromIndex: draggedItem.index,
        toIndex: targetIndex,
        roundNumber
      })
      
      if (draggedItem.index !== targetIndex) {
        await reorderPatternItemsInRound(roundNumber, draggedItem.index, targetIndex)
      }
      setDraggedItem(null)
    } else {
      console.log('[DRAG] Invalid drop - different rounds or no dragged item')
    }
  }

  // 編輯織圖資訊處理函數
  const handleOpenEditChartModal = () => {
    if (!currentChart) return
    setEditChartName(currentChart.name)
    setEditChartDescription(currentChart.description || '')
    setEditChartNotes(currentChart.notes || '')
    setShowEditChartModal(true)
  }

  const handleUpdateChart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChart || !editChartName.trim()) return

    const updatedChart = {
      ...currentChart,
      name: editChartName.trim(),
      description: editChartDescription.trim() || undefined,
      notes: editChartNotes.trim() || undefined,
      lastModified: new Date()
    }

    await updateChart(updatedChart)
    setShowEditChartModal(false)
  }

  // 範本管理處理函數
  const handleSaveAsTemplate = (group: StitchGroup) => {
    setShowTemplateModal({ mode: 'save', group })
  }

  const handleSelectFromTemplate = (roundNumber: number) => {
    setShowTemplateModal({ mode: 'select', roundNumber })
  }

  const handleTemplateSelect = async (template: any) => {
    if (showAddGroupModal) {
      // 如果是在新增群組模態視窗中，載入範本內容到當前編輯的群組
      console.log('[TEMPLATE] Loading template in add group modal:', template)
      const templateGroup = createStitchGroupFromTemplate(template.id)
      if (templateGroup) {
        console.log('[TEMPLATE] Loaded template group:', templateGroup)
        
        // 如果是第一次載入範本（沒有現有針法），設定群組名稱
        if (newGroupStitches.length === 0) {
          setNewGroupName(templateGroup.name)
        }
        
        // 重複次數固定設為1，讓用戶自己調整
        setNewGroupRepeatCount(1)
        
        // 將範本的針法加到現有針法列表後面（append），而不是取代
        setNewGroupStitches(prevStitches => [...prevStitches, ...templateGroup.stitches])
      }
    } else if (showTemplateModal?.roundNumber) {
      // 如果是在圈數中直接使用範本，直接新增群組
      const newGroup = createStitchGroupFromTemplate(template.id)
      if (newGroup) {
        console.log('[TEMPLATE] Adding template group to round:', newGroup)
        
        if (currentChart) {
          // 多織圖模式：更新織圖
          const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === showTemplateModal.roundNumber)
          if (targetRound) {
            const updatedRound = {
              ...targetRound,
              stitchGroups: [...targetRound.stitchGroups, newGroup]
            }
            const updatedChart = {
              ...currentChart,
              rounds: currentChart.rounds.map((r: Round) => 
                r.roundNumber === showTemplateModal.roundNumber ? updatedRound : r
              ),
              lastModified: new Date()
            }
            await updateChart(updatedChart)
          }
        } else {
          // 舊格式模式
          await addStitchGroupToRound(showTemplateModal.roundNumber, newGroup)
        }
      }
    }
    setShowTemplateModal(null)
  }

  // 複製圈數處理函數
  const handleCopyRound = (roundNumber: number) => {
    const pattern = getProjectPattern(currentProject)
    const sourceRound = pattern.find(r => r.roundNumber === roundNumber)
    if (sourceRound) {
      setShowCopyRoundModal({ sourceRound })
    }
  }

  const handleCopyRoundConfirm = async (targetRoundNumber: number, insertPosition: 'before' | 'after') => {
    if (showCopyRoundModal?.sourceRound) {
      await copyRound(showCopyRoundModal.sourceRound.roundNumber, targetRoundNumber, insertPosition)
      setShowCopyRoundModal(null)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border sticky top-0 z-10">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={`/project/${projectId}`}
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
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-semibold text-text-primary">織圖編輯</h1>
                {currentChart && (
                  <span className="text-xs sm:text-sm text-text-secondary">
                    {currentChart.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddRoundForm(true)}
                className="btn btn-primary text-sm"
                disabled={isLoading}
              >
                {isLoading ? '處理中...' : '新增圈數'}
              </button>
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 織圖預覽 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-text-primary">
                {currentChart ? currentChart.name : '織圖預覽'}
              </h2>
              {currentChart && (currentChart.description || currentChart.notes) && (
                <div className="mt-2 space-y-1">
                  {currentChart.description && (
                    <p className="text-sm text-text-secondary">{currentChart.description}</p>
                  )}
                  {currentChart.notes && (
                    <p className="text-xs text-text-tertiary whitespace-pre-wrap">{currentChart.notes}</p>
                  )}
                </div>
              )}
            </div>
            {currentChart && (
              <button
                onClick={handleOpenEditChartModal}
                className="ml-4 text-text-secondary hover:text-text-primary p-2 transition-colors"
                title="編輯織圖資訊"
              >
                <FiEdit3 className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {chartPattern.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-3 flex justify-center">
                <FiEdit3 className="w-8 h-8 text-text-tertiary" />
              </div>
              <p className="text-text-tertiary mb-3">尚未建立織圖</p>
              <button
                onClick={() => setShowAddRoundForm(true)}
                className="text-primary hover:underline text-sm"
              >
                點擊這裡開始編輯織圖
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 織圖列表 */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {chartPattern.map((round) => {
                  const roundStitches = getRoundTotalStitches(round)
                  const roundDescription = currentProject ? describeRound(round, currentProject.yarns) : '載入中...'
                  
                  return (
                    <div key={round.id} className="flex gap-3 p-3 bg-background-secondary rounded-lg">
                      <div className="text-sm font-semibold flex-shrink-0 leading-relaxed" style={{ color: '#d96699' }}>
                        R{round.roundNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium text-sm leading-relaxed m-0">
                          {roundDescription}
                        </p>
                        {round.notes && (
                          <p className="text-xs text-text-tertiary mt-1">
                            {round.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-text-primary leading-relaxed m-0">
                          {roundStitches} 針
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 總計資訊 */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="grid grid-cols-3 gap-4 text-sm w-full">
                  <div>
                    <span className="text-text-secondary">總圈數: </span>
                    <span className="font-medium text-text-primary">{chartPattern.length}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">總針數: </span>
                    <span className="font-medium text-text-primary">
                      {chartPattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">使用毛線: </span>
                    <span className="font-medium text-text-primary">{currentProject?.yarns.length || 0} 種</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 圈數列表 */}
        {chartPattern.length === 0 ? (
          <div className="card text-center py-12">
            <div className="mb-4 flex justify-center">
              <FiEdit3 className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              還沒有織圖圈數
            </h3>
            <p className="text-text-secondary mb-6">
              開始建立你的第一個圈數
            </p>
            <button
              onClick={() => setShowAddRoundForm(true)}
              className="btn btn-primary"
            >
              新增第一圈
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {chartPattern
              .sort((a, b) => a.roundNumber - b.roundNumber)
              .map((round) => (
              <div key={round.id} className="card" data-round-card={round.roundNumber}>
                <div className="mb-4">
                  {/* 手機版：兩行佈局 */}
                  <div className="block sm:hidden">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">
                        第 {round.roundNumber} 圈
                      </h3>
                      <button
                        onClick={() => handleDeleteRound(round.roundNumber)}
                        className="text-text-tertiary hover:text-red-500 transition-colors p-2"
                      >
                        <BsTrash className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <button
                        onClick={() => setShowStitchModal({ roundNumber: round.roundNumber, mode: 'add' })}
                        className="btn btn-ghost p-2 h-auto flex flex-col items-center"
                      >
                        <span className="font-medium text-sm">新增針目</span>
                      </button>
                      <button
                        onClick={() => setShowAddGroupModal({ roundNumber: round.roundNumber })}
                        className="btn btn-ghost p-2 h-auto flex flex-col items-center"
                      >
                        <span className="font-medium text-sm">新增群組</span>
                      </button>
                      <button
                        onClick={() => handleCopyRound(round.roundNumber)}
                        className="btn btn-ghost p-2 h-auto flex flex-col items-center"
                      >
                        <span className="font-medium text-sm">複製圈數</span>
                      </button>
                    </div>
                  </div>

                  {/* 電腦版：原本佈局 */}
                  <div className="hidden sm:flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        第 {round.roundNumber} 圈
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowStitchModal({ roundNumber: round.roundNumber, mode: 'add' })}
                        className="btn btn-ghost text-sm"
                      >
                        新增針法
                      </button>
                      <button
                        onClick={() => setShowAddGroupModal({ roundNumber: round.roundNumber })}
                        className="btn btn-ghost text-sm"
                      >
                        新增群組
                      </button>
                      <button
                        onClick={() => handleCopyRound(round.roundNumber)}
                        className="btn btn-ghost text-sm"
                      >
                        複製圈數
                      </button>
                      <button
                        onClick={() => handleDeleteRound(round.roundNumber)}
                        className="text-text-tertiary hover:text-red-500 transition-colors p-2"
                      >
                        <BsTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 圈數備註 */}
                {editingRound?.id === round.id ? (
                  <div className="mb-4">
                    <input
                      type="text"
                      defaultValue={round.notes || ''}
                      className="input text-sm"
                      placeholder="輸入備註..."
                      onBlur={(e) => handleUpdateRoundNotes(round, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateRoundNotes(round, e.currentTarget.value)
                        }
                        if (e.key === 'Escape') {
                          setEditingRound(null)
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    {round.notes ? (
                      <div 
                        className="text-sm text-text-secondary cursor-pointer hover:text-text-primary"
                        onClick={() => setEditingRound(round)}
                      >
                        備註：{round.notes}
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary"
                        onClick={() => setEditingRound(round)}
                      >
                        點擊新增備註...
                      </div>
                    )}
                  </div>
                )}

                {/* 織圖內容 - 按照新增順序顯示針法和群組 */}
                {getSortedPatternItems(round).length > 0 && (
                  <div className="mb-4">
                    <div className="space-y-2">
                      {getSortedPatternItems(round).map((patternItem, index) => (
                        patternItem.type === PatternItemType.STITCH ? (
                          // 針法顯示
                          <div 
                            key={patternItem.id} 
                            className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded cursor-move"
                            draggable
                            onDragStart={(e) => handleDragStart(e, index, round.roundNumber)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, round.roundNumber)}
                          >
                            {/* 針目圖標 - 固定寬度40px，居中對齊 */}
                            <div className="text-lg flex items-center justify-center">
                              {getStitchDisplayInfo(patternItem.data as StitchInfo).symbol}
                            </div>
                            
                            {/* 針目資訊 - 彈性寬度 */}
                            <div className="min-w-0">
                              {editingStitch?.stitchId === (patternItem.data as StitchInfo).id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editStitchType}
                                    onChange={(e) => setEditStitchType(e.target.value as StitchType)}
                                    className="input text-sm flex-1"
                                  >
                                    {Object.entries(StitchTypeInfo).map(([key, info]) => (
                                      <option key={key} value={key}>
                                        {info.symbol} {info.rawValue}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min="1"
                                    value={editStitchCount}
                                    {...handleNumberInputChange(setEditStitchCount)}
                                    className="input text-sm w-16"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-text-primary">
                                    {getStitchDisplayInfo(patternItem.data as StitchInfo).rawValue}
                                  </span>
                                  <span className="text-sm text-text-secondary">
                                    ×{(patternItem.data as StitchInfo).count}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* 操作按鈕 - 固定寬度100px，右對齊 */}
                            <div className="flex items-center justify-end gap-1">
                              {editingStitch?.stitchId === (patternItem.data as StitchInfo).id ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateStitch(round.roundNumber, (patternItem.data as StitchInfo).id)}
                                    className="text-green-500 hover:text-green-600 p-1 w-8 h-8 flex items-center justify-center"
                                  >
                                    <CiCircleCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingStitch(null)}
                                    className="text-text-tertiary hover:text-text-secondary p-1 w-8 h-8 flex items-center justify-center"
                                  >
                                    <RxCrossCircled className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditStitch(round.roundNumber, patternItem.data as StitchInfo)}
                                    className="text-text-tertiary hover:text-primary p-1 w-8 h-8 flex items-center justify-center"
                                  >
                                    <VscEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStitch(round.roundNumber, (patternItem.data as StitchInfo).id)}
                                    className="text-text-tertiary hover:text-red-500 p-1 w-8 h-8 flex items-center justify-center"
                                  >
                                    <BsTrash className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          // 群組顯示  
                          <div 
                            key={patternItem.id} 
                            className="border border-border rounded-lg p-3 cursor-move"
                            data-group-id={(patternItem.data as StitchGroup).id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index, round.roundNumber)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, round.roundNumber)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              {editingGroup?.groupId === (patternItem.data as StitchGroup).id ? (
                                <div className="w-full">
                                  <div className="flex items-center gap-2 flex-1 mb-3">
                                    <input
                                      type="text"
                                      value={editGroupName}
                                      onChange={(e) => setEditGroupName(e.target.value)}
                                      className="input text-sm flex-1"
                                      placeholder="群組名稱"
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      value={editGroupRepeatCount}
                                      {...handleNumberInputChange(setEditGroupRepeatCount)}
                                      className="input text-sm w-20"
                                    />
                                    <span className="text-sm text-text-secondary">次</span>
                                    <button
                                      onClick={() => handleUpdateGroup(round.roundNumber, (patternItem.data as StitchGroup).id, patternItem.data as StitchGroup)}
                                      className="text-green-500 hover:text-green-600 p-2"
                                    >
                                      <CiCircleCheck className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingGroup(null)}
                                      className="text-text-tertiary hover:text-text-secondary p-2"
                                    >
                                      <RxCrossCircled className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">群組針法</span>
                                    <button
                                      onClick={() => setShowEditGroupStitchModal({ roundNumber: round.roundNumber, groupId: (patternItem.data as StitchGroup).id })}
                                      className="btn btn-ghost text-xs px-2 py-1"
                                    >
                                      新增針法
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-medium text-text-primary">
                                    {(patternItem.data as StitchGroup).name}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEditGroup(round.roundNumber, patternItem.data as StitchGroup)}
                                      className="text-text-tertiary hover:text-primary p-2"
                                    >
                                      <VscEdit className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGroup(round.roundNumber, (patternItem.data as StitchGroup).id)}
                                      className="text-text-tertiary hover:text-red-500 p-2"
                                    >
                                      <BsTrash className="w-5 h-5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="space-y-2">
                              {(patternItem.data as StitchGroup).stitches.map((stitch) => (
                                <div key={stitch.id} className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded ml-4">
                                  {/* 針目圖標 - 固定寬度40px，居中對齊 */}
                                  <div className="text-lg flex items-center justify-center">
                                    {getStitchDisplayInfo(stitch).symbol}
                                  </div>
                                  
                                  {/* 針目資訊 - 彈性寬度 */}
                                  <div className="min-w-0">
                                    {editingGroupStitch?.stitchId === stitch.id && editingGroupStitch?.groupId === (patternItem.data as StitchGroup).id ? (
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={editGroupStitchType}
                                          onChange={(e) => setEditGroupStitchType(e.target.value as StitchType)}
                                          className="input text-sm flex-1"
                                        >
                                          {Object.entries(StitchTypeInfo).map(([key, info]) => (
                                            <option key={key} value={key}>
                                              {info.symbol} {info.rawValue}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="number"
                                          min="1"
                                          value={editGroupStitchCount}
                                          {...handleNumberInputChange(setEditGroupStitchCount)}
                                          className="input text-sm w-16"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-text-primary">
                                          {getStitchDisplayInfo(stitch).rawValue}
                                        </span>
                                        <span className="text-sm text-text-secondary">
                                          ×{stitch.count}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* 操作按鈕 - 固定寬度100px，右對齊 */}
                                  <div className="flex items-center justify-end gap-1">
                                    {editingGroupStitch?.stitchId === stitch.id && editingGroupStitch?.groupId === (patternItem.data as StitchGroup).id ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateGroupStitch(round.roundNumber, (patternItem.data as StitchGroup).id, stitch.id)}
                                          className="text-green-500 hover:text-green-600 p-1 w-8 h-8 flex items-center justify-center"
                                        >
                                          <CiCircleCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setEditingGroupStitch(null)}
                                          className="text-text-tertiary hover:text-text-secondary p-1 w-8 h-8 flex items-center justify-center"
                                        >
                                          <RxCrossCircled className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEditGroupStitch(round.roundNumber, (patternItem.data as StitchGroup).id, stitch)}
                                          className="text-text-tertiary hover:text-primary p-1 w-8 h-8 flex items-center justify-center"
                                        >
                                          <VscEdit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteGroupStitch(round.roundNumber, (patternItem.data as StitchGroup).id, stitch.id)}
                                          className="text-text-tertiary hover:text-red-500 p-1 w-8 h-8 flex items-center justify-center"
                                        >
                                          <BsTrash className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* 範本按鈕和針數統計 - 獨立一行 */}
                            {!editingGroup?.groupId && (
                              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                                {/* <button
                                  onClick={() => handleSaveAsTemplate(patternItem.data as StitchGroup)}
                                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                                  title="存成範本"
                                >
                                  存成範本
                                </button> */}
                                <div className="text-sm text-text-secondary">
                                  重複 {(patternItem.data as StitchGroup).repeatCount} 次 (共 {getStitchGroupTotalStitches(patternItem.data as StitchGroup)} 針)
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                    <div className="mb-4 mt-4">
                      <div className="text-sm text-text-primary">
                        共 {getRoundTotalStitches(round)} 針
                      </div>
                    </div>
                  </div>
                )}

                {/* 舊版針法顯示 (保留作為備用) */}
                {getSortedPatternItems(round).length === 0 && round.stitches.length > 0 && (
                  <div className="mb-4">
                    <div className="space-y-2">
                      {round.stitches.map((stitch, index) => (
                        <div 
                          key={stitch.id} 
                          className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded cursor-move"
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, round.roundNumber)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index, round.roundNumber)}
                        >
                          {/* 針目圖標 - 固定寬度40px，居中對齊 */}
                          <div className="text-lg flex items-center justify-center">
                            {getStitchDisplayInfo(stitch).symbol}
                          </div>
                          
                          {/* 針目資訊 - 彈性寬度 */}
                          <div className="min-w-0">
                            {editingStitch?.stitchId === stitch.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={editStitchType}
                                  onChange={(e) => setEditStitchType(e.target.value as StitchType)}
                                  className="input text-sm flex-1"
                                >
                                  {Object.entries(StitchTypeInfo).map(([key, info]) => (
                                    <option key={key} value={key}>
                                      {info.symbol} {info.rawValue}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  value={editStitchCount}
                                  {...handleNumberInputChange(setEditStitchCount)}
                                  className="input text-sm w-16"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">
                                  {getStitchDisplayInfo(stitch).rawValue}
                                </span>
                                <span className="text-sm text-text-secondary">
                                  ×{stitch.count}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* 操作按鈕 - 固定寬度100px，右對齊 */}
                          <div className="flex items-center justify-end gap-1">
                            {editingStitch?.stitchId === stitch.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateStitch(round.roundNumber, stitch.id)}
                                  className="text-green-500 hover:text-green-600 p-1 w-8 h-8 flex items-center justify-center"
                                >
                                  <CiCircleCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingStitch(null)}
                                  className="text-text-tertiary hover:text-text-secondary p-1 w-8 h-8 flex items-center justify-center"
                                >
                                  <RxCrossCircled className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditStitch(round.roundNumber, stitch)}
                                  className="text-text-tertiary hover:text-primary p-1 w-8 h-8 flex items-center justify-center"
                                >
                                  <VscEdit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStitch(round.roundNumber, stitch.id)}
                                  className="text-text-tertiary hover:text-red-500 p-1 w-8 h-8 flex items-center justify-center"
                                >
                                  <BsTrash className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 舊版針目群組顯示 (保留作為備用) */}
                {getSortedPatternItems(round).length === 0 && round.stitchGroups.length > 0 && (
                  <div className="mb-4">
                    <div className="space-y-3">
                      {round.stitchGroups.map((group, index) => (
                        <div 
                          key={group.id} 
                          className="border border-border rounded-lg p-3 cursor-move"
                          data-group-id={group.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, round.roundNumber)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index, round.roundNumber)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {editingGroup?.groupId === group.id ? (
                              <div className="w-full">
                                <div className="flex items-center gap-2 flex-1 mb-3">
                                  <input
                                    type="text"
                                    value={editGroupName}
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                    className="input text-sm flex-1"
                                    placeholder="群組名稱"
                                  />
                                  <input
                                    type="number"
                                    min="1"
                                    value={editGroupRepeatCount}
                                    {...handleNumberInputChange(setEditGroupRepeatCount)}
                                    className="input text-sm w-20"
                                  />
                                  <span className="text-sm text-text-secondary">次</span>
                                  <button
                                    onClick={() => handleUpdateGroup(round.roundNumber, group.id, group)}
                                    className="text-green-500 hover:text-green-600 p-2"
                                  >
                                    <CiCircleCheck className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingGroup(null)}
                                    className="text-text-tertiary hover:text-text-secondary p-2"
                                  >
                                    <RxCrossCircled className="w-5 h-5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-text-secondary">群組針法</span>
                                  <button
                                    onClick={() => setShowEditGroupStitchModal({ roundNumber: round.roundNumber, groupId: group.id })}
                                    className="btn btn-ghost text-xs px-2 py-1"
                                  >
                                    新增針法
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-medium text-text-primary">
                                  {group.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditGroup(round.roundNumber, group)}
                                    className="text-text-tertiary hover:text-primary p-2"
                                  >
                                    <VscEdit className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGroup(round.roundNumber, group.id)}
                                    className="text-text-tertiary hover:text-red-500 p-2"
                                  >
                                    <BsTrash className="w-5 h-5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="space-y-2">
                            {group.stitches.map((stitch) => (
                              <div key={stitch.id} className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-tertiary rounded ml-4">
                                {/* 針目圖標 - 固定寬度40px，居中對齊 */}
                                <div className="text-lg flex items-center justify-center">
                                  {getStitchDisplayInfo(stitch).symbol}
                                </div>
                                
                                {/* 針目資訊 - 彈性寬度 */}
                                <div className="min-w-0">
                                  {editingGroupStitch?.stitchId === stitch.id && editingGroupStitch?.groupId === group.id ? (
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={editGroupStitchType}
                                        onChange={(e) => setEditGroupStitchType(e.target.value as StitchType)}
                                        className="input text-sm flex-1"
                                      >
                                        {Object.entries(StitchTypeInfo).map(([key, info]) => (
                                          <option key={key} value={key}>
                                            {info.symbol} {info.rawValue}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        min="1"
                                        value={editGroupStitchCount}
                                        {...handleNumberInputChange(setEditGroupStitchCount)}
                                        className="input text-sm w-16"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-text-primary">
                                        {getStitchDisplayInfo(stitch).rawValue}
                                      </span>
                                      <span className="text-sm text-text-secondary">
                                        ×{stitch.count}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* 操作按鈕 - 固定寬度100px，右對齊 */}
                                <div className="flex items-center justify-end gap-1">
                                  {editingGroupStitch?.stitchId === stitch.id && editingGroupStitch?.groupId === group.id ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateGroupStitch(round.roundNumber, group.id, stitch.id)}
                                        className="text-green-500 hover:text-green-600 p-1 w-8 h-8 flex items-center justify-center"
                                      >
                                        <CiCircleCheck className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingGroupStitch(null)}
                                        className="text-text-tertiary hover:text-text-secondary p-1 w-8 h-8 flex items-center justify-center"
                                      >
                                        <RxCrossCircled className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditGroupStitch(round.roundNumber, group.id, stitch)}
                                        className="text-text-tertiary hover:text-primary p-1 w-8 h-8 flex items-center justify-center"
                                      >
                                        <VscEdit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteGroupStitch(round.roundNumber, group.id, stitch.id)}
                                        className="text-text-tertiary hover:text-red-500 p-1 w-8 h-8 flex items-center justify-center"
                                      >
                                        <BsTrash className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* 範本按鈕和針數統計 - 獨立一行 */}
                          {!editingGroup?.groupId && (
                            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                              <button
                                onClick={() => handleSaveAsTemplate(group)}
                                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                                title="存成範本"
                              >
                                存成範本
                              </button>
                              <div className="text-sm text-text-secondary">
                                重複 {group.repeatCount} 次 (共 {getStitchGroupTotalStitches(group)} 針)
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增圈數彈窗 */}
      {showAddRoundForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              新增圈數
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                備註（選填）
              </label>
              <input
                type="text"
                value={newRoundNotes}
                onChange={(e) => setNewRoundNotes(e.target.value)}
                className="input"
                placeholder="輸入備註..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddRoundForm(false)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAddRound}
                className="btn btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? '新增中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 針法選擇彈窗 */}
      <StitchSelectionModal
        isOpen={showStitchModal !== null}
        onClose={() => setShowStitchModal(null)}
        onConfirm={handleStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="新增針法"
      />

      {/* 群組針法選擇彈窗 */}
      <StitchSelectionModal
        isOpen={showGroupStitchModal}
        onClose={() => setShowGroupStitchModal(false)}
        onConfirm={handleGroupStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="新增群組針法"
      />

      {/* 編輯群組時新增針法選擇彈窗 */}
      <StitchSelectionModal
        isOpen={showEditGroupStitchModal !== null}
        onClose={() => setShowEditGroupStitchModal(null)}
        onConfirm={handleEditGroupStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="新增針法到群組"
      />

      {/* 編輯新增群組中針法選擇彈窗 */}
      <StitchSelectionModal
        isOpen={showEditNewGroupStitchModal !== null}
        onClose={() => setShowEditNewGroupStitchModal(null)}
        onConfirm={handleEditNewGroupStitchModalConfirm}
        availableYarns={currentProject?.yarns || []}
        title="編輯群組針法"
        initialStitch={showEditNewGroupStitchModal ? newGroupStitches.find(s => s.id === showEditNewGroupStitchModal.stitchId) : undefined}
      />

      {/* 範本管理模態 */}
      <StitchGroupTemplateModal
        isOpen={showTemplateModal !== null}
        onClose={() => setShowTemplateModal(null)}
        onSelectTemplate={handleTemplateSelect}
        groupToSave={showTemplateModal?.group}
        mode={showTemplateModal?.mode || 'select'}
        title={showTemplateModal?.mode === 'save' ? '存為範本' : '選擇範本'}
      />

      {/* 新增群組模態視窗 */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-primary rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              新增針目群組
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  群組名稱
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="input"
                  placeholder="針目群組"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  重複次數
                </label>
                <input
                  type="number"
                  min="1"
                  value={newGroupRepeatCount}
                  {...handleNumberInputChange(setNewGroupRepeatCount)}
                  className="input"
                />
              </div>
            </div>

            {/* 群組中的針法 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-secondary">
                  群組針法
                </label>
              </div>
              
              <div className="space-y-2 mb-4">
                {newGroupStitches.map((stitch) => (
                  <div key={stitch.id} className="grid grid-cols-[40px_1fr_100px] items-center gap-3 p-2 bg-background-secondary rounded">
                    {/* 針目圖標 - 固定寬度40px，居中對齊 */}
                    <div className="text-lg flex items-center justify-center">
                      {getStitchDisplayInfo(stitch).symbol}
                    </div>
                    
                    {/* 針目資訊 - 彈性寬度 */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {getStitchDisplayInfo(stitch).rawValue}
                        </span>
                        <span className="text-sm text-text-secondary">
                          ×{stitch.count}
                        </span>
                      </div>
                    </div>
                    
                    {/* 編輯和刪除按鈕 - 固定寬度100px，右對齊 */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShowEditNewGroupStitchModal({ stitchId: stitch.id })}
                        className="text-text-tertiary hover:text-primary transition-colors p-1 w-8 h-8 flex items-center justify-center"
                      >
                        <VscEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveStitchFromGroup(stitch.id)}
                        className="text-text-tertiary hover:text-red-500 transition-colors p-1 w-8 h-8 flex items-center justify-center"
                      >
                        <BsTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setShowGroupStitchModal(true)}
                  className="btn btn-secondary text-sm"
                >
                  新增針法
                </button>
                <button
                  onClick={() => showAddGroupModal && handleSelectFromTemplate(showAddGroupModal.roundNumber)}
                  className="btn btn-secondary text-sm"
                >
                  從範本複製
                </button>
                <button
                  onClick={() => {
                    if (newGroupStitches.length > 0) {
                      const tempGroup = {
                        id: 'temp',
                        name: newGroupName || '針目群組',
                        stitches: newGroupStitches,
                        repeatCount: typeof newGroupRepeatCount === 'number' ? newGroupRepeatCount : parseInt(newGroupRepeatCount) || 1
                      }
                      setShowTemplateModal({ mode: 'save', group: tempGroup })
                    }
                  }}
                  className="btn btn-secondary text-sm"
                  disabled={newGroupStitches.length === 0}
                >
                  存成範本
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddGroupModal(null)
                  setNewGroupStitches([])
                  setNewGroupName('')
                  setNewGroupRepeatCount(1)
                }}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAddGroup}
                className="btn btn-primary flex-1"
                disabled={newGroupStitches.length === 0}
              >
                新增群組
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯織圖資訊模態 */}
      {showEditChartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-primary rounded-lg shadow-lg w-full max-w-md">
            <form onSubmit={handleUpdateChart} className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">編輯織圖資訊</h3>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  織圖名稱
                </label>
                <input
                  type="text"
                  value={editChartName}
                  onChange={(e) => setEditChartName(e.target.value)}
                  className="input"
                  placeholder="織圖名稱"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  描述（選填）
                </label>
                <input
                  type="text"
                  value={editChartDescription}
                  onChange={(e) => setEditChartDescription(e.target.value)}
                  className="input"
                  placeholder="織圖的簡短描述"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  備註（選填）
                </label>
                <textarea
                  value={editChartNotes}
                  onChange={(e) => setEditChartNotes(e.target.value)}
                  className="input min-h-[80px] resize-y"
                  placeholder="織圖的詳細備註"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditChartModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 複製圈數位置選擇模態 */}
      <CopyRoundModal
        isOpen={showCopyRoundModal !== null}
        onClose={() => setShowCopyRoundModal(null)}
        onConfirm={handleCopyRoundConfirm}
        sourceRound={showCopyRoundModal?.sourceRound || null}
        allRounds={getProjectPattern(currentProject)}
      />
    </div>
  )
}