import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDuration, formatDate } from './formatters'

describe('Date Formatters', () => {
  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(30)).toBe('30秒')
      expect(formatDuration(59)).toBe('59秒')
    })

    it('should format minutes and ignore seconds when minutes > 0', () => {
      expect(formatDuration(60)).toBe('1分鐘')
      expect(formatDuration(120)).toBe('2分鐘')
      expect(formatDuration(150)).toBe('2分鐘') // 2.5 minutes = 2 minutes (floor)
    })

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1小時0分')
      expect(formatDuration(3660)).toBe('1小時1分')
      expect(formatDuration(7230)).toBe('2小時0分') // 2 hours 30 seconds = 2 hours 0 minutes
    })

    it('should handle zero seconds', () => {
      expect(formatDuration(0)).toBe('0秒')
    })

    it('should handle large numbers', () => {
      expect(formatDuration(86400)).toBe('24小時0分') // 1 day
      expect(formatDuration(90061)).toBe('25小時1分') // 25 hours 1 second
    })

    it('should handle negative numbers', () => {
      expect(formatDuration(-60)).toBe('-60秒')
      expect(formatDuration(-30)).toBe('-30秒')
    })
  })

  describe('formatDate', () => {
    beforeEach(() => {
      // Mock the timezone to Taiwan for consistent testing
      vi.stubGlobal('Intl', {
        DateTimeFormat: vi.fn().mockImplementation((_, __) => ({
          format: vi.fn().mockImplementation((date) => {
            // Mock Taiwan format
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            const hour = date.getHours().toString().padStart(2, '0')
            const minute = date.getMinutes().toString().padStart(2, '0')
            return `${year}年${month}月${day}日 ${hour}:${minute}`
          })
        }))
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should format Date object', () => {
      const date = new Date('2023-12-25T10:30:00')
      const result = formatDate(date)
      expect(result).toBe('2023年12月25日 10:30')
    })

    it('should format timestamp number', () => {
      const timestamp = new Date('2023-12-25T10:30:00').getTime()
      const result = formatDate(timestamp)
      expect(result).toBe('2023年12月25日 10:30')
    })

    it('should format date string', () => {
      const result = formatDate('2023-12-25T10:30:00')
      expect(result).toBe('2023年12月25日 10:30')
    })

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('無效日期')
      expect(formatDate(NaN)).toBe('無效日期')
    })

    it('should handle edge dates', () => {
      // Test epoch
      const epoch = formatDate(0)
      expect(epoch).toBe('1970年1月1日 08:00') // UTC+8 Taiwan time
      
      // Test future date
      const future = formatDate('2099-12-31T23:59:59')
      expect(future).toBe('2099年12月31日 23:59')
    })

    it('should handle different date formats', () => {
      // ISO string
      expect(formatDate('2023-01-01')).toBe('2023年1月1日 08:00')
      
      // Different ISO format
      expect(formatDate('2023-01-01T00:00:00.000Z')).toBe('2023年1月1日 08:00')
    })
  })
})