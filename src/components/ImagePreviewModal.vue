<template>
  <Dialog :open="isOpen" @update:open="updateOpen">
    <DialogContent class="max-w-screen-lg p-0 overflow-hidden">
      <DialogTitle class="sr-only">Image Preview</DialogTitle>
      <DialogDescription class="sr-only">
        Full-size preview of the image{{ imageCaption ? ': ' + imageCaption : '' }}
      </DialogDescription>
      
      <div class="relative">
        <img 
          :src="imageSrc" 
          :alt="imageAlt" 
          class="w-full h-auto max-h-[80vh] object-contain"
        />
        <Button 
          @click="close" 
          variant="ghost" 
          size="icon" 
          class="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full"
        >
          <XIcon class="h-5 w-5" />
        </Button>
        <div v-if="imageCaption" class="p-4 bg-background text-center">
          {{ imageCaption }}
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  imageSrc: string
  imageAlt?: string
  imageCaption?: string
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
}>()

const updateOpen = (value: boolean) => {
  emit('update:isOpen', value)
}

const close = () => {
  emit('update:isOpen', false)
}
</script> 