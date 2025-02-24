<script setup lang="ts">
import { FormItem } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Copy, RotateCcw } from 'lucide-vue-next'
import type { CodeFormControl } from '@/types/codeExecution'
import { computed } from 'vue'
import { useNumericControl } from '@/composables/useNumericControl'

// Import control components
import NumericControl from './controls/NumericControl.vue'
import BooleanControl from './controls/BooleanControl.vue'
import SelectControl from './controls/SelectControl.vue'
import TextControl from './controls/TextControl.vue'
import ColorControl from './controls/ColorControl.vue'
import DateTimeControl from './controls/DateTimeControl.vue'

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

const { handleNumericValue } = useNumericControl(props.control)

// Computed properties
const controlValue = computed({
    get: () => props.modelValue ?? getDefaultValue(),
    set: (value) => handleValueUpdate(value)
})

const getDefaultValue = () => {
    switch (props.control.type) {
        case 'number':
        case 'slider':
        case 'range':
            return props.control.options?.min ?? 0
        case 'text':
            return ''
        case 'checkbox':
            return false
        case 'select':
            return props.control.options?.choices?.[0] ?? ''
        case 'color':
            return '#000000'
        case 'datetime':
            return new Date().toISOString().slice(0, 16)
        default:
            return null
    }
}

// Event handlers
const handleValueUpdate = (value: any) => {
    let processedValue = value

    switch (props.control.type) {
        case 'number':
        case 'slider':
        case 'range':
            processedValue = handleNumericValue(Number(value))
            break
        case 'checkbox':
            processedValue = Boolean(value)
            break
        case 'text':
        case 'datetime':
        case 'color':
            processedValue = String(value ?? '')
            break
        case 'select':
            processedValue = value
            break
    }

    emit('update:modelValue', processedValue)
}

const handleReset = () => emit('reset')
const handleCopy = () => emit('copy')
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
            <component :is="control.type === 'checkbox' ? 'div' : 'div'" class="space-y-2">
                <NumericControl v-if="['number', 'slider', 'range'].includes(control.type)" v-model="controlValue"
                    :control="control" />

                <BooleanControl v-else-if="control.type === 'checkbox'" v-model="controlValue" />

                <SelectControl v-else-if="control.type === 'select'" v-model="controlValue"
                    :choices="control.options?.choices" />

                <TextControl v-else-if="control.type === 'text'" v-model="controlValue" :control="control" />

                <ColorControl v-else-if="control.type === 'color'" v-model="controlValue" />

                <DateTimeControl v-else-if="control.type === 'datetime'" v-model="controlValue" />
            </component>
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

/* Color picker styles */
input[type="color"] {
    @apply border border-input bg-transparent;
    -webkit-appearance: none;
}

input[type="color"]::-webkit-color-swatch-wrapper {
    @apply p-0;
}

input[type="color"]::-webkit-color-swatch {
    @apply border-none rounded-md;
}
</style>