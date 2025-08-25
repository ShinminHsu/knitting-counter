import { useState, useEffect } from 'react'
import { StitchType, StitchTypeInfo, Yarn, StitchInfo } from '../types'
import { getStitchDisplayInfo } from '../utils'

interface StitchSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => void
  availableYarns: Yarn[]
  title?: string
  initialStitch?: StitchInfo
}

export default function StitchSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  availableYarns,
  title = "新增針法",
  initialStitch
}: StitchSelectionModalProps) {
  const [selectedStitchType, setSelectedStitchType] = useState<StitchType>(StitchType.SINGLE)
  const [count, setCount] = useState<number>(1)
  const [countText, setCountText] = useState<string>("1")
  const [selectedYarnId, setSelectedYarnId] = useState<string>(availableYarns[0]?.id || '')
  const [customName, setCustomName] = useState<string>('')
  const [customSymbol, setCustomSymbol] = useState<string>('')

  // 當有初始針法時，預填表單
  useEffect(() => {
    if (isOpen && initialStitch) {
      setSelectedStitchType(initialStitch.type)
      setCount(initialStitch.count)
      setCountText(initialStitch.count.toString())
      setSelectedYarnId(initialStitch.yarnId)
      setCustomName(initialStitch.customName || '')
      setCustomSymbol(initialStitch.customSymbol || '')
    } else if (isOpen && !initialStitch) {
      // 重置為預設值
      setSelectedStitchType(StitchType.SINGLE)
      setCount(1)
      setCountText("1")
      setSelectedYarnId(availableYarns[0]?.id || '')
      setCustomName('')
      setCustomSymbol('')
    }
  }, [isOpen, initialStitch, availableYarns])

  const handleConfirm = () => {
    onConfirm(selectedStitchType, count, selectedYarnId, customName || undefined, customSymbol || undefined)
    onClose()
    // Reset form
    setSelectedStitchType(StitchType.SINGLE)
    setCount(1)
    setCountText("1")
    setSelectedYarnId(availableYarns[0]?.id || '')
    setCustomName('')
    setCustomSymbol('')
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setSelectedStitchType(StitchType.SINGLE)
    setCount(1)
    setCountText("1")
    setSelectedYarnId(availableYarns[0]?.id || '')
    setCustomName('')
    setCustomSymbol('')
  }

  if (!isOpen) return null

  const selectedYarn = availableYarns.find(yarn => yarn.id === selectedYarnId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          {title}
        </h2>

        {/* 針法類型選擇 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3">針法類型</h3>
          
          {/* 手機版：下拉式選單 */}
          <div className="block sm:hidden">
            <select
              value={selectedStitchType}
              onChange={(e) => setSelectedStitchType(e.target.value as StitchType)}
              className="input w-full text-base"
              style={{ fontSize: '16px' }}
            >
              {Object.entries(StitchTypeInfo).map(([key, info]) => (
                <option key={key} value={key} style={{ fontSize: '16px' }}>
                  {info.symbol} {info.rawValue} ({info.englishName})
                </option>
              ))}
            </select>
          </div>

          {/* 電腦版：網格選擇 */}
          <div className="hidden sm:grid grid-cols-6 gap-3">
            {Object.entries(StitchTypeInfo).map(([key, info]) => (
              <div
                key={key}
                className={`
                  p-3 rounded-lg border-2 cursor-pointer transition-all
                  flex flex-col items-center justify-center min-h-[80px]
                  ${selectedStitchType === key 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                  }
                `}
                onClick={() => setSelectedStitchType(key as StitchType)}
              >
                <div className={`text-xl font-bold mb-1 ${
                  selectedStitchType === key ? 'text-primary' : 'text-text-primary'
                }`}>
                  {info.symbol}
                </div>
                <div className={`text-xs font-medium text-center leading-tight ${
                  selectedStitchType === key ? 'text-text-primary' : 'text-text-secondary'
                }`}>
                  {info.rawValue}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {info.englishName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 自定義針法輸入 */}
        {selectedStitchType === StitchType.CUSTOM && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">自定義針法</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  針法名稱
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input"
                  placeholder="輸入針法名稱"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  針法符號
                </label>
                <input
                  type="text"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  className="input text-center text-lg font-mono"
                  placeholder="輸入符號"
                  maxLength={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* 數量選擇 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3">數量</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const newCount = Math.max(1, count - 1)
                setCount(newCount)
                setCountText(newCount.toString())
              }}
              className="w-10 h-10 rounded-lg border border-border hover:border-primary flex items-center justify-center text-text-primary hover:bg-background-tertiary transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="100"
              value={countText}
              onChange={(e) => {
                const value = e.target.value
                setCountText(value)
                
                if (value === '') {
                  // Allow empty input temporarily
                  return
                }
                
                const numValue = parseInt(value)
                if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                  setCount(numValue)
                }
              }}
              onBlur={(e) => {
                const value = e.target.value
                if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
                  setCount(1)
                  setCountText("1")
                } else {
                  const numValue = Math.min(100, Math.max(1, parseInt(value)))
                  setCount(numValue)
                  setCountText(numValue.toString())
                }
              }}
              className="input text-center w-20"
            />
            <button
              onClick={() => {
                const newCount = Math.min(100, count + 1)
                setCount(newCount)
                setCountText(newCount.toString())
              }}
              className="w-10 h-10 rounded-lg border border-border hover:border-primary flex items-center justify-center text-text-primary hover:bg-background-tertiary transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* 毛線顏色選擇 */}
        {availableYarns.length > 1 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">毛線顏色</h3>
            <div className="space-y-2">
              {availableYarns.map((yarn) => (
                <div
                  key={yarn.id}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                    ${selectedYarnId === yarn.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                    }
                  `}
                  onClick={() => setSelectedYarnId(yarn.id)}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: yarn.color.hex }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">
                      {yarn.name}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {yarn.color.name}
                      {yarn.brand && ` • ${yarn.brand}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 預覽 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3">預覽</h3>
          <div className="p-4 bg-background-tertiary rounded-lg">
            <div className="flex items-center gap-3">
              {selectedYarn && (
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: selectedYarn.color.hex }}
                />
              )}
              <div className="text-xl font-bold text-text-primary">
                {(() => {
                  if (selectedStitchType === StitchType.CUSTOM) {
                    return customSymbol || '?'
                  }
                  const tempStitch: StitchInfo = {
                    id: 'temp',
                    type: selectedStitchType,
                    yarnId: '',
                    count: 1
                  }
                  return getStitchDisplayInfo(tempStitch).symbol
                })()}
              </div>
              <div className="flex-1">
                <div className="font-medium text-text-primary">
                  {(() => {
                    if (selectedStitchType === StitchType.CUSTOM) {
                      return customName || '自定義'
                    }
                    const tempStitch: StitchInfo = {
                      id: 'temp',
                      type: selectedStitchType,
                      yarnId: '',
                      count: 1
                    }
                    return getStitchDisplayInfo(tempStitch).rawValue
                  })()}
                </div>
                {selectedYarn && (
                  <div className="text-sm text-text-secondary">
                    {selectedYarn.name}
                  </div>
                )}
              </div>
              <div className="text-lg font-medium text-text-primary">
                ×{count}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary flex-1"
            disabled={selectedStitchType === StitchType.CUSTOM && (!customName.trim() || !customSymbol.trim())}
          >
            確認
          </button>
        </div>
      </div>
    </div>
  )
}