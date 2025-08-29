import { CiCircleCheck } from 'react-icons/ci'
import { RxCrossCircled } from 'react-icons/rx'

interface GroupEditorProps {
  groupName: string
  groupRepeatCount: string
  onNameChange: (name: string) => void
  onRepeatCountChange: (count: string) => void
  onConfirm: () => void
  onCancel: () => void
  onAddStitch: () => void
}

export default function GroupEditor({
  groupName,
  groupRepeatCount,
  onNameChange,
  onRepeatCountChange,
  onConfirm,
  onCancel,
  onAddStitch
}: GroupEditorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-1 mb-3">
        <input
          type="text"
          value={groupName}
          onChange={(e) => onNameChange(e.target.value)}
          className="input text-sm flex-1"
          placeholder="群組名稱"
        />
        <input
          type="text"
          value={groupRepeatCount}
          onChange={(e) => onRepeatCountChange(e.target.value)}
          onBlur={(e) => {
            // Apply validation on blur but don't override the controlled value
            const raw = e.target.value.trim()
            if (raw === '' || raw === '0') {
              onRepeatCountChange('1')
            } else if (!/^\d+$/.test(raw)) {
              alert('請輸入有效的數字（1 以上的整數）')
              onRepeatCountChange('1')
            } else {
              const num = parseInt(raw, 10)
              const clamped = Number.isNaN(num) || num <= 0 ? 1 : Math.max(1, num)
              onRepeatCountChange(String(clamped))
            }
          }}
          className="input text-sm w-20"
          placeholder="次數"
        />
        <span className="text-sm text-text-secondary">次</span>
        <button
          onClick={onConfirm}
          className="text-green-500 hover:text-green-600 p-2"
        >
          <CiCircleCheck className="w-5 h-5" />
        </button>
        <button
          onClick={onCancel}
          className="text-text-tertiary hover:text-text-secondary p-2"
        >
          <RxCrossCircled className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">群組針法</span>
        <button
          onClick={onAddStitch}
          className="btn btn-ghost text-xs px-2 py-1"
        >
          新增針法
        </button>
      </div>
    </div>
  )
}