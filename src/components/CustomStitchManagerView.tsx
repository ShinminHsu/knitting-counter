import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomStitchStore } from '../stores'
import { CustomStitchPattern } from '../types'
import { validateCustomStitch } from '../stores/useCustomStitchStore'

export default function CustomStitchManagerView() {
  const navigate = useNavigate()
  const {
    customStitches,
    isLoading,
    createCustomStitch,
    updateCustomStitch,
    deleteCustomStitch,
    duplicateCustomStitch,
    searchCustomStitches,
    getRecentlyUsedCustomStitches,
    getPopularCustomStitches
  } = useCustomStitchStore()

  // 狀態管理
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStitches, setFilteredStitches] = useState<CustomStitchPattern[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingStitch, setEditingStitch] = useState<CustomStitchPattern | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'all' | 'recent' | 'popular'>('all')
  
  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    englishName: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState<string[]>([])

  // 更新篩選的針法列表
  useEffect(() => {
    let result: CustomStitchPattern[] = []
    
    switch (selectedTab) {
      case 'recent':
        result = getRecentlyUsedCustomStitches()
        break
      case 'popular':
        result = getPopularCustomStitches()
        break
      default:
        result = customStitches
    }

    if (searchQuery.trim()) {
      result = searchCustomStitches(searchQuery)
    }

    setFilteredStitches(result)
  }, [customStitches, searchQuery, selectedTab, searchCustomStitches, getRecentlyUsedCustomStitches, getPopularCustomStitches])

  // 重置表單
  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      englishName: '',
      description: ''
    })
    setFormErrors([])
    setEditingStitch(null)
  }

  // 開啟新增模態框
  const handleOpenCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  // 開啟編輯模態框
  const handleOpenEditModal = (stitch: CustomStitchPattern) => {
    setFormData({
      name: stitch.name,
      symbol: stitch.symbol,
      englishName: stitch.englishName,
      description: stitch.description || ''
    })
    setEditingStitch(stitch)
    setShowCreateModal(true)
  }

  // 儲存針法（新增或編輯）
  const handleSaveStitch = async () => {
    // 驗證表單
    const tempStitch: CustomStitchPattern = {
      id: '',
      name: formData.name,
      symbol: formData.symbol,
      englishName: formData.englishName,
      description: formData.description,
      createdDate: new Date(),
      useCount: 0
    }
    
    const validation = validateCustomStitch(tempStitch)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      return
    }

    try {
      if (editingStitch) {
        // 更新現有針法
        await updateCustomStitch(editingStitch.id, {
          name: formData.name,
          symbol: formData.symbol,
          englishName: formData.englishName,
          description: formData.description
        })
      } else {
        // 新增針法
        await createCustomStitch(
          formData.name,
          formData.symbol,
          formData.englishName,
          formData.description
        )
      }

      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : '保存失敗'])
    }
  }

  // 刪除針法
  const handleDeleteStitch = async (stitchId: string) => {
    try {
      await deleteCustomStitch(stitchId)
      setConfirmDeleteId(null)
    } catch (error) {
      console.error('刪除針法失敗:', error)
    }
  }

  // 複製針法
  const handleDuplicateStitch = async (stitchId: string) => {
    try {
      await duplicateCustomStitch(stitchId)
    } catch (error) {
      console.error('複製針法失敗:', error)
    }
  }

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
            <h1 className="text-xl font-semibold text-text-primary">自定義針法管理</h1>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
          >
            新增針法
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {/* 搜尋欄和分頁標籤 */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜尋針法名稱、符號或縮寫..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          {/* 分頁標籤 */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                selectedTab === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              全部 ({customStitches.length})
            </button>
            <button
              onClick={() => setSelectedTab('recent')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                selectedTab === 'recent'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              最近使用 ({getRecentlyUsedCustomStitches().length})
            </button>
            <button
              onClick={() => setSelectedTab('popular')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                selectedTab === 'popular'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              熱門 ({getPopularCustomStitches().length})
            </button>
          </div>
        </div>

        {/* 針法列表 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">載入中...</p>
            </div>
          ) : filteredStitches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary">
                {searchQuery ? '沒有找到符合的針法' : '還沒有任何自定義針法'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenCreateModal}
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
                        onClick={() => handleOpenEditModal(stitch)}
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
                        onClick={() => setConfirmDeleteId(stitch.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        title="刪除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 針法資訊 */}
                  {stitch.description && (
                    <p className="text-sm text-text-secondary mb-3">{stitch.description}</p>
                  )}

                  <div className="flex justify-between text-xs text-text-tertiary">
                    <span>使用次數: {stitch.useCount}</span>
                    <span>{stitch.createdDate.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增/編輯針法模態框 */}
      {showCreateModal && (
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
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
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
                  value={formData.englishName}
                  onChange={(e) => setFormData(prev => ({ ...prev, englishName: e.target.value }))}
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
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full resize-none"
                  placeholder="描述這個針法的用途或特色"
                  rows={3}
                  maxLength={100}
                />
              </div>

              {/* 預覽 */}
              {formData.name && formData.symbol && formData.englishName && (
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <div className="text-sm text-text-secondary mb-1">預覽：</div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-primary">{formData.symbol}</div>
                    <div>
                      <div className="font-medium text-text-primary">{formData.name}</div>
                      <div className="text-sm text-text-secondary">{formData.englishName}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 錯誤訊息 */}
              {formErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <ul className="text-sm text-red-600 space-y-1">
                    {formErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSaveStitch}
                disabled={!formData.name.trim() || !formData.symbol.trim() || !formData.englishName.trim()}
                className="btn btn-primary flex-1"
              >
                {editingStitch ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認模態框 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">確認刪除</h3>
            <p className="text-text-secondary mb-6">
              確定要刪除這個自定義針法嗎？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteStitch(confirmDeleteId)}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}