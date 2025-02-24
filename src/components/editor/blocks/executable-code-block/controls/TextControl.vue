<script setup lang="ts">
import { Input } from '@/components/ui/input'
import type { CodeFormControl } from '@/types/codeExecution'
import { computed, watch } from 'vue'

const props = defineProps<{
    modelValue: string
    control: CodeFormControl
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

// Computed property for input value with proper type handling
const inputValue = computed({
    get: () => {
        // Handle null/undefined values
        if (props.modelValue === null || props.modelValue === undefined) {
            return ''
        }
        return String(props.modelValue)
    },
    set: (value: string) => {
        console.log('TextControl - Value changing:', value)
        emit('update:modelValue', value)
    }
})

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
    console.log('TextControl - External value changed:', newValue)
}, { immediate: true })
</script>

<template>
    <div class="relative">
        <Input v-model="inputValue" :type="control.type" :placeholder="control.options?.placeholder"
            :required="control.options?.required" :pattern="control.options?.pattern" class="w-full"
            @blur="emit('update:modelValue', inputValue)" />
    </div>
</template>