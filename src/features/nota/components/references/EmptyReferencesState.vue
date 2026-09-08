<script setup lang="ts">
import { BookIcon, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineEmits<{
  addReference: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <div class="relative mb-6">
      <BookIcon class="h-16 w-16 text-muted-foreground/20" />
      <div class="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
        <Plus class="h-4 w-4 text-primary-foreground" />
      </div>
    </div>
    
    <h3 class="text-lg font-semibold mb-2">No References Yet</h3>
    <p class="text-sm text-muted-foreground text-center mb-6 max-w-sm">
      Add references to your document to enable citations and build a bibliography.
    </p>
    
    <Button @click="$emit('addReference')" class="shadow-sm">
      <Plus class="w-4 h-4 mr-2" />
      Add Your First Reference
    </Button>
    
    <p class="mt-6 text-xs text-muted-foreground text-center">
      Enter one manually, look up a DOI, or import BibTeX.
    </p>
  </div>
</template>
