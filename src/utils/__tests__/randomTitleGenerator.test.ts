import { describe, it, expect } from 'vitest'
import { generateRandomTitle } from '../randomTitleGenerator'

describe('randomTitleGenerator', () => {
  describe('generateRandomTitle', () => {
    it('should generate a title with two words', () => {
      const title = generateRandomTitle()
      const words = title.split(' ')
      expect(words).toHaveLength(2)
    })

    it('should generate a title with first word capitalized', () => {
      const title = generateRandomTitle()
      const firstWord = title.split(' ')[0]
      expect(firstWord[0]).toBe(firstWord[0].toUpperCase())
    })

    it('should generate a title with second word capitalized', () => {
      const title = generateRandomTitle()
      const secondWord = title.split(' ')[1]
      expect(secondWord[0]).toBe(secondWord[0].toUpperCase())
    })

    it('should generate different titles on multiple calls', () => {
      const titles = new Set()
      // Generate 20 titles - statistically should get some variation
      for (let i = 0; i < 20; i++) {
        titles.add(generateRandomTitle())
      }
      // Should have at least 2 different titles
      expect(titles.size).toBeGreaterThan(1)
    })

    it('should only contain expected adjectives and nouns', () => {
      const expectedAdjectives = ['Quick', 'New', 'Fresh', 'Brilliant', 'Random', 'Fleeting', 'Important', 'Creative', 'Urgent', 'Daily']
      const expectedNouns = ['Idea', 'Note', 'Thought', 'Draft', 'Musings', 'Insight', 'Plan', 'Jotting', 'Memo', 'Log']
      
      // Generate multiple titles to check consistency
      for (let i = 0; i < 10; i++) {
        const title = generateRandomTitle()
        const [adjective, noun] = title.split(' ')
        expect(expectedAdjectives).toContain(adjective)
        expect(expectedNouns).toContain(noun)
      }
    })
  })
})
