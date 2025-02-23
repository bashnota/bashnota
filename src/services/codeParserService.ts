import type { CodeFormControl, ParsedControl } from '@/types/codeExecution'
import { useCodeControls } from '@/composables/useCodeControls'

export class CodeParserService {
  // Improved regex patterns for better matching
  private static readonly PARAM_REGEX = /^\s*(\w+)\s*=\s*(["'].*?["']|[^#]*?)(?:\s*#\s*@param\s*{([^}]+)}.*)?$/
  private static readonly OPTIONS_REGEX = /(\w+)=([^,\}]+)(?:,\s*|$)/g
  private static readonly VALUE_REGEX = /^\s*(["']?)(.*?)\1\s*$/

  static parseControls(code: string): CodeFormControl[] {
    const { parseControlType, parseControlValue, parseOptions } = useCodeControls()
    const controls: CodeFormControl[] = []
    
    code.split('\n').forEach(line => {
      const match = line.match(this.PARAM_REGEX)
      if (!match) return
      
      const [_, name, rawValue, type] = match
      const valueMatch = rawValue.match(this.VALUE_REGEX)
      const value = valueMatch ? valueMatch[2] : rawValue.trim()
      
      const controlType = parseControlType(type)
      let parsedValue: any

      // Special handling for different types
      if (controlType === 'text') {
        parsedValue = value
      } else if (controlType === 'checkbox') {
        parsedValue = value.toLowerCase() === 'true'
      } else if (['number', 'slider', 'range'].includes(controlType)) {
        parsedValue = parseFloat(value)
      } else {
        parsedValue = parseControlValue(value, type)
      }

      console.log('🔍 Parsing control:', { name, value: parsedValue, type: controlType })
      
      controls.push({
        name,
        value: parsedValue,
        type: controlType,
        options: parseOptions(type)
      })
    })

    return controls
  }
} 