interface AddRoundFormProps {
  isOpen: boolean
  isLoading: boolean
  newRoundNotes: string
  onNotesChange: (notes: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export default function AddRoundForm({
  isOpen,
  isLoading,
  newRoundNotes,
  onNotesChange,
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
            備註（選填）
          </label>
          <input
            type="text"
            value={newRoundNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="input"
            placeholder="輸入備註..."
          />
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
            {isLoading ? '新增中...' : '新增'}
          </button>
        </div>
      </div>
    </div>
  )
}