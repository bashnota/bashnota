<script setup lang="ts">
import { Input } from '@/components/ui/input'

const props = defineProps<{
    modelValue: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()
</script>

<template>
    <Input type="datetime-local" :value="modelValue" @update:modelValue="emit('update:modelValue', $event)"
        class="w-full" />
</template>