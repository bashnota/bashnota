<template>
  <div class="flex flex-col gap-1 w-full mt-2">
    <!-- Label section -->
    <div v-if="isReadOnly && modelValue.label" class="font-medium text-base px-2 py-1">
      {{ modelValue.label }}
    </div>

    <div
      v-else-if="!isReadOnly && !isEditingLabel"
      class="font-medium text-base hover:bg-muted/50 rounded px-2 py-1 cursor-text"
      @click="startEditingLabel"
    >
      {{ modelValue.label || 'Click to add figure label' }}
    </div>

    <Input
      v-else-if="!isReadOnly"
      :value="localLabel"
      @input="handleLabelInput"
      @blur="finishEditingLabel"
      @keyup.enter="finishEditingLabel"
      @keyup.esc="cancelEditingLabel"
      placeholder="Figure label (e.g., Figure 1)"
      class="font-medium"
      :disabled="modelValue.isLocked"
      autofocus
    />

    <!-- Caption section with KaTeX support -->
    <div 
      v-if="isReadOnly && modelValue.caption" 
      class="text-sm text-muted-foreground px-2 py-1"
      v-html="renderedCaption"
    ></div>

    <div
      v-else-if="!isReadOnly && !isEditingCaption"
      class="text-sm text-muted-foreground hover:bg-muted/50 rounded px-2 py-1 cursor-text"
      @click="startEditingCaption"
      v-html="renderedCaption || 'Click to add caption'"
    ></div>

    <Input
      v-else-if="!isReadOnly"
      :value="localCaption"
      @input="handleCaptionInput"
      @blur="finishEditingCaption"
      @keyup.enter="finishEditingCaption"
      @keyup.esc="cancelEditingCaption"
      placeholder="Add caption... ($ for inline math, $$ for display math)"
      class="text-sm"
      :disabled="modelValue.isLocked"
      autofocus
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Input } from '@/components/ui/input'
import katex from 'katex'
import 'katex/dist/katex.min.css'

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
}>()

// Local state
const localLabel = ref(props.modelValue.label || '')
const localCaption = ref(props.modelValue.caption || '')
const isEditingLabel = ref(false)
const isEditingCaption = ref(false)

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
    console.error('KaTeX parsing error:', error)
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
    if (newValue.label !== localLabel.value) {
      localLabel.value = newValue.label || ''
    }
  },
  { deep: true, immediate: true }
)

// Label methods
const startEditingLabel = () => {
  if (props.modelValue.isLocked) return
  isEditingLabel.value = true
}

const finishEditingLabel = () => {
  isEditingLabel.value = false
  updateModelValue({ label: localLabel.value })
}

const cancelEditingLabel = () => {
  isEditingLabel.value = false
  localLabel.value = props.modelValue.label || ''
}

// Caption methods
const startEditingCaption = () => {
  if (props.modelValue.isLocked) return
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

// Update model value with partial data
const updateModelValue = (data: Partial<CaptionData>) => {
  emit('update:modelValue', {
    ...props.modelValue,
    ...data
  })
}

// Handle input changes directly
const handleCaptionInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localCaption.value = target.value
}

const handleLabelInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localLabel.value = target.value
}

onMounted(() => {
  // Initialize with current values
  localCaption.value = props.modelValue.caption || ''
  localLabel.value = props.modelValue.label || ''
})
</script> 