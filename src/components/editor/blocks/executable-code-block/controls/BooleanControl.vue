<script setup lang="ts">
import { Switch } from '@/components/ui/switch'

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
}>()
</script>

<template>
    <div class="flex items-center space-x-2">
        <Switch :checked="modelValue" @update:checked="emit('update:modelValue', $event)" />
        <span class="text-sm text-muted-foreground">
            {{ modelValue ? 'Yes' : 'No' }}
        </span>
    </div>
</template>