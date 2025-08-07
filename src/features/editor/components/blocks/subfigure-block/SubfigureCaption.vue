<template>
  <div class="flex flex-col gap-2 w-full mt-4">
    <!-- Label (always non-editable) -->
    <div class="font-medium text-base px-2 py-1">
      <div class="flex items-center gap-1">
        <LockIcon v-if="modelValue.isLocked" class="w-3 h-3 opacity-50" />
        <span>{{ modelValue.label }}</span>
      </div>
    </div>

    <!-- Read-only caption with KaTeX support -->
    <div 
      v-if="isReadOnly && modelValue.caption" 
      class="text-sm text-muted-foreground px-2 py-1"
      v-html="renderedCaption"
    ></div>

    <!-- Editable caption -->
    <div
      v-else-if="!isReadOnly && !isEditingCaption"
      class="text-sm text-muted-foreground rounded px-2 py-1"
      :class="modelValue.isLocked ? 'cursor-lock' : 'hover:bg-muted/50 cursor-text'"
      @click="startEditingCaption"
    >
      <div class="flex items-center gap-1">
        <LockIcon v-if="modelValue.isLocked" class="w-3 h-3 opacity-50" />
        <span v-if="renderedCaption" v-html="renderedCaption"></span>
        <span v-else>Click to add main caption</span>
      </div>
    </div>
    <Input
      v-else-if="!isReadOnly"
      :value="localCaption"
      @input="handleCaptionInput"
      @blur="finishEditingCaption"
      @keyup.enter="finishEditingCaption"
      @keyup.esc="cancelEditingCaption"
      placeholder="Add main caption... ($ for inline math, $$ for display math)"
      class="text-sm"
      :disabled="modelValue.isLocked"
      autofocus
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Input } from '@/components/ui/input'
import { LockIcon } from 'lucide-vue-next'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { logger } from '@/services/logger'

interface CaptionData {
  label: string
  caption: string
  isLocked: boolean
}

const props = defineProps<{
  modelValue: CaptionData
  isReadOnly: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CaptionData]
  'unlock': []
}>()

// Local state
const localCaption = ref(props.modelValue.caption || '')
const isEditingCaption = ref(false)

// Computed properties
const isAutoLabel = computed(() => {
  // Check if label matches the pattern "Figure X" where X is a number
  return /^Figure \d+$/.test(props.modelValue.label);
})

// Render caption with KaTeX support
const renderedCaption = computed(() => {
  if (!localCaption.value) {
    return ''
  }
  
  let text = localCaption.value
  try {
    // Process display math: $$...$$
    text = text.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: true
      })
    })
    
    // Process inline math: $...$
    text = text.replace(/\$([^$\n]+)\$/g, (match, formula) => {
      // Skip if it's part of display math (already processed)
      if (match.startsWith('$$') || match.endsWith('$$')) {
        return match
      }
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: false
      })
    })
    
    return text
  } catch (error) {
    logger.error('KaTeX parsing error:', error)
    return text
  }
})

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue.caption !== localCaption.value) {
      localCaption.value = newValue.caption || ''
    }
  },
  { deep: true, immediate: true }
)

// Caption methods
const startEditingCaption = () => {
  if (props.modelValue.isLocked) {
    emit('unlock')
    return
  }
  isEditingCaption.value = true
}

const finishEditingCaption = () => {
  isEditingCaption.value = false
  updateModelValue({ caption: localCaption.value })
}

const cancelEditingCaption = () => {
  isEditingCaption.value = false
  localCaption.value = props.modelValue.caption || ''
}

const handleCaptionInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localCaption.value = target.value
}

// Update model value with partial data
const updateModelValue = (data: Partial<CaptionData>) => {
  emit('update:modelValue', {
    ...props.modelValue,
    ...data
  })
}

onMounted(() => {
  // Initialize with current values
  localCaption.value = props.modelValue.caption || ''
})
</script>

<style scoped>
.cursor-lock {
  cursor: not-allowed;
}
</style>








