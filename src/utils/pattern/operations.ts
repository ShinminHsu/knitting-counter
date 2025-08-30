import { Round, StitchGroup, StitchInfo, PatternItemType, StitchType, StitchTypeInfo, Yarn, PatternItem } from '../../types'
import { getSortedPatternItems } from './rendering'

// Interface for expanded stitch items
interface ExpandedStitch {
  id: string
  type: StitchType
  yarnId: string
  originalStitchId: string
  groupId?: string
}

// 計算單一針法的實際針數（考慮加減針）
export function getStitchActualCount(stitch: StitchInfo): number {
  const stitchCountMap: Partial<Record<StitchType, number>> = {
    // 基礎針法 = 1針
    [StitchType.SINGLE]: 1,
    [StitchType.HALF_DOUBLE]: 1,
    [StitchType.DOUBLE]: 1,
    [StitchType.TRIPLE]: 1,
    [StitchType.CHAIN]: 1,
    [StitchType.SLIP]: 1,
    [StitchType.MAGIC_RING]: 1,
    [StitchType.FRONT_POST]: 1,
    [StitchType.BACK_POST]: 1,
    
    // 加針類 = 2針 (1針變2針)
    [StitchType.SINGLE_INCREASE]: 2,
    [StitchType.HALF_DOUBLE_INCREASE]: 2,
    [StitchType.DOUBLE_INCREASE]: 2,
    [StitchType.TRIPLE_INCREASE]: 2,
    [StitchType.INCREASE]: 2, // 通用加針
    
    // 減針類 = 1針 (2針變1針)
    [StitchType.SINGLE_DECREASE]: 1,
    [StitchType.HALF_DOUBLE_DECREASE]: 1,
    [StitchType.DOUBLE_DECREASE]: 1,
    [StitchType.TRIPLE_DECREASE]: 1,
    [StitchType.DECREASE]: 1, // 通用減針
    
    // 棒針針法
    [StitchType.KNIT]: 1,
    [StitchType.PURL]: 1,
    [StitchType.KNIT_FRONT_BACK]: 2, // 棒針加針
    [StitchType.PURL_FRONT_BACK]: 2, // 棒針加針
    [StitchType.KNIT_TWO_TOGETHER]: 1, // 棒針減針
    [StitchType.PURL_TWO_TOGETHER]: 1, // 棒針減針
    [StitchType.SLIP_SLIP_KNIT]: 1, // 棒針減針
    [StitchType.YARN_OVER]: 1,
    [StitchType.SLIP_STITCH_KNIT]: 1,
    [StitchType.CABLE_FRONT]: 1,
    [StitchType.CABLE_BACK]: 1,
    
    [StitchType.CUSTOM]: 1
  }
  
  const multiplier = stitchCountMap[stitch.type] || 1
  return multiplier * stitch.count
}

// 計算群組總針數
export function getStitchGroupTotalStitches(group: StitchGroup): number {
  return group.stitches.reduce((sum, stitch) => sum + getStitchActualCount(stitch), 0) * group.repeatCount
}

// 計算圈數總針數
export function getRoundTotalStitches(round: Round): number {
  // 優先使用新的 PatternItems 結構計算
  const sortedPatternItems = getSortedPatternItems(round)
  if (sortedPatternItems.length > 0) {
    return sortedPatternItems.reduce((sum: number, item: PatternItem) => {
      if (item.type === PatternItemType.STITCH) {
        const stitch = item.data as StitchInfo
        return sum + getStitchActualCount(stitch)
      } else if (item.type === PatternItemType.GROUP) {
        const group = item.data as StitchGroup
        return sum + getStitchGroupTotalStitches(group)
      }
      return sum
    }, 0)
  }
  
  // 回退到舊格式計算（向後相容）
  const individualStitches = round.stitches.reduce((sum, stitch) => sum + getStitchActualCount(stitch), 0)
  const groupStitches = round.stitchGroups.reduce((sum, group) => sum + getStitchGroupTotalStitches(group), 0)
  return individualStitches + groupStitches
}

// 展開圈數中的所有針目（包括群組）
export function getExpandedStitches(round: Round): ExpandedStitch[] {
  const expanded: ExpandedStitch[] = []
  
  // 展開個別針法
  round.stitches.forEach(stitch => {
    for (let i = 0; i < stitch.count; i++) {
      expanded.push({
        id: `${stitch.id}-${i}`,
        type: stitch.type,
        yarnId: stitch.yarnId,
        originalStitchId: stitch.id
      })
    }
  })
  
  // 展開群組針法
  round.stitchGroups.forEach(group => {
    for (let repeat = 0; repeat < group.repeatCount; repeat++) {
      group.stitches.forEach(stitch => {
        for (let i = 0; i < stitch.count; i++) {
          expanded.push({
            id: `${group.id}-${repeat}-${stitch.id}-${i}`,
            type: stitch.type,
            yarnId: stitch.yarnId,
            originalStitchId: stitch.id,
            groupId: group.id
          })
        }
      })
    }
  })
  
  return expanded
}

// 根據圈數描述織圖
export function describeRound(round: Round, yarns: Yarn[]): string {
  const allDescriptions: string[] = []
  
  // 使用 getSortedPatternItems 獲取正確順序的針法項目
  const sortedPatternItems = getSortedPatternItems(round)
  
  if (sortedPatternItems.length > 0) {
    // 如果有新的排序格式，使用它
    sortedPatternItems.forEach((item: PatternItem) => {
      if (item.type === PatternItemType.STITCH) {
        const stitchInfo = item.data as StitchInfo
        const count = stitchInfo.count
        const displayInfo = getStitchDisplayInfo(stitchInfo)
        allDescriptions.push(`${displayInfo.rawValue} × ${count}`)
      } else if (item.type === PatternItemType.GROUP) {
        const group = item.data as StitchGroup
        allDescriptions.push(describeStitchGroup(group, yarns))
      }
    })
  } else {
    // 兼容舊格式
    // 個別針法
    const stitchDescriptions = round.stitches.map(stitchInfo => {
      const count = stitchInfo.count
      const displayInfo = getStitchDisplayInfo(stitchInfo)
      return `${displayInfo.rawValue} × ${count}`
    })
    allDescriptions.push(...stitchDescriptions)
    
    // 群組針法
    const groupDescriptions = round.stitchGroups.map(group => {
      return describeStitchGroup(group, yarns)
    })
    allDescriptions.push(...groupDescriptions)
  }
  
  return allDescriptions.join('、') || '無針法'
}

// 描述針目群組
export function describeStitchGroup(group: StitchGroup, yarns: Yarn[]): string {
  const stitchDescriptions = group.stitches.map(stitch => {
    const count = stitch.count
    const displayInfo = getStitchDisplayInfo(stitch)
    return `${displayInfo.rawValue} × ${count}`
  })
  
  const groupName = group.name || '針目群組'
  const repeatText = ` × ${group.repeatCount}`

  return `【${groupName}：${stitchDescriptions.join('、')}】${repeatText}`
}

// 獲取針法顯示信息的helper函數
export function getStitchDisplayInfo(stitch: StitchInfo) {
  // 確保針法對象有效
  if (!stitch || !stitch.type) {
    return { symbol: '?', rawValue: '未知', englishName: 'unknown' }
  }
  
  if (stitch.type === StitchType.CUSTOM) {
    return {
      symbol: stitch.customSymbol || '?',
      rawValue: stitch.customName || '自定義',
      englishName: 'custom'
    }
  }
  
  return StitchTypeInfo[stitch.type] || { symbol: '?', rawValue: '未知', englishName: 'unknown' }
}