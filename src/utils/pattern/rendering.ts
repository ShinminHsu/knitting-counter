import { Round, PatternItem, PatternItemType, StitchInfo, StitchGroup } from '../../types'
import { generateId } from '../common/generators'

// 從舊格式轉換為新格式：將 stitches 和 stitchGroups 轉換為 patternItems
export function migrateRoundToPatternItems(round: Round): Round {
  if (round.patternItems && round.patternItems.length > 0) {
    // 已經有新格式，但檢查是否需要重新排序
    const sortedItems = round.patternItems.slice().sort((a, b) => {
      // 首先按 order 排序
      if (a.order !== b.order) {
        return a.order - b.order
      }
      // 如果 order 相同，按創建時間排序
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
    
    // 重新分配連續的 order 值
    sortedItems.forEach((item, index) => {
      item.order = index
    })
    
    return {
      ...round,
      patternItems: sortedItems
    }
  }

  const patternItems: PatternItem[] = []
  let order = 0
  
  // 創建一個基準時間，然後為每個項目分配遞增的時間
  const baseTime = new Date()

  // 將個別針法轉換為 PatternItem
  round.stitches.forEach(stitch => {
    patternItems.push({
      id: generateId(),
      type: PatternItemType.STITCH,
      order: order++,
      createdAt: new Date(baseTime.getTime() + order * 1000), // 每個項目間隔1秒
      data: stitch
    })
  })

  // 將群組轉換為 PatternItem
  round.stitchGroups.forEach(group => {
    patternItems.push({
      id: generateId(),
      type: PatternItemType.GROUP,
      order: order++,
      createdAt: new Date(baseTime.getTime() + order * 1000), // 每個項目間隔1秒
      data: group
    })
  })

  return {
    ...round,
    patternItems: patternItems.sort((a, b) => a.order - b.order)
  }
}

// 從新格式同步到舊格式：從 patternItems 生成 stitches 和 stitchGroups
export function syncPatternItemsToLegacyFormat(round: Round): Round {
  if (!round.patternItems) {
    return round
  }

  const stitches: StitchInfo[] = []
  const stitchGroups: StitchGroup[] = []

  round.patternItems
    .sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime())
    .forEach(item => {
      if (item.type === PatternItemType.STITCH) {
        stitches.push(item.data as StitchInfo)
      } else if (item.type === PatternItemType.GROUP) {
        stitchGroups.push(item.data as StitchGroup)
      }
    })

  return {
    ...round,
    stitches,
    stitchGroups
  }
}

// 獲取排序後的 PatternItem 列表
export function getSortedPatternItems(round: Round): PatternItem[] {
  const migratedRound = migrateRoundToPatternItems(round)
  return migratedRound.patternItems?.sort((a, b) => 
    a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime()
  ) || []
}

// 添加新的針法到 PatternItem 列表
export function addStitchToPatternItems(round: Round, stitch: StitchInfo): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const maxOrder = patternItems.length > 0 ? Math.max(...patternItems.map(item => item.order)) : -1
  const newPatternItem: PatternItem = {
    id: generateId(),
    type: PatternItemType.STITCH,
    order: maxOrder + 1,
    createdAt: new Date(),
    data: stitch
  }

  const updatedRound = {
    ...migratedRound,
    patternItems: [...patternItems, newPatternItem]
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 添加新的群組到 PatternItem 列表
export function addGroupToPatternItems(round: Round, group: StitchGroup): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const maxOrder = patternItems.length > 0 ? Math.max(...patternItems.map(item => item.order)) : -1
  const newPatternItem: PatternItem = {
    id: generateId(),
    type: PatternItemType.GROUP,
    order: maxOrder + 1,
    createdAt: new Date(),
    data: group
  }

  const updatedRound = {
    ...migratedRound,
    patternItems: [...patternItems, newPatternItem]
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 重新排序 PatternItem
export function reorderPatternItems(round: Round, fromIndex: number, toIndex: number): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = [...(migratedRound.patternItems || [])]
  
  // 按照當前順序排序
  patternItems.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime())
  
  // 執行拖拽重排
  const [movedItem] = patternItems.splice(fromIndex, 1)
  patternItems.splice(toIndex, 0, movedItem)
  
  // 重新分配 order
  patternItems.forEach((item, index) => {
    item.order = index
  })

  const updatedRound = {
    ...migratedRound,
    patternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 更新 PatternItem 中的針法
export function updateStitchInPatternItems(round: Round, stitchId: string, updatedStitch: StitchInfo): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const updatedPatternItems = patternItems.map(item => {
    if (item.type === PatternItemType.STITCH && (item.data as StitchInfo).id === stitchId) {
      return {
        ...item,
        data: updatedStitch
      }
    }
    return item
  })

  const updatedRound = {
    ...migratedRound,
    patternItems: updatedPatternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 刪除 PatternItem 中的針法
export function deleteStitchFromPatternItems(round: Round, stitchId: string): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const filteredPatternItems = patternItems.filter(item => {
    return !(item.type === PatternItemType.STITCH && (item.data as StitchInfo).id === stitchId)
  })

  // 重新分配 order
  filteredPatternItems.forEach((item, index) => {
    item.order = index
  })

  const updatedRound = {
    ...migratedRound,
    patternItems: filteredPatternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 更新 PatternItem 中的群組
export function updateGroupInPatternItems(round: Round, groupId: string, updatedGroup: StitchGroup): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const updatedPatternItems = patternItems.map(item => {
    if (item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === groupId) {
      return {
        ...item,
        data: updatedGroup
      }
    }
    return item
  })

  const updatedRound = {
    ...migratedRound,
    patternItems: updatedPatternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 更新群組中的針目
export function updateStitchInGroupPatternItems(round: Round, groupId: string, stitchId: string, updatedStitch: StitchInfo): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const updatedPatternItems = patternItems.map(item => {
    if (item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === groupId) {
      const group = item.data as StitchGroup
      return {
        ...item,
        data: {
          ...group,
          stitches: group.stitches.map(stitch => 
            stitch.id === stitchId ? updatedStitch : stitch
          )
        }
      }
    }
    return item
  })

  const updatedRound = {
    ...migratedRound,
    patternItems: updatedPatternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 更新群組完成重複次數
export function updateGroupCompletedRepeatsInPatternItems(round: Round, groupId: string, completedRepeats: number): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const updatedPatternItems = patternItems.map(item => {
    if (item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === groupId) {
      const group = item.data as StitchGroup
      return {
        ...item,
        data: {
          ...group,
          completedRepeats: Math.max(0, Math.min(completedRepeats, group.repeatCount))
        }
      }
    }
    return item
  })

  const updatedRound = {
    ...migratedRound,
    patternItems: updatedPatternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}

// 刪除 PatternItem 中的群組
export function deleteGroupFromPatternItems(round: Round, groupId: string): Round {
  const migratedRound = migrateRoundToPatternItems(round)
  const patternItems = migratedRound.patternItems || []
  
  const filteredPatternItems = patternItems.filter(item => {
    return !(item.type === PatternItemType.GROUP && (item.data as StitchGroup).id === groupId)
  })

  // 重新分配 order
  filteredPatternItems.forEach((item, index) => {
    item.order = index
  })

  const updatedRound = {
    ...migratedRound,
    patternItems: filteredPatternItems
  }

  return syncPatternItemsToLegacyFormat(updatedRound)
}