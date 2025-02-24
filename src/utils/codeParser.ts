import type { CodeFormControl } from '@/types/codeExecution'

interface ParsedValue {
  raw: string
  processed: any
}

export function parseCodeControls(code: string): CodeFormControl[] {
  const controls: CodeFormControl[] = []
  const lines = code.split('\n')
  
  // Match patterns like: variable=value # @param {type}
  const paramRegex = /(\w+)\s*=\s*([^#]+)\s*#\s*@param\s*{([^}]+)}/
  
  lines.forEach(line => {
    const match = line.match(paramRegex)
    if (!match) return
    
    const [_, name, rawValue, type] = match
    const parsedValue = parseValue(rawValue.trim(), type)
    
    const control: CodeFormControl = {
      name,
      value: parsedValue.processed,
      type: parseControlType(type),
      options: parseOptions(type, parsedValue.raw)
    }
    
    controls.push(control)
  })
  
  return controls
}

function parseValue(rawValue: string, type: string): ParsedValue {
  const trimmedValue = rawValue.trim()
  
  // Keep original string value for options parsing
  const raw = trimmedValue.replace(/^["']|["']$/g, '')
  
  let processed: any = raw
  
  if (type.includes('checkbox')) {
    processed = raw.toLowerCase() === 'true'
  } else if (type.includes('number') || type.includes('slider') || type.includes('range')) {
    processed = parseFloat(raw)
  }
  
  return { raw, processed }
}

function parseControlType(type: string): CodeFormControl['type'] {
  if (type.includes('slider')) return 'slider'
  if (type.includes('range')) return 'range'
  if (type.includes('number')) return 'number'
  if (type.includes('select')) return 'select'
  if (type.includes('checkbox')) return 'checkbox'
  if (type.includes('color')) return 'color'
  if (type.includes('datetime')) return 'datetime'
  return 'text'
}

function parseOptions(type: string, defaultValue: string) {
  const options: CodeFormControl['options'] = {
    defaultValue
  }
  
  // Parse all options using a more flexible regex
  const optionsRegex = /(\w+)=([^|\}]+)/g
  let match
  
  while ((match = optionsRegex.exec(type)) !== null) {
    const [_, key, value] = match
    parseOptionValue(key, value, type, options)
  }
  
  // Handle float detection for numeric types
  if (type.includes('slider') || type.includes('range') || type.includes('number')) {
    options.isFloat = Boolean(
      (options.min && String(options.min).includes('.')) ||
      (options.max && String(options.max).includes('.')) ||
      (options.step && String(options.step).includes('.'))
    )
  }
  
  return options
}

function parseOptionValue(key: string, value: string, type: string, options: NonNullable<CodeFormControl['options']>) {
  const trimmedValue = value.trim()
  
  switch (key) {
    case 'min':
    case 'max':
    case 'step':
      options[key] = parseFloat(trimmedValue)
      break
      
    case 'required':
      options[key] = trimmedValue.toLowerCase() === 'true'
      break
      
    case 'choices':
      const choicesMatch = trimmedValue.match(/\[(.*?)\]/)
      if (choicesMatch) {
        options.choices = choicesMatch[1].split(',').map(c => c.trim())
      }
      break
      
    case 'label':
    case 'description':
    case 'placeholder':
    case 'pattern':
      options[key] = trimmedValue.replace(/^["']|["']$/g, '')
      break
      
    default:
      options[key] = trimmedValue
  }
}