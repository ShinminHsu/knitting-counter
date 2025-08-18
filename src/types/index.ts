// 基本資料類型 - 對應 iOS 版本的 Swift 結構

export interface YarnColor {
  name: string
  hex: string
}

export interface Yarn {
  id: string
  name: string
  brand?: string
  color: YarnColor
}

export enum StitchType {
  SINGLE = 'single',
  DOUBLE = 'double',
  TRIPLE = 'triple', 
  CHAIN = 'chain',
  SLIP = 'slip',
  INCREASE = 'increase',
  DECREASE = 'decrease',
  MAGIC_RING = 'magic_ring',
  FRONT_POST = 'front_post',
  BACK_POST = 'back_post'
}

export const StitchTypeInfo: Record<StitchType, {
  rawValue: string
  symbol: string
  englishName: string
}> = {
  [StitchType.SINGLE]: { rawValue: '短針', symbol: '×', englishName: 'Single Crochet' },
  [StitchType.DOUBLE]: { rawValue: '長針', symbol: '↑', englishName: 'Double Crochet' },
  [StitchType.TRIPLE]: { rawValue: '長長針', symbol: '↟', englishName: 'Triple Crochet' },
  [StitchType.CHAIN]: { rawValue: '鎖針', symbol: '○', englishName: 'Chain' },
  [StitchType.SLIP]: { rawValue: '引拔針', symbol: '•', englishName: 'Slip Stitch' },
  [StitchType.INCREASE]: { rawValue: '加針', symbol: '▲', englishName: 'Increase' },
  [StitchType.DECREASE]: { rawValue: '減針', symbol: '▼', englishName: 'Decrease' },
  [StitchType.MAGIC_RING]: { rawValue: '魔術環', symbol: '◉', englishName: 'Magic Ring' },
  [StitchType.FRONT_POST]: { rawValue: '前柱針', symbol: '⟨', englishName: 'Front Post' },
  [StitchType.BACK_POST]: { rawValue: '後柱針', symbol: '⟩', englishName: 'Back Post' }
}

export interface StitchInfo {
  id: string
  type: StitchType
  yarnId: string
  count: number
}

export interface StitchGroup {
  id: string
  name: string
  stitches: StitchInfo[]
  repeatCount: number
}

export interface ExpandedStitch {
  id: string
  type: StitchType
  yarnId: string
  originalStitchId: string
  groupId?: string
}

export interface Round {
  id: string
  roundNumber: number
  stitches: StitchInfo[]
  stitchGroups: StitchGroup[]
  notes?: string
}

export interface WorkSession {
  id: string
  startTime: Date
  duration: number // 秒數
  roundsCompleted: number
  stitchesCompleted: number
}

export interface Project {
  id: string
  name: string
  source?: string
  pattern: Round[]
  currentRound: number
  currentStitch: number
  yarns: Yarn[]
  sessions: WorkSession[]
  createdDate: Date
  lastModified: Date
  isCompleted?: boolean // 編織是否已完成
}

// 匯出/匯入相關類型
export enum ExportType {
  PATTERN_ONLY = 'pattern_only',
  FULL_PROJECT = 'full_project'
}

export interface ProjectExportData {
  version: string
  exportType: ExportType
  exportDate: Date
  project: {
    id: string
    name: string
    source?: string
    createdDate: Date
    lastModified: Date
  }
  yarns: Yarn[]
  pattern: Round[]
  progress?: {
    currentRound: number
    currentStitch: number
  }
  sessions?: WorkSession[]
}

export enum ImportMode {
  CREATE_NEW = 'create_new',
  OVERWRITE_EXISTING = 'overwrite_existing', 
  MERGE_PATTERN = 'merge_pattern'
}

export interface ImportResult {
  success: boolean
  project?: Project
  errors: string[]
  warnings: string[]
}

// UI 狀態類型
export interface AppState {
  currentProject?: Project
  projects: Project[]
  isLoading: boolean
  error?: string
}

// 路由類型
export type RouteParams = {
  projectId?: string
  roundId?: string
}