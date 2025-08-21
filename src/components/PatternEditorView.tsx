import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
// import { FaRegEdit } from 'react-icons/fa'
import { FiEdit3 } from "react-icons/fi"
import { VscEdit } from 'react-icons/vsc'
import { BsTrash } from 'react-icons/bs'
import { CiCircleCheck } from 'react-icons/ci'
import { RxCrossCircled } from 'react-icons/rx'
import { useSyncedAppStore } from '../store/syncedAppStore'
import SyncStatusIndicator from './SyncStatusIndicator'
import StitchSelectionModal from './StitchSelectionModal'
import { 
  generateId,
  getRoundTotalStitches,
  getStitchGroupTotalStitches,
  getSortedPatternItems,
  getStitchDisplayInfo
} from '../utils'
import { Round, StitchInfo, StitchGroup, StitchType, StitchTypeInfo, PatternItemType } from '../types'

export default function PatternEditorView() {
  const { projectId } = useParams()
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
    reorderPatternItemsInRound
  } = useSyncedAppStore()

  const [showAddRoundForm, setShowAddRoundForm] = useState(false)
  const [showStitchModal, setShowStitchModal] = useState<{ roundNumber: number, mode: 'add' | 'edit', stitchId?: string } | null>(null)
  const [showAddGroupForm, setShowAddGroupForm] = useState<number | null>(null)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [editingStitch, setEditingStitch] = useState<{ roundNumber: number, stitchId: string } | null>(null)
  const [editingGroup, setEditingGroup] = useState<{ roundNumber: number, groupId: string } | null>(null)
  const [editingGroupStitch, setEditingGroupStitch] = useState<{ roundNumber: number, groupId: string, stitchId: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 新增圈數表單狀態
  const [newRoundNotes, setNewRoundNotes] = useState('')

  // 群組中新增針法的modal狀態
  const [showGroupStitchModal, setShowGroupStitchModal] = useState(false)
  
  // 編輯群組時新增針法的modal狀態
  const [showEditGroupStitchModal, setShowEditGroupStitchModal] = useState<{ roundNumber: number, groupId: string } | null>(null)

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

  // 拖拽狀態
  const [draggedItem, setDraggedItem] = useState<{ index: number, roundNumber: number } | null>(null)

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(projectId)
      } else {
        navigate('/404')
      }
    }
  }, [projectId, projects, navigate])

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
      
      const roundNumbers = currentProject.pattern?.map(r => r.roundNumber) || []
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
        currentPatternLength: currentProject.pattern.length
      })

      await addRound(newRound)
      
      console.log('[UI-ADD-ROUND] Successfully added round, cleaning up UI state')
      setNewRoundNotes('')
      setShowAddRoundForm(false)
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
      await deleteRound(roundNumber)
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

      await addStitchToRound(showStitchModal.roundNumber, newStitch)
      
      console.log('[UI-ADD-STITCH] Successfully added stitch')
    } catch (error) {
      console.error('[UI-ADD-STITCH] Error adding stitch:', error)
      alert('新增針法時發生錯誤，請查看控制台了解詳情')
    } finally {
      console.log('[UI-ADD-STITCH] Setting loading to false')
      setIsLoading(false)
    }
  }

  const handleAddGroup = async (roundNumber: number) => {
    if (newGroupStitches.length === 0) {
      alert('請先新增群組中的針法')
      return
    }

    const newGroup: StitchGroup = {
      id: generateId(),
      name: newGroupName.trim() || '針目群組',
      stitches: [...newGroupStitches],
      repeatCount: ensureNumber(newGroupRepeatCount)
    }

    await addStitchGroupToRound(roundNumber, newGroup)
    setNewGroupName('')
    setNewGroupRepeatCount(1)
    setNewGroupStitches([])
    setShowAddGroupForm(null)
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
  }

  const handleEditGroupStitchModalConfirm = async (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => {
    if (!showEditGroupStitchModal) return

    const { roundNumber, groupId } = showEditGroupStitchModal
    const round = currentProject?.pattern.find(r => r.roundNumber === roundNumber)
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
    const updatedStitch: StitchInfo = {
      id: stitchId,
      type: editStitchType,
      yarnId: currentProject!.yarns[0]?.id || '',
      count: ensureNumber(editStitchCount)
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
    const updatedStitch: StitchInfo = {
      id: stitchId,
      type: editGroupStitchType,
      yarnId: currentProject!.yarns[0]?.id || '',
      count: ensureNumber(editGroupStitchCount)
    }

    await updateStitchInGroup(roundNumber, groupId, stitchId, updatedStitch)
    setEditingGroupStitch(null)
  }

  const handleDeleteGroupStitch = async (roundNumber: number, groupId: string, stitchId: string) => {
    if (confirm('確定要刪除這個針法嗎？')) {
      const round = currentProject?.pattern.find(r => r.roundNumber === roundNumber)
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

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border sticky top-0 z-10">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to={`/project/${projectId}`}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-base"
              >
                ← 返回
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-text-primary">織圖編輯</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddRoundForm(true)}
                className="btn btn-primary w-full sm:w-auto"
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
        {/* 織圖總覽 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">織圖總覽</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">總圈數：</span>
              <span className="font-medium text-text-primary">{currentProject.pattern.length}</span>
            </div>
            <div>
              <span className="text-text-secondary">總針數：</span>
              <span className="font-medium text-text-primary">
                {currentProject.pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">使用毛線：</span>
              <span className="font-medium text-text-primary">{currentProject.yarns.length} 種</span>
            </div>
            <div>
              <span className="text-text-secondary">當前圈數：</span>
              <span className="font-medium text-text-primary">R{currentProject.currentRound}</span>
            </div>
          </div>
        </div>

        {/* 圈數列表 */}
        {currentProject.pattern.length === 0 ? (
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
            {currentProject.pattern
              .sort((a, b) => a.roundNumber - b.roundNumber)
              .map((round) => (
              <div key={round.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      第 {round.roundNumber} 圈
                    </h3>
                    <div className="text-sm text-text-secondary">
                      {getRoundTotalStitches(round)} 針
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStitchModal({ roundNumber: round.roundNumber, mode: 'add' })}
                      className="btn btn-ghost text-sm"
                    >
                      新增針法
                    </button>
                    <button
                      onClick={() => setShowAddGroupForm(round.roundNumber)}
                      className="btn btn-ghost text-sm"
                    >
                      新增群組
                    </button>
                    <button
                      onClick={() => handleDeleteRound(round.roundNumber)}
                      className="text-text-tertiary hover:text-red-500 transition-colors p-2"
                    >
                      <BsTrash className="w-5 h-5" />
                    </button>
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
                        備註: {round.notes}
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
                            className="flex items-center gap-3 p-2 bg-background-tertiary rounded cursor-move"
                            draggable
                            onDragStart={(e) => handleDragStart(e, index, round.roundNumber)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, round.roundNumber)}
                          >
                            <div className="text-lg">
                              {getStitchDisplayInfo(patternItem.data as StitchInfo).symbol}
                            </div>
                            <div className="flex-1">
                              {editingStitch?.stitchId === (patternItem.data as StitchInfo).id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editStitchType}
                                    onChange={(e) => setEditStitchType(e.target.value as StitchType)}
                                    className="input text-sm"
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
                                  <button
                                    onClick={() => handleUpdateStitch(round.roundNumber, (patternItem.data as StitchInfo).id)}
                                    className="text-green-500 hover:text-green-600 p-2"
                                  >
                                    <CiCircleCheck className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingStitch(null)}
                                    className="text-text-tertiary hover:text-text-secondary p-2"
                                  >
                                    <RxCrossCircled className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-text-primary">
                                      {getStitchDisplayInfo(patternItem.data as StitchInfo).rawValue}
                                    </span>
                                    <span className="text-sm text-text-secondary">
                                      ×{(patternItem.data as StitchInfo).count}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleEditStitch(round.roundNumber, patternItem.data as StitchInfo)}
                                      className="text-text-tertiary hover:text-primary p-1"
                                    >
                                      <VscEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStitch(round.roundNumber, (patternItem.data as StitchInfo).id)}
                                      className="text-text-tertiary hover:text-red-500 p-1"
                                    >
                                      <BsTrash className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // 群組顯示  
                          <div 
                            key={patternItem.id} 
                            className="border border-border rounded-lg p-3 cursor-move"
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
                                    <div className="text-sm text-text-secondary">
                                      重複 {(patternItem.data as StitchGroup).repeatCount} 次 (共 {getStitchGroupTotalStitches(patternItem.data as StitchGroup)} 針)
                                    </div>
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
                                <div key={stitch.id} className="flex items-center gap-3 p-2 bg-background-tertiary rounded ml-4">
                                  <div className="text-lg">
                                    {getStitchDisplayInfo(stitch).symbol}
                                  </div>
                                  <div className="flex-1">
                                    {editingGroupStitch?.stitchId === stitch.id && editingGroupStitch?.groupId === (patternItem.data as StitchGroup).id ? (
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={editGroupStitchType}
                                          onChange={(e) => setEditGroupStitchType(e.target.value as StitchType)}
                                          className="input text-sm"
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
                                        <button
                                          onClick={() => handleUpdateGroupStitch(round.roundNumber, (patternItem.data as StitchGroup).id, stitch.id)}
                                          className="text-green-500 hover:text-green-600 p-2"
                                        >
                                          <CiCircleCheck className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingGroupStitch(null)}
                                          className="text-text-tertiary hover:text-text-secondary p-2"
                                        >
                                          <RxCrossCircled className="w-5 h-5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-text-primary">
                                            {getStitchDisplayInfo(stitch).rawValue}
                                          </span>
                                          <span className="text-sm text-text-secondary">
                                            ×{stitch.count}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleEditGroupStitch(round.roundNumber, (patternItem.data as StitchGroup).id, stitch)}
                                            className="text-text-tertiary hover:text-primary p-1"
                                          >
                                            <VscEdit className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteGroupStitch(round.roundNumber, (patternItem.data as StitchGroup).id, stitch.id)}
                                            className="text-text-tertiary hover:text-red-500 p-1"
                                          >
                                            <BsTrash className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
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
                          className="flex items-center gap-3 p-2 bg-background-tertiary rounded cursor-move"
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, round.roundNumber)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index, round.roundNumber)}
                        >
                          <div className="text-lg">
                            {getStitchDisplayInfo(stitch).symbol}
                          </div>
                          <div className="flex-1">
                            {editingStitch?.stitchId === stitch.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={editStitchType}
                                  onChange={(e) => setEditStitchType(e.target.value as StitchType)}
                                  className="input text-sm"
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
                                <button
                                  onClick={() => handleUpdateStitch(round.roundNumber, stitch.id)}
                                  className="text-green-500 hover:text-green-600 p-2"
                                >
                                  <CiCircleCheck className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => setEditingStitch(null)}
                                  className="text-text-tertiary hover:text-text-secondary p-2"
                                >
                                  <RxCrossCircled className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-text-primary">
                                    {getStitchDisplayInfo(stitch).rawValue}
                                  </span>
                                  <span className="text-sm text-text-secondary">
                                    ×{stitch.count}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditStitch(round.roundNumber, stitch)}
                                    className="text-text-tertiary hover:text-primary p-1"
                                  >
                                    <VscEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStitch(round.roundNumber, stitch.id)}
                                    className="text-text-tertiary hover:text-red-500 p-1"
                                  >
                                    <BsTrash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
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
                                  <div className="text-sm text-text-secondary">
                                    重複 {group.repeatCount} 次 (共 {getStitchGroupTotalStitches(group)} 針)
                                  </div>
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
                              <div key={stitch.id} className="flex items-center gap-3 p-2 bg-background-tertiary rounded ml-4">
                                <div className="text-lg">
                                  {getStitchDisplayInfo(stitch).symbol}
                                </div>
                                <div className="flex-1">
                                  {editingGroupStitch?.stitchId === stitch.id && editingGroupStitch?.groupId === group.id ? (
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={editGroupStitchType}
                                        onChange={(e) => setEditGroupStitchType(e.target.value as StitchType)}
                                        className="input text-sm"
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
                                      <button
                                        onClick={() => handleUpdateGroupStitch(round.roundNumber, group.id, stitch.id)}
                                        className="text-green-500 hover:text-green-600 p-2"
                                      >
                                        <CiCircleCheck className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingGroupStitch(null)}
                                        className="text-text-tertiary hover:text-text-secondary p-2"
                                      >
                                        <RxCrossCircled className="w-5 h-5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-text-primary">
                                          {getStitchDisplayInfo(stitch).rawValue}
                                        </span>
                                        <span className="text-sm text-text-secondary">
                                          ×{stitch.count}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleEditGroupStitch(round.roundNumber, group.id, stitch)}
                                          className="text-text-tertiary hover:text-primary p-1"
                                        >
                                          <VscEdit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteGroupStitch(round.roundNumber, group.id, stitch.id)}
                                          className="text-text-tertiary hover:text-red-500 p-1"
                                        >
                                          <BsTrash className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* 新增群組表單 */}
                {showAddGroupForm === round.roundNumber && (
                  <div className="bg-background-tertiary rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-text-primary mb-3">新增針目群組</h4>
                    
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
                        <button
                          onClick={() => setShowGroupStitchModal(true)}
                          className="btn btn-ghost text-sm"
                        >
                          新增針法
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {newGroupStitches.map((stitch) => (
                          <div key={stitch.id} className="flex items-center gap-3 p-2 bg-background-secondary rounded">
                            <div className="text-lg">
                              {getStitchDisplayInfo(stitch).symbol}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-text-primary">
                                {getStitchDisplayInfo(stitch).rawValue}
                              </span>
                              <span className="text-sm text-text-secondary ml-2">
                                ×{stitch.count}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveStitchFromGroup(stitch.id)}
                              className="text-text-tertiary hover:text-red-500 transition-colors p-2"
                            >
                              <BsTrash className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>

                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddGroup(round.roundNumber)}
                        className="btn btn-primary"
                        disabled={newGroupStitches.length === 0}
                      >
                        新增群組
                      </button>
                      <button
                        onClick={() => {
                          setShowAddGroupForm(null)
                          setNewGroupStitches([])
                          setNewGroupName('')
                          setNewGroupRepeatCount(1)
                        }}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
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
    </div>
  )
}