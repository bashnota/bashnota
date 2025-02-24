<script setup lang="ts">
import type { CodeFormControl } from '@/types/codeExecution'
import { Input } from '@/components/ui/input'
import { useNumericControl } from '@/composables/useNumericControl'
import { computed } from 'vue'

const props = defineProps<{
    modelValue: number
    control: CodeFormControl
}>()

const emit = defineEmits<{
    'update:modelValue': [value: number]
}>()

const { handleNumericValue } = useNumericControl(props.control)

const step = computed(() => {
    if (props.control.options?.step) return props.control.options.step
    return props.control.options?.isFloat ? 0.1 : 1
})

const displayValue = computed(() => {
    if (props.control.options?.isFloat) {
        const precision = String(step.value).split('.')[1]?.length || 2
        return Number(props.modelValue).toFixed(precision)
    }
    return props.modelValue
})

const handleInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).valueAsNumber
    emit('update:modelValue', handleNumericValue(value))
}
</script>

<template>
    <div class="space-y-2">
        <input v-if="control.type === 'slider' || control.type === 'range'" type="range" :value="modelValue"
            @input="handleInput" :min="control.options?.min" :max="control.options?.max" :step="step"
            class="range-input w-full" />
        <Input type="number" :value="displayValue"
            @update:modelValue="value => emit('update:modelValue', handleNumericValue(Number(value)))"
            :min="control.options?.min" :max="control.options?.max" :step="step"
            :class="control.type === 'range' ? 'w-24 h-8' : 'w-full'" />
    </div>
</template>