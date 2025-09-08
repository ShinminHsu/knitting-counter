import { useState, useEffect } from 'react'
import { StitchType, StitchTypeInfo, Yarn, StitchInfo } from '../types'
import { getStitchDisplayInfo } from '../utils'
import { useCustomStitchStore } from '../stores'

// 針法分組定義
const stitchGroups = {
  basic: {
    title: '基礎針法',
    stitches: [
      StitchType.SINGLE,
      StitchType.HALF_DOUBLE, 
      StitchType.DOUBLE,
      StitchType.TRIPLE,
      StitchType.CHAIN,
      StitchType.SLIP,
      StitchType.MAGIC_RING
    ]
  },
  increase: {
    title: '加針',
    stitches: [
      StitchType.SINGLE_INCREASE,
      StitchType.HALF_DOUBLE_INCREASE,
      StitchType.DOUBLE_INCREASE,
      StitchType.TRIPLE_INCREASE,
      StitchType.INCREASE
    ]
  },
  decrease: {
    title: '減針',
    stitches: [
      StitchType.SINGLE_DECREASE,
      StitchType.HALF_DOUBLE_DECREASE,
      StitchType.DOUBLE_DECREASE,
      StitchType.TRIPLE_DECREASE,
      StitchType.DECREASE
    ]
  },
  special: {
    title: '特殊針法',
    stitches: [
      StitchType.FRONT_POST,
      StitchType.BACK_POST
    ]
  },
  knitting: {
    title: '棒針',
    stitches: [
      StitchType.KNIT,
      StitchType.PURL,
      StitchType.KNIT_FRONT_BACK,
      StitchType.PURL_FRONT_BACK,
      StitchType.KNIT_TWO_TOGETHER,
      StitchType.PURL_TWO_TOGETHER,
      StitchType.SLIP_SLIP_KNIT,
      StitchType.YARN_OVER,
      StitchType.SLIP_STITCH_KNIT,
      StitchType.CABLE_FRONT,
      StitchType.CABLE_BACK
    ]
  }
}

interface StitchSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (stitchType: StitchType, count: number, yarnId: string, customName?: string, customSymbol?: string) => void
  availableYarns: Yarn[]
  title?: string
  initialStitch?: StitchInfo
}

const IncreaseTooltipContent = () => (
  <div className="text-sm text-text-primary leading-relaxed">
    <p className="mb-2"><strong>加針說明：</strong></p>
    <p className="mb-2">
      <strong>短針加針</strong>、<strong>中長針加針</strong>、<strong>長針加針</strong>、<strong>長長針加針</strong>
      這四個針目會自動讓針目數量變二，代表的是一個對應的針法跟一個加針。
    </p>
    <p>
      如果只是選擇 <strong>加針</strong>，那麼針目計算數量會為1，讓用戶自由選擇需要加幾針時使用。
    </p>
  </div>
)

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
  const [customEnglishName, setCustomEnglishName] = useState<string>('')
  const [showIncreaseTooltip, setShowIncreaseTooltip] = useState<boolean>(false)
  const [showSaveCustomModal, setShowSaveCustomModal] = useState<boolean>(false)
  const [selectedCustomStitchId, setSelectedCustomStitchId] = useState<string>('')
  
  // 自定義針法 store
  const { customStitches, createCustomStitch, useCustomStitch } = useCustomStitchStore()

  // Body scroll lock for mobile
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scroll position
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  // 當有初始針法時，預填表單
  useEffect(() => {
    if (isOpen && initialStitch) {
      setSelectedStitchType(initialStitch.type)
      setCount(initialStitch.count)
      setCountText(initialStitch.count.toString())
      setSelectedYarnId(initialStitch.yarnId)
      setCustomName(initialStitch.customName || '')
      setCustomSymbol(initialStitch.customSymbol || '')
      
      // 如果是自定義針法，嘗試從自定義針法庫中找到對應的英文縮寫
      if (initialStitch.type === StitchType.CUSTOM && initialStitch.customName && initialStitch.customSymbol) {
        const matchingCustomStitch = customStitches.find(
          stitch => stitch.name === initialStitch.customName && stitch.symbol === initialStitch.customSymbol
        )
        if (matchingCustomStitch) {
          setCustomEnglishName(matchingCustomStitch.englishName)
          setSelectedCustomStitchId(matchingCustomStitch.id)
        } else {
          // 如果在庫中找不到，可能是舊的自定義針法，設置一個默認的英文縮寫
          setCustomEnglishName('custom')
          setSelectedCustomStitchId('')
        }
      } else {
        setCustomEnglishName('')
        setSelectedCustomStitchId('')
      }
    } else if (isOpen && !initialStitch) {
      // 重置為預設值
      resetForm()
    }
  }, [isOpen, initialStitch, availableYarns, customStitches])

  const resetForm = () => {
    setSelectedStitchType(StitchType.SINGLE)
    setCount(1)
    setCountText("1")
    setSelectedYarnId(availableYarns[0]?.id || '')
    setCustomName('')
    setCustomSymbol('')
    setCustomEnglishName('')
    setSelectedCustomStitchId('')
    setShowSaveCustomModal(false)
  }

  const handleConfirm = () => {
    onConfirm(selectedStitchType, count, selectedYarnId, customName || undefined, customSymbol || undefined)
    onClose()
    resetForm()
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  // 選擇自定義針法
  const handleSelectCustomStitch = async (customStitchId: string) => {
    const customStitch = await useCustomStitch(customStitchId)
    if (customStitch) {
      setSelectedStitchType(StitchType.CUSTOM)
      setCustomName(customStitch.name)
      setCustomSymbol(customStitch.symbol)
      setCustomEnglishName(customStitch.englishName)
      setSelectedCustomStitchId(customStitchId)
    }
  }

  // 保存當前自定義針法
  const handleSaveCustomStitch = async (name: string, englishName: string) => {
    if (selectedStitchType === StitchType.CUSTOM && customName.trim() && customSymbol.trim()) {
      await createCustomStitch(name || customName, customSymbol, englishName)
      setShowSaveCustomModal(false)
    }
  }


  if (!isOpen) return null

  const selectedYarn = availableYarns.find(yarn => yarn.id === selectedYarnId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-[80]">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-lg sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          {title}
        </h2>

        {/* 分組針法選擇 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-text-secondary">針法類型</h3>
            <div className="relative sm:hidden">
              <div
                className="w-3 h-3 rounded-full border border-text-tertiary flex items-center justify-center cursor-help"
                onClick={() => setShowIncreaseTooltip(!showIncreaseTooltip)}
              >
                <span className="text-xs">?</span>
              </div>
              {showIncreaseTooltip && (
                <div className="absolute z-10 w-80 p-3 bg-background-secondary border border-border rounded-lg shadow-lg top-6 -left-32">
                  <IncreaseTooltipContent />
                </div>
              )}
            </div>
          </div>
          
          {/* 手機版：分組下拉選單 */}
          <div className="block sm:hidden">
            <select
              value={selectedCustomStitchId ? `custom-${selectedCustomStitchId}` : selectedStitchType}
              onChange={(e) => {
                const value = e.target.value
                if (value.startsWith('custom-')) {
                  const customStitchId = value.replace('custom-', '')
                  handleSelectCustomStitch(customStitchId)
                } else {
                  setSelectedStitchType(value as StitchType)
                  setSelectedCustomStitchId('')
                  setCustomName('')
                  setCustomSymbol('')
                  setCustomEnglishName('')
                }
              }}
              className="input w-full text-base"
              style={{ fontSize: '16px' }}
            >
              {/* 我的自定義針法分組 */}
              {customStitches.length > 0 && (
                <optgroup label="我的自定義針法">
                  {customStitches.slice(0, 10).map((customStitch) => (
                    <option 
                      key={`custom-${customStitch.id}`} 
                      value={`custom-${customStitch.id}`}
                      style={{ fontSize: '16px' }}
                    >
                      {customStitch.symbol} {customStitch.name} ({customStitch.englishName})
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* 預設針法分組 */}
              {Object.entries(stitchGroups).map(([groupKey, group]) => (
                <optgroup key={groupKey} label={group.title}>
                  {group.stitches.map((stitchType) => {
                    const info = StitchTypeInfo[stitchType]
                    return (
                      <option key={stitchType} value={stitchType} style={{ fontSize: '16px' }}>
                        {info.symbol} {info.rawValue} ({info.englishName})
                      </option>
                    )
                  })}
                </optgroup>
              ))}
              <option value={StitchType.CUSTOM}>? 自定義 (custom)</option>
            </select>
          </div>

          {/* 電腦版：分組網格選擇 */}
          <div className="hidden sm:block space-y-4">
            {/* 我的自定義針法 */}
            {customStitches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-text-tertiary">我的自定義針法</h4>
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      // TODO: 導航到自定義針法管理頁面
                      alert('自定義針法管理功能即將推出！')
                    }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    管理
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {customStitches.slice(0, 16).map((customStitch) => (
                    <div
                      key={customStitch.id}
                      className={`
                        p-2 rounded-lg border-2 cursor-pointer transition-all
                        flex flex-col items-center justify-center min-h-[70px]
                        ${selectedCustomStitchId === customStitch.id
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                        }
                      `}
                      onClick={() => handleSelectCustomStitch(customStitch.id)}
                    >
                      <div className={`text-lg font-bold mb-1 ${
                        selectedCustomStitchId === customStitch.id ? 'text-primary' : 'text-text-primary'
                      }`}>
                        {customStitch.symbol}
                      </div>
                      <div className={`text-xs font-medium text-center leading-tight ${
                        selectedCustomStitchId === customStitch.id ? 'text-text-primary' : 'text-text-secondary'
                      }`}>
                        {customStitch.name}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        {customStitch.englishName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 預設針法分組 */}
            {Object.entries(stitchGroups).map(([groupKey, group]) => (
              <div key={groupKey}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-medium text-text-tertiary">{group.title}</h4>
                  {groupKey === 'increase' && (
                    <div className="relative">
                      <div
                        className="w-3 h-3 rounded-full border border-text-tertiary flex items-center justify-center cursor-help hover:border-primary hover:text-primary transition-colors"
                        onMouseEnter={() => setShowIncreaseTooltip(true)}
                        onMouseLeave={() => setShowIncreaseTooltip(false)}
                        onClick={() => setShowIncreaseTooltip(!showIncreaseTooltip)}
                      >
                        <span className="text-xs">?</span>
                      </div>
                      {showIncreaseTooltip && (
                        <div className="absolute z-10 w-80 p-3 bg-background-secondary border border-border rounded-lg shadow-lg -top-2 left-6">
                          <IncreaseTooltipContent />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {group.stitches.map((stitchType) => {
                    const info = StitchTypeInfo[stitchType]
                    return (
                      <div
                        key={stitchType}
                        className={`
                          p-2 rounded-lg border-2 cursor-pointer transition-all
                          flex flex-col items-center justify-center min-h-[70px]
                          ${selectedStitchType === stitchType 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                          }
                        `}
                        onClick={() => setSelectedStitchType(stitchType)}
                      >
                        <div className={`text-lg font-bold mb-1 ${
                          selectedStitchType === stitchType ? 'text-primary' : 'text-text-primary'
                        }`}>
                          {info.symbol}
                        </div>
                        <div className={`text-xs font-medium text-center leading-tight ${
                          selectedStitchType === stitchType ? 'text-text-primary' : 'text-text-secondary'
                        }`}>
                          {info.rawValue}
                        </div>
                        <div className="text-xs text-text-tertiary mt-1">
                          {info.englishName}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            
            {/* 自定義針法 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-medium text-text-tertiary">自定義</h4>
              </div>
              <div className="grid grid-cols-8 gap-2">
                <div
                  className={`
                    p-2 rounded-lg border-2 cursor-pointer transition-all
                    flex flex-col items-center justify-center min-h-[70px]
                    ${selectedStitchType === StitchType.CUSTOM && !selectedCustomStitchId
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                    }
                  `}
                  onClick={() => {
                    setSelectedStitchType(StitchType.CUSTOM)
                    setSelectedCustomStitchId('')
                    setCustomName('')
                    setCustomSymbol('')
                    setCustomEnglishName('')
                  }}
                >
                  <div className={`text-lg font-bold mb-1 ${
                    selectedStitchType === StitchType.CUSTOM && !selectedCustomStitchId ? 'text-primary' : 'text-text-primary'
                  }`}>
                    ?
                  </div>
                  <div className={`text-xs font-medium text-center leading-tight ${
                    selectedStitchType === StitchType.CUSTOM && !selectedCustomStitchId ? 'text-text-primary' : 'text-text-secondary'
                  }`}>
                    自定義
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 自定義針法輸入 */}
        {selectedStitchType === StitchType.CUSTOM && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-secondary">自定義針法</h3>
              {customStitches.length > 0 && (
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    // TODO: 導航到自定義針法管理頁面
                    alert('自定義針法管理功能即將推出！')
                  }}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  管理已保存的針法
                </button>
              )}
            </div>
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
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  英文縮寫
                </label>
                <input
                  type="text"
                  value={customEnglishName}
                  onChange={(e) => setCustomEnglishName(e.target.value)}
                  className="input text-center"
                  placeholder="例如: dc, sc, hdc"
                  maxLength={10}
                />
              </div>
              {selectedStitchType === StitchType.CUSTOM && customName.trim() && customSymbol.trim() && customEnglishName.trim() && (
                  <button
                    onClick={() => setShowSaveCustomModal(true)}
                    className="text-sm px-2 py-1 btn btn-primary mb-4"
                  >
                    點此保存此自定義針法
                  </button>
                )}
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
            disabled={selectedStitchType === StitchType.CUSTOM && (!customName.trim() || !customSymbol.trim() || !customEnglishName.trim())}
          >
            確認
          </button>
        </div>
      </div>

      {/* 保存自定義針法模態框 */}
      {showSaveCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-[90]">
          <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              保存自定義針法
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  針法名稱
                </label>
                <input
                  type="text"
                  defaultValue={customName}
                  className="input"
                  placeholder="輸入針法名稱"
                  id="save-custom-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  英文縮寫
                </label>
                <input
                  type="text"
                  defaultValue={customEnglishName}
                  className="input"
                  placeholder="例如: dc, sc, hdc"
                  id="save-custom-english"
                  maxLength={10}
                />
              </div>
              
              <div className="p-3 bg-background-tertiary rounded-lg">
                <div className="text-sm text-text-secondary mb-1">預覽：</div>
                <div className="text-xl font-bold text-text-primary">
                  {customSymbol} {customName} ({customEnglishName})
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveCustomModal(false)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const nameInput = document.getElementById('save-custom-name') as HTMLInputElement
                  const englishInput = document.getElementById('save-custom-english') as HTMLInputElement
                  handleSaveCustomStitch(nameInput.value.trim(), englishInput.value.trim())
                }}
                className="btn btn-primary flex-1"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}