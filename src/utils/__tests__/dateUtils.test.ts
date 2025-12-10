import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  getRelativeTime,
  getTimeOfDay,
  getGreeting,
  formatTime,
  formatShortDate,
} from '../dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    beforeEach(() => {
      // Mock the current date to a fixed time for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Today" for current date', () => {
      const today = new Date('2024-01-15T10:00:00Z')
      expect(formatDate(today)).toBe('Today')
    })

    it('should return "Yesterday" for previous day', () => {
      const yesterday = new Date('2024-01-14T10:00:00Z')
      expect(formatDate(yesterday)).toBe('Yesterday')
    })

    it('should return "X days ago" for dates within a week', () => {
      const threeDaysAgo = new Date('2024-01-12T10:00:00Z')
      expect(formatDate(threeDaysAgo)).toBe('3 days ago')
    })

    it('should return formatted date for dates older than a week', () => {
      const oldDate = new Date('2024-01-01T10:00:00Z')
      const result = formatDate(oldDate)
      expect(result).toContain('Jan')
      expect(result).toContain('1')
    })

    it('should include year for dates from different year', () => {
      const oldDate = new Date('2023-06-15T10:00:00Z')
      const result = formatDate(oldDate)
      expect(result).toContain('2023')
    })

    it('should handle string dates', () => {
      const dateString = '2024-01-15T10:00:00Z'
      expect(formatDate(dateString)).toBe('Today')
    })
  })

  describe('getRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Just now" for very recent time', () => {
      const justNow = new Date('2024-01-15T11:59:30Z')
      expect(getRelativeTime(justNow)).toBe('Just now')
    })

    it('should return minutes ago for times less than an hour', () => {
      const thirtyMinsAgo = new Date('2024-01-15T11:30:00Z')
      expect(getRelativeTime(thirtyMinsAgo)).toBe('30m ago')
    })

    it('should return hours ago for times less than a day', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z')
      expect(getRelativeTime(twoHoursAgo)).toBe('2h ago')
    })

    it('should return days ago for older times', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z')
      expect(getRelativeTime(threeDaysAgo)).toBe('3d ago')
    })

    it('should handle string dates', () => {
      const dateString = '2024-01-15T11:30:00Z'
      expect(getRelativeTime(dateString)).toBe('30m ago')
    })
  })

  describe('getTimeOfDay', () => {
    it('should return "morning" for hours before noon', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T08:00:00Z'))
      expect(getTimeOfDay()).toBe('morning')
      vi.useRealTimers()
    })

    it('should return "afternoon" for hours between noon and 5pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T14:00:00Z'))
      expect(getTimeOfDay()).toBe('afternoon')
      vi.useRealTimers()
    })

    it('should return "evening" for hours between 5pm and 8pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T18:00:00Z'))
      expect(getTimeOfDay()).toBe('evening')
      vi.useRealTimers()
    })

    it('should return "night" for hours after 8pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T21:00:00Z'))
      expect(getTimeOfDay()).toBe('night')
      vi.useRealTimers()
    })
  })

  describe('getGreeting', () => {
    it('should return morning greeting', () => {
      expect(getGreeting('Alice', 'morning')).toBe('Good morning, Alice!')
    })

    it('should return afternoon greeting', () => {
      expect(getGreeting('Bob', 'afternoon')).toBe('Good afternoon, Bob!')
    })

    it('should return evening greeting', () => {
      expect(getGreeting('Charlie', 'evening')).toBe('Good evening, Charlie!')
    })

    it('should return night greeting', () => {
      expect(getGreeting('Diana', 'night')).toBe('Working late, Diana?')
    })

    it('should use "there" when no name is provided', () => {
      expect(getGreeting(undefined, 'morning')).toBe('Good morning, there!')
    })

    it('should detect time of day automatically when not provided', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T08:00:00Z'))
      expect(getGreeting('Alice')).toBe('Good morning, Alice!')
      vi.useRealTimers()
    })

    it('should handle unknown time of day', () => {
      expect(getGreeting('Alice', 'unknown' as any)).toBe('Hello, Alice!')
    })
  })

  describe('formatTime', () => {
    it('should format time in HH:MM format', () => {
      const date = new Date('2024-01-15T14:30:00Z')
      const result = formatTime(date)
      // Result depends on timezone, so just check format
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should use current time when no date is provided', () => {
      const result = formatTime()
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatShortDate', () => {
    it('should format date with weekday, month and day', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = formatShortDate(date)
      expect(result).toMatch(/\w{3}, \w{3} \d{1,2}/)
    })

    it('should use current date when no date is provided', () => {
      const result = formatShortDate()
      expect(result).toMatch(/\w{3}, \w{3} \d{1,2}/)
    })
  })
})
