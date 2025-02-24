<script setup lang="ts">
import type { CodeFormControl } from '@/types/codeExecution'
import { useControlValues } from '@/composables/useControlValues'
import ControlItem from './ControlItem.vue'
import { ref, watch, computed } from 'vue'

interface Props {
    controls: CodeFormControl[]
    code: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'update:code': [value: string]
    'update:control': [control: CodeFormControl]
}>()

const { updateValue, resetToDefault } = useControlValues(props.controls, emit)

// Group controls by type for better organization
const groupedControls = computed(() => {
    const groups = {
        numeric: [] as CodeFormControl[],
        text: [] as CodeFormControl[],
        boolean: [] as CodeFormControl[],
        select: [] as CodeFormControl[],
        other: [] as CodeFormControl[]
    }

    props.controls.forEach(control => {
        switch (control.type) {
            case 'number':
            case 'slider':
            case 'range':
                groups.numeric.push(control)
                break
            case 'text':
                groups.text.push(control)
                break
            case 'checkbox':
                groups.boolean.push(control)
                break
            case 'select':
                groups.select.push(control)
                break
            default:
                groups.other.push(control)
        }
    })

    return groups
})

const controlValues = ref<Record<string, any>>({})

// Initialize control values
watch(() => props.controls, (newControls) => {
    controlValues.value = newControls.reduce((acc, control) => {
        acc[control.name] = control.value
        return acc
    }, {} as Record<string, any>)
}, { immediate: true })

const formatValueForCode = (value: any, type: CodeFormControl['type']): string => {
    if (value === null || value === undefined) return 'None'

    switch (type) {
        case 'text':
        case 'select':
            return `"${String(value).replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
        case 'checkbox':
            return value ? 'True' : 'False'
        case 'number':
        case 'slider':
        case 'range':
            if (Number.isInteger(value)) {
                return String(Math.round(value))
            }
            return Number(value).toFixed(6).replace(/\.?0+$/, '')
        default:
            return String(value)
    }
}

const updateCodeWithValue = (name: string, value: any, type: CodeFormControl['type']) => {
    const lines = props.code.split('\n')
    let updated = false

    const updatedLines = lines.map(line => {
        const varRegex = new RegExp(`^(\\s*)(${name})\\s*=\\s*([^#]*?)(?:\\s*(#.*))?$`)
        const match = line.match(varRegex)

        if (match) {
            updated = true
            const [, indent, varName, , comment = ''] = match
            const formattedValue = formatValueForCode(value, type)
            return `${indent}${varName}=${formattedValue}${comment ? ' ' + comment : ''}`
        }
        return line
    })

    if (updated) {
        emit('update:code', updatedLines.join('\n'))
    }
}

const handleControlUpdate = (control: CodeFormControl, value: any) => {
    console.log('Control Update:', { control, value }) // Debug log

    let processedValue = value

    switch (control.type) {
        case 'number':
        case 'slider':
        case 'range':
            processedValue = Number(value)
            if (!isNaN(processedValue)) {
                if (control.options?.min !== undefined) {
                    processedValue = Math.max(control.options.min, processedValue)
                }
                if (control.options?.max !== undefined) {
                    processedValue = Math.min(control.options.max, processedValue)
                }
            }
            break
        case 'text':
            processedValue = String(value ?? '')
            break
        case 'select':
            processedValue = value
            break
        case 'checkbox':
            processedValue = Boolean(value)
            break
        default:
            processedValue = value
    }

    // Update the control value
    controlValues.value[control.name] = processedValue

    // Update the code
    updateCodeWithValue(control.name, processedValue, control.type)

    // Emit control update
    updateValue(control, processedValue)

    console.log('Updated Values:', {
        controlValues: controlValues.value,
        processedValue
    }) // Debug log
}

const handleReset = (control: CodeFormControl) => {
    const defaultValue = control.options?.defaultValue
    resetToDefault(control)
    controlValues.value[control.name] = defaultValue
    updateCodeWithValue(control.name, defaultValue, control.type)
}

const handleCopy = (value: any) => {
    navigator.clipboard.writeText(String(value))
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
            const match = trimmed.match(/^["'](.*)["']$/s)
            if (match) {
                return match[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\\\/g, '\\')
            }
            return trimmed
        default:
            return trimmed
    }
}

watch(() => props.code, (newCode) => {
    const lines = newCode.split('\n')

    props.controls.forEach(control => {
        const varRegex = new RegExp(`^\\s*${control.name}\\s*=\\s*([^#]+)`)
        const line = lines.find(l => varRegex.test(l))

        if (line) {
            const match = line.match(varRegex)
            if (match) {
                const rawValue = match[1].trim()
                const value = parseValueFromCode(rawValue, control.type)
                if (value !== controlValues.value[control.name]) {
                    controlValues.value[control.name] = value
                }
            }
        }
    })
}, { immediate: true })
</script>

<template>
    <div v-if="controls.length > 0" class="border-b">
        <div class="p-4 grid gap-4">
            <template v-for="(controls, type) in groupedControls" :key="type">
                <div v-if="controls.length" class="space-y-4">
                    <h3 class="text-sm font-medium text-muted-foreground">
                        {{ type === 'numeric' ? 'Numeric Controls' :
                            type === 'boolean' ? 'Toggle Controls' :
                                type === 'select' ? 'Selection Controls' :
                                    type === 'text' ? 'Text Controls' : 'Other Controls'
                        }}
                    </h3>
                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <ControlItem v-for="control in controls" :key="control.name" :control="control"
                            :model-value="controlValues[control.name]"
                            @update:model-value="(value) => handleControlUpdate(control, value)"
                            @reset="handleReset(control)" @copy="handleCopy(controlValues[control.name])" />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>