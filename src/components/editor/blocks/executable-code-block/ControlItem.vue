<script setup lang="ts">
import { FormItem } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Copy, RotateCcw } from 'lucide-vue-next'
import type { CodeFormControl } from '@/types/codeExecution'
import { computed, watch } from 'vue'

const props = defineProps<{
    control: CodeFormControl
    modelValue: any
}>()

const emit = defineEmits<{
    'update:modelValue': [value: any]
    'reset': []
    'copy': []
}>()

// Add computed value for text input
const inputValue = computed({
    get: () => props.modelValue,
    set: (value) => handleValueUpdate(value)
})

const processValue = (value: any, type: CodeFormControl['type']): any => {
    switch (type) {
        case 'text':
            return String(value ?? '')
        case 'number':
        case 'slider':
        case 'range':
            const numValue = Number(value)
            return props.control.options.isFloat ?
                Number(numValue.toFixed(3)) :
                Math.round(numValue)
        case 'checkbox':
            return Boolean(value)
        case 'color':
        case 'datetime':
        case 'select':
            return String(value)
        default:
            return value
    }
}

const handleValueUpdate = (value: any) => {
    const processedValue = processValue(value, props.control.type)
    emit('update:modelValue', processedValue)
}

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
    if (props.control.type === 'text' && newValue !== inputValue.value) {
        inputValue.value = newValue
    }
}, { immediate: true })

function parseControlValue(value: string, type: string): any {
    const trimmedValue = value.trim()
    if (type === 'text') {
        return trimmedValue.replace(/^["']|["']$/g, '') // Remove surrounding quotes
    }
    // ... other type handling
}
</script>

<template>
    <FormItem class="relative group">
        <div class="flex items-center justify-between mb-2">
            <Label>{{ control.options?.label || control.name }}</Label>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="$emit('reset')" title="Reset to default">
                    <RotateCcw class="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="$emit('copy')" title="Copy value">
                    <Copy class="h-3 w-3" />
                </Button>
            </div>
        </div>

        <p v-if="control.options?.description" class="text-xs text-muted-foreground mb-2">
            {{ control.options.description }}
        </p>

        <!-- Controls -->
        <div v-if="control.type === 'slider' || control.type === 'range'" class="space-y-2">
            <input type="range" :min="control.options?.min" :max="control.options?.max" :step="control.options?.step"
                :value="modelValue" @input="e => handleValueUpdate((e.target as HTMLInputElement).value)"
                class="range-input w-full" />
            <div class="flex items-center gap-2">
                <Input type="number" :value="modelValue" @update:modelValue="handleValueUpdate"
                    :min="control.options?.min" :max="control.options?.max" :step="control.options?.step"
                    class="w-20 h-8" />
            </div>
        </div>

        <div v-else-if="control.type === 'checkbox'" class="flex items-center space-x-2">
            <Switch :checked="modelValue" @update:checked="handleValueUpdate" />
            <span class="text-sm text-muted-foreground">{{ modelValue ? 'Yes' : 'No' }}</span>
        </div>

        <Select v-else-if="control.type === 'select'" :model-value="modelValue" @update:model-value="handleValueUpdate">
            <SelectTrigger>{{ modelValue }}</SelectTrigger>
            <SelectContent>
                <SelectItem v-for="choice in control.options?.choices" :key="choice" :value="choice">
                    {{ choice }}
                </SelectItem>
            </SelectContent>
        </Select>

        <!-- Text input -->
        <Input v-else-if="control.type === 'text'" v-model="inputValue" :placeholder="control.options.placeholder"
            :required="control.options.required" :pattern="control.options.pattern" />

        <Input v-else :type="control.type" :model-value="modelValue" @update:model-value="handleValueUpdate"
            :min="control.options?.min" :max="control.options?.max" :step="control.options?.step"
            :placeholder="control.options?.placeholder" :pattern="control.options?.pattern"
            :required="control.options?.required" />
    </FormItem>
</template>

<style scoped>
.range-input {
    @apply h-2 rounded-full bg-secondary appearance-none cursor-pointer transition-all;
}

.range-input::-webkit-slider-thumb {
    @apply appearance-none w-4 h-4 rounded-full bg-primary border-2 border-background hover:bg-primary/90 transition-all;
}

.range-input::-moz-range-thumb {
    @apply w-4 h-4 rounded-full bg-primary border-2 border-background hover:bg-primary/90 transition-all;
}
</style>