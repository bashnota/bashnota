<script setup lang="ts">
import { FormItem } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Copy, RotateCcw } from 'lucide-vue-next'
import type { CodeFormControl } from '@/types/codeExecution'
import { computed } from 'vue'

interface Props {
    control: CodeFormControl
    modelValue: any
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null
})

const emit = defineEmits<{
    'update:modelValue': [value: any]
    'reset': []
    'copy': []
}>()

const inputValue = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const displayValue = computed(() => {
    return props.modelValue !== null ? String(props.modelValue) : ''
})

const isNumericType = computed(() => {
    return ['number', 'slider', 'range'].includes(props.control.type)
})

const processValue = (value: any): any => {
    if (value === null || value === undefined) return null

    switch (props.control.type) {
        case 'text':
        case 'color':
        case 'datetime':
        case 'select':
            return String(value)
        case 'number':
        case 'slider':
        case 'range':
            const numValue = Number(value)
            return props.control.options?.isFloat
                ? Number(numValue.toFixed(3))
                : Math.round(numValue)
        case 'checkbox':
            return Boolean(value)
        default:
            return value
    }
}

const handleValueUpdate = (value: any) => {
    const processedValue = processValue(value)
    emit('update:modelValue', processedValue)
}

const handleReset = () => {
    emit('reset')
}

const handleCopy = () => {
    emit('copy')
}
</script>

<template>
    <FormItem class="relative group">
        <div class="flex items-center justify-between mb-2">
            <Label class="font-medium">
                {{ control.options?.label || control.name }}
            </Label>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Control actions">
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="handleReset" title="Reset to default">
                    <RotateCcw class="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="handleCopy" title="Copy value">
                    <Copy class="h-3 w-3" />
                </Button>
            </div>
        </div>

        <!-- Description -->
        <p v-if="control.options?.description" class="text-xs text-muted-foreground mb-2">
            {{ control.options.description }}
        </p>

        <!-- Controls -->
        <div class="space-y-2">
            <!-- Slider/Range Input -->
            <template v-if="control.type === 'slider' || control.type === 'range'">
                <input type="range" :min="control.options?.min" :max="control.options?.max"
                    :step="control.options?.step" :value="modelValue"
                    @input="e => handleValueUpdate(Number((e.target as HTMLInputElement).value))"
                    class="range-input w-full" />
                <div class="flex items-center gap-2">
                    <Input type="number" :value="modelValue" @update:modelValue="handleValueUpdate"
                        :min="control.options?.min" :max="control.options?.max" :step="control.options?.step"
                        class="w-20 h-8" />
                </div>
            </template>

            <!-- Checkbox -->
            <div v-else-if="control.type === 'checkbox'" class="flex items-center space-x-2">
                <Switch :checked="modelValue" @update:checked="handleValueUpdate" />
                <span class="text-sm text-muted-foreground">
                    {{ modelValue ? 'Yes' : 'No' }}
                </span>
            </div>

            <!-- Select -->
            <Select v-else-if="control.type === 'select'" :model-value="modelValue"
                @update:model-value="handleValueUpdate">
                <SelectTrigger>{{ displayValue }}</SelectTrigger>
                <SelectContent>
                    <SelectItem v-for="choice in control.options?.choices" :key="choice" :value="choice">
                        {{ choice }}
                    </SelectItem>
                </SelectContent>
            </Select>

            <!-- Text input -->
            <Input v-else-if="control.type === 'text'" type="text" :value="modelValue"
                @update:modelValue="handleValueUpdate" :placeholder="control.options?.placeholder" />

            <!-- Number input -->
            <Input v-else-if="control.type === 'number'" type="number" :value="modelValue"
                @update:modelValue="value => handleValueUpdate(Number(value))" :min="control.options?.min"
                :max="control.options?.max" :step="control.options?.step" :placeholder="control.options?.placeholder" />
        </div>
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