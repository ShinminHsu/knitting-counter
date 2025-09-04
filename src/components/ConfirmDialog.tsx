import React from 'react'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '確定',
  cancelText = '取消'
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          {title}
        </h2>
        
        <p className="text-text-secondary mb-6 leading-relaxed">
          {message}
        </p>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary flex-1"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-primary flex-1"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}