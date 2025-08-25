import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Project, Round, StitchGroup, Yarn, StitchType, StitchTypeInfo, PatternItem, PatternItemType, StitchInfo, Chart, ChartSummary, ProjectMigrationResult } from '../types'

// CSS 類名合併工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一 ID
export function generateId(): string {
  return crypto.randomUUID()
}

// 格式化時間間隔
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}小時${minutes}分`
  } else if (minutes > 0) {
    return `${minutes}分鐘`
  } else {
    return `${seconds}秒`
  }
}

// 格式化檔案大小
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化日期
export function formatDate(date: Date | string | number): string {
  let dateObj: Date
  
  if (date instanceof Date) {
    dateObj = date
  } else {
    dateObj = new Date(date)
  }
  
  // 檢查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '無效日期'
  }
  
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

// 建立樣本資料
export function createSampleYarns(): Yarn[] {
  return [
    {
      id: generateId(),
      name: '白色棉線',
      brand: '樣本品牌',
      color: { name: '白色', hex: '#FFFFFF' }
    },
    {
      id: generateId(),
      name: '粉色棉線', 
      brand: '樣本品牌',
      color: { name: '粉色', hex: '#FFB3E6' }
    },
    {
      id: generateId(),
      name: '藍色棉線',
      brand: '樣本品牌', 
      color: { name: '藍色', hex: '#87CEEB' }
    }
  ]
}

export function createSampleProject(): Project {
  const yarns = createSampleYarns()
  
  const round1: Round = {
    id: generateId(),
    roundNumber: 1,
    stitches: [
      {
        id: generateId(),
        type: StitchType.CHAIN,
        yarnId: yarns[0].id,
        count: 4
      },
      {
        id: generateId(),
        type: StitchType.SLIP,
        yarnId: yarns[0].id,
        count: 1
      }
    ],
    stitchGroups: [],
    notes: '起始魔術環'
  }
  
  const round2: Round = {
    id: generateId(),
    roundNumber: 2,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[0].id,
        count: 8
      }
    ],
    stitchGroups: [],
    notes: '短針增加'
  }
  
  const round3: Round = {
    id: generateId(),
    roundNumber: 3,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[1].id,
        count: 16
      }
    ],
    stitchGroups: [],
    notes: '換色，繼續增加'
  }
  
  return {
    id: generateId(),
    name: '範例杯墊',
    source: 'https://www.youtube.com/watch?v=example',
    pattern: [round1, round2, round3],
    currentRound: 1,
    currentStitch: 0,
    yarns,
    sessions: [],
    createdDate: new Date(),
    lastModified: new Date(),
    isCompleted: false
  }
}

// 根據圈數描述織圖
export function describeRound(round: Round, yarns: Yarn[]): string {
  const allDescriptions: string[] = []
  
  // 使用 getSortedPatternItems 獲取正確順序的針法項目
  const sortedPatternItems = getSortedPatternItems(round)
  
  if (sortedPatternItems.length > 0) {
    // 如果有新的排序格式，使用它
    sortedPatternItems.forEach((item) => {
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

// 展開圈數中的所有針目（包括群組）
export function getExpandedStitches(round: Round): any[] {
  const expanded: any[] = []
  
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

// 深拷貝對象
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// 防抖函數
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 節流函數
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 檢查是否為移動設備
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 檢查是否為 iOS 設備
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

// 檢查是否在 PWA 模式下運行
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
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
    return sortedPatternItems.reduce((sum, item) => {
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

// 計算專案總時間
export function getProjectTotalTime(project: Project): number {
  return project.sessions.reduce((sum, session) => sum + session.duration, 0)
}

// 計算專案總圈數
export function getProjectTotalRounds(project: Project): number {
  const pattern = getProjectPattern(project)
  return pattern.map(round => round.roundNumber).reduce((max, num) => Math.max(max, num), 0)
}

// 計算專案總針數
export function getProjectTotalStitches(project: Project): number {
  const pattern = getProjectPattern(project)
  return pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
}

// 計算專案已完成針數
export function getProjectCompletedStitches(project: Project): number {
  const pattern = getProjectPattern(project)
  if (!pattern || pattern.length === 0) return 0
  
  let completed = 0
  const currentRound = getProjectCurrentRound(project)
  const currentStitch = getProjectCurrentStitch(project)
  
  // 計算已完成的完整圈數
  for (let roundNumber = 1; roundNumber < currentRound; roundNumber++) {
    const round = pattern.find(r => r.roundNumber === roundNumber)
    if (round) {
      completed += getRoundTotalStitches(round)
    }
  }
  
  // 添加當前圈的進度，但要確保不超出範圍
  const currentRoundData = pattern.find(r => r.roundNumber === currentRound)
  if (currentRoundData) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRoundData)
    const validCurrentStitch = Math.min(Math.max(0, currentStitch), maxStitchesInCurrentRound)
    completed += validCurrentStitch
  }
  
  return completed
}

// 計算專案進度百分比
export function getProjectProgressPercentage(project: Project): number {
  const pattern = getProjectPattern(project)
  if (!pattern || pattern.length === 0) return 0
  
  const totalStitches = getProjectTotalStitches(project)
  if (totalStitches === 0) return 0
  
  const completedStitches = getProjectCompletedStitches(project)
  const progressRatio = completedStitches / totalStitches
  
  // 確保進度百分比在0-1之間
  return Math.min(Math.max(0, progressRatio), 1)
}

// 檢查專案是否完成
export function isProjectCompleted(project: Project): boolean {
  const pattern = getProjectPattern(project)
  if (!pattern || pattern.length === 0) return false
  
  const totalRounds = getProjectTotalRounds(project)
  const currentRound = getProjectCurrentRound(project)
  const currentStitch = getProjectCurrentStitch(project)
  
  // 如果當前圈數超過總圈數，認為已完成
  if (currentRound > totalRounds) return true
  
  // 如果在最後一圈且針數達到最後一針，也認為已完成
  if (currentRound === totalRounds) {
    const lastRound = pattern.find(r => r.roundNumber === totalRounds)
    if (lastRound) {
      const totalStitchesInLastRound = getRoundTotalStitches(lastRound)
      return currentStitch >= totalStitchesInLastRound
    }
  }
  
  return false
}

// 處理 PatternItem 的工具函數

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

// ==================== 多織圖支持工具函數 ====================

// 兼容性函數：獲取專案的織圖數據（支持新舊格式）
export function getProjectPattern(project: Project): Round[] {
  // 優先使用當前織圖的數據
  const currentChart = getCurrentChart(project)
  if (currentChart && currentChart.rounds) {
    return currentChart.rounds
  }
  
  // 回退到舊格式
  return project.pattern || []
}

// 兼容性函數：獲取專案的當前圈數
export function getProjectCurrentRound(project: Project): number {
  // 優先使用當前織圖的數據
  const currentChart = getCurrentChart(project)
  if (currentChart) {
    return currentChart.currentRound
  }
  
  // 回退到舊格式
  return project.currentRound || 1
}

// 兼容性函數：獲取專案的當前針數
export function getProjectCurrentStitch(project: Project): number {
  // 優先使用當前織圖的數據
  const currentChart = getCurrentChart(project)
  if (currentChart) {
    return currentChart.currentStitch
  }
  
  // 回退到舊格式
  return project.currentStitch || 0
}

// 檢查專案是否為舊格式（只有 pattern 沒有 charts）
export function isLegacyProject(project: Project): boolean {
  return !project.charts && !!project.pattern && Array.isArray(project.pattern) && project.pattern.length > 0
}

// 檢查專案是否為新格式（有 charts）
export function isMultiChartProject(project: Project): boolean {
  return !!project.charts && Array.isArray(project.charts) && project.charts.length > 0
}

// 將舊格式專案遷移為新格式（向後兼容）
export function migrateProjectToMultiChart(project: Project): ProjectMigrationResult {
  try {
    // 如果已經是新格式，直接返回
    if (isMultiChartProject(project)) {
      return {
        success: true,
        migratedChartsCount: 0,
        errors: []
      }
    }

    // 如果是舊格式，進行遷移
    if (isLegacyProject(project)) {
      const defaultChart: Chart = {
        id: generateId(),
        name: '主織圖',
        description: '從舊版本遷移的織圖',
        rounds: project.pattern || [],
        currentRound: project.currentRound || 1,
        currentStitch: project.currentStitch || 0,
        createdDate: project.createdDate,
        lastModified: new Date(),
        isCompleted: project.isCompleted || false,
        notes: ''
      }

      // 更新專案結構
      const migratedProject: Project = {
        ...project,
        charts: [defaultChart],
        currentChartId: defaultChart.id,
        // 保留舊欄位以確保向後兼容
        pattern: project.pattern,
        currentRound: project.currentRound,
        currentStitch: project.currentStitch
      }

      Object.assign(project, migratedProject)

      return {
        success: true,
        migratedChartsCount: 1,
        errors: []
      }
    }

    // 如果沒有任何織圖資料，創建空的 charts 陣列
    if (!project.charts) {
      project.charts = []
    }
    return {
      success: true,
      migratedChartsCount: 0,
      errors: []
    }

  } catch (error) {
    console.error('Migration failed:', error)
    return {
      success: false,
      migratedChartsCount: 0,
      errors: [error instanceof Error ? error.message : '未知錯誤']
    }
  }
}

// 創建新織圖
export function createChart(name: string, description?: string, notes?: string): Chart {
  return {
    id: generateId(),
    name: name.trim() || '新織圖',
    description: description?.trim() || '',
    rounds: [],
    currentRound: 1,
    currentStitch: 0,
    createdDate: new Date(),
    lastModified: new Date(),
    isCompleted: false,
    notes: notes?.trim() || ''
  }
}

// 獲取專案的當前織圖
export function getCurrentChart(project: Project): Chart | null {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts || project.charts.length === 0) {
    return null
  }

  // 如果有指定的當前織圖ID，優先使用
  if (project.currentChartId) {
    const chart = project.charts.find(c => c.id === project.currentChartId)
    if (chart) return chart
  }

  // 否則返回第一個織圖
  return project.charts[0]
}

// 獲取專案的所有織圖摘要
export function getProjectChartSummaries(project: Project): ChartSummary[] {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return []

  return project.charts.map(chart => ({
    id: chart.id,
    name: chart.name,
    description: chart.description,
    notes: chart.notes,
    roundCount: chart.rounds ? chart.rounds.length : 0,
    totalStitches: chart.rounds ? chart.rounds.reduce((sum, round) => sum + getRoundTotalStitches(round), 0) : 0,
    currentProgress: getChartProgressPercentage(chart),
    isCompleted: chart.isCompleted || false,
    lastModified: chart.lastModified
  }))
}

// 計算織圖進度百分比
export function getChartProgressPercentage(chart: Chart): number {
  if (!chart.rounds || chart.rounds.length === 0) return 0
  
  const totalStitches = chart.rounds.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
  if (totalStitches === 0) return 0
  
  let completedStitches = 0
  
  // 計算已完成的完整圈數
  for (let roundNumber = 1; roundNumber < chart.currentRound; roundNumber++) {
    const round = chart.rounds.find(r => r.roundNumber === roundNumber)
    if (round) {
      completedStitches += getRoundTotalStitches(round)
    }
  }
  
  // 添加當前圈的進度
  const currentRound = chart.rounds.find(r => r.roundNumber === chart.currentRound)
  if (currentRound) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRound)
    const validCurrentStitch = Math.min(Math.max(0, chart.currentStitch), maxStitchesInCurrentRound)
    completedStitches += validCurrentStitch
  }
  
  const progressRatio = completedStitches / totalStitches
  return Math.min(Math.max(0, progressRatio * 100), 100)
}

// 計算織圖已完成針數
export function getChartCompletedStitches(chart: Chart): number {
  if (!chart.rounds || chart.rounds.length === 0) return 0
  
  let completed = 0
  
  // 計算已完成的完整圈數
  for (let roundNumber = 1; roundNumber < chart.currentRound; roundNumber++) {
    const round = chart.rounds.find(r => r.roundNumber === roundNumber)
    if (round) {
      completed += getRoundTotalStitches(round)
    }
  }
  
  // 添加當前圈的進度
  const currentRound = chart.rounds.find(r => r.roundNumber === chart.currentRound)
  if (currentRound) {
    const maxStitchesInCurrentRound = getRoundTotalStitches(currentRound)
    const validCurrentStitch = Math.min(Math.max(0, chart.currentStitch), maxStitchesInCurrentRound)
    completed += validCurrentStitch
  }
  
  return completed
}

// 檢查織圖是否完成
export function isChartCompleted(chart: Chart): boolean {
  if (!chart.rounds || chart.rounds.length === 0) return false
  
  const totalRounds = Math.max(...chart.rounds.map(r => r.roundNumber))
  
  // 如果當前圈數超過總圈數，認為已完成
  if (chart.currentRound > totalRounds) return true
  
  // 如果在最後一圈且針數達到最後一針，也認為已完成
  if (chart.currentRound === totalRounds) {
    const lastRound = chart.rounds.find(r => r.roundNumber === totalRounds)
    if (lastRound) {
      const totalStitchesInLastRound = getRoundTotalStitches(lastRound)
      return chart.currentStitch >= totalStitchesInLastRound
    }
  }
  
  return false
}

// 更新專案的當前織圖
export function setCurrentChart(project: Project, chartId: string): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return false
  
  const chart = project.charts.find(c => c.id === chartId)
  if (!chart) return false
  
  project.currentChartId = chartId
  return true
}

// 添加織圖到專案
export function addChartToProject(project: Project, chart: Chart): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) {
    project.charts = []
  }
  
  // 檢查是否已存在相同ID的織圖
  if (project.charts.some(c => c.id === chart.id)) {
    return false
  }
  
  project.charts.push(chart)
  
  // 如果這是第一個織圖，設為當前織圖
  if (project.charts.length === 1) {
    project.currentChartId = chart.id
  }
  
  return true
}

// 從專案中移除織圖
export function removeChartFromProject(project: Project, chartId: string): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return false
  
  const initialLength = project.charts.length
  project.charts = project.charts.filter(c => c.id !== chartId)
  
  // 如果移除的是當前織圖，切換到第一個可用的織圖
  if (project.currentChartId === chartId && project.charts.length > 0) {
    project.currentChartId = project.charts[0].id
  } else if (project.charts.length === 0) {
    project.currentChartId = undefined
  }
  
  return project.charts.length < initialLength
}

// 更新專案中的織圖
export function updateChartInProject(project: Project, updatedChart: Chart): boolean {
  // 確保專案已遷移到新格式
  migrateProjectToMultiChart(project)
  
  if (!project.charts) return false
  
  const index = project.charts.findIndex(c => c.id === updatedChart.id)
  if (index === -1) return false
  
  project.charts[index] = {
    ...project.charts[index],
    ...updatedChart,
    lastModified: new Date()
  }
  
  return true
}

// Additional safe utilities for null/undefined checking
export function getProjectCurrentRoundSafe(project: Project | null | undefined): number {
  if (!project) return 1
  return getProjectCurrentRound(project)
}

export function getProjectCurrentStitchSafe(project: Project | null | undefined): number {
  if (!project) return 0
  return getProjectCurrentStitch(project)
}

export function getProjectPatternSafe(project: Project | null | undefined): Round[] {
  if (!project) return []
  return getProjectPattern(project)
}