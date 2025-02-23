<script setup lang="ts">
import type { CodeFormControl } from '@/types/codeExecution'
import { useControlValues } from '@/composables/useControlValues'
import ControlItem from './ControlItem.vue'
import { ref, watch } from 'vue'

const props = defineProps<{
    controls: CodeFormControl[]
}>()

const emit = defineEmits<{
    'update:control': [control: CodeFormControl]
}>()

const { updateValue, resetToDefault } = useControlValues(props.controls, emit)

const controlValues = ref<Record<string, any>>({})

// Initialize control values
watch(() => props.controls, (newControls) => {
    console.log('🔄 CodeControls controls updated:', newControls)
    controlValues.value = newControls.reduce((acc, control) => {
        acc[control.name] = control.value
        return acc
    }, {} as Record<string, any>)
}, { immediate: true })

const handleControlUpdate = (control: CodeFormControl, value: any) => {
    console.log('🎛️ CodeControls handleControlUpdate:', {
        control,
        value,
        previousValue: controlValues.value[control.name]
    })
    updateValue(control, value)
    controlValues.value[control.name] = value
}

const handleReset = (control: CodeFormControl) => {
    resetToDefault(control)
}

const handleCopy = (value: any) => {
    navigator.clipboard.writeText(String(value))
}
</script>

<template>
    <div v-if="controls.length > 0" class="border-b">
        <div class="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ControlItem v-for="control in controls" :key="control.name" :control="control"
                :model-value="controlValues[control.name]"
                @update:model-value="(value) => handleControlUpdate(control, value)" @reset="handleReset(control)"
                @copy="handleCopy(controlValues[control.name])" />
        </div>
    </div>
</template>