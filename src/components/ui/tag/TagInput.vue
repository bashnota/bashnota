<template>
  <div class="w-full space-y-2">
    <div class="flex flex-wrap gap-2 min-h-[32px] rounded-md focus-within:ring-1 focus-within:ring-primary">
      <Tag 
        v-for="tag in modelValue" 
        :key="tag"
        :onRemove="() => removeTag(tag)"
      >
        {{ tag }}
      </Tag>
      
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="flex-1 min-w-[80px] bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
        :placeholder="modelValue.length ? 'Add another tag...' : 'Add tags...'"
        @keydown.enter.prevent="addTag"
        @keydown.backspace="handleBackspace"
        @keydown.tab="addTag"
        @keydown.comma.prevent="addTag"
      />
    </div>
    
    <!-- Suggestions -->
    <div v-if="suggestions.length > 0" class="text-xs text-muted-foreground">
      Suggestions: 
      <button 
        v-for="suggestion in suggestions" 
        :key="suggestion"
        @click="addSuggestion(suggestion)"
        class="ml-1 text-primary hover:underline"
      >
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Tag from './Tag.vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  suggestions?: string[]
}>(), {
  modelValue: () => [],
  suggestions: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const inputRef = ref<HTMLInputElement>()
const inputValue = ref('')

const suggestions = computed(() => {
  const input = inputValue.value.toLowerCase()
  if (!input || !props.suggestions) return []
  return props.suggestions
    .filter(tag => 
      tag.toLowerCase().includes(input) && 
      !props.modelValue.includes(tag)
    )
    .slice(0, 5)
})

const addTag = () => {
  const tag = inputValue.value.trim()
  if (tag && !props.modelValue.includes(tag)) {
    emit('update:modelValue', [...props.modelValue, tag])
    inputValue.value = ''
  }
}

const addSuggestion = (tag: string) => {
  if (!props.modelValue.includes(tag)) {
    emit('update:modelValue', [...props.modelValue, tag])
    inputValue.value = ''
  }
}

const removeTag = (tagToRemove: string) => {
  emit('update:modelValue', props.modelValue.filter(tag => tag !== tagToRemove))
}

const handleBackspace = (event: KeyboardEvent) => {
  if (inputValue.value === '' && props.modelValue.length > 0) {
    event.preventDefault()
    removeTag(props.modelValue[props.modelValue.length - 1])
  }
}
</script> 