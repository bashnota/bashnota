import { useToast } from '@/components/ui/toast'
import { type ClassValue, clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: Date | string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/**
 * Format a date into a human-readable relative time (e.g., "2 hours ago")
 * @param date The date to format
 * @returns A string representation of the relative time
 */
export const formatRelativeTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export const toast = (
  message: string,
  title: string = '',
  variant: 'default' | 'destructive' = 'default',
) => {
  const { toast } = useToast()

  toast({
    title,
    description: message,
    variant,
    duration: 2000,
    class: cn('top-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4'),
  })
}

export const getURLWithoutProtocol = (url: string) => {
  return url.replace(/(^\w+:|^)\/\//, '')
}

/**
 * Convert ANSI escape codes to HTML with proper styling
 * @param text The text containing ANSI escape codes
 * @returns HTML string with styled spans
 */
export const ansiToHtml = (text: string): string => {
  if (!text) return ''

  // ANSI color codes mapping
  const ansiColors: Record<string, string> = {
    // Standard colors (30-37, 90-97)
    '30': 'color: #000000', // black
    '31': 'color: #dc2626', // red
    '32': 'color: #16a34a', // green
    '33': 'color: #ca8a04', // yellow
    '34': 'color: #2563eb', // blue
    '35': 'color: #9333ea', // magenta
    '36': 'color: #0891b2', // cyan
    '37': 'color: #6b7280', // white/gray
    
    // Bright colors (90-97)
    '90': 'color: #374151', // bright black (dark gray)
    '91': 'color: #ef4444', // bright red
    '92': 'color: #22c55e', // bright green
    '93': 'color: #eab308', // bright yellow
    '94': 'color: #3b82f6', // bright blue
    '95': 'color: #a855f7', // bright magenta
    '96': 'color: #06b6d4', // bright cyan
    '97': 'color: #f3f4f6', // bright white
    
    // Background colors (40-47, 100-107)
    '40': 'background-color: #000000',
    '41': 'background-color: #dc2626',
    '42': 'background-color: #16a34a',
    '43': 'background-color: #ca8a04',
    '44': 'background-color: #2563eb',
    '45': 'background-color: #9333ea',
    '46': 'background-color: #0891b2',
    '47': 'background-color: #6b7280',
    
    // Text styles
    '1': 'font-weight: bold',
    '2': 'opacity: 0.7',
    '3': 'font-style: italic',
    '4': 'text-decoration: underline',
    '9': 'text-decoration: line-through',
  }

  // Handle 256-color codes (38;5;n and 48;5;n)
  const get256Color = (colorCode: number, isBackground = false): string => {
    // Standard colors (0-15)
    if (colorCode < 16) {
      const standardColors = [
        '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
        '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'
      ]
      const prop = isBackground ? 'background-color' : 'color'
      return `${prop}: ${standardColors[colorCode]}`
    }
    
    // 216 color cube (16-231)
    if (colorCode < 232) {
      const n = colorCode - 16
      const r = Math.floor(n / 36)
      const g = Math.floor((n % 36) / 6)
      const b = n % 6
      const toHex = (val: number) => val === 0 ? 0 : 55 + val * 40
      const color = `rgb(${toHex(r)}, ${toHex(g)}, ${toHex(b)})`
      const prop = isBackground ? 'background-color' : 'color'
      return `${prop}: ${color}`
    }
    
    // Grayscale (232-255)
    const gray = 8 + (colorCode - 232) * 10
    const color = `rgb(${gray}, ${gray}, ${gray})`
    const prop = isBackground ? 'background-color' : 'color'
    return `${prop}: ${color}`
  }

  let result = text
  let openTags: string[] = []

  // Replace ANSI escape sequences
  result = result.replace(/\x1b\[([0-9;]*)m/g, (match, codes) => {
    if (!codes) {
      // Reset all formatting
      const closeTags = openTags.reverse().map(() => '</span>').join('')
      openTags = []
      return closeTags
    }

    const codeList = codes.split(';').filter((code: string) => code !== '')
    let styles: string[] = []
    let html = ''

    for (const code of codeList) {
      if (code === '0') {
        // Reset all formatting
        html += openTags.reverse().map(() => '</span>').join('')
        openTags = []
      } else if (code === '38') {
        // Extended foreground color - handled separately
        continue
      } else if (code === '48') {
        // Extended background color - handled separately
        continue
      } else if (ansiColors[code]) {
        styles.push(ansiColors[code])
      }
    }

    // Handle 256-color sequences (38;5;n or 48;5;n)
    const colorMatch = codes.match(/(?:38|48);5;(\d+)/)
    if (colorMatch) {
      const colorCode = parseInt(colorMatch[1])
      const isBackground = codes.includes('48;5')
      styles.push(get256Color(colorCode, isBackground))
    }

    // Handle RGB sequences (38;2;r;g;b or 48;2;r;g;b)
    const rgbMatch = codes.match(/(38|48);2;(\d+);(\d+);(\d+)/)
    if (rgbMatch) {
      const [, type, r, g, b] = rgbMatch
      const prop = type === '48' ? 'background-color' : 'color'
      styles.push(`${prop}: rgb(${r}, ${g}, ${b})`)
    }

    if (styles.length > 0) {
      const styleAttr = styles.join('; ')
      html += `<span style="${styleAttr}">`
      openTags.push('span')
    }

    return html
  })

  // Close any remaining open tags
  result += openTags.reverse().map(() => '</span>').join('')

  return result
}

/**
 * Strip ANSI escape codes from text
 * @param text The text containing ANSI escape codes
 * @returns Plain text without ANSI codes
 */
export const stripAnsi = (text: string): string => {
  if (!text) return ''
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}
