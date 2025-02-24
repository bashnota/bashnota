import type { CodeFormControl } from '@/types/codeExecution'

export function useNumericControl(control: CodeFormControl) {
    const handleNumericValue = (value: number): number => {
        if (isNaN(value)) return 0

        let processedValue = value

        if (control.options?.min !== undefined) {
            processedValue = Math.max(control.options.min, processedValue)
        }
        if (control.options?.max !== undefined) {
            processedValue = Math.min(control.options.max, processedValue)
        }
        if (control.options?.step) {
            const step = Number(control.options.step)
            processedValue = Math.round(processedValue / step) * step
            const precision = String(step).split('.')[1]?.length || 0
            return Number(processedValue.toFixed(precision))
        }

        return processedValue
    }

    return {
        handleNumericValue
    }
} 