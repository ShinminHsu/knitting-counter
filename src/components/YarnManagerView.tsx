import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSyncedAppStore } from '../store/syncedAppStore'
import SyncStatusIndicator from './SyncStatusIndicator'
import { Yarn, YarnColor } from '../types'
import { generateId } from '../utils'

const presetColors: YarnColor[] = [
  { name: '白色', hex: '#FFFFFF' },
  { name: '黑色', hex: '#000000' },
  { name: '紅色', hex: '#FF0000' },
  { name: '藍色', hex: '#0066CC' },
  { name: '綠色', hex: '#00AA00' },
  { name: '黃色', hex: '#FFD700' },
  { name: '紫色', hex: '#8A2BE2' },
  { name: '橙色', hex: '#FF8C00' },
  { name: '粉紅色', hex: '#FF69B4' },
  { name: '棕色', hex: '#A0522D' },
  { name: '灰色', hex: '#808080' },
  { name: '米色', hex: '#F5F5DC' }
]

export default function YarnManagerView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject, projects, addYarn, updateYarn, deleteYarn } = useSyncedAppStore()
  
  const [showAddYarn, setShowAddYarn] = useState(false)
  const [editingYarn, setEditingYarn] = useState<Yarn | null>(null)
  const [yarnName, setYarnName] = useState('')
  const [yarnBrand, setYarnBrand] = useState('')
  const [selectedColor, setSelectedColor] = useState<YarnColor>(presetColors[0])
  const [customColor, setCustomColor] = useState('')

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

  const handleAddYarn = () => {
    setEditingYarn(null)
    setYarnName(presetColors[0].name + '毛線') // 預設名稱為顏色名稱
    setYarnBrand('')
    setSelectedColor(presetColors[0])
    setCustomColor('')
    setShowAddYarn(true)
  }

  const handleEditYarn = (yarn: Yarn) => {
    setEditingYarn(yarn)
    setYarnName(yarn.name)
    setYarnBrand(yarn.brand || '')
    setSelectedColor(yarn.color)
    setCustomColor(yarn.color.hex)
    setShowAddYarn(true)
  }

  const handleSaveYarn = () => {
    if (!yarnName.trim()) return

    const color = customColor ? 
      { name: '自定義', hex: customColor } : 
      selectedColor

    const yarn: Yarn = {
      id: editingYarn?.id || generateId(),
      name: yarnName.trim(),
      brand: yarnBrand.trim() || undefined,
      color
    }

    if (editingYarn) {
      updateYarn(yarn)
    } else {
      addYarn(yarn)
    }

    setShowAddYarn(false)
    resetForm()
  }

  const handleDeleteYarn = (yarnId: string) => {
    if (confirm('確定要刪除這個毛線嗎？')) {
      deleteYarn(yarnId)
    }
  }

  const resetForm = () => {
    setYarnName('')
    setYarnBrand('')
    setSelectedColor(presetColors[0])
    setCustomColor('')
    setEditingYarn(null)
  }

  const handleCancel = () => {
    setShowAddYarn(false)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-background-primary safe-top safe-bottom">
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to={`/project/${projectId}`}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-base"
              >
                ← 返回
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-text-primary">毛線管理</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddYarn}
                className="btn btn-primary w-full sm:w-auto"
              >
                + 新增毛線
              </button>
              <SyncStatusIndicator />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 毛線列表 */}
        {currentProject.yarns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🧶</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              還沒有毛線
            </h2>
            <p className="text-text-secondary mb-4">
              點擊上方「新增毛線」按鈕來添加第一個毛線
            </p>
            <button
              onClick={handleAddYarn}
              className="btn btn-primary"
            >
              新增毛線
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {currentProject.yarns.map((yarn) => (
              <div key={yarn.id} className="card">
                <div className="flex items-center gap-4">
                  {/* 毛線顏色 */}
                  <div
                    className="w-12 h-12 rounded-full border-2 border-border flex-shrink-0"
                    style={{ backgroundColor: yarn.color.hex }}
                  />
                  
                  {/* 毛線資訊 */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {yarn.name}
                    </h3>
                    {yarn.brand && (
                      <p className="text-text-secondary">{yarn.brand}</p>
                    )}
                    <p className="text-sm text-text-tertiary">
                      {yarn.color.name} ({yarn.color.hex})
                    </p>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditYarn(yarn)}
                      className="btn btn-secondary text-sm"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteYarn(yarn.id)}
                      className="btn bg-red-500 hover:bg-red-600 text-white text-sm"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 新增/編輯毛線表單 */}
        {showAddYarn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-primary rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  {editingYarn ? '編輯毛線' : '新增毛線'}
                </h2>

                <div className="space-y-4">
                  {/* 毛線名稱 */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      毛線名稱 *
                    </label>
                    <input
                      type="text"
                      value={yarnName}
                      onChange={(e) => setYarnName(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background-secondary text-text-primary"
                      placeholder="例如：4號線"
                    />
                  </div>

                  {/* 品牌 */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      品牌（選填）
                    </label>
                    <input
                      type="text"
                      value={yarnBrand}
                      onChange={(e) => setYarnBrand(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background-secondary text-text-primary"
                      placeholder="例如：台灣製"
                    />
                  </div>

                  {/* 顏色選擇 */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      顏色
                    </label>
                    
                    {/* 預設顏色 */}
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {presetColors.map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => {
                            setSelectedColor(color)
                            setCustomColor('')
                            // 如果是新增模式且名稱是預設格式，則更新名稱
                            if (!editingYarn && (yarnName === '' || yarnName.endsWith('毛線'))) {
                              setYarnName(color.name + '毛線')
                            }
                          }}
                          className={`w-10 h-10 rounded-full border-2 ${
                            selectedColor.hex === color.hex && !customColor
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>

                    {/* 自定義顏色 */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        或輸入自定義顏色
                      </label>
                      <input
                        type="color"
                        value={customColor || selectedColor.hex}
                        onChange={(e) => {
                          setCustomColor(e.target.value)
                          // 如果是新增模式且名稱是預設格式，則更新為自定義顏色
                          if (!editingYarn && (yarnName === '' || yarnName.endsWith('毛線'))) {
                            setYarnName('自定義毛線')
                          }
                        }}
                        className="w-full h-10 border border-border rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 預覽 */}
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-sm text-text-secondary mb-2">預覽</p>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border border-border"
                        style={{ 
                          backgroundColor: customColor || selectedColor.hex 
                        }}
                      />
                      <div>
                        <p className="font-medium text-text-primary">
                          {yarnName || '毛線名稱'}
                        </p>
                        {yarnBrand && (
                          <p className="text-sm text-text-secondary">{yarnBrand}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 按鈕 */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCancel}
                    className="flex-1 btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveYarn}
                    disabled={!yarnName.trim()}
                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingYarn ? '更新' : '新增'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}