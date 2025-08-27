import { useState, useCallback } from 'react'

interface ValidationState {
  [key: string]: boolean
}

export function useNumberInputValidation() {
  const [inputValidation, setInputValidation] = useState<ValidationState>({})

  const handleNumberInputChange = useCallback((
    setValue: (value: string) => void,
    minValue = 1,
    fieldKey?: string
  ) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // 直接設置為字串，保持游標位置
      setValue(value)
      
      // 更新驗證狀態以提供視覺反饋
      if (fieldKey) {
        const isValid = value === '' || /^\d+$/.test(value)
        setInputValidation(prev => ({
          ...prev,
          [fieldKey]: isValid
        }))
      }
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()

      // 清除此欄位的驗證狀態
      if (fieldKey) {
        setInputValidation(prev => {
          const newState = { ...prev }
          delete newState[fieldKey]
          return newState
        })
      }

      // 如果是空值或0，設為最小值的字串
      if (raw === '' || raw === '0') {
        setValue(String(minValue))
        return
      }

      // 檢查是否為有效數字
      if (!/^\d+$/.test(raw)) {
        // 如果包含非數字字符，顯示警告並重置為最小值
        alert(`請輸入有效的數字（${minValue} 以上的整數）`)
        setValue(String(minValue))
        return
      }

      const num = parseInt(raw, 10)
      const clamped = Number.isNaN(num) || num <= 0 ? minValue : Math.max(minValue, num)
      setValue(String(clamped))
    }
  }), [setInputValidation])

  // 確保數字值的輔助函數
  const ensureNumber = useCallback((value: string, defaultValue: number = 1): number => {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : Math.max(defaultValue, parsed)
  }, [])

  return {
    inputValidation,
    handleNumberInputChange,
    ensureNumber
  }
}