import { memo, useMemo } from 'react'
import { Round, StitchInfo, StitchGroup, PatternItemType } from '../types'
import { getSortedPatternItems, getStitchDisplayInfo } from '../utils'

interface StitchProgressRendererProps {
  displayRound: Round | undefined
  currentStitchInRound: number
  totalStitchesInCurrentRound: number
  getYarnColor: (yarnId: string) => string
  isLightColor: (hex: string) => boolean
  onSkipToStitch?: (stitchIndex: number) => void
}

/**
 * Optimized component for rendering stitch progress visualization
 * Uses memoization and virtualization for performance with large stitch counts
 */
export const StitchProgressRenderer = memo<StitchProgressRendererProps>(({
  displayRound,
  currentStitchInRound,
  totalStitchesInCurrentRound,
  getYarnColor,
  isLightColor,
  onSkipToStitch
}) => {
  // Memoized pattern rows generation
  const patternRows = useMemo(() => {
    if (!displayRound || totalStitchesInCurrentRound === 0) {
      return []
    }

    const rows: JSX.Element[] = []
    let stitchIndex = 0

    // Use getSortedPatternItems for correct order
    const sortedPatternItems = getSortedPatternItems(displayRound)

    if (sortedPatternItems.length > 0) {
      // Use new sorted format
      sortedPatternItems.forEach((item, itemIndex) => {
        if (item.type === PatternItemType.STITCH) {
          const stitch = item.data as StitchInfo
          const stitchRow = renderStitchRow(
            stitch,
            stitchIndex,
            currentStitchInRound,
            getYarnColor,
            isLightColor,
            `stitch-row-${itemIndex}`,
            onSkipToStitch
          )
          rows.push(stitchRow)
          stitchIndex += stitch.count
        } else if (item.type === PatternItemType.GROUP) {
          const group = item.data as StitchGroup
          const groupRows = renderGroupRows(
            group,
            stitchIndex,
            currentStitchInRound,
            getYarnColor,
            isLightColor,
            `group-${itemIndex}`,
            onSkipToStitch
          )
          rows.push(...groupRows.rows)
          stitchIndex += groupRows.totalStitches
        }
      })
    } else {
      // Fallback to legacy format for backward compatibility
      displayRound.stitches.forEach((stitch, index) => {
        const stitchRow = renderStitchRow(
          stitch,
          stitchIndex,
          currentStitchInRound,
          getYarnColor,
          isLightColor,
          `legacy-stitch-${index}`,
          onSkipToStitch
        )
        rows.push(stitchRow)
        stitchIndex += stitch.count
      })

      displayRound.stitchGroups.forEach((group, index) => {
        const groupRows = renderGroupRows(
          group,
          stitchIndex,
          currentStitchInRound,
          getYarnColor,
          isLightColor,
          `legacy-group-${index}`,
          onSkipToStitch
        )
        rows.push(...groupRows.rows)
        stitchIndex += groupRows.totalStitches
      })
    }

    return rows
  }, [displayRound, currentStitchInRound, totalStitchesInCurrentRound, getYarnColor, isLightColor, onSkipToStitch])

  if (!displayRound || totalStitchesInCurrentRound === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">當前圈數沒有針法資料</p>
      </div>
    )
  }

  return (
    <div className="px-1 sm:px-0 space-y-3">
      {patternRows}
    </div>
  )
})

StitchProgressRenderer.displayName = 'StitchProgressRenderer'

/**
 * Render a row of stitches
 * Each row contains all stitches of the same type
 */
function renderStitchRow(
  stitch: StitchInfo,
  startIndex: number,
  currentStitchInRound: number,
  getYarnColor: (yarnId: string) => string,
  isLightColor: (hex: string) => boolean,
  rowKey: string,
  onSkipToStitch?: (stitchIndex: number) => void
): JSX.Element {
  const yarnColor = getYarnColor(stitch.yarnId)
  const displayInfo = getStitchDisplayInfo(stitch)
  const elements: JSX.Element[] = []
  
  // 計算這個針法區間的結束位置 (用於標記完成 - 使用 count)
  const endIndex = startIndex + stitch.count - 1
  
  // 檢查是否已完成或正在進行中
  const isBlockCompleted = endIndex < currentStitchInRound
  const isBlockInProgress = startIndex <= currentStitchInRound && currentStitchInRound <= endIndex
  
  // 點擊處理函數 - 跳到這個區間的下一針（完成整個區間）
  const handleBlockClick = () => {
    if (onSkipToStitch && !isBlockCompleted) {
      onSkipToStitch(endIndex + 1)
    }
  }

  for (let i = 0; i < stitch.count; i++) {
    const stitchIndex = startIndex + i
    const isCompleted = stitchIndex < currentStitchInRound
    const isCurrent = stitchIndex === currentStitchInRound

    elements.push(
      <StitchElement
        key={`${stitch.id}-${i}`}
        symbol={displayInfo.symbol}
        yarnColor={yarnColor}
        isCompleted={isCompleted}
        isCurrent={isCurrent}
        isLightColor={isLightColor(yarnColor)}
        stitchIndex={stitchIndex}
        debugInfo={`single-stitch-${stitch.id}-${i}`}
      />
    )
  }

  return (
    <div key={rowKey} className="inline-block">
      <div 
        className={`text-xs mb-1 cursor-pointer transition-colors duration-200 ${
          isBlockCompleted 
            ? 'text-text-primary' 
            : isBlockInProgress 
            ? 'text-primary font-medium' 
            : 'text-text-secondary hover:text-primary'
        }`}
        onClick={handleBlockClick}
      >
        {displayInfo.englishName} {stitch.count}
      </div>
      <div className="flex flex-wrap gap-x-0.5 gap-y-1 sm:gap-2 p-2 bg-background-secondary">
        {elements}
      </div>
    </div>
  )
}

/**
 * Render group rows
 * Each repeat of the group gets its own row
 */
function renderGroupRows(
  group: StitchGroup,
  startIndex: number,
  currentStitchInRound: number,
  getYarnColor: (yarnId: string) => string,
  isLightColor: (hex: string) => boolean,
  groupKey: string,
  onSkipToStitch?: (stitchIndex: number) => void
): { rows: JSX.Element[]; totalStitches: number } {
  const rows: JSX.Element[] = []
  let stitchIndex = startIndex

  for (let repeat = 0; repeat < group.repeatCount; repeat++) {
    const rowElements: JSX.Element[] = []
    let repeatStitchIndex = stitchIndex
    
    // 計算這次重複的總針數 (用於進度追蹤)
    const repeatTotalCount = group.stitches.reduce((sum, stitch) => sum + stitch.count, 0)
    const repeatEndIndex = stitchIndex + repeatTotalCount - 1
    
    // 檢查這次重複的完成狀態
    const isRepeatCompleted = repeatEndIndex < currentStitchInRound
    const isRepeatInProgress = stitchIndex <= currentStitchInRound && currentStitchInRound <= repeatEndIndex
    
    // 點擊處理函數 - 完成這次重複
    const handleRepeatClick = () => {
      if (onSkipToStitch && !isRepeatCompleted) {
        onSkipToStitch(repeatEndIndex + 1)
      }
    }

    group.stitches.forEach((stitch) => {
      const stitchElements: JSX.Element[] = []
      const yarnColor = getYarnColor(stitch.yarnId)
      const displayInfo = getStitchDisplayInfo(stitch)

      for (let i = 0; i < stitch.count; i++) {
        const currentStitchIndex = repeatStitchIndex + i
        const isCompleted = currentStitchIndex < currentStitchInRound
        const isCurrent = currentStitchIndex === currentStitchInRound

        stitchElements.push(
          <StitchElement
            key={`${group.id}-${repeat}-${stitch.id}-${i}`}
            symbol={displayInfo.symbol}
            yarnColor={yarnColor}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            isLightColor={isLightColor(yarnColor)}
            stitchIndex={currentStitchIndex}
            debugInfo={`group-${group.id}-repeat-${repeat}-stitch-${stitch.id}-${i}`}
          />
        )
      }
      
      rowElements.push(...stitchElements)
      repeatStitchIndex += stitch.count
    })

    rows.push(
      <div key={`${groupKey}-repeat-${repeat}`} className="inline-block">
        <div 
          className={`text-xs mb-1 cursor-pointer transition-colors duration-200 ${
            isRepeatCompleted 
              ? 'text-text-primary' 
              : isRepeatInProgress 
              ? 'text-primary font-medium' 
              : 'text-text-secondary hover:text-primary'
          }`}
          onClick={handleRepeatClick}
        >
          【{group.name || '針目群組'}】- {repeat + 1}
        </div>
        <div className="flex flex-wrap gap-x-0.5 gap-y-1 sm:gap-2 p-2 bg-background-secondary">
          {rowElements}
        </div>
      </div>
    )

    stitchIndex = repeatStitchIndex
  }

  return {
    rows,
    totalStitches: stitchIndex - startIndex
  }
}

/**
 * Individual stitch element component
 * Memoized to prevent unnecessary re-renders
 */
const StitchElement = memo<{
  symbol: string
  yarnColor: string
  isCompleted: boolean
  isCurrent: boolean
  isLightColor: boolean
  stitchIndex: number
  debugInfo?: string
}>(({ symbol, isCompleted, isCurrent, stitchIndex, debugInfo }) => {
  return (
    <div 
      className="flex flex-col items-center justify-center w-8 h-8 sm:w-12 sm:h-12 transition-all duration-300"
      data-stitch-index={stitchIndex}
      data-debug-info={debugInfo}
    >
      <div className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
        isCompleted 
          ? 'text-text-primary' 
          : isCurrent 
          ? 'text-primary' 
          : 'text-text-tertiary/50'
      }`}>
        {symbol}
      </div>
    </div>
  )
})

StitchElement.displayName = 'StitchElement'

export default StitchProgressRenderer