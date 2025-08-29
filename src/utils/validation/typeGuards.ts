import { Project, Round, StitchInfo, StitchGroup, Chart, Yarn, WorkSession, StitchType } from '../../types'

// Basic type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isDate(value: unknown): value is Date {
  if (!(value instanceof Date)) {
    return false
  }
  // Check if it's a valid date (not Invalid Date)
  return !isNaN(value.getTime())
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

// StitchType validation
export function isValidStitchType(value: unknown): value is StitchType {
  return isString(value) && Object.values(StitchType).includes(value as StitchType)
}

// StitchInfo validation
export function isValidStitchInfo(value: unknown): value is StitchInfo {
  if (!isObject(value)) return false
  
  const stitch = value as Record<string, unknown>
  
  return (
    isString(stitch.id) &&
    isValidStitchType(stitch.type) &&
    isString(stitch.yarnId) &&
    isNumber(stitch.count) &&
    stitch.count > 0 &&
    (stitch.customName === undefined || isString(stitch.customName)) &&
    (stitch.customSymbol === undefined || isString(stitch.customSymbol))
  )
}

// StitchGroup validation
export function isValidStitchGroup(value: unknown): value is StitchGroup {
  if (!isObject(value)) return false
  
  const group = value as Record<string, unknown>
  
  return (
    isString(group.id) &&
    isString(group.name) &&
    isNumber(group.repeatCount) &&
    group.repeatCount > 0 &&
    isArray(group.stitches) &&
    group.stitches.every(isValidStitchInfo) &&
    (group.completedRepeats === undefined || (isNumber(group.completedRepeats) && group.completedRepeats >= 0))
  )
}

// Round validation
export function isValidRound(value: unknown): value is Round {
  if (!isObject(value)) return false
  
  const round = value as Record<string, unknown>
  
  return (
    isString(round.id) &&
    isNumber(round.roundNumber) &&
    round.roundNumber > 0 &&
    isArray(round.stitches) &&
    round.stitches.every(isValidStitchInfo) &&
    isArray(round.stitchGroups) &&
    round.stitchGroups.every(isValidStitchGroup) &&
    (round.notes === undefined || isString(round.notes))
  )
}

// Yarn validation
export function isValidYarn(value: unknown): value is Yarn {
  if (!isObject(value)) return false
  
  const yarn = value as Record<string, unknown>
  
  // Validate color object structure
  const hasValidColor = isObject(yarn.color) &&
    isString((yarn.color as Record<string, unknown>).name) &&
    isString((yarn.color as Record<string, unknown>).hex)
  
  return (
    isString(yarn.id) &&
    isString(yarn.name) &&
    hasValidColor &&
    (yarn.brand === undefined || isString(yarn.brand))
  )
}

// WorkSession validation
export function isValidWorkSession(value: unknown): value is WorkSession {
  if (!isObject(value)) return false
  
  const session = value as Record<string, unknown>
  
  return (
    isString(session.id) &&
    isDate(session.startTime) &&
    isNumber(session.duration) &&
    session.duration >= 0 &&
    (session.roundsCompleted === undefined || (isNumber(session.roundsCompleted) && session.roundsCompleted >= 0)) &&
    (session.stitchesCompleted === undefined || (isNumber(session.stitchesCompleted) && session.stitchesCompleted >= 0))
  )
}

// Chart validation
export function isValidChart(value: unknown): value is Chart {
  if (!isObject(value)) return false
  
  const chart = value as Record<string, unknown>
  
  const chartChecks = {
    hasId: isString(chart.id),
    hasName: isString(chart.name),
    hasValidDescription: (chart.description === undefined || isString(chart.description)),
    hasValidNotes: (chart.notes === undefined || isString(chart.notes)),
    hasValidRounds: isArray(chart.rounds) && chart.rounds.every(isValidRound),
    hasValidCurrentRound: isNumber(chart.currentRound) && chart.currentRound > 0,
    hasValidCurrentStitch: isNumber(chart.currentStitch) && chart.currentStitch >= 0,
    hasValidIsCompleted: (chart.isCompleted === undefined || isBoolean(chart.isCompleted)),
    hasValidCreatedDate: isDate(chart.createdDate),
    hasValidLastModified: isDate(chart.lastModified)
  }
  
  console.log('[VALIDATION-DEBUG] Chart validation details for chart:', chart.id, chartChecks)
  
  // Log type information for Date fields if they fail
  if (!chartChecks.hasValidCreatedDate) {
    console.log('[VALIDATION-DEBUG] Chart createdDate issue:', {
      type: typeof chart.createdDate,
      value: chart.createdDate,
      isDate: chart.createdDate instanceof Date
    })
  }
  
  if (!chartChecks.hasValidLastModified) {
    console.log('[VALIDATION-DEBUG] Chart lastModified issue:', {
      type: typeof chart.lastModified,
      value: chart.lastModified,
      isDate: chart.lastModified instanceof Date
    })
  }
  
  return (
    chartChecks.hasId &&
    chartChecks.hasName &&
    chartChecks.hasValidDescription &&
    chartChecks.hasValidNotes &&
    chartChecks.hasValidRounds &&
    chartChecks.hasValidCurrentRound &&
    chartChecks.hasValidCurrentStitch &&
    chartChecks.hasValidIsCompleted &&
    chartChecks.hasValidCreatedDate &&
    chartChecks.hasValidLastModified
  )
}

// Project validation - made more lenient for better compatibility
export function isValidProject(value: unknown): value is Project {
  if (!isObject(value)) return false
  
  const project = value as Record<string, unknown>
  
  const checks = {
    hasId: isString(project.id),
    hasName: isString(project.name),
    hasValidSource: (project.source === undefined || isString(project.source)),
    hasValidNotes: (project.notes === undefined || isString(project.notes)),
    hasValidPattern: (project.pattern === undefined || (isArray(project.pattern) && project.pattern.every(isValidRound))),
    hasValidCurrentRound: (project.currentRound === undefined || (isNumber(project.currentRound) && project.currentRound > 0)),
    hasValidCurrentStitch: (project.currentStitch === undefined || (isNumber(project.currentStitch) && project.currentStitch >= 0)),
    hasValidYarns: isArray(project.yarns) && project.yarns.every(isValidYarn),
    hasValidSessions: isArray(project.sessions) && project.sessions.every(isValidWorkSession),
    hasValidCreatedDate: isDate(project.createdDate),
    hasValidLastModified: isDate(project.lastModified),
    hasValidIsCompleted: (project.isCompleted === undefined || isBoolean(project.isCompleted)),
    hasValidCharts: (project.charts === undefined || (isArray(project.charts) && project.charts.every(isValidChart)))
  }
  
  console.log('[VALIDATION-DEBUG] Individual field checks:', checks)
  
  // Log pattern validation details if it exists
  if (project.pattern && isArray(project.pattern)) {
    console.log('[VALIDATION-DEBUG] Pattern validation details:', {
      patternLength: project.pattern.length,
      allRoundsValid: project.pattern.every(isValidRound),
      firstRoundValid: project.pattern.length > 0 ? isValidRound(project.pattern[0]) : 'N/A'
    })
  }
  
  // Log charts validation details if it exists
  if (project.charts && isArray(project.charts)) {
    const chartValidations = project.charts.map((chart: any, index: number) => ({
      index,
      id: chart.id,
      isValid: isValidChart(chart)
    }))
    
    console.log('[VALIDATION-DEBUG] Charts validation details:', {
      chartsLength: project.charts.length,
      allChartsValid: project.charts.every(isValidChart),
      individualChartValidation: chartValidations
    })
    
    // Log details for invalid charts
    chartValidations.forEach(({index, id, isValid}) => {
      if (!isValid) {
        console.log(`[VALIDATION-DEBUG] Invalid chart at index ${index} (id: ${id}) - validating individually...`)
        // This will trigger the detailed chart validation logging
        isValidChart((project.charts as any[])[index])
      }
    })
  }
  
  return (
    checks.hasId &&
    checks.hasName &&
    checks.hasValidSource &&
    checks.hasValidNotes &&
    checks.hasValidPattern &&
    checks.hasValidCurrentRound &&
    checks.hasValidCurrentStitch &&
    checks.hasValidYarns &&
    checks.hasValidSessions &&
    checks.hasValidCreatedDate &&
    checks.hasValidLastModified &&
    checks.hasValidIsCompleted &&
    checks.hasValidCharts
  )
}

// Validation error types
export interface ValidationError {
  path: string
  message: string
  value: unknown
}

export interface ValidationResult<T> {
  isValid: boolean
  data?: T
  errors: ValidationError[]
}

// Generic validation function with detailed error reporting
export function validateWithErrors<T>(
  value: unknown,
  validator: (val: unknown) => val is T,
  path = 'root'
): ValidationResult<T> {
  try {
    if (validator(value)) {
      return {
        isValid: true,
        data: value,
        errors: []
      }
    } else {
      return {
        isValid: false,
        errors: [{
          path,
          message: 'Value does not match expected type',
          value
        }]
      }
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        path,
        message: error instanceof Error ? error.message : 'Unknown validation error',
        value
      }]
    }
  }
}

// Convenience validation functions
export function validateProject(value: unknown): ValidationResult<Project> {
  return validateWithErrors(value, isValidProject, 'project')
}

export function validateRound(value: unknown): ValidationResult<Round> {
  return validateWithErrors(value, isValidRound, 'round')
}

export function validateChart(value: unknown): ValidationResult<Chart> {
  return validateWithErrors(value, isValidChart, 'chart')
}

export function validateStitchInfo(value: unknown): ValidationResult<StitchInfo> {
  return validateWithErrors(value, isValidStitchInfo, 'stitch')
}

export function validateYarn(value: unknown): ValidationResult<Yarn> {
  return validateWithErrors(value, isValidYarn, 'yarn')
}

// Safe parsing functions for external data
export function safeParseProject(data: unknown): Project | null {
  const result = validateProject(data)
  if (result.isValid && result.data) {
    return result.data
  }
  console.warn('[VALIDATION] Invalid project data:', result.errors)
  return null
}

export function safeParseProjects(data: unknown): Project[] {
  if (!isArray(data)) {
    console.warn('[VALIDATION] Projects data is not an array')
    return []
  }
  
  const validProjects: Project[] = []
  const errors: ValidationError[] = []
  
  data.forEach((item, index) => {
    // Use a more lenient approach for existing data
    if (isObject(item)) {
      const project = item as Record<string, unknown>
      
      // Basic required fields check
      if (isString(project.id) &&
          isString(project.name) &&
          isDate(project.createdDate) &&
          isDate(project.lastModified)) {
        
        // Apply minimal fixes to ensure compatibility
        const sanitizedProject = {
          ...project,
          yarns: isArray(project.yarns) ? project.yarns : [],
          sessions: isArray(project.sessions) ? project.sessions : [],
          pattern: isArray(project.pattern) ? project.pattern : [],
          currentRound: isNumber(project.currentRound) ? project.currentRound : 1,
          currentStitch: isNumber(project.currentStitch) ? project.currentStitch : 0,
          source: isString(project.source) ? project.source : '',
          notes: isString(project.notes) ? project.notes : '',
          isCompleted: isBoolean(project.isCompleted) ? project.isCompleted : false
        } as Project
        
        validProjects.push(sanitizedProject)
        return
      }
    }
    
    // Fallback to strict validation
    const result = validateProject(item)
    if (result.isValid && result.data) {
      validProjects.push(result.data)
    } else {
      errors.push(...result.errors.map(error => ({
        ...error,
        path: `projects[${index}].${error.path}`
      })))
    }
  })
  
  if (errors.length > 0) {
    console.warn('[VALIDATION] Some projects failed strict validation but may have been sanitized:', errors.length)
  }
  
  return validProjects
}

// Runtime assertion functions for critical paths
export function assertIsProject(value: unknown, context = 'unknown'): asserts value is Project {
  if (!isValidProject(value)) {
    // Enhanced error reporting for debugging
    console.error('[VALIDATION-DEBUG] Project validation failed in context:', context)
    console.error('[VALIDATION-DEBUG] Value type:', typeof value)
    console.error('[VALIDATION-DEBUG] Value is object:', isObject(value))
    
    if (isObject(value)) {
      const project = value as Record<string, unknown>
      console.error('[VALIDATION-DEBUG] Project validation details:', {
        hasId: !!project.id && isString(project.id),
        hasName: !!project.name && isString(project.name),
        hasCreatedDate: !!project.createdDate && isDate(project.createdDate),
        hasLastModified: !!project.lastModified && isDate(project.lastModified),
        hasYarns: !!project.yarns && isArray(project.yarns),
        hasSessions: !!project.sessions && isArray(project.sessions),
        projectKeys: Object.keys(project),
        createdDateType: typeof project.createdDate,
        lastModifiedType: typeof project.lastModified,
        yarnsType: typeof project.yarns,
        sessionsType: typeof project.sessions,
        createdDateIsDate: project.createdDate instanceof Date,
        lastModifiedIsDate: project.lastModified instanceof Date,
        projectId: project.id,
        projectName: project.name
      })
      
      // Check individual field validation
      if (project.yarns && isArray(project.yarns)) {
        console.error('[VALIDATION-DEBUG] Yarns validation:', {
          yarnsLength: project.yarns.length,
          allYarnsValid: project.yarns.every(isValidYarn),
          firstYarnValid: project.yarns.length > 0 ? isValidYarn(project.yarns[0]) : 'N/A'
        })
      }
      
      if (project.sessions && isArray(project.sessions)) {
        console.error('[VALIDATION-DEBUG] Sessions validation:', {
          sessionsLength: project.sessions.length,
          allSessionsValid: project.sessions.every(isValidWorkSession),
          firstSessionValid: project.sessions.length > 0 ? isValidWorkSession(project.sessions[0]) : 'N/A'
        })
      }
      
      // Check charts validation if it exists
      if (project.charts !== undefined) {
        console.error('[VALIDATION-DEBUG] Charts field validation:', {
          chartsExists: !!project.charts,
          chartsIsArray: isArray(project.charts),
          chartsType: typeof project.charts,
          chartsLength: isArray(project.charts) ? project.charts.length : 'N/A'
        })
        
        if (isArray(project.charts)) {
          const chartValidations = project.charts.map((chart: any, index: number) => {
            const isValid = isValidChart(chart)
            console.error(`[VALIDATION-DEBUG] Chart ${index} (id: ${chart?.id}) validation:`, isValid)
            if (!isValid) {
              console.error(`[VALIDATION-DEBUG] Invalid chart ${index} details:`, {
                type: typeof chart,
                isObject: isObject(chart),
                hasId: isString(chart?.id),
                hasName: isString(chart?.name),
                hasCreatedDate: isDate(chart?.createdDate),
                hasLastModified: isDate(chart?.lastModified),
                createdDateType: typeof chart?.createdDate,
                lastModifiedType: typeof chart?.lastModified
              })
            }
            return { index, id: chart?.id, isValid }
          })
          
          console.error('[VALIDATION-DEBUG] All charts validation results:', chartValidations)
        }
      }
    }
    
    throw new Error(`[VALIDATION] Expected valid Project in ${context}, got: ${typeof value}`)
  }
}

export function assertIsRound(value: unknown, context = 'unknown'): asserts value is Round {
  if (!isValidRound(value)) {
    throw new Error(`[VALIDATION] Expected valid Round in ${context}, got: ${typeof value}`)
  }
}

export function assertIsChart(value: unknown, context = 'unknown'): asserts value is Chart {
  if (!isValidChart(value)) {
    throw new Error(`[VALIDATION] Expected valid Chart in ${context}, got: ${typeof value}`)
  }
}