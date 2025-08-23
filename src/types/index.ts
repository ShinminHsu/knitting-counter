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
  // 鉤針針法
  SINGLE = 'single',
  HALF_DOUBLE = 'half_double',
  DOUBLE = 'double',
  TRIPLE = 'triple', 
  CHAIN = 'chain',
  SLIP = 'slip',
  INCREASE = 'increase',
  DECREASE = 'decrease',
  MAGIC_RING = 'magic_ring',
  FRONT_POST = 'front_post',
  BACK_POST = 'back_post',
  // 棒針針法
  KNIT = 'knit',
  PURL = 'purl',
  KNIT_FRONT_BACK = 'knit_front_back',
  PURL_FRONT_BACK = 'purl_front_back',
  KNIT_TWO_TOGETHER = 'knit_two_together',
  PURL_TWO_TOGETHER = 'purl_two_together',
  SLIP_SLIP_KNIT = 'slip_slip_knit',
  YARN_OVER = 'yarn_over',
  SLIP_STITCH_KNIT = 'slip_stitch_knit',
  CABLE_FRONT = 'cable_front',
  CABLE_BACK = 'cable_back',
  CUSTOM = 'custom'
}

export const StitchTypeInfo: Record<StitchType, {
  rawValue: string
  symbol: string
  englishName: string
}> = {
  // 鉤針針法
  [StitchType.SINGLE]: { rawValue: '短針', symbol: '×', englishName: 'sc' },
  [StitchType.HALF_DOUBLE]: { rawValue: '中長針', symbol: '⊥', englishName: 'hdc' },
  [StitchType.DOUBLE]: { rawValue: '長針', symbol: '↑', englishName: 'dc' },
  [StitchType.TRIPLE]: { rawValue: '長長針', symbol: '↟', englishName: 'tr' },
  [StitchType.CHAIN]: { rawValue: '鎖針', symbol: '○', englishName: 'ch' },
  [StitchType.SLIP]: { rawValue: '引拔針', symbol: '•', englishName: 'sl st' },
  [StitchType.INCREASE]: { rawValue: '加針', symbol: '▲', englishName: 'inc' },
  [StitchType.DECREASE]: { rawValue: '減針', symbol: '▼', englishName: 'dec' },
  [StitchType.MAGIC_RING]: { rawValue: '魔術環', symbol: '◉', englishName: 'mr' },
  [StitchType.FRONT_POST]: { rawValue: '前柱針', symbol: '⟨', englishName: 'fp' },
  [StitchType.BACK_POST]: { rawValue: '後柱針', symbol: '⟩', englishName: 'bp' },
  // 棒針針法
  [StitchType.KNIT]: { rawValue: '下針', symbol: '∣', englishName: 'k' },
  [StitchType.PURL]: { rawValue: '上針', symbol: '⌒', englishName: 'p' },
  [StitchType.KNIT_FRONT_BACK]: { rawValue: '下針加針', symbol: '∣+', englishName: 'kfb' },
  [StitchType.PURL_FRONT_BACK]: { rawValue: '上針加針', symbol: '⌒+', englishName: 'pfb' },
  [StitchType.KNIT_TWO_TOGETHER]: { rawValue: '右上二併一', symbol: '∣2', englishName: 'k2tog' },
  [StitchType.PURL_TWO_TOGETHER]: { rawValue: '上針二併一', symbol: '⌒2', englishName: 'p2tog' },
  [StitchType.SLIP_SLIP_KNIT]: { rawValue: '左上二併一', symbol: 'ssk', englishName: 'ssk' },
  [StitchType.YARN_OVER]: { rawValue: '掛線', symbol: '○', englishName: 'yo' },
  [StitchType.SLIP_STITCH_KNIT]: { rawValue: '滑針下針', symbol: 'sk', englishName: 'skp' },
  [StitchType.CABLE_FRONT]: { rawValue: '前交叉', symbol: '⟨∣', englishName: 'cf' },
  [StitchType.CABLE_BACK]: { rawValue: '後交叉', symbol: '∣⟩', englishName: 'cb' },
  [StitchType.CUSTOM]: { rawValue: '自定義', symbol: '?', englishName: 'custom' }
}

export interface StitchInfo {
  id: string
  type: StitchType
  yarnId: string
  count: number
  // 自定義針法的名稱和符號（當type為CUSTOM時使用）
  customName?: string
  customSymbol?: string
}

export interface StitchGroup {
  id: string
  name: string
  stitches: StitchInfo[]
  repeatCount: number
}

// 用於統一處理針法和群組順序的類型
export enum PatternItemType {
  STITCH = 'stitch',
  GROUP = 'group'
}

export interface PatternItem {
  id: string
  type: PatternItemType
  order: number // 用於排序的數字，越小越前面
  createdAt: Date // 新增時間，作為排序的輔助
  data: StitchInfo | StitchGroup // 實際的針法或群組數據
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
  stitches: StitchInfo[] // 保留舊格式以便向後相容
  stitchGroups: StitchGroup[] // 保留舊格式以便向後相容
  patternItems?: PatternItem[] // 新的統一結構，用於排序
  notes?: string
}

export interface Pattern {
  id: string
  name: string
  description?: string
  rounds: Round[]
  createdDate: Date
  lastModified: Date
  isCompleted?: boolean
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