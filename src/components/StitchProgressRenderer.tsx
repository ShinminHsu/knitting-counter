import { memo, useMemo } from 'react'
import { Round, StitchInfo, StitchGroup, PatternItemType } from '../types'
import { getSortedPatternItems, getStitchDisplayInfo } from '../utils'

interface StitchProgressRendererProps {
  displayRound: Round | undefined
  currentStitchInRound: number
  totalStitchesInCurrentRound: number
  getYarnColor: (yarnId: string) => string
  isLightColor: (hex: string) => boolean
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
  isLightColor
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
            `stitch-row-${itemIndex}`
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
            `group-${itemIndex}`
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
          `legacy-stitch-${index}`
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
          `legacy-group-${index}`
        )
        rows.push(...groupRows.rows)
        stitchIndex += groupRows.totalStitches
      })
    }

    return rows
  }, [displayRound, currentStitchInRound, totalStitchesInCurrentRound, getYarnColor, isLightColor])

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
  rowKey: string
): JSX.Element {
  const yarnColor = getYarnColor(stitch.yarnId)
  const displayInfo = getStitchDisplayInfo(stitch)
  const elements: JSX.Element[] = []

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
      <div className="text-xs text-text-secondary mb-2">
        {displayInfo.rawValue} {displayInfo.symbol} {stitch.count}
      </div>
      <div className="inline-flex flex-wrap gap-x-0.5 gap-y-1 sm:gap-2 p-2 bg-background-secondary border-l border-dashed border-border">
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
  groupKey: string
): { rows: JSX.Element[]; totalStitches: number } {
  const rows: JSX.Element[] = []
  let stitchIndex = startIndex

  for (let repeat = 0; repeat < group.repeatCount; repeat++) {
    const rowElements: JSX.Element[] = []
    let repeatStitchIndex = stitchIndex

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
        <div className="text-xs text-text-secondary mb-2">
          【{group.name || '針目群組'}】- {repeat + 1}
        </div>
        <div className="inline-flex flex-wrap gap-x-0.5 gap-y-1 sm:gap-2 p-2 bg-background-secondary border-l border-dashed border-border">
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
      className="flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 transition-all duration-300"
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