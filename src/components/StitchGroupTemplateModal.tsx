import { useState, useEffect } from 'react'
import { StitchGroupTemplate, StitchGroup, StitchInfo } from '../types'
import { useSyncedAppStore } from '../store/syncedAppStore'
import { getStitchDisplayInfo, formatDate } from '../utils'

interface StitchGroupTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: StitchGroupTemplate) => void
  groupToSave?: StitchGroup
  mode: 'save' | 'select'
  title?: string
}

export default function StitchGroupTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  groupToSave,
  mode,
  title
}: StitchGroupTemplateModalProps) {
  const { stitchGroupTemplates, saveStitchGroupAsTemplate, deleteStitchGroupTemplate } = useSyncedAppStore()
  
  // 存為範本的狀態
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  
  // 選擇範本的狀態
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [repeatCount, setRepeatCount] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // 重置表單
  useEffect(() => {
    if (isOpen) {
      if (mode === 'save' && groupToSave) {
        setTemplateName(groupToSave.name)
        setTemplateDescription('')
        setTemplateCategory('')
      } else {
        setTemplateName('')
        setTemplateDescription('')
        setTemplateCategory('')
        setSelectedTemplateId('')
        setRepeatCount(1)
        setSearchQuery('')
        setSelectedCategory('')
      }
    }
  }, [isOpen, mode, groupToSave])

  const handleSaveTemplate = async () => {
    if (!groupToSave || !templateName.trim()) return
    
    await saveStitchGroupAsTemplate(
      groupToSave, 
      templateName, 
      templateDescription || undefined, 
      templateCategory || undefined
    )
    onClose()
  }

  const handleSelectTemplate = () => {
    const template = stitchGroupTemplates.find(t => t.id === selectedTemplateId)
    if (template) {
      onSelectTemplate(template)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('確定要刪除此範本嗎？')) {
      await deleteStitchGroupTemplate(templateId)
    }
  }

  // 過濾範本
  const filteredTemplates = stitchGroupTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // 獲取所有分類
  const categories = Array.from(new Set(stitchGroupTemplates.map(t => t.category).filter(Boolean)))

  if (!isOpen) return null

  const modalTitle = title || (mode === 'save' ? '存為範本' : '選擇範本')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          {modalTitle}
        </h2>

        {mode === 'save' && groupToSave && (
          <div className="space-y-4">
            {/* 預覽要儲存的群組 */}
            <div className="p-4 bg-background-tertiary rounded-lg">
              <h3 className="text-sm font-medium text-text-secondary mb-2">針目群組預覽</h3>
              <div className="text-lg font-semibold text-text-primary mb-2">{groupToSave.name}</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {groupToSave.stitches.map((stitch: StitchInfo, index: number) => {
                  const displayInfo = getStitchDisplayInfo(stitch)
                  return (
                    <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                      {displayInfo.symbol} {displayInfo.rawValue} ×{stitch.count}
                    </span>
                  )
                })}
              </div>
              <div className="text-sm text-text-tertiary">重複 {groupToSave.repeatCount} 次</div>
            </div>

            {/* 範本資訊輸入 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                範本名稱 *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="input"
                placeholder="輸入範本名稱"
                maxLength={50}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                描述
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="input min-h-20"
                placeholder="描述此範本的用途或特點"
                maxLength={200}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                分類
              </label>
              <input
                type="text"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="input"
                placeholder="例如：花邊、基礎、裝飾等"
                maxLength={20}
              />
            </div>
          </div>
        )}

        {mode === 'select' && (
          <div className="space-y-4">
            {/* 搜尋和篩選 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  placeholder="搜尋範本名稱或描述"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input"
                >
                  <option value="">所有分類</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 範本列表 */}
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-tertiary">
                  {stitchGroupTemplates.length === 0 ? '尚無儲存的範本' : '無符合條件的範本'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-text-primary">{template.name}</h3>
                        {template.category && (
                          <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded mt-1">
                            {template.category}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTemplate(template.id)
                        }}
                        className="text-text-tertiary hover:text-red-500 text-sm"
                      >
                        刪除
                      </button>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-text-secondary mb-2">{template.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {template.stitches.map((stitch, index) => {
                        const displayInfo = getStitchDisplayInfo(stitch)
                        return (
                          <span key={index} className="px-2 py-1 bg-background-tertiary text-text-primary rounded text-xs">
                            {displayInfo.symbol} {displayInfo.rawValue} ×{stitch.count}
                          </span>
                        )
                      })}
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-text-tertiary">
                      <div className="flex gap-4">
                        <span>建立於 {formatDate(template.createdDate)}</span>
                        <span>使用 {template.useCount} 次</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            取消
          </button>
          <button
            onClick={mode === 'save' ? handleSaveTemplate : handleSelectTemplate}
            className="btn btn-primary flex-1"
            disabled={
              mode === 'save' 
                ? !templateName.trim()
                : !selectedTemplateId
            }
          >
            {mode === 'save' ? '儲存範本' : '使用範本'}
          </button>
        </div>
      </div>
    </div>
  )
}