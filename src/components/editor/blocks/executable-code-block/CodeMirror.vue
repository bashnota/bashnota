<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { basicLight } from 'cm6-theme-basic-light'
import { basicDark } from 'cm6-theme-basic-dark'
import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isDark = ref(false)

// Computed property for v-model
const code = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value =
    savedTheme === 'dark' ||
    (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const observer = new MutationObserver(() => {
    const newTheme = localStorage.getItem('theme')
    isDark.value =
      newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

const extensions = computed(() => [
  EditorView.lineWrapping,
  python(),
  isDark.value ? basicDark : basicLight,
  props.readonly ? EditorView.editable.of(false) : [],
])
</script>

<template>
  <div class="rounded-md border border-input bg-background">
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :disabled="disabled"
      placeholder="Enter Python code here..."
    />
  </div>
</template>

<style>
/* Base styles for editor */
.cm-scroller,
.cm-gutters {
  min-height: 150px !important;
}

/* Autocomplete menu styles */
.cm-tooltip {
  @apply border border-border bg-popover text-popover-foreground shadow-md !important;
}

.cm-tooltip .cm-completionLabel {
  @apply text-sm;
}
</style>
