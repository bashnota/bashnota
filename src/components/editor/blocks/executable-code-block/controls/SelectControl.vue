<script setup lang="ts">
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'

const props = defineProps<{
    modelValue: string
    choices?: string[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()
</script>

<template>
    <Select :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
        <SelectTrigger class="w-full">
            {{ modelValue || 'Select option...' }}
        </SelectTrigger>
        <SelectContent>
            <SelectItem v-for="choice in choices" :key="choice" :value="choice">
                {{ choice }}
            </SelectItem>
        </SelectContent>
    </Select>
</template>