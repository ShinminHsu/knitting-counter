import { useState } from 'react'

export interface CreateChartModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description: string, notes: string) => void
}

export default function CreateChartModal({
  isOpen,
  onClose,
  onCreate
}: CreateChartModalProps) {
  const [chartName, setChartName] = useState('')
  const [chartDescription, setChartDescription] = useState('')
  const [chartNotes, setChartNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chartName.trim()) return
    
    onCreate(chartName.trim(), chartDescription.trim(), chartNotes.trim())
    handleClose()
  }

  const handleClose = () => {
    setChartName('')
    setChartDescription('')
    setChartNotes('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          建立新織圖
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              織圖名稱 *
            </label>
            <input
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              className="input"
              placeholder="輸入織圖名稱，如：主體、袖子、領口等"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              描述（選填）
            </label>
            <input
              type="text"
              value={chartDescription}
              onChange={(e) => setChartDescription(e.target.value)}
              className="input"
              placeholder="織圖的簡單描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              備註（選填）
            </label>
            <textarea
              value={chartNotes}
              onChange={(e) => setChartNotes(e.target.value)}
              className="input"
              placeholder="織圖的詳細備註"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary flex-1"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
            >
              建立
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}