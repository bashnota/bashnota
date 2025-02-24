<script setup lang="ts">
const props = defineProps<{
    modelValue: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()
</script>

<template>
    <input type="color" :value="modelValue"
        @input="e => emit('update:modelValue', (e.target as HTMLInputElement).value)"
        class="w-full h-10 rounded-md cursor-pointer" />
</template>

<style scoped>
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