<template>
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" 
    @click="emit('close')"
    @keydown.escape="emit('close')"
    tabindex="0"
    ref="modalRef"
  >
    <div 
      class="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm" 
      @click.stop
    >
      <img 
        :src="props.src" 
        class="max-w-full max-h-[90vh] object-contain"
        alt="Full size preview"
        @wheel.prevent  <!-- Prevent zoom on mouse wheel -->
      />
      <Button 
        class="absolute top-4 right-4 hover:bg-white/20" 
        variant="ghost" 
        size="icon"
        @click="emit('close')"
      >
        <XIcon class="h-5 w-5 text-white" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  src: string
}>()

const emit = defineEmits<{
  close: []
}>()

const modalRef = ref<HTMLElement | null>(null)

// Handle keyboard events and focus management
onMounted(() => {
  // Prevent body scroll
  document.body.style.overflow = 'hidden'
  
  // Focus the modal
  modalRef.value?.focus()
})

onUnmounted(() => {
  // Restore body scroll
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Remove old styles since we're using Tailwind classes */
</style> 