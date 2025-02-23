import type { CodeFormControl, ControlType } from '@/types/codeExecution'

export function useCodeControls() {
  const parseControlType = (type: string): ControlType => {
    if (type.includes('slider')) return 'slider'
    if (type.includes('range')) return 'range'
    if (type.includes('number')) return 'number'
    if (type.includes('select')) return 'select'
    if (type.includes('checkbox')) return 'checkbox'
    if (type.includes('color')) return 'color'
    if (type.includes('datetime')) return 'datetime'
    return 'text'
  }

  const parseControlValue = (value: string, type: string): any => {
    const trimmedValue = value.trim()
    if (type.includes('checkbox')) {
      return trimmedValue.toLowerCase() === 'true'
    }
    if (type.includes('number') || type.includes('slider') || type.includes('range')) {
      return parseFloat(trimmedValue)
    }
    return trimmedValue.replace(/^["']|["']$/g, '')
  }

  const parseOptionValue = (key: string, value: string, type: string, options: NonNullable<CodeFormControl['options']>): void => {
    switch (key) {
      case 'min':
      case 'max':
      case 'step':
        options[key] = parseFloat(value)
        break
      case 'defaultValue':
        options[key] = type.includes('checkbox') ? value.toLowerCase() === 'true' : value
        break
      case 'required':
        options[key] = value.toLowerCase() === 'true'
        break
      case 'choices':
        const choicesMatch = value.match(/\[(.*?)\]/)
        if (choicesMatch) {
          options.choices = choicesMatch[1].split(',').map(c => c.trim())
        }
        break
      default:
        options[key] = value
    }
  }

  const handleFloatDetection = (type: string, options: CodeFormControl['options']) => {
    if (type.includes('slider') || type.includes('range') || type.includes('number')) {
      options.isFloat = Boolean(
        (options.min && String(options.min).includes('.')) ||
        (options.max && String(options.max).includes('.')) ||
        (options.step && String(options.step).includes('.'))
      )
    }
  }

  const parseOptions = (type: string): NonNullable<CodeFormControl['options']> => {
    const options: NonNullable<CodeFormControl['options']> = {}
    const optionsRegex = /(\w+)=([^|\}]+)/g
    let match

    while ((match = optionsRegex.exec(type)) !== null) {
      const [_, key, value] = match
      parseOptionValue(key, value, type, options)
    }

    handleFloatDetection(type, options)
    return options
  }

  return {
    parseControlType,
    parseControlValue,
    parseOptions
  }
} 