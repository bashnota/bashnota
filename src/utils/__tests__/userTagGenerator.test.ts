import { describe, it, expect, vi, beforeAll } from 'vitest'
import { generateUserTag, validateUserTagFormat } from '../userTagGenerator'

// Mock Firebase services
vi.mock('@/services/firebase', () => ({
  firestore: {},
}))

vi.mock('@/services/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('userTagGenerator', () => {
  describe('generateUserTag', () => {
    it('should generate a tag with default options', () => {
      const tag = generateUserTag()
      expect(tag).toBeTruthy()
      expect(typeof tag).toBe('string')
    })

    it('should generate a tag with words by default', () => {
      const tag = generateUserTag({ useWords: true })
      // Should contain alphabetic characters and numbers
      expect(tag).toMatch(/[a-z]+[a-z]+\d+/)
    })

    it('should generate a tag without words when useWords is false', () => {
      const tag = generateUserTag({ useWords: false })
      // Should be alphanumeric only
      expect(tag).toMatch(/^[a-zA-Z0-9]+$/)
    })

    it('should respect the prefix option', () => {
      const prefix = 'test_'
      const tag = generateUserTag({ prefix })
      expect(tag.startsWith(prefix)).toBe(true)
    })

    it('should respect the length option when not using words', () => {
      const length = 12
      const tag = generateUserTag({ useWords: false, length })
      expect(tag.length).toBe(length)
    })

    it('should respect the length option with prefix', () => {
      const prefix = 'pre_'
      const length = 10
      const tag = generateUserTag({ useWords: false, prefix, length })
      expect(tag.length).toBe(prefix.length + length)
    })

    it('should generate different tags on multiple calls', () => {
      const tags = new Set()
      // Generate 20 tags - should get variation
      for (let i = 0; i < 20; i++) {
        tags.add(generateUserTag())
      }
      // Should have multiple unique tags
      expect(tags.size).toBeGreaterThan(10)
    })

    it('should generate valid format tags with words', () => {
      for (let i = 0; i < 10; i++) {
        const tag = generateUserTag({ useWords: true })
        // Should be alphanumeric only
        expect(tag).toMatch(/^[a-zA-Z0-9]+$/)
      }
    })
  })

  describe('validateUserTagFormat', () => {
    it('should accept valid alphanumeric tags', () => {
      expect(validateUserTagFormat('validTag123')).toBe(true)
      expect(validateUserTagFormat('user_name_2024')).toBe(true)
      expect(validateUserTagFormat('ABC123')).toBe(true)
    })

    it('should accept tags with underscores', () => {
      expect(validateUserTagFormat('user_tag')).toBe(true)
      expect(validateUserTagFormat('my_user_tag_123')).toBe(true)
    })

    it('should reject tags that are too short', () => {
      expect(validateUserTagFormat('ab')).toBe(false)
      expect(validateUserTagFormat('a')).toBe(false)
      expect(validateUserTagFormat('')).toBe(false)
    })

    it('should reject tags that are too long', () => {
      const longTag = 'a'.repeat(31)
      expect(validateUserTagFormat(longTag)).toBe(false)
    })

    it('should accept tags at boundary lengths', () => {
      expect(validateUserTagFormat('abc')).toBe(true) // 3 chars
      expect(validateUserTagFormat('a'.repeat(30))).toBe(true) // 30 chars
    })

    it('should reject tags with special characters', () => {
      expect(validateUserTagFormat('user-tag')).toBe(false)
      expect(validateUserTagFormat('user.tag')).toBe(false)
      expect(validateUserTagFormat('user@tag')).toBe(false)
      expect(validateUserTagFormat('user tag')).toBe(false)
      expect(validateUserTagFormat('user!tag')).toBe(false)
    })

    it('should reject tags with spaces', () => {
      expect(validateUserTagFormat('user tag')).toBe(false)
      expect(validateUserTagFormat(' usertag')).toBe(false)
      expect(validateUserTagFormat('usertag ')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(validateUserTagFormat('___')).toBe(true) // Only underscores
      expect(validateUserTagFormat('123')).toBe(true) // Only numbers
      expect(validateUserTagFormat('_a_')).toBe(true) // Starting/ending with underscore
    })
  })
})
