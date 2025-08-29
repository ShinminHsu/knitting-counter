// ========================================
// 統一導出入口 - 保持向後兼容性
// ========================================

// Date 模組 - 日期格式化工具
export {
  formatDuration,
  formatDate
} from './date/formatters'

// Common 模組 - 通用工具函數
export {
  generateId,
  createSampleYarns,
  createSampleProject
} from './common/generators'

export {
  isMobile,
  isIOS,
  isPWA
} from './common/device'

export {
  debounce,
  throttle,
  deepClone,
  formatFileSize,
  cn
} from './common/performance'

// Pattern 模組 - 模式操作工具
export {
  getStitchGroupTotalStitches,
  getRoundTotalStitches,
  getExpandedStitches,
  describeRound,
  describeStitchGroup,
  getStitchDisplayInfo
} from './pattern/operations'

export {
  migrateRoundToPatternItems,
  syncPatternItemsToLegacyFormat,
  getSortedPatternItems,
  addStitchToPatternItems,
  addGroupToPatternItems,
  reorderPatternItems,
  updateStitchInPatternItems,
  deleteStitchFromPatternItems,
  updateGroupInPatternItems,
  updateStitchInGroupPatternItems,
  updateGroupCompletedRepeatsInPatternItems,
  deleteGroupFromPatternItems
} from './pattern/rendering'

// Project 模組 - 專案計算工具
export {
  getProjectTotalTime,
  getProjectTotalRounds,
  getProjectTotalStitches,
  getProjectCompletedStitches,
  getProjectProgressPercentage,
  getProjectTotalRoundsAllCharts,
  getProjectTotalStitchesAllCharts,
  getProjectCompletedStitchesAllCharts,
  getProjectProgressPercentageAllCharts,
  isProjectCompleted,
  getProjectCurrentRoundSafe,
  getProjectCurrentStitchSafe,
  getProjectPatternSafe
} from './project/calculations'

export {
  getProjectPattern,
  getProjectCurrentRound,
  getProjectCurrentStitch,
  isLegacyProject,
  isMultiChartProject,
  migrateProjectToMultiChart
} from './project/migration'

// Chart 模組 - 圖表管理工具
export {
  createChart,
  getCurrentChart,
  setCurrentChart,
  addChartToProject,
  removeChartFromProject,
  updateChartInProject
} from './chart/management'

export {
  getProjectChartSummaries,
  getChartProgressPercentage,
  getChartCompletedStitches,
  isChartCompleted
} from './chart/progress'