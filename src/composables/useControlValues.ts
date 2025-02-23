import { ref } from 'vue'
import type { CodeFormControl } from '@/types/codeExecution'

export function useControlValues(
  controls: CodeFormControl[],
  emit: (event: 'update:control', control: CodeFormControl) => void
) {
  const values = ref<Record<string, any>>({})

  // Enhanced initialization with type-specific handling
  const initializeValue = (control: CodeFormControl) => {
    if (control.options?.defaultValue !== undefined) {
      values.value[control.name] = parseValueByType(control.options.defaultValue, control.type)
    } else {
      values.value[control.name] = control.value ?? getDefaultValue(control)
    }
  }

  const parseValueByType = (value: any, type: CodeFormControl['type']): any => {
    switch (type) {
      case 'number':
      case 'slider':
      case 'range':
        return Number(value)
      case 'checkbox':
        return Boolean(value)
      case 'text':
      case 'datetime':
      case 'color':
      case 'select':
        return String(value)
      default:
        return value
    }
  }

  const getDefaultValue = (control: CodeFormControl): any => {
    const defaults: Record<CodeFormControl['type'], any> = {
      slider: control.options?.min ?? 0,
      range: control.options?.min ?? 0,
      number: 0,
      text: '',
      checkbox: false,
      select: control.options?.choices?.[0] ?? '',
      color: '#000000',
      datetime: new Date().toISOString().slice(0, 16)
    }
    return defaults[control.type]
  }

  // Initialize values
  controls.forEach(initializeValue)

  const updateValue = (control: CodeFormControl, value: any) => {
    const processedValue = parseValueByType(value, control.type)
    values.value[control.name] = processedValue
    
    const updatedControl = { 
      ...control,
      value: processedValue
    }
    emit('update:control', updatedControl)
  }

  const copyToClipboard = (value: string) => {
    window.navigator.clipboard.writeText(String(value))
  }

  return {
    values,
    updateValue,
    resetToDefault: (control: CodeFormControl) => {
      const defaultValue = control.options?.defaultValue ?? getDefaultValue(control)
      updateValue(control, defaultValue)
    },
    getDisplayValue: (control: CodeFormControl): string => {
      const value = values.value[control.name]
      return control.type === 'checkbox' ? (value ? 'Yes' : 'No') : String(value)
    },
    copyToClipboard
  }
} 