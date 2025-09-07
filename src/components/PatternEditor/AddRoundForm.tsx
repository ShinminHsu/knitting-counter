interface AddRoundFormProps {
  isOpen: boolean
  isLoading: boolean
  newRoundNotes: string
  roundCount: number
  onNotesChange: (notes: string) => void
  onRoundCountChange: (count: number) => void
  onCancel: () => void
  onConfirm: () => void
}

export default function AddRoundForm({
  isOpen,
  isLoading,
  newRoundNotes,
  roundCount,
  onNotesChange,
  onRoundCountChange,
  onCancel,
  onConfirm
}: AddRoundFormProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          新增圈數
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            新增數量
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={roundCount === 0 ? '' : roundCount.toString()}
            onChange={(e) => {
              const value = e.target.value
              if (value === '') {
                onRoundCountChange(0) // 用0表示空值
                return
              }
              // 只允許數字
              if (!/^\d+$/.test(value)) return
              
              const numValue = parseInt(value)
              if (!isNaN(numValue)) {
                onRoundCountChange(Math.min(100, numValue))
              }
            }}
            onBlur={(e) => {
              // 失去焦點時，如果為空或0則設為1
              const value = e.target.value
              if (value === '' || parseInt(value) === 0) {
                onRoundCountChange(1)
              }
            }}
            className="input"
            placeholder="輸入要新增的圈數..."
          />
          <div className="text-xs text-text-tertiary mt-1">
            最多可同時新增 100 圈
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            備註（選填）
          </label>
          <input
            type="text"
            value={newRoundNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="input"
            placeholder="輸入備註..."
          />
          <div className="text-xs text-text-tertiary mt-1">
            {roundCount > 1 ? '此備註將套用到所有新增的圈數' : ''}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary flex-1"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary flex-1"
            disabled={isLoading}
          >
            {isLoading ? '新增中...' : `新增 ${roundCount} 圈`}
          </button>
        </div>
      </div>
    </div>
  )
}