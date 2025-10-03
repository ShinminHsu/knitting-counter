import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomStitchStore } from '../stores'
import { useTemplateStore } from '../stores/useTemplateStore'
import { CustomStitchPattern, StitchGroupTemplate, StitchInfo, StitchType, StitchTypeInfo } from '../types'
import { validateCustomStitch } from '../stores/useCustomStitchStore'
import { getTemplatePreview } from '../stores/useTemplateStore'
import { generateId, getStitchDisplayInfo } from '../utils'

type ActiveTab = 'custom-stitches' | 'group-templates'

export default function PatternElementManagerView() {
  const navigate = useNavigate()
  
  // Custom Stitches Store
  const {
    customStitches,
    isLoading: stitchesLoading,
    createCustomStitch,
    updateCustomStitch,
    deleteCustomStitch,
    duplicateCustomStitch,
    searchCustomStitches,
    getRecentlyUsedCustomStitches,
    getPopularCustomStitches
  } = useCustomStitchStore()

  // Templates Store
  const {
    templates,
    isLoading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    searchTemplates,
    getRecentlyUsedTemplates,
    getPopularTemplates,
    getCategories
  } = useTemplateStore()

  // 狀態管理
  const [activeTab, setActiveTab] = useState<ActiveTab>('custom-stitches')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 針法相關狀態
  const [filteredStitches, setFilteredStitches] = useState<CustomStitchPattern[]>([])
  const [showCreateStitchModal, setShowCreateStitchModal] = useState(false)
  const [editingStitch, setEditingStitch] = useState<CustomStitchPattern | null>(null)
  const [confirmDeleteStitchId, setConfirmDeleteStitchId] = useState<string | null>(null)
  const [stitchFormData, setStitchFormData] = useState({
    name: '',
    symbol: '',
    englishName: '',
    description: ''
  })
  const [stitchFormErrors, setStitchFormErrors] = useState<string[]>([])

  // 範本相關狀態
  const [filteredTemplates, setFilteredTemplates] = useState<StitchGroupTemplate[]>([])
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StitchGroupTemplate | null>(null)
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    category: '一般',
    repeatCount: 1
  })
  const [repeatCountText, setRepeatCountText] = useState('1')
  const [templateFormErrors, setTemplateFormErrors] = useState<string[]>([])
  const [templateStitches, setTemplateStitches] = useState<StitchInfo[]>([])
  const [showAddStitchToTemplate, setShowAddStitchToTemplate] = useState(false)
  const [stitchCountTexts, setStitchCountTexts] = useState<Record<string, string>>({})

  // 更新篩選的針法列表
  useEffect(() => {
    if (activeTab !== 'custom-stitches') return
    
    let result: CustomStitchPattern[] = customStitches

    if (searchQuery.trim()) {
      result = searchCustomStitches(searchQuery)
    }

    setFilteredStitches(result)
  }, [customStitches, searchQuery, activeTab, searchCustomStitches])

  // 更新篩選的範本列表
  useEffect(() => {
    if (activeTab !== 'group-templates') return
    
    let result: StitchGroupTemplate[] = templates

    if (searchQuery.trim()) {
      result = searchTemplates(searchQuery)
    }

    if (selectedCategory) {
      result = result.filter(template => template.category === selectedCategory)
    }

    setFilteredTemplates(result)
  }, [templates, searchQuery, selectedCategory, activeTab, searchTemplates])

  // 切換分頁時重置狀態
  useEffect(() => {
    setSearchQuery('')
    setSelectedCategory('')
  }, [activeTab])

  // 重置針法表單
  const resetStitchForm = () => {
    setStitchFormData({
      name: '',
      symbol: '',
      englishName: '',
      description: ''
    })
    setStitchFormErrors([])
    setEditingStitch(null)
  }

  // 重置範本表單
  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      category: '一般',
      repeatCount: 1
    })
    setRepeatCountText('1')
    setTemplateFormErrors([])
    setEditingTemplate(null)
    setTemplateStitches([])
    setStitchCountTexts({})
    setShowAddStitchToTemplate(false)
  }

  // 針法相關操作
  const handleOpenCreateStitchModal = () => {
    resetStitchForm()
    setShowCreateStitchModal(true)
  }

  const handleOpenEditStitchModal = (stitch: CustomStitchPattern) => {
    setStitchFormData({
      name: stitch.name,
      symbol: stitch.symbol,
      englishName: stitch.englishName,
      description: stitch.description || ''
    })
    setEditingStitch(stitch)
    setShowCreateStitchModal(true)
  }

  const handleSaveStitch = async () => {
    const tempStitch: CustomStitchPattern = {
      id: '',
      name: stitchFormData.name,
      symbol: stitchFormData.symbol,
      englishName: stitchFormData.englishName,
      description: stitchFormData.description,
      createdDate: new Date(),
      useCount: 0
    }
    
    const validation = validateCustomStitch(tempStitch)
    if (!validation.isValid) {
      setStitchFormErrors(validation.errors)
      return
    }

    try {
      if (editingStitch) {
        await updateCustomStitch(editingStitch.id, {
          name: stitchFormData.name,
          symbol: stitchFormData.symbol,
          englishName: stitchFormData.englishName,
          description: stitchFormData.description
        })
      } else {
        await createCustomStitch(
          stitchFormData.name,
          stitchFormData.symbol,
          stitchFormData.englishName,
          stitchFormData.description
        )
      }

      setShowCreateStitchModal(false)
      resetStitchForm()
    } catch (error) {
      setStitchFormErrors([error instanceof Error ? error.message : '保存失敗'])
    }
  }

  const handleDeleteStitch = async (stitchId: string) => {
    try {
      await deleteCustomStitch(stitchId)
      setConfirmDeleteStitchId(null)
    } catch (error) {
      console.error('刪除針法失敗:', error)
    }
  }

  const handleDuplicateStitch = async (stitchId: string) => {
    try {
      await duplicateCustomStitch(stitchId)
    } catch (error) {
      console.error('複製針法失敗:', error)
    }
  }

  // 範本相關操作
  const handleOpenCreateTemplateModal = () => {
    resetTemplateForm()
    setShowCreateTemplateModal(true)
  }

  const handleOpenEditTemplateModal = (template: StitchGroupTemplate) => {
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '一般',
      repeatCount: template.repeatCount
    })
    setRepeatCountText(template.repeatCount.toString())
    setTemplateStitches([...template.stitches])
    
    // 初始化針法數量文字狀態
    const countTexts: Record<string, string> = {}
    template.stitches.forEach(stitch => {
      countTexts[stitch.id] = stitch.count.toString()
    })
    setStitchCountTexts(countTexts)
    
    setEditingTemplate(template)
    setShowCreateTemplateModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateFormData.name.trim()) {
      setTemplateFormErrors(['範本名稱不能為空'])
      return
    }

    if (templateStitches.length === 0) {
      setTemplateFormErrors(['範本必須包含至少一個針法'])
      return
    }

    if (templateFormData.repeatCount <= 0) {
      setTemplateFormErrors(['重複次數必須大於0'])
      return
    }

    try {
      if (editingTemplate) {
        // 更新現有範本
        await updateTemplate(editingTemplate.id, {
          name: templateFormData.name,
          description: templateFormData.description,
          category: templateFormData.category,
          repeatCount: templateFormData.repeatCount,
          stitches: templateStitches
        })
      } else {
        // 創建新範本
        await createTemplate(
          templateFormData.name,
          templateFormData.description,
          templateStitches,
          templateFormData.category
        )
      }

      setShowCreateTemplateModal(false)
      resetTemplateForm()
    } catch (error) {
      setTemplateFormErrors([error instanceof Error ? error.message : '保存失敗'])
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId)
      setConfirmDeleteTemplateId(null)
    } catch (error) {
      console.error('刪除範本失敗:', error)
    }
  }

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      await duplicateTemplate(templateId)
    } catch (error) {
      console.error('複製範本失敗:', error)
    }
  }

  // 範本針法管理
  const handleAddStitchToTemplate = (stitchType: StitchType, count: number, customName?: string, customSymbol?: string) => {
    const newStitch: StitchInfo = {
      id: generateId(),
      type: stitchType,
      yarnId: '', // 範本中不需要指定毛線
      count,
      customName,
      customSymbol
    }
    setTemplateStitches(prev => [...prev, newStitch])
    
    // 初始化新針法的數量文字狀態
    setStitchCountTexts(prev => ({
      ...prev,
      [newStitch.id]: count.toString()
    }))
    
    setShowAddStitchToTemplate(false)
  }

  const handleRemoveStitchFromTemplate = (stitchId: string) => {
    setTemplateStitches(prev => prev.filter(stitch => stitch.id !== stitchId))
    setStitchCountTexts(prev => {
      const newTexts = { ...prev }
      delete newTexts[stitchId]
      return newTexts
    })
  }

  const handleUpdateStitchCountText = (stitchId: string, value: string) => {
    setStitchCountTexts(prev => ({
      ...prev,
      [stitchId]: value
    }))
    
    if (value === '') {
      // 允許暫時為空
      return
    }
    
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
      setTemplateStitches(prev => prev.map(stitch =>
        stitch.id === stitchId ? { ...stitch, count: numValue } : stitch
      ))
    }
  }

  const handleStitchCountBlur = (stitchId: string, value: string) => {
    if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
      const correctedValue = '1'
      setStitchCountTexts(prev => ({
        ...prev,
        [stitchId]: correctedValue
      }))
      setTemplateStitches(prev => prev.map(stitch =>
        stitch.id === stitchId ? { ...stitch, count: 1 } : stitch
      ))
    } else {
      const numValue = Math.min(100, Math.max(1, parseInt(value)))
      const correctedValue = numValue.toString()
      setStitchCountTexts(prev => ({
        ...prev,
        [stitchId]: correctedValue
      }))
      setTemplateStitches(prev => prev.map(stitch =>
        stitch.id === stitchId ? { ...stitch, count: numValue } : stitch
      ))
    }
  }

  const isLoading = stitchesLoading || templatesLoading

  return (
    <div className="min-h-screen bg-background-primary">
      {/* 頂部導航 */}
      <div className="bg-background-secondary border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-text-primary">針法和範本管理</h1>
          </div>
          <button
            onClick={activeTab === 'custom-stitches' ? handleOpenCreateStitchModal : handleOpenCreateTemplateModal}
            className="btn btn-primary"
          >
            {activeTab === 'custom-stitches' ? '新增針法' : '新增範本'}
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {/* 主要分頁 */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('custom-stitches')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'custom-stitches'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              自定義針法 ({customStitches.length})
            </button>
            <button
              onClick={() => setActiveTab('group-templates')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'group-templates'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              針法群組範本 ({templates.length})
            </button>
          </div>
        </div>

        {/* 搜尋欄和子分頁標籤 */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={activeTab === 'custom-stitches' ? "搜尋針法名稱、符號或縮寫..." : "搜尋範本名稱、描述或分類..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full"
              />
            </div>
            {activeTab === 'group-templates' && (
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input w-full"
                >
                  <option value="">所有分類</option>
                  {getCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 子分頁標籤 */}
        </div>

        {/* 內容區域 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">載入中...</p>
            </div>
          ) : activeTab === 'custom-stitches' ? (
            // 自定義針法列表
            filteredStitches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary">
                  {searchQuery ? '沒有找到符合的針法' : '還沒有任何自定義針法'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleOpenCreateStitchModal}
                    className="mt-4 btn btn-primary"
                  >
                    新增第一個針法
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStitches.map((stitch) => (
                  <div
                    key={stitch.id}
                    className="bg-background-secondary rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-primary bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                          {stitch.symbol}
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary">{stitch.name}</h3>
                          <p className="text-sm text-text-secondary">{stitch.englishName}</p>
                        </div>
                      </div>
                      
                      {/* 動作按鈕 */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditStitchModal(stitch)}
                          className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
                          title="編輯"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDuplicateStitch(stitch.id)}
                          className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
                          title="複製"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteStitchId(stitch.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          title="刪除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {stitch.description && (
                      <p className="text-sm text-text-secondary mb-3">{stitch.description}</p>
                    )}

                    <div className="flex justify-end text-xs text-text-tertiary">
                      <span>{stitch.createdDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // 針法群組範本列表
            filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary">
                  {searchQuery || selectedCategory ? '沒有找到符合的範本' : '還沒有任何群組範本'}
                </p>
                <p className="text-sm text-text-tertiary mt-2">
                  請在織圖編輯器中創建針法群組並保存為範本
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-background-secondary rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">{template.name}</h3>
                        {template.category && (
                          <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded mt-1">
                            {template.category}
                          </span>
                        )}
                      </div>
                      
                      {/* 動作按鈕 */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditTemplateModal(template)}
                          className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
                          title="編輯"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(template.id)}
                          className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
                          title="複製"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTemplateId(template.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          title="刪除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {template.description && (
                      <p className="text-sm text-text-secondary mb-3">{template.description}</p>
                    )}

                    <div className="mb-3">
                      <p className="text-sm text-text-secondary">
                        {getTemplatePreview(template)}
                      </p>
                    </div>

                    <div className="flex justify-end text-xs text-text-tertiary">
                      <span>{template.createdDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* 新增/編輯針法模態框 */}
      {showCreateStitchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              {editingStitch ? '編輯針法' : '新增針法'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  針法名稱 *
                </label>
                <input
                  type="text"
                  value={stitchFormData.name}
                  onChange={(e) => setStitchFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input w-full"
                  placeholder="輸入針法名稱"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  針法符號 *
                </label>
                <input
                  type="text"
                  value={stitchFormData.symbol}
                  onChange={(e) => setStitchFormData(prev => ({ ...prev, symbol: e.target.value }))}
                  className="input w-full text-center text-2xl font-mono"
                  placeholder="輸入符號"
                  maxLength={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  英文縮寫 *
                </label>
                <input
                  type="text"
                  value={stitchFormData.englishName}
                  onChange={(e) => setStitchFormData(prev => ({ ...prev, englishName: e.target.value }))}
                  className="input w-full"
                  placeholder="例如: dc, sc, hdc"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  描述（選填）
                </label>
                <textarea
                  value={stitchFormData.description}
                  onChange={(e) => setStitchFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full resize-none"
                  placeholder="描述這個針法的用途或特色"
                  rows={3}
                  maxLength={100}
                />
              </div>

              {/* 預覽 */}
              {stitchFormData.name && stitchFormData.symbol && stitchFormData.englishName && (
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <div className="text-sm text-text-secondary mb-1">預覽：</div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-primary">{stitchFormData.symbol}</div>
                    <div>
                      <div className="font-medium text-text-primary">{stitchFormData.name}</div>
                      <div className="text-sm text-text-secondary">{stitchFormData.englishName}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 錯誤訊息 */}
              {stitchFormErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <ul className="text-sm text-red-600 space-y-1">
                    {stitchFormErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateStitchModal(false)
                  resetStitchForm()
                }}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSaveStitch}
                disabled={!stitchFormData.name.trim() || !stitchFormData.symbol.trim() || !stitchFormData.englishName.trim()}
                className="btn btn-primary flex-1"
              >
                {editingStitch ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯範本模態框 */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              {editingTemplate ? '編輯範本' : '新增範本'}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左側：基本資訊 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-text-primary">基本資訊</h3>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    範本名稱 *
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input w-full"
                    placeholder="輸入範本名稱"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    分類
                  </label>
                  <input
                    type="text"
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="input w-full"
                    placeholder="輸入分類名稱"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    重複次數
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={repeatCountText}
                    onChange={(e) => {
                      const value = e.target.value
                      setRepeatCountText(value)
                      
                      if (value === '') {
                        // 允許暫時為空
                        return
                      }
                      
                      const numValue = parseInt(value)
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                        setTemplateFormData(prev => ({ ...prev, repeatCount: numValue }))
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
                        setTemplateFormData(prev => ({ ...prev, repeatCount: 1 }))
                        setRepeatCountText('1')
                      } else {
                        const numValue = Math.min(100, Math.max(1, parseInt(value)))
                        setTemplateFormData(prev => ({ ...prev, repeatCount: numValue }))
                        setRepeatCountText(numValue.toString())
                      }
                    }}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    描述（選填）
                  </label>
                  <textarea
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input w-full resize-none"
                    placeholder="描述這個範本的用途或特色"
                    rows={3}
                    maxLength={200}
                  />
                </div>

                {/* 錯誤訊息 */}
                {templateFormErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <ul className="text-sm text-red-600 space-y-1">
                      {templateFormErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 右側：針法編輯 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-text-primary">針法列表</h3>
                  <button
                    onClick={() => setShowAddStitchToTemplate(true)}
                    className="btn btn-primary text-sm"
                  >
                    新增針法
                  </button>
                </div>

                {templateStitches.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <p className="text-text-secondary">還沒有添加任何針法</p>
                    <button
                      onClick={() => setShowAddStitchToTemplate(true)}
                      className="mt-2 text-sm text-primary hover:text-primary/80"
                    >
                      點擊新增第一個針法
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templateStitches.map((stitch, index) => {
                      const displayInfo = getStitchDisplayInfo(stitch)
                      return (
                        <div key={stitch.id} className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                          <span className="text-sm text-text-tertiary w-6">{index + 1}.</span>
                          <div className="text-lg font-bold text-primary w-8 text-center">
                            {displayInfo.symbol}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-text-primary">{displayInfo.rawValue}</div>
                            <div className="text-xs text-text-secondary">{displayInfo.englishName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={stitchCountTexts[stitch.id] !== undefined ? stitchCountTexts[stitch.id] : stitch.count.toString()}
                              onChange={(e) => handleUpdateStitchCountText(stitch.id, e.target.value)}
                              onBlur={(e) => handleStitchCountBlur(stitch.id, e.target.value)}
                              className="input w-16 text-center text-sm"
                            />
                            <button
                              onClick={() => handleRemoveStitchFromTemplate(stitch.id)}
                              className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 預覽 */}
                {templateStitches.length > 0 && (
                  <div className="p-3 bg-background-tertiary rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">預覽：</div>
                    <div className="text-sm text-text-primary">
                      {templateStitches.map(stitch => {
                        const displayInfo = getStitchDisplayInfo(stitch)
                        return `${displayInfo.englishName} ${stitch.count}`
                      }).join(', ')}
                      {templateFormData.repeatCount > 1 && `（重複 ${templateFormData.repeatCount} 次）`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateTemplateModal(false)
                  resetTemplateForm()
                }}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateFormData.name.trim() || templateStitches.length === 0}
                className="btn btn-primary flex-1"
              >
                {editingTemplate ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除針法確認模態框 */}
      {confirmDeleteStitchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">確認刪除</h3>
            <p className="text-text-secondary mb-6">
              確定要刪除這個自定義針法嗎？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteStitchId(null)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteStitch(confirmDeleteStitchId)}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除範本確認模態框 */}
      {confirmDeleteTemplateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">確認刪除</h3>
            <p className="text-text-secondary mb-6">
              確定要刪除這個針法群組範本嗎？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteTemplateId(null)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteTemplate(confirmDeleteTemplateId)}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 為範本添加針法的簡化選擇模態框 */}
      {showAddStitchToTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-primary mb-4">新增針法到範本</h3>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {Object.values(StitchType).filter(type => type !== StitchType.CUSTOM).map(stitchType => {
                const info = StitchTypeInfo[stitchType]
                return (
                  <button
                    key={stitchType}
                    onClick={() => handleAddStitchToTemplate(stitchType, 1)}
                    className="p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all flex flex-col items-center gap-1"
                  >
                    <div className="text-lg font-bold text-text-primary">{info.symbol}</div>
                    <div className="text-xs text-text-secondary text-center leading-tight">{info.rawValue}</div>
                  </button>
                )
              })}
            </div>

            {/* 自定義針法 */}
            {customStitches.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-secondary mb-2">我的自定義針法</h4>
                <div className="grid grid-cols-4 gap-2">
                  {customStitches.slice(0, 8).map(customStitch => (
                    <button
                      key={customStitch.id}
                      onClick={() => handleAddStitchToTemplate(StitchType.CUSTOM, 1, customStitch.name, customStitch.symbol)}
                      className="p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all flex flex-col items-center gap-1"
                    >
                      <div className="text-lg font-bold text-text-primary">{customStitch.symbol}</div>
                      <div className="text-xs text-text-secondary text-center leading-tight">{customStitch.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddStitchToTemplate(false)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}