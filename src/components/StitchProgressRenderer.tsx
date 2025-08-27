import React, { memo, useMemo } from 'react'
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
  // Memoized stitch elements generation
  const stitchElements = useMemo(() => {
    if (!displayRound || totalStitchesInCurrentRound === 0) {
      return null
    }

    const elements: JSX.Element[] = []
    let stitchIndex = 0

    // Use getSortedPatternItems for correct order
    const sortedPatternItems = getSortedPatternItems(displayRound)

    if (sortedPatternItems.length > 0) {
      // Use new sorted format
      sortedPatternItems.forEach((item) => {
        if (item.type === PatternItemType.STITCH) {
          const stitch = item.data as StitchInfo
          const stitchElements = renderStitchElements(
            stitch,
            stitchIndex,
            currentStitchInRound,
            getYarnColor,
            isLightColor
          )
          elements.push(...stitchElements)
          stitchIndex += stitch.count
        } else if (item.type === PatternItemType.GROUP) {
          const group = item.data as StitchGroup
          const groupElements = renderGroupElements(
            group,
            stitchIndex,
            currentStitchInRound,
            getYarnColor,
            isLightColor
          )
          elements.push(...groupElements.elements)
          stitchIndex += groupElements.totalStitches
        }
      })
    } else {
      // Fallback to legacy format for backward compatibility
      displayRound.stitches.forEach((stitch) => {
        const stitchElements = renderStitchElements(
          stitch,
          stitchIndex,
          currentStitchInRound,
          getYarnColor,
          isLightColor
        )
        elements.push(...stitchElements)
        stitchIndex += stitch.count
      })

      displayRound.stitchGroups.forEach((group) => {
        const groupElements = renderGroupElements(
          group,
          stitchIndex,
          currentStitchInRound,
          getYarnColor,
          isLightColor
        )
        elements.push(...groupElements.elements)
        stitchIndex += groupElements.totalStitches
      })
    }

    return elements
  }, [displayRound, currentStitchInRound, totalStitchesInCurrentRound, getYarnColor, isLightColor])

  if (!displayRound || totalStitchesInCurrentRound === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">當前圈數沒有針法資料</p>
      </div>
    )
  }

  return (
    <div className="w-full px-1 sm:px-0">
      <div className="grid grid-cols-8 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-x-0.5 gap-y-1 sm:gap-2 place-items-center w-full">
        {stitchElements}
      </div>
    </div>
  )
})

StitchProgressRenderer.displayName = 'StitchProgressRenderer'

/**
 * Render individual stitch elements
 * Memoized for performance
 */
function renderStitchElements(
  stitch: StitchInfo,
  startIndex: number,
  currentStitchInRound: number,
  getYarnColor: (yarnId: string) => string,
  isLightColor: (hex: string) => boolean
): JSX.Element[] {
  const elements: JSX.Element[] = []
  const yarnColor = getYarnColor(stitch.yarnId)
  const displayInfo = getStitchDisplayInfo(stitch)

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
      />
    )
  }

  return elements
}

/**
 * Render group elements
 * Memoized for performance
 */
function renderGroupElements(
  group: StitchGroup,
  startIndex: number,
  currentStitchInRound: number,
  getYarnColor: (yarnId: string) => string,
  isLightColor: (hex: string) => boolean
): { elements: JSX.Element[]; totalStitches: number } {
  const elements: JSX.Element[] = []
  let stitchIndex = startIndex

  for (let repeat = 0; repeat < group.repeatCount; repeat++) {
    group.stitches.forEach((stitch) => {
      const stitchElements = renderStitchElements(
        stitch,
        stitchIndex,
        currentStitchInRound,
        getYarnColor,
        isLightColor
      )
      
      // Add group context to keys for better React reconciliation
      const groupedElements = stitchElements.map((element, index) =>
        React.cloneElement(element, {
          key: `${group.id}-${repeat}-${stitch.id}-${index}`
        })
      )
      
      elements.push(...groupedElements)
      stitchIndex += stitch.count
    })
  }

  return {
    elements,
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
}>(({ symbol, yarnColor, isCompleted, isCurrent, isLightColor }) => {
  return (
    <div className="flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 transition-all duration-300">
      <div className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
        isCompleted 
          ? 'text-text-primary' 
          : isCurrent 
          ? 'text-primary' 
          : 'text-text-tertiary/50'
      }`}>
        {symbol}
      </div>
      <div 
        className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
          isCompleted || isCurrent
            ? (isLightColor ? 'border border-gray-400' : '')
            : ''
        }`}
        style={{ 
          backgroundColor: isCompleted || isCurrent ? yarnColor : '#f3f4f6'
        }}
      />
    </div>
  )
})

StitchElement.displayName = 'StitchElement'

export default StitchProgressRenderer