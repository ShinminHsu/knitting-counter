import { useState, useEffect } from 'react'

export interface EditProjectModalProps {
  isOpen: boolean
  project: any
  onClose: () => void
  onSave: (name: string, source: string, notes: string) => void
}

export default function EditProjectModal({
  isOpen,
  project,
  onClose,
  onSave
}: EditProjectModalProps) {
  const [editName, setEditName] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (isOpen && project) {
      setEditName(project.name)
      setEditSource(project.source || '')
      setEditNotes(project.notes || '')
    }
  }, [isOpen, project])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    
    onSave(editName.trim(), editSource.trim(), editNotes.trim())
  }

  const handleClose = () => {
    setEditName('')
    setEditSource('')
    setEditNotes('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          編輯專案資訊
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              專案名稱 *
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input"
              placeholder="輸入專案名稱"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              來源網址（選填）
            </label>
            <input
              type="url"
              value={editSource}
              onChange={(e) => setEditSource(e.target.value)}
              className="input"
              placeholder="https://..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              備註（選填）
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder="專案的詳細備註或說明..."
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
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}