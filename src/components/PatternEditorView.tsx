import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { 
  generateId,
  getRoundTotalStitches,
  getStitchGroupTotalStitches
} from '../utils'
import { Round, StitchInfo, StitchGroup, StitchType, StitchTypeInfo } from '../types'

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
    addStitchGroupToRound
  } = useAppStore()

  const [showAddRoundForm, setShowAddRoundForm] = useState(false)
  const [showAddStitchForm, setShowAddStitchForm] = useState<number | null>(null)
  const [showAddGroupForm, setShowAddGroupForm] = useState<number | null>(null)
  const [editingRound, setEditingRound] = useState<Round | null>(null)

  // 新增圈數表單狀態
  const [newRoundNotes, setNewRoundNotes] = useState('')

  // 新增針法表單狀態
  const [newStitchType, setNewStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [newStitchCount, setNewStitchCount] = useState(1)

  // 新增群組表單狀態
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRepeatCount, setNewGroupRepeatCount] = useState(1)
  const [newGroupStitches, setNewGroupStitches] = useState<StitchInfo[]>([])

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(projectId)
      } else {
        navigate('/404')
      }
    }
  }, [projectId, setCurrentProject, projects, navigate])

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

  const handleAddRound = () => {
    const nextRoundNumber = Math.max(0, ...currentProject.pattern.map(r => r.roundNumber)) + 1
    
    const newRound: Round = {
      id: generateId(),
      roundNumber: nextRoundNumber,
      stitches: [],
      stitchGroups: [],
      notes: newRoundNotes.trim() || undefined
    }

    addRound(newRound)
    setNewRoundNotes('')
    setShowAddRoundForm(false)
  }

  const handleDeleteRound = (roundNumber: number) => {
    if (confirm(`確定要刪除第 ${roundNumber} 圈嗎？`)) {
      deleteRound(roundNumber)
    }
  }

  const handleAddStitch = (roundNumber: number) => {
    const newStitch: StitchInfo = {
      id: generateId(),
      type: newStitchType,
      yarnId: currentProject.yarns[0]?.id || '',
      count: newStitchCount
    }

    addStitchToRound(roundNumber, newStitch)
    setNewStitchCount(1)
    setShowAddStitchForm(null)
  }

  const handleAddGroup = (roundNumber: number) => {
    if (newGroupStitches.length === 0) {
      alert('請先新增群組中的針法')
      return
    }

    const newGroup: StitchGroup = {
      id: generateId(),
      name: newGroupName.trim() || '針目群組',
      stitches: [...newGroupStitches],
      repeatCount: newGroupRepeatCount
    }

    addStitchGroupToRound(roundNumber, newGroup)
    setNewGroupName('')
    setNewGroupRepeatCount(1)
    setNewGroupStitches([])
    setShowAddGroupForm(null)
  }

  const handleAddStitchToGroup = () => {
    const newStitch: StitchInfo = {
      id: generateId(),
      type: newStitchType,
      yarnId: currentProject.yarns[0]?.id || '',
      count: newStitchCount
    }

    setNewGroupStitches([...newGroupStitches, newStitch])
    setNewStitchCount(1)
  }

  const handleRemoveStitchFromGroup = (stitchId: string) => {
    setNewGroupStitches(newGroupStitches.filter(s => s.id !== stitchId))
  }

  const handleUpdateRoundNotes = (round: Round, notes: string) => {
    const updatedRound = { ...round, notes: notes.trim() || undefined }
    updateRound(updatedRound)
    setEditingRound(null)
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/project/${projectId}`}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-semibold text-text-primary">織圖編輯</h1>
            </div>
            
            <button
              onClick={() => setShowAddRoundForm(true)}
              className="btn btn-primary"
            >
              新增圈數
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
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
            <div className="text-6xl mb-4">📝</div>
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
                    {round.roundNumber === currentProject.currentRound && (
                      <div className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                        目前
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddStitchForm(round.roundNumber)}
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
                      className="text-text-tertiary hover:text-red-500 transition-colors"
                    >
                      刪除
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

                {/* 個別針法 */}
                {round.stitches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-text-primary mb-2">針法</h4>
                    <div className="space-y-2">
                      {round.stitches.map((stitch) => (
                        <div key={stitch.id} className="flex items-center gap-3 p-2 bg-background-tertiary rounded">
                          <div className="text-lg">
                            {StitchTypeInfo[stitch.type]?.symbol || '○'}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-text-primary">
                              {StitchTypeInfo[stitch.type]?.rawValue || stitch.type}
                            </span>
                            <span className="text-sm text-text-secondary ml-2">
                              ×{stitch.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 針目群組 */}
                {round.stitchGroups.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-text-primary mb-2">針目群組</h4>
                    <div className="space-y-3">
                      {round.stitchGroups.map((group) => (
                        <div key={group.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-text-primary">
                              {group.name}
                            </div>
                            <div className="text-sm text-text-secondary">
                              重複 {group.repeatCount} 次 (共 {getStitchGroupTotalStitches(group)} 針)
                            </div>
                          </div>
                          <div className="space-y-2">
                            {group.stitches.map((stitch) => (
                              <div key={stitch.id} className="flex items-center gap-3 p-2 bg-background-tertiary rounded ml-4">
                                <div className="text-lg">
                                  {StitchTypeInfo[stitch.type]?.symbol || '○'}
                                </div>
                                <div className="flex-1">
                                  <span className="font-medium text-text-primary">
                                    {StitchTypeInfo[stitch.type]?.rawValue || stitch.type}
                                  </span>
                                  <span className="text-sm text-text-secondary ml-2">
                                    ×{stitch.count}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 新增針法表單 */}
                {showAddStitchForm === round.roundNumber && (
                  <div className="bg-background-tertiary rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-text-primary mb-3">新增針法</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          針法類型
                        </label>
                        <select
                          value={newStitchType}
                          onChange={(e) => setNewStitchType(e.target.value as StitchType)}
                          className="input"
                        >
                          {Object.entries(StitchTypeInfo).map(([key, info]) => (
                            <option key={key} value={key}>
                              {info.symbol} {info.rawValue}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          數量
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newStitchCount}
                          onChange={(e) => setNewStitchCount(parseInt(e.target.value) || 1)}
                          className="input"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddStitch(round.roundNumber)}
                        className="btn btn-primary"
                      >
                        新增
                      </button>
                      <button
                        onClick={() => setShowAddStitchForm(null)}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
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
                          onChange={(e) => setNewGroupRepeatCount(parseInt(e.target.value) || 1)}
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
                          onClick={handleAddStitchToGroup}
                          className="btn btn-ghost text-sm"
                        >
                          新增針法
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {newGroupStitches.map((stitch) => (
                          <div key={stitch.id} className="flex items-center gap-3 p-2 bg-background-secondary rounded">
                            <div className="text-lg">
                              {StitchTypeInfo[stitch.type]?.symbol || '○'}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-text-primary">
                                {StitchTypeInfo[stitch.type]?.rawValue || stitch.type}
                              </span>
                              <span className="text-sm text-text-secondary ml-2">
                                ×{stitch.count}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveStitchFromGroup(stitch.id)}
                              className="text-text-tertiary hover:text-red-500 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <select
                          value={newStitchType}
                          onChange={(e) => setNewStitchType(e.target.value as StitchType)}
                          className="input"
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
                          value={newStitchCount}
                          onChange={(e) => setNewStitchCount(parseInt(e.target.value) || 1)}
                          className="input"
                          placeholder="數量"
                        />
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
              >
                新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}