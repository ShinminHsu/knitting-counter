import { StitchType, Round, StitchInfo, StitchGroup, PatternItemType } from '../../types'
import { getSortedPatternItems } from '../pattern/rendering'

/**
 * 判斷針法是否為加針類型
 */
export function isIncreaseStitch(stitchType: StitchType): boolean {
  return [
    StitchType.SINGLE_INCREASE,
    StitchType.HALF_DOUBLE_INCREASE,
    StitchType.DOUBLE_INCREASE,
    StitchType.TRIPLE_INCREASE,
    StitchType.INCREASE,
    StitchType.KNIT_FRONT_BACK,
    StitchType.PURL_FRONT_BACK
  ].includes(stitchType)
}

/**
 * 根據當前針目位置和圈數資料，計算顯示的針目數字（考慮加針邏輯）
 * @param currentStitch 當前針目位置（0-based）
 * @param displayRound 當前圈數資料
 * @param isViewMode 是否為查看模式
 * @returns 顯示的針目數字（0-based）
 */
export function calculateStitchDisplayNumber(
  currentStitch: number,
  displayRound: Round | undefined,
  isViewMode: boolean
): number {
  if (isViewMode) {
    return 0
  }

  if (!displayRound) {
    return currentStitch
  }

  // 使用 getSortedPatternItems 獲取正確順序的針法
  const sortedPatternItems = getSortedPatternItems(displayRound)
  let displayNumber = 0
  let stitchIndex = 0

  if (sortedPatternItems.length > 0) {
    // 使用新的排序格式
    for (const item of sortedPatternItems) {
      if (item.type === PatternItemType.STITCH) {
        const stitch = item.data as StitchInfo
        
        // 檢查當前針目是否在這個 stitch 範圍內
        if (currentStitch >= stitchIndex && currentStitch < stitchIndex + stitch.count) {
          const positionInStitch = currentStitch - stitchIndex
          
          if (isIncreaseStitch(stitch.type)) {
            // 加針類型：每個實際針目顯示為 2 個針目
            displayNumber += positionInStitch * 2
          } else {
            // 一般針法：1:1 對應
            displayNumber += positionInStitch
          }
          break
        }
        
        // 累加已經完成的針目顯示數
        if (isIncreaseStitch(stitch.type)) {
          displayNumber += stitch.count * 2
        } else {
          displayNumber += stitch.count
        }
        
        stitchIndex += stitch.count
      } else if (item.type === PatternItemType.GROUP) {
        const group = item.data as StitchGroup
        
        for (let repeat = 0; repeat < group.repeatCount; repeat++) {
          for (const stitch of group.stitches) {
            // 檢查當前針目是否在這個 stitch 範圍內
            if (currentStitch >= stitchIndex && currentStitch < stitchIndex + stitch.count) {
              const positionInStitch = currentStitch - stitchIndex
              
              if (isIncreaseStitch(stitch.type)) {
                displayNumber += positionInStitch * 2
              } else {
                displayNumber += positionInStitch
              }
              return displayNumber
            }
            
            // 累加已經完成的針目顯示數
            if (isIncreaseStitch(stitch.type)) {
              displayNumber += stitch.count * 2
            } else {
              displayNumber += stitch.count
            }
            
            stitchIndex += stitch.count
          }
        }
      }
    }
  } else {
    // 向後兼容：使用舊格式
    for (const stitch of displayRound.stitches) {
      if (currentStitch >= stitchIndex && currentStitch < stitchIndex + stitch.count) {
        const positionInStitch = currentStitch - stitchIndex
        
        if (isIncreaseStitch(stitch.type)) {
          displayNumber += positionInStitch * 2
        } else {
          displayNumber += positionInStitch
        }
        return displayNumber
      }
      
      if (isIncreaseStitch(stitch.type)) {
        displayNumber += stitch.count * 2
      } else {
        displayNumber += stitch.count
      }
      
      stitchIndex += stitch.count
    }
    
    for (const group of displayRound.stitchGroups) {
      for (let repeat = 0; repeat < group.repeatCount; repeat++) {
        for (const stitch of group.stitches) {
          if (currentStitch >= stitchIndex && currentStitch < stitchIndex + stitch.count) {
            const positionInStitch = currentStitch - stitchIndex
            
            if (isIncreaseStitch(stitch.type)) {
              displayNumber += positionInStitch * 2
            } else {
              displayNumber += positionInStitch
            }
            return displayNumber
          }
          
          if (isIncreaseStitch(stitch.type)) {
            displayNumber += stitch.count * 2
          } else {
            displayNumber += stitch.count
          }
          
          stitchIndex += stitch.count
        }
      }
    }
  }

  return displayNumber
}