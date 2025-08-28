import { useState, useEffect } from 'react'
import { Round } from '../types'

interface CopyRoundModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (targetRoundNumber: number, insertPosition: 'before' | 'after') => void
  sourceRound: Round | null
  allRounds: Round[]
}

export default function CopyRoundModal({
  isOpen,
  onClose,
  onConfirm,
  sourceRound,
  allRounds
}: CopyRoundModalProps) {
  const [insertType, setInsertType] = useState<'start' | 'end' | 'before' | 'after'>('end')
  const [targetRoundNumber, setTargetRoundNumber] = useState<number>(1)
  const [insertPosition, setInsertPosition] = useState<'before' | 'after'>('after')

  // 重置表單
  useEffect(() => {
    if (isOpen) {
      setInsertType('end')
      setTargetRoundNumber(allRounds.length > 0 ? allRounds[0].roundNumber : 1)
      setInsertPosition('after')
    }
  }, [isOpen, allRounds])

  const handleConfirm = () => {
    let finalTargetRoundNumber: number
    let finalInsertPosition: 'before' | 'after' = 'after'

    switch (insertType) {
      case 'start':
        // 插入到最前面，目標是第一圈的前面
        finalTargetRoundNumber = Math.min(...allRounds.map(r => r.roundNumber))
        finalInsertPosition = 'before'
        break
      case 'end':
        // 插入到最後面，目標是最後一圈的後面
        finalTargetRoundNumber = Math.max(...allRounds.map(r => r.roundNumber))
        finalInsertPosition = 'after'
        break
      case 'before':
      case 'after':
        finalTargetRoundNumber = targetRoundNumber
        finalInsertPosition = insertPosition
        break
    }

    onConfirm(finalTargetRoundNumber, finalInsertPosition)
    onClose() // Close modal after confirmation
  }

  if (!isOpen || !sourceRound) return null

  // 取得所有圈數編號並排序
  const sortedRounds = [...allRounds].sort((a, b) => a.roundNumber - b.roundNumber)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background-secondary rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          複製圈數位置選擇
        </h2>

        {/* 來源圈數資訊 */}
        <div className="mb-6 p-4 bg-background-tertiary rounded-lg">
          <h3 className="text-sm font-medium text-text-secondary mb-2">複製來源</h3>
          <div className="font-semibold text-text-primary">第 {sourceRound.roundNumber} 圈</div>
          {sourceRound.notes && (
            <div className="text-sm text-text-secondary mt-1">{sourceRound.notes}</div>
          )}
        </div>

        {/* 插入位置選擇 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3">插入位置</h3>
          
          <div className="space-y-3">
            {/* 插入到最前面 */}
            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors">
              <input
                type="radio"
                name="insertType"
                value="start"
                checked={insertType === 'start'}
                onChange={(e) => setInsertType(e.target.value as any)}
                className="text-primary"
              />
              <div>
                <div className="font-medium text-text-primary">插入到最前面</div>
                <div className="text-sm text-text-secondary">成為第 1 圈，其他圈數後移</div>
              </div>
            </label>

            {/* 插入到最後面 */}
            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors">
              <input
                type="radio"
                name="insertType"
                value="end"
                checked={insertType === 'end'}
                onChange={(e) => setInsertType(e.target.value as any)}
                className="text-primary"
              />
              <div>
                <div className="font-medium text-text-primary">插入到最後面</div>
                <div className="text-sm text-text-secondary">
                  成為第 {Math.max(...allRounds.map(r => r.roundNumber)) + 1} 圈
                </div>
              </div>
            </label>

            {/* 插入到指定位置 */}
            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background-tertiary transition-colors">
              <input
                type="radio"
                name="insertType"
                value="before"
                checked={insertType === 'before' || insertType === 'after'}
                onChange={() => setInsertType('after')}
                className="text-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-text-primary mb-2">插入到指定圈數</div>
                
                {(insertType === 'before' || insertType === 'after') && (
                  <div className="space-y-3">
                    {/* 圈數選擇 */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        選擇圈數
                      </label>
                      <select
                        value={targetRoundNumber}
                        onChange={(e) => setTargetRoundNumber(Number(e.target.value))}
                        className="input w-full"
                      >
                        {sortedRounds.map((round) => (
                          <option key={round.id} value={round.roundNumber}>
                            第 {round.roundNumber} 圈
                            {round.notes ? ` - ${round.notes}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 前面或後面 */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        插入位置
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2 border border-border rounded cursor-pointer hover:bg-background-tertiary transition-colors">
                          <input
                            type="radio"
                            name="insertPosition"
                            value="before"
                            checked={insertPosition === 'before'}
                            onChange={(e) => setInsertPosition(e.target.value as any)}
                            className="text-primary"
                          />
                          <span className="text-sm">前面</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border border-border rounded cursor-pointer hover:bg-background-tertiary transition-colors">
                          <input
                            type="radio"
                            name="insertPosition"
                            value="after"
                            checked={insertPosition === 'after'}
                            onChange={(e) => setInsertPosition(e.target.value as any)}
                            className="text-primary"
                          />
                          <span className="text-sm">後面</span>
                        </label>
                      </div>
                    </div>

                    {/* 預覽結果 */}
                    <div className="p-2 bg-primary/10 rounded text-sm text-primary">
                      {insertPosition === 'before' 
                        ? `將插入到第 ${targetRoundNumber} 圈的前面`
                        : `將插入到第 ${targetRoundNumber} 圈的後面`
                      }
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary flex-1"
          >
            確認複製
          </button>
        </div>
      </div>
    </div>
  )
}