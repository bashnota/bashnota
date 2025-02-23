import type { CodeFormControl } from '@/types/codeExecution'

export function parseCodeControls(code: string): CodeFormControl[] {
  const controls: CodeFormControl[] = []
  const lines = code.split('\n')
  
  // Match patterns like: variable=value # @param {type}
  const paramRegex = /(\w+)\s*=\s*([^#]+)\s*#\s*@param\s*{([^}]+)}/
  
  lines.forEach(line => {
    const match = line.match(paramRegex)
    if (match) {
      const [_, name, rawValue, type] = match
      
      // Parse the value based on type
      let value = rawValue.trim()
      if (type.includes('checkbox')) {
        value = value.toLowerCase() === 'true'
      } else if (type.includes('number') || type.includes('slider') || type.includes('range')) {
        value = parseFloat(value)
      } else {
        // Remove quotes from string values
        value = value.replace(/^["']|["']$/g, '')
      }
      
      const control: CodeFormControl = {
        name,
        value,
        type: parseControlType(type),
        options: parseOptions(type)
      }
      
      controls.push(control)
    }
  })
  
  return controls
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

function parseOptions(type: string) {
  const options: CodeFormControl['options'] = {}
  
  // Parse all options using a more flexible regex
  const optionsRegex = /(\w+)=([^|\}]+)/g
  let match
  
  while ((match = optionsRegex.exec(type)) !== null) {
    const [_, key, value] = match
    
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