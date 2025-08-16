import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Project, Round, StitchInfo, StitchGroup, Yarn, YarnColor, StitchType, StitchTypeInfo } from '../types'

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
    lastModified: new Date()
  }
}

// 根據圈數描述織圖
export function describeRound(round: Round, yarns: Yarn[]): string {
  const allDescriptions: string[] = []
  
  // 個別針法
  const stitchDescriptions = round.stitches.map(stitchInfo => {
    const yarn = yarns.find(y => y.id === stitchInfo.yarnId)
    const yarnName = yarn?.name || '未知毛線'
    const count = stitchInfo.count > 1 ? ` ×${stitchInfo.count}` : ''
    const stitchName = StitchTypeInfo[stitchInfo.type]?.rawValue || stitchInfo.type
    return `${stitchName}(${yarnName})${count}`
  })
  allDescriptions.push(...stitchDescriptions)
  
  // 群組針法
  const groupDescriptions = round.stitchGroups.map(group => {
    return describeStitchGroup(group, yarns)
  })
  allDescriptions.push(...groupDescriptions)
  
  return allDescriptions.join(', ') || '無針法'
}

export function describeStitchGroup(group: StitchGroup, yarns: Yarn[]): string {
  const stitchDescriptions = group.stitches.map(stitch => {
    const yarn = yarns.find(y => y.id === stitch.yarnId)
    const yarnName = yarn?.name || '未知毛線'
    const count = stitch.count > 1 ? ` ×${stitch.count}` : ''
    const stitchName = StitchTypeInfo[stitch.type]?.rawValue || stitch.type
    return `${stitchName}(${yarnName})${count}`
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
  return project.pattern.map(round => round.roundNumber).reduce((max, num) => Math.max(max, num), 0)
}

// 計算專案總針數
export function getProjectTotalStitches(project: Project): number {
  return project.pattern.reduce((sum, round) => sum + getRoundTotalStitches(round), 0)
}

// 計算專案已完成針數
export function getProjectCompletedStitches(project: Project): number {
  let completed = 0
  for (let roundNumber = 1; roundNumber < project.currentRound; roundNumber++) {
    const round = project.pattern.find(r => r.roundNumber === roundNumber)
    if (round) {
      completed += getRoundTotalStitches(round)
    }
  }
  completed += project.currentStitch
  return completed
}

// 計算專案進度百分比
export function getProjectProgressPercentage(project: Project): number {
  const totalStitches = getProjectTotalStitches(project)
  if (totalStitches === 0) return 0
  return getProjectCompletedStitches(project) / totalStitches
}

// 檢查專案是否完成
export function isProjectCompleted(project: Project): boolean {
  return project.currentRound > getProjectTotalRounds(project)
}