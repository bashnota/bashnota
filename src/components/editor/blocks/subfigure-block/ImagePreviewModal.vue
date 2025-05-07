<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    @click="close"
  >
    <div 
      class="relative max-w-[90vw] max-h-[90vh]"
      @click.stop
    >
      <!-- Close button -->
      <button
        class="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
        @click="close"
      >
        <XIcon class="w-6 h-6" />
      </button>

      <!-- Image -->
      <img
        :src="imageSrc"
        :alt="caption"
        class="max-w-full max-h-[90vh] object-contain"
        :style="{ objectFit: imageFit }"
      />

      <!-- Caption -->
      <div 
        v-if="caption"
        class="absolute bottom-0 left-0 right-0 p-4 text-white bg-black/50"
      >
        {{ caption }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'

defineProps<{
  modelValue: boolean
  imageSrc: string
  caption?: string
  imageFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const close = () => {
  emit('update:modelValue', false)
}

// Close on escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script> 