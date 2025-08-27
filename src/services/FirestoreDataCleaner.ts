import { Timestamp } from 'firebase/firestore'
import { Project, Round, StitchInfo, StitchGroup, Yarn, WorkSession, Chart } from '../types'

/**
 * FirestoreDataCleaner provides data cleaning and validation utilities
 * Responsible for:
 * - Cleaning data before Firestore operations to prevent undefined values
 * - Validating data structures 
 * - Converting between client and Firestore formats
 * - Ensuring data consistency
 */
export class FirestoreDataCleaner {

  /**
   * Clean yarn data to ensure no undefined values
   * @param yarns - Array of yarns to clean
   * @returns Cleaned yarn array
   */
  cleanYarns(yarns: Yarn[]): any[] {
    return (yarns || [])
      .filter(yarn => yarn && yarn.id && yarn.name && yarn.color)
      .map(yarn => ({
        id: yarn.id,
        name: yarn.name,
        color: {
          name: yarn.color.name || '',
          hex: yarn.color.hex || '#000000'
        },
        ...(yarn.brand && { brand: yarn.brand })
      }))
  }

  /**
   * Clean work sessions data to ensure no undefined values
   * @param sessions - Array of work sessions to clean
   * @returns Cleaned sessions array with Firestore timestamps
   */
  cleanSessions(sessions: WorkSession[]): any[] {
    return (sessions || [])
      .filter(session => session && session.startTime)
      .map(session => ({
        id: session.id || '',
        duration: session.duration || 0,
        roundsCompleted: session.roundsCompleted || 0,
        stitchesCompleted: session.stitchesCompleted || 0,
        startTime: Timestamp.fromDate(session.startTime)
      }))
  }

  /**
   * Clean stitch data to ensure no undefined values
   * @param stitches - Array of stitches to clean
   * @returns Cleaned stitches array
   */
  cleanStitches(stitches: StitchInfo[]): any[] {
    return (stitches || [])
      .filter(stitch => stitch !== undefined && stitch !== null)
      .map(stitch => ({
        id: stitch.id || '',
        type: stitch.type || 'single',
        yarnId: stitch.yarnId || '',
        count: stitch.count || 1,
        ...(stitch.customName && { customName: stitch.customName }),
        ...(stitch.customSymbol && { customSymbol: stitch.customSymbol })
      }))
  }

  /**
   * Clean stitch groups data to ensure no undefined values
   * @param stitchGroups - Array of stitch groups to clean
   * @returns Cleaned stitch groups array
   */
  cleanStitchGroups(stitchGroups: StitchGroup[]): any[] {
    return (stitchGroups || [])
      .filter(group => group !== undefined && group !== null)
      .map(group => ({
        id: group.id || '',
        name: group.name || '',
        repeatCount: group.repeatCount || 1,
        stitches: this.cleanStitches(group.stitches || []),
        ...(group.completedRepeats !== undefined && { completedRepeats: group.completedRepeats })
      }))
  }

  /**
   * Clean round data to ensure no undefined values
   * @param round - Round data to clean
   * @returns Cleaned round data
   */
  cleanRound(round: Round): any {
    const cleanedRound: any = {
      id: round.id,
      roundNumber: round.roundNumber,
      stitches: this.cleanStitches(round.stitches || []),
      stitchGroups: this.cleanStitchGroups(round.stitchGroups || [])
    }

    // Only include notes if it's defined and not empty
    if (round.notes !== undefined && round.notes !== null) {
      cleanedRound.notes = round.notes
    }

    return cleanedRound
  }

  /**
   * Clean rounds array
   * @param rounds - Array of rounds to clean
   * @returns Cleaned rounds array
   */
  cleanRounds(rounds: Round[]): any[] {
    return (rounds || []).map(round => this.cleanRound(round))
  }

  /**
   * Clean chart data to ensure no undefined values
   * @param chart - Chart data to clean
   * @returns Cleaned chart data
   */
  cleanChart(chart: Chart): any {
    return {
      id: chart.id,
      name: chart.name,
      description: chart.description || '',
      rounds: this.cleanRounds(chart.rounds || []),
      currentRound: chart.currentRound || 1,
      currentStitch: chart.currentStitch || 0,
      createdDate: chart.createdDate,
      lastModified: chart.lastModified,
      isCompleted: chart.isCompleted || false,
      notes: chart.notes || ''
    }
  }

  /**
   * Clean charts array
   * @param charts - Array of charts to clean
   * @returns Cleaned charts array
   */
  cleanCharts(charts: Chart[]): any[] {
    return (charts || [])
      .filter(chart => chart && chart.id && chart.name)
      .map(chart => this.cleanChart(chart))
  }

  /**
   * Clean project data for creation in Firestore
   * @param project - Project data to clean
   * @returns Cleaned project data ready for Firestore
   */
  cleanProjectForCreate(project: Project): any {
    const cleanedYarns = this.cleanYarns(project.yarns || [])
    const cleanedSessions = this.cleanSessions(project.sessions || [])
    const cleanedCharts = this.cleanCharts(project.charts || [])

    return {
      id: project.id,
      name: project.name || '',
      source: project.source || '',
      notes: project.notes || '',
      currentRound: project.currentRound || 1,
      currentStitch: project.currentStitch || 0,
      charts: cleanedCharts,
      currentChartId: project.currentChartId || '',
      yarns: cleanedYarns,
      sessions: cleanedSessions,
      createdDate: Timestamp.fromDate(project.createdDate),
      lastModified: Timestamp.fromDate(project.lastModified),
      isCompleted: project.isCompleted ?? false
    }
  }

  /**
   * Clean project data for update in Firestore
   * @param project - Project data to clean
   * @returns Cleaned project data ready for Firestore update
   */
  cleanProjectForUpdate(project: Project): any {
    const cleanedYarns = this.cleanYarns(project.yarns || [])
    const cleanedSessions = this.cleanSessions(project.sessions || [])
    const cleanedCharts = this.cleanCharts(project.charts || [])

    return {
      name: project.name || '',
      source: project.source || '',
      notes: project.notes || '',
      currentRound: project.currentRound || 1,
      currentStitch: project.currentStitch || 0,
      charts: cleanedCharts,
      currentChartId: project.currentChartId || '',
      yarns: cleanedYarns,
      sessions: cleanedSessions,
      lastModified: Timestamp.fromDate(project.lastModified),
      isCompleted: project.isCompleted ?? false
    }
  }

  /**
   * Validate project data structure
   * @param project - Project to validate
   * @throws Error if validation fails
   */
  validateProject(project: Project): void {
    if (!project.id || typeof project.id !== 'string') {
      throw new Error('Project must have a valid ID')
    }

    if (!project.name || typeof project.name !== 'string') {
      throw new Error('Project must have a valid name')
    }

    if (!project.createdDate || !(project.createdDate instanceof Date)) {
      throw new Error('Project must have a valid created date')
    }

    if (!project.lastModified || !(project.lastModified instanceof Date)) {
      throw new Error('Project must have a valid last modified date')
    }

    if (project.yarns && !Array.isArray(project.yarns)) {
      throw new Error('Project yarns must be an array')
    }

    if (project.sessions && !Array.isArray(project.sessions)) {
      throw new Error('Project sessions must be an array')
    }

    if (project.charts && !Array.isArray(project.charts)) {
      throw new Error('Project charts must be an array')
    }

    if (project.pattern && !Array.isArray(project.pattern)) {
      throw new Error('Project pattern must be an array')
    }
  }

  /**
   * Validate round data structure
   * @param round - Round to validate
   * @throws Error if validation fails
   */
  validateRound(round: Round): void {
    if (!round.id || typeof round.id !== 'string') {
      throw new Error('Round must have a valid ID')
    }

    if (typeof round.roundNumber !== 'number' || round.roundNumber < 1) {
      throw new Error('Round must have a valid round number')
    }

    if (!Array.isArray(round.stitches)) {
      throw new Error('Round stitches must be an array')
    }

    if (!Array.isArray(round.stitchGroups)) {
      throw new Error('Round stitch groups must be an array')
    }
  }

  /**
   * Convert Firestore timestamps back to Date objects
   * @param data - Data object containing Firestore timestamps
   * @returns Data with Date objects
   */
  convertTimestampsToDate(data: any): any {
    if (!data) return data

    const converted = { ...data }

    // Convert common timestamp fields
    if (converted.createdDate && typeof converted.createdDate.toDate === 'function') {
      converted.createdDate = converted.createdDate.toDate()
    }

    if (converted.lastModified && typeof converted.lastModified.toDate === 'function') {
      converted.lastModified = converted.lastModified.toDate()
    }

    if (converted.lastLogin && typeof converted.lastLogin.toDate === 'function') {
      converted.lastLogin = converted.lastLogin.toDate()
    }

    // Convert session timestamps
    if (converted.sessions && Array.isArray(converted.sessions)) {
      converted.sessions = converted.sessions.map((session: any) => ({
        ...session,
        startTime: session.startTime && typeof session.startTime.toDate === 'function'
          ? session.startTime.toDate()
          : session.startTime
      }))
    }

    return converted
  }

  /**
   * Check if data contains any undefined values (for debugging)
   * @param obj - Object to check
   * @param path - Current path for debugging
   * @returns Array of paths with undefined values
   */
  findUndefinedValues(obj: any, path: string = ''): string[] {
    const undefinedPaths: string[] = []

    if (obj === undefined) {
      undefinedPaths.push(path)
      return undefinedPaths
    }

    if (obj === null || typeof obj !== 'object') {
      return undefinedPaths
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        undefinedPaths.push(...this.findUndefinedValues(item, `${path}[${index}]`))
      })
    } else {
      Object.keys(obj).forEach(key => {
        const newPath = path ? `${path}.${key}` : key
        undefinedPaths.push(...this.findUndefinedValues(obj[key], newPath))
      })
    }

    return undefinedPaths
  }

  /**
   * Log data cleaning summary for debugging
   * @param originalData - Original data before cleaning
   * @param cleanedData - Data after cleaning
   * @param operation - Operation being performed
   */
  logCleaningSummary(originalData: any, cleanedData: any, operation: string): void {
    console.log(`[FIRESTORE-CLEANER] ${operation} cleaning summary:`, {
      originalUndefinedPaths: this.findUndefinedValues(originalData),
      cleanedUndefinedPaths: this.findUndefinedValues(cleanedData),
      operation
    })
  }
}

export const firestoreDataCleaner = new FirestoreDataCleaner()