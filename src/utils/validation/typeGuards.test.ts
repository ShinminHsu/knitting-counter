
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isString,
  isNumber,
  isBoolean,
  isDate,
  isObject,
  isArray,
  isValidStitchType,
  isValidStitchInfo,
  isValidStitchGroup,
  isValidYarn,
  isValidWorkSession,
  isValidChart,
  isValidProject,
  validateProject,
  safeParseProject,
  safeParseProjects,
  assertIsProject,
  assertIsRound,
  assertIsChart
} from './typeGuards'
import {
  StitchType,
  StitchInfo,
  StitchGroup,
  Yarn,
  WorkSession,
  Chart,
  Project
} from '../../types'
import { createMockProject, createMockChart } from '../../test/utils'

describe('Type Guards', () => {
  describe('Basic type guards', () => {
    describe('isString', () => {
      it('should return true for strings', () => {
        expect(isString('hello')).toBe(true)
        expect(isString('')).toBe(true)
        expect(isString('123')).toBe(true)
      })

      it('should return false for non-strings', () => {
        expect(isString(123)).toBe(false)
        expect(isString(null)).toBe(false)
        expect(isString(undefined)).toBe(false)
        expect(isString({})).toBe(false)
        expect(isString([])).toBe(false)
      })
    })

    describe('isNumber', () => {
      it('should return true for valid numbers', () => {
        expect(isNumber(123)).toBe(true)
        expect(isNumber(0)).toBe(true)
        expect(isNumber(-123)).toBe(true)
        expect(isNumber(123.45)).toBe(true)
      })

      it('should return false for invalid numbers and non-numbers', () => {
        expect(isNumber(NaN)).toBe(false)
        expect(isNumber('123')).toBe(false)
        expect(isNumber(null)).toBe(false)
        expect(isNumber(undefined)).toBe(false)
      })
    })

    describe('isBoolean', () => {
      it('should return true for booleans', () => {
        expect(isBoolean(true)).toBe(true)
        expect(isBoolean(false)).toBe(true)
      })

      it('should return false for non-booleans', () => {
        expect(isBoolean(1)).toBe(false)
        expect(isBoolean(0)).toBe(false)
        expect(isBoolean('true')).toBe(false)
        expect(isBoolean(null)).toBe(false)
      })
    })

    describe('isDate', () => {
      it('should return true for valid dates', () => {
        expect(isDate(new Date())).toBe(true)
        expect(isDate(new Date('2023-01-01'))).toBe(true)
      })

      it('should return false for invalid dates and non-dates', () => {
        expect(isDate(new Date('invalid'))).toBe(false)
        expect(isDate('2023-01-01')).toBe(false)
        expect(isDate(1234567890)).toBe(false)
        expect(isDate(null)).toBe(false)
      })
    })

    describe('isObject', () => {
      it('should return true for objects', () => {
        expect(isObject({})).toBe(true)
        expect(isObject({ key: 'value' })).toBe(true)
      })

      it('should return false for non-objects', () => {
        expect(isObject(null)).toBe(false)
        expect(isObject([])).toBe(false)
        expect(isObject('string')).toBe(false)
        expect(isObject(123)).toBe(false)
        expect(isObject(undefined)).toBe(false)
      })
    })

    describe('isArray', () => {
      it('should return true for arrays', () => {
        expect(isArray([])).toBe(true)
        expect(isArray([1, 2, 3])).toBe(true)
        expect(isArray(['a', 'b'])).toBe(true)
      })

      it('should return false for non-arrays', () => {
        expect(isArray({})).toBe(false)
        expect(isArray('string')).toBe(false)
        expect(isArray(null)).toBe(false)
        expect(isArray(undefined)).toBe(false)
      })
    })
  })

  describe('Domain-specific type guards', () => {
    describe('isValidStitchType', () => {
      it('should return true for valid stitch types', () => {
        expect(isValidStitchType(StitchType.SINGLE)).toBe(true)
        expect(isValidStitchType(StitchType.CHAIN)).toBe(true)
        expect(isValidStitchType(StitchType.CUSTOM)).toBe(true)
      })

      it('should return false for invalid stitch types', () => {
        expect(isValidStitchType('invalid')).toBe(false)
        expect(isValidStitchType(123)).toBe(false)
        expect(isValidStitchType(null)).toBe(false)
      })
    })

    describe('isValidStitchInfo', () => {
      const validStitch: StitchInfo = {
        id: 'stitch-1',
        type: StitchType.SINGLE,
        yarnId: 'yarn-1',
        count: 3
      }

      it('should return true for valid stitch info', () => {
        expect(isValidStitchInfo(validStitch)).toBe(true)
      })

      it('should return true for stitch with optional custom fields', () => {
        const customStitch = {
          ...validStitch,
          customName: 'Custom Stitch',
          customSymbol: '*'
        }
        expect(isValidStitchInfo(customStitch)).toBe(true)
      })

      it('should return false for invalid stitch info', () => {
        expect(isValidStitchInfo({ ...validStitch, id: 123 })).toBe(false)
        expect(isValidStitchInfo({ ...validStitch, type: 'invalid' })).toBe(false)
        expect(isValidStitchInfo({ ...validStitch, count: 0 })).toBe(false)
        expect(isValidStitchInfo({ ...validStitch, count: -1 })).toBe(false)
        expect(isValidStitchInfo(null)).toBe(false)
        expect(isValidStitchInfo('string')).toBe(false)
      })

      it('should return false for missing required fields', () => {
        expect(isValidStitchInfo({ type: StitchType.SINGLE, yarnId: 'yarn-1', count: 1 })).toBe(false)
        expect(isValidStitchInfo({ id: 'stitch-1', yarnId: 'yarn-1', count: 1 })).toBe(false)
        expect(isValidStitchInfo({ id: 'stitch-1', type: StitchType.SINGLE, count: 1 })).toBe(false)
        expect(isValidStitchInfo({ id: 'stitch-1', type: StitchType.SINGLE, yarnId: 'yarn-1' })).toBe(false)
      })
    })

    describe('isValidStitchGroup', () => {
      const validStitch: StitchInfo = {
        id: 'stitch-1',
        type: StitchType.SINGLE,
        yarnId: 'yarn-1',
        count: 1
      }

      const validGroup: StitchGroup = {
        id: 'group-1',
        name: 'Test Group',
        stitches: [validStitch],
        repeatCount: 2
      }

      it('should return true for valid stitch group', () => {
        expect(isValidStitchGroup(validGroup)).toBe(true)
      })

      it('should return true for group with completedRepeats', () => {
        const groupWithCompleted = { ...validGroup, completedRepeats: 1 }
        expect(isValidStitchGroup(groupWithCompleted)).toBe(true)
      })

      it('should return false for invalid stitch group', () => {
        expect(isValidStitchGroup({ ...validGroup, repeatCount: 0 })).toBe(false)
        expect(isValidStitchGroup({ ...validGroup, repeatCount: -1 })).toBe(false)
        expect(isValidStitchGroup({ ...validGroup, stitches: [{ invalid: 'stitch' }] })).toBe(false)
        expect(isValidStitchGroup(null)).toBe(false)
      })
    })

    describe('isValidYarn', () => {
      const validYarn: Yarn = {
        id: 'yarn-1',
        name: 'Test Yarn',
        color: {
          name: 'Red',
          hex: '#FF0000'
        }
      }

      it('should return true for valid yarn', () => {
        expect(isValidYarn(validYarn)).toBe(true)
      })

      it('should return true for yarn with brand', () => {
        const yarnWithBrand = { ...validYarn, brand: 'Test Brand' }
        expect(isValidYarn(yarnWithBrand)).toBe(true)
      })

      it('should return false for invalid yarn', () => {
        expect(isValidYarn({ ...validYarn, color: { name: 'Red' } })).toBe(false) // Missing hex
        expect(isValidYarn({ ...validYarn, color: { hex: '#FF0000' } })).toBe(false) // Missing name
        expect(isValidYarn({ ...validYarn, color: 'red' })).toBe(false) // Invalid color object
        expect(isValidYarn(null)).toBe(false)
      })
    })

    describe('isValidWorkSession', () => {
      const validSession: WorkSession = {
        id: 'session-1',
        startTime: new Date(),
        duration: 1800, // 30 minutes
        roundsCompleted: 2,
        stitchesCompleted: 50
      }

      it('should return true for valid work session', () => {
        expect(isValidWorkSession(validSession)).toBe(true)
      })

      it('should return true for session with optional fields undefined', () => {
        const minimalSession = {
          id: 'session-1',
          startTime: new Date(),
          duration: 1800
        }
        expect(isValidWorkSession(minimalSession)).toBe(true)
      })

      it('should return false for invalid work session', () => {
        expect(isValidWorkSession({ ...validSession, duration: -1 })).toBe(false)
        expect(isValidWorkSession({ ...validSession, roundsCompleted: -1 })).toBe(false)
        expect(isValidWorkSession({ ...validSession, stitchesCompleted: -1 })).toBe(false)
        expect(isValidWorkSession({ ...validSession, startTime: 'invalid' })).toBe(false)
        expect(isValidWorkSession(null)).toBe(false)
      })
    })

    describe('isValidChart', () => {
      let validChart: Chart

      beforeEach(() => {
        validChart = createMockChart()
      })

      it('should return true for valid chart', () => {
        expect(isValidChart(validChart)).toBe(true)
      })

      it('should return false for invalid chart', () => {
        expect(isValidChart({ ...validChart, currentRound: 0 })).toBe(false)
        expect(isValidChart({ ...validChart, currentStitch: -1 })).toBe(false)
        expect(isValidChart({ ...validChart, rounds: [{ invalid: 'round' }] })).toBe(false)
        expect(isValidChart(null)).toBe(false)
      })
    })

    describe('isValidProject', () => {
      let validProject: Project

      beforeEach(() => {
        validProject = createMockProject()
      })

      it('should return true for valid project', () => {
        expect(isValidProject(validProject)).toBe(true)
      })

      it('should return false for invalid project', () => {
        expect(isValidProject({ ...validProject, yarns: ['invalid'] })).toBe(false)
        expect(isValidProject({ ...validProject, sessions: [{ invalid: 'session' }] })).toBe(false)
        expect(isValidProject(null)).toBe(false)
      })

      it('should handle projects with optional fields', () => {
        const minimalProject = {
          id: 'project-1',
          name: 'Test Project',
          yarns: [],
          sessions: [],
          createdDate: new Date(),
          lastModified: new Date()
        }
        expect(isValidProject(minimalProject)).toBe(true)
      })
    })
  })

  describe('Validation functions', () => {
    describe('validateProject', () => {
      it('should return success for valid project', () => {
        const project = createMockProject()
        const result = validateProject(project)
        
        expect(result.isValid).toBe(true)
        expect(result.data).toBe(project)
        expect(result.errors).toHaveLength(0)
      })

      it('should return error for invalid project', () => {
        const invalidProject = { invalid: 'project' }
        const result = validateProject(invalidProject)
        
        expect(result.isValid).toBe(false)
        expect(result.data).toBeUndefined()
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].path).toBe('project')
      })
    })

    describe('safeParseProject', () => {
      it('should return project for valid data', () => {
        const project = createMockProject()
        const result = safeParseProject(project)
        
        expect(result).toBe(project)
      })

      it('should return null for invalid data', () => {
        const invalidData = { invalid: 'data' }
        const result = safeParseProject(invalidData)
        
        expect(result).toBeNull()
      })
    })

    describe('safeParseProjects', () => {
      it('should return empty array for non-array data', () => {
        const result = safeParseProjects('not an array')
        expect(result).toEqual([])
      })

      it('should return valid projects and filter invalid ones', () => {
        const validProject = createMockProject()
        const mixedData = [
          validProject,
          { invalid: 'project' },
          {
            id: 'project-2',
            name: 'Basic Project',
            createdDate: new Date(),
            lastModified: new Date()
          }
        ]
        
        const result = safeParseProjects(mixedData)
        
        expect(result).toHaveLength(2) // One fully valid, one sanitized
        expect(result[0].id).toBe(validProject.id)
        expect(result[0].name).toBe(validProject.name)
        expect(result[1].id).toBe('project-2')
      })

      it('should sanitize projects with missing fields', () => {
        const basicProject = {
          id: 'project-1',
          name: 'Test Project',
          createdDate: new Date(),
          lastModified: new Date()
        }
        
        const result = safeParseProjects([basicProject])
        
        expect(result).toHaveLength(1)
        expect(result[0].yarns).toEqual([])
        expect(result[0].sessions).toEqual([])
        expect(result[0].currentRound).toBe(1)
        expect(result[0].currentStitch).toBe(0)
      })
    })

    describe('Assertion functions', () => {
      describe('assertIsProject', () => {
        it('should not throw for valid project', () => {
          const project = createMockProject()
          expect(() => assertIsProject(project)).not.toThrow()
        })

        it('should throw for invalid project', () => {
          const invalidProject = { invalid: 'project' }
          expect(() => assertIsProject(invalidProject, 'test context')).toThrow(
            '[VALIDATION] Expected valid Project in test context'
          )
        })
      })

      describe('assertIsRound', () => {
        it('should not throw for valid round', () => {
          const round = {
            id: 'round-1',
            roundNumber: 1,
            stitches: [],
            stitchGroups: []
          }
          expect(() => assertIsRound(round)).not.toThrow()
        })

        it('should throw for invalid round', () => {
          const invalidRound = { invalid: 'round' }
          expect(() => assertIsRound(invalidRound, 'test context')).toThrow(
            '[VALIDATION] Expected valid Round in test context'
          )
        })
      })

      describe('assertIsChart', () => {
        it('should not throw for valid chart', () => {
          const chart = createMockChart()
          expect(() => assertIsChart(chart)).not.toThrow()
        })

        it('should throw for invalid chart', () => {
          const invalidChart = { invalid: 'chart' }
          expect(() => assertIsChart(invalidChart, 'test context')).toThrow(
            '[VALIDATION] Expected valid Chart in test context'
          )
        })
      })
    })
  })
})