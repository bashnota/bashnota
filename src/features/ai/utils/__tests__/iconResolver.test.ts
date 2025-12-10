import { describe, it, expect } from 'vitest'
import { getIconComponent, getColorClasses, ICON_MAP, COLOR_CLASSES } from '../iconResolver'

describe('iconResolver', () => {
  describe('getIconComponent', () => {
    it('should return correct icon for valid icon name', () => {
      const result = getIconComponent('EditIcon')
      expect(result).toBe(ICON_MAP.EditIcon)
    })

    it('should return SparklesIcon for "SparklesIcon"', () => {
      const result = getIconComponent('SparklesIcon')
      expect(result).toBe(ICON_MAP.SparklesIcon)
    })

    it('should return WandIcon for "WandIcon"', () => {
      const result = getIconComponent('WandIcon')
      expect(result).toBe(ICON_MAP.WandIcon)
    })

    it('should return CheckCircleIcon for "CheckCircleIcon"', () => {
      const result = getIconComponent('CheckCircleIcon')
      expect(result).toBe(ICON_MAP.CheckCircleIcon)
    })

    it('should return default EditIcon for invalid icon name', () => {
      const result = getIconComponent('InvalidIcon')
      expect(result).toBe(ICON_MAP.EditIcon)
    })

    it('should return default EditIcon for empty string', () => {
      const result = getIconComponent('')
      expect(result).toBe(ICON_MAP.EditIcon)
    })

    it('should return default EditIcon for null', () => {
      const result = getIconComponent(null as any)
      expect(result).toBe(ICON_MAP.EditIcon)
    })

    it('should return default EditIcon for undefined', () => {
      const result = getIconComponent(undefined as any)
      expect(result).toBe(ICON_MAP.EditIcon)
    })

    it('should return default EditIcon for non-string value', () => {
      const result = getIconComponent(123 as any)
      expect(result).toBe(ICON_MAP.EditIcon)
    })

    it('should handle all icon names in ICON_MAP', () => {
      Object.keys(ICON_MAP).forEach(iconName => {
        const result = getIconComponent(iconName)
        expect(result).toBe(ICON_MAP[iconName as keyof typeof ICON_MAP])
      })
    })
  })

  describe('getColorClasses', () => {
    it('should return correct color classes for valid color', () => {
      const result = getColorClasses('blue')
      expect(result).toEqual(COLOR_CLASSES.blue)
    })

    it('should return green color classes', () => {
      const result = getColorClasses('green')
      expect(result).toEqual({
        text: 'text-green-600',
        hover: 'hover:bg-green-50 hover:text-green-700',
        bg: 'bg-green-600'
      })
    })

    it('should return purple color classes', () => {
      const result = getColorClasses('purple')
      expect(result).toEqual(COLOR_CLASSES.purple)
    })

    it('should return default blue for invalid color', () => {
      const result = getColorClasses('invalid')
      expect(result).toBe(COLOR_CLASSES.blue)
    })

    it('should return default blue for empty string', () => {
      const result = getColorClasses('')
      expect(result).toBe(COLOR_CLASSES.blue)
    })

    it('should return default blue for null', () => {
      const result = getColorClasses(null as any)
      expect(result).toBe(COLOR_CLASSES.blue)
    })

    it('should return default blue for undefined', () => {
      const result = getColorClasses(undefined as any)
      expect(result).toBe(COLOR_CLASSES.blue)
    })

    it('should return default blue for non-string value', () => {
      const result = getColorClasses(123 as any)
      expect(result).toBe(COLOR_CLASSES.blue)
    })

    it('should handle all colors in COLOR_CLASSES', () => {
      Object.keys(COLOR_CLASSES).forEach(colorName => {
        const result = getColorClasses(colorName)
        expect(result).toBe(COLOR_CLASSES[colorName as keyof typeof COLOR_CLASSES])
      })
    })

    it('should return objects with expected properties', () => {
      const result = getColorClasses('red')
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('hover')
      expect(result).toHaveProperty('bg')
    })

    it('should return consistent tailwind class patterns', () => {
      Object.values(COLOR_CLASSES).forEach(colorClass => {
        expect(colorClass.text).toMatch(/^text-\w+-\d+$/)
        expect(colorClass.hover).toMatch(/^hover:bg-\w+-\d+ hover:text-\w+-\d+$/)
        expect(colorClass.bg).toMatch(/^bg-\w+-\d+$/)
      })
    })
  })

  describe('ICON_MAP', () => {
    it('should contain expected icon names', () => {
      const expectedIcons = [
        'EditIcon',
        'CheckCircleIcon',
        'SparklesIcon',
        'WandIcon',
        'PlusCircleIcon',
        'LanguagesIcon',
        'FileTextIcon',
        'PenToolIcon',
        'BookOpenIcon',
        'LightbulbIcon',
        'TargetIcon',
        'ZapIcon'
      ]

      expectedIcons.forEach(icon => {
        expect(ICON_MAP).toHaveProperty(icon)
      })
    })
  })

  describe('COLOR_CLASSES', () => {
    it('should contain expected color names', () => {
      const expectedColors = [
        'blue', 'green', 'purple', 'orange', 'indigo',
        'teal', 'cyan', 'pink', 'red', 'yellow'
      ]

      expectedColors.forEach(color => {
        expect(COLOR_CLASSES).toHaveProperty(color)
      })
    })
  })
})
