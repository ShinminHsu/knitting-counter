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

// 計算群組總針數
export function getStitchGroupTotalStitches(group: StitchGroup): number {
  return group.stitches.reduce((sum, stitch) => sum + stitch.count, 0) * group.repeatCount
}

// 計算圈數總針數
export function getRoundTotalStitches(round: Round): number {
  // 優先使用新的 PatternItems 結構計算
  const sortedPatternItems = getSortedPatternItems(round)
  if (sortedPatternItems.length > 0) {
    return sortedPatternItems.reduce((sum: number, item: PatternItem) => {
      if (item.type === PatternItemType.STITCH) {
        const stitch = item.data as StitchInfo
        return sum + stitch.count
      } else if (item.type === PatternItemType.GROUP) {
        const group = item.data as StitchGroup
        return sum + getStitchGroupTotalStitches(group)
      }
      return sum
    }, 0)
  }
  
  // 回退到舊格式計算（向後相容）
  const individualStitches = round.stitches.reduce((sum, stitch) => sum + stitch.count, 0)
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
        const yarn = yarns.find(y => y.id === stitchInfo.yarnId)
        const yarnName = yarn?.name || '未知毛線'
        const count = stitchInfo.count > 1 ? ` ×${stitchInfo.count}` : ''
        const displayInfo = getStitchDisplayInfo(stitchInfo)
        allDescriptions.push(`${displayInfo.rawValue}(${yarnName})${count}`)
      } else if (item.type === PatternItemType.GROUP) {
        const group = item.data as StitchGroup
        allDescriptions.push(describeStitchGroup(group, yarns))
      }
    })
  } else {
    // 兼容舊格式
    // 個別針法
    const stitchDescriptions = round.stitches.map(stitchInfo => {
      const yarn = yarns.find(y => y.id === stitchInfo.yarnId)
      const yarnName = yarn?.name || '未知毛線'
      const count = stitchInfo.count > 1 ? ` ×${stitchInfo.count}` : ''
      const displayInfo = getStitchDisplayInfo(stitchInfo)
      return `${displayInfo.rawValue}(${yarnName})${count}`
    })
    allDescriptions.push(...stitchDescriptions)
    
    // 群組針法
    const groupDescriptions = round.stitchGroups.map(group => {
      return describeStitchGroup(group, yarns)
    })
    allDescriptions.push(...groupDescriptions)
  }
  
  return allDescriptions.join(', ') || '無針法'
}

// 描述針目群組
export function describeStitchGroup(group: StitchGroup, yarns: Yarn[]): string {
  const stitchDescriptions = group.stitches.map(stitch => {
    const yarn = yarns.find(y => y.id === stitch.yarnId)
    const yarnName = yarn?.name || '未知毛線'
    const count = stitch.count > 1 ? ` ×${stitch.count}` : ''
    const displayInfo = getStitchDisplayInfo(stitch)
    return `${displayInfo.rawValue}(${yarnName})${count}`
  })
  
  const groupName = group.name || '針目群組'
  const repeatText = group.repeatCount > 1 ? ` 重複${group.repeatCount}次` : ''
  
  return `[${groupName}: ${stitchDescriptions.join(', ')}]${repeatText}`
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