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
  return value instanceof Date && !isNaN(value.getTime())
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
  
  return (
    isString(chart.id) &&
    isString(chart.name) &&
    (chart.description === undefined || isString(chart.description)) &&
    (chart.notes === undefined || isString(chart.notes)) &&
    isArray(chart.rounds) &&
    chart.rounds.every(isValidRound) &&
    isNumber(chart.currentRound) &&
    chart.currentRound > 0 &&
    isNumber(chart.currentStitch) &&
    chart.currentStitch >= 0 &&
    (chart.isCompleted === undefined || isBoolean(chart.isCompleted)) &&
    isDate(chart.createdDate) &&
    isDate(chart.lastModified)
  )
}

// Project validation - made more lenient for better compatibility
export function isValidProject(value: unknown): value is Project {
  if (!isObject(value)) return false
  
  const project = value as Record<string, unknown>
  
  return (
    isString(project.id) &&
    isString(project.name) &&
    (project.source === undefined || isString(project.source)) &&
    (project.notes === undefined || isString(project.notes)) &&
    // Pattern is optional for compatibility
    (project.pattern === undefined || (isArray(project.pattern) && project.pattern.every(isValidRound))) &&
    (project.currentRound === undefined || (isNumber(project.currentRound) && project.currentRound > 0)) &&
    (project.currentStitch === undefined || (isNumber(project.currentStitch) && project.currentStitch >= 0)) &&
    isArray(project.yarns) &&
    project.yarns.every(isValidYarn) &&
    isArray(project.sessions) &&
    project.sessions.every(isValidWorkSession) &&
    isDate(project.createdDate) &&
    isDate(project.lastModified) &&
    (project.isCompleted === undefined || isBoolean(project.isCompleted)) &&
    (project.charts === undefined || (isArray(project.charts) && project.charts.every(isValidChart)))
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