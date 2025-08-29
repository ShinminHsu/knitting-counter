import { CiCircleCheck } from 'react-icons/ci'
import { RxCrossCircled } from 'react-icons/rx'
import { StitchType, StitchTypeInfo } from '../../types'

interface StitchEditorProps {
  stitchType: StitchType
  stitchCount: string
  onTypeChange: (type: StitchType) => void
  onCountChange: (count: string) => void
  onConfirm: () => void
  onCancel: () => void
  fieldKey?: string
}

export default function StitchEditor({
  stitchType,
  stitchCount,
  onTypeChange,
  onCountChange,
  onConfirm,
  onCancel,
  fieldKey = 'stitchEditor'
}: StitchEditorProps) {
  

  return (
    <div className="w-full">
      {/* 手機版：垂直佈局 */}
      <div className="block sm:hidden space-y-2">
        <select
          value={stitchType}
          onChange={(e) => onTypeChange(e.target.value as StitchType)}
          className="input text-base w-full"
          style={{ fontSize: '16px' }}
        >
          {Object.entries(StitchTypeInfo).map(([key, info]) => (
            <option key={key} value={key} style={{ fontSize: '16px' }}>
              {info.symbol} {info.rawValue}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={stitchCount || ''}
            onChange={(e) => {
              const value = e.target.value
              // 允許空字串和數字，立即更新
              if (value === '' || /^\d*$/.test(value)) {
                onCountChange(value)
              }
            }}
            onKeyDown={(e) => {
              // 允許複製貼上快捷鍵
              if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
                return
              }
              
              // 允許刪除鍵、方向鍵、Tab等控制鍵
              if (e.key === 'Backspace' ||
                  e.key === 'Delete' ||
                  e.key === 'ArrowLeft' ||
                  e.key === 'ArrowRight' ||
                  e.key === 'Tab' ||
                  e.key === 'Home' ||
                  e.key === 'End' ||
                  e.key.length > 1) {
                return
              }
              
              // 只允許數字鍵
              if (!/\d/.test(e.key)) {
                e.preventDefault()
              }
            }}
            onBlur={(e) => {
              const value = e.target.value.trim()
              // 如果為空或無效，設為1
              if (value === '' || !/^\d+$/.test(value) || parseInt(value) <= 0) {
                onCountChange('1')
              }
            }}
            className="input text-base flex-1"
            style={{ fontSize: '16px' }}
            placeholder="數量"
            autoFocus
          />
          <button
            type="button"
            onClick={onConfirm}
            className="text-green-500 hover:text-green-600 p-2 w-10 h-10 flex items-center justify-center bg-white border border-border rounded hover:bg-gray-50 transition-colors"
          >
            <CiCircleCheck className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-tertiary hover:text-text-secondary p-2 w-10 h-10 flex items-center justify-center bg-white border border-border rounded hover:bg-gray-50 transition-colors"
          >
            <RxCrossCircled className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 桌面版：水平佈局 */}
      <div className="hidden sm:flex items-center gap-2">
        <select
          value={stitchType}
          onChange={(e) => onTypeChange(e.target.value as StitchType)}
          className="input text-sm flex-1 min-w-0"
        >
          {Object.entries(StitchTypeInfo).map(([key, info]) => (
            <option key={key} value={key}>
              {info.symbol} {info.rawValue}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={stitchCount || ''}
          onChange={(e) => {
            const value = e.target.value
            // 允許空字串和數字，立即更新
            if (value === '' || /^\d*$/.test(value)) {
              onCountChange(value)
            }
          }}
          onKeyDown={(e) => {
            // 允許複製貼上快捷鍵
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
              return
            }
            
            // 允許刪除鍵、方向鍵、Tab等控制鍵
            if (e.key === 'Backspace' ||
                e.key === 'Delete' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === 'Tab' ||
                e.key === 'Home' ||
                e.key === 'End' ||
                e.key.length > 1) {
              return
            }
            
            // 只允許數字鍵
            if (!/\d/.test(e.key)) {
              e.preventDefault()
            }
          }}
          onBlur={(e) => {
            const value = e.target.value.trim()
            // 如果為空或無效，設為1
            if (value === '' || !/^\d+$/.test(value) || parseInt(value) <= 0) {
              onCountChange('1')
            }
          }}
          className="input text-sm w-16 flex-shrink-0"
          placeholder="數量"
          autoFocus
        />
        <button
          type="button"
          onClick={onConfirm}
          className="text-green-500 hover:text-green-600 p-1 w-8 h-8 flex items-center justify-center flex-shrink-0"
        >
          <CiCircleCheck className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-tertiary hover:text-text-secondary p-1 w-8 h-8 flex items-center justify-center flex-shrink-0"
        >
          <RxCrossCircled className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}