import { CiCircleCheck } from 'react-icons/ci'
import { RxCrossCircled } from 'react-icons/rx'
import { StitchType, StitchTypeInfo } from '../../types'
import { useNumberInputValidation } from '../../hooks/useNumberInputValidation'

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
  const { inputValidation, handleNumberInputChange } = useNumberInputValidation()

  return (
    <div className="flex items-center gap-2">
      <select
        value={stitchType}
        onChange={(e) => onTypeChange(e.target.value as StitchType)}
        className="input text-sm flex-1"
      >
        {Object.entries(StitchTypeInfo).map(([key, info]) => (
          <option key={key} value={key}>
            {info.symbol} {info.rawValue}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={stitchCount}
        {...handleNumberInputChange(onCountChange, 1, fieldKey)}
        className={`input text-sm w-16 ${inputValidation[fieldKey] === false ? 'border-red-500 bg-red-50' : ''}`}
        placeholder="數量"
        autoFocus
      />
      <button
        onClick={onConfirm}
        className="text-green-500 hover:text-green-600 p-1 w-8 h-8 flex items-center justify-center"
      >
        <CiCircleCheck className="w-4 h-4" />
      </button>
      <button
        onClick={onCancel}
        className="text-text-tertiary hover:text-text-secondary p-1 w-8 h-8 flex items-center justify-center"
      >
        <RxCrossCircled className="w-4 h-4" />
      </button>
    </div>
  )
}