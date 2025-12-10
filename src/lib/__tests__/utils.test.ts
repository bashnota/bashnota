import { describe, it, expect } from 'vitest'
import { cn, getURLWithoutProtocol, stripAnsi } from '../utils'

describe('lib/utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'conditional', true && 'active')
      expect(result).toBe('base active')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      // twMerge should keep only the last px value
      expect(result).toBe('py-1 px-4')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle objects', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'error': true,
      })
      expect(result).toBe('active error')
    })

    it('should handle empty values', () => {
      const result = cn('', null, undefined, 'valid')
      expect(result).toBe('valid')
    })
  })

  describe('getURLWithoutProtocol', () => {
    it('should remove http protocol', () => {
      const result = getURLWithoutProtocol('http://example.com')
      expect(result).toBe('example.com')
    })

    it('should remove https protocol', () => {
      const result = getURLWithoutProtocol('https://example.com')
      expect(result).toBe('example.com')
    })

    it('should remove ftp protocol', () => {
      const result = getURLWithoutProtocol('ftp://example.com')
      expect(result).toBe('example.com')
    })

    it('should handle URL with path', () => {
      const result = getURLWithoutProtocol('https://example.com/path/to/page')
      expect(result).toBe('example.com/path/to/page')
    })

    it('should handle URL with query params', () => {
      const result = getURLWithoutProtocol('https://example.com?param=value')
      expect(result).toBe('example.com?param=value')
    })

    it('should handle URL already without protocol', () => {
      const result = getURLWithoutProtocol('example.com')
      expect(result).toBe('example.com')
    })

    it('should handle protocol-relative URLs', () => {
      const result = getURLWithoutProtocol('//example.com')
      expect(result).toBe('example.com')
    })
  })

  describe('stripAnsi', () => {
    it('should remove basic ANSI color codes', () => {
      const text = '\x1b[31mRed text\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('Red text')
    })

    it('should remove multiple ANSI codes', () => {
      const text = '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('Red Green')
    })

    it('should handle text without ANSI codes', () => {
      const text = 'Plain text'
      const result = stripAnsi(text)
      expect(result).toBe('Plain text')
    })

    it('should remove bold/italic codes', () => {
      const text = '\x1b[1mBold\x1b[0m \x1b[3mItalic\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('Bold Italic')
    })

    it('should remove background color codes', () => {
      const text = '\x1b[41mRed background\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('Red background')
    })

    it('should handle empty string', () => {
      const result = stripAnsi('')
      expect(result).toBe('')
    })

    it('should handle null/undefined', () => {
      expect(stripAnsi(null as any)).toBe('')
      expect(stripAnsi(undefined as any)).toBe('')
    })

    it('should remove 256-color codes', () => {
      const text = '\x1b[38;5;196mRed text\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('Red text')
    })

    it('should remove RGB color codes', () => {
      const text = '\x1b[38;2;255;0;0mRGB Red\x1b[0m'
      const result = stripAnsi(text)
      expect(result).toBe('RGB Red')
    })
  })
})
