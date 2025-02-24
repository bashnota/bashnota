import type { CodeFormControl } from '@/types/codeExecution'

export function useControlFormatter() {
    const formatValueForCode = (value: any, type: CodeFormControl['type'], control?: CodeFormControl): string => {
        if (value === null || value === undefined) return 'None'

        switch (type) {
            case 'text':
            case 'select':
            case 'datetime':
            case 'color':
                return `"${String(value).replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
            case 'checkbox':
                return value ? 'True' : 'False'
            case 'number':
            case 'slider':
            case 'range':
                return formatNumericValue(value, control?.options?.step)
            default:
                return String(value)
        }
    }

    const formatNumericValue = (value: number, step?: number): string => {
        if (Number.isInteger(value)) {
            return String(Math.round(value))
        }
        if (step && String(step).includes('.')) {
            const precision = String(step).split('.')[1].length
            return Number(value).toFixed(precision)
        }
        return Number(value).toFixed(6).replace(/\.?0+$/, '')
    }

    const parseValueFromCode = (value: string, type: CodeFormControl['type']): any => {
        const trimmed = value.trim()

        switch (type) {
            case 'checkbox':
                return trimmed.toLowerCase() === 'true'
            case 'number':
            case 'slider':
            case 'range':
                const num = parseFloat(trimmed)
                return Number.isNaN(num) ? 0 : num
            case 'text':
            case 'select':
                return parseStringValue(trimmed)
            default:
                return trimmed
        }
    }

    const parseStringValue = (value: string): string => {
        const match = value.match(/^["'](.*)["']$/s)
        if (match) {
            return match[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\\\/g, '\\')
        }
        return value
    }

    return {
        formatValueForCode,
        parseValueFromCode,
        formatNumericValue,
        parseStringValue
    }
} 