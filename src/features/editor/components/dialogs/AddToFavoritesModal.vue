<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { TagsInput, TagsInputInput, TagsInputItem } from '@/ui/tags-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/ui/dialog'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', name: string, tags: string[]): void
}>()

const name = ref('')
const tags = ref<string[]>([])

const handleNameInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  name.value = target.value
}

const handleSubmit = () => {
  if (!name.value.trim()) return
  
  emit('submit', name.value.trim(), tags.value)
  
  // Reset form
  name.value = ''
  tags.value = []
  
  // Close modal
  emit('update:open', false)
}

watch(() => props.open, (newValue) => {
  if (newValue) {
    name.value = ''
    tags.value = []
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add to Favorites</DialogTitle>
        <DialogDescription>
          Save this block to your favorites for quick access later.
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium">Block Name</label>
          <Input
            id="name"
            :value="name"
            @input="handleNameInput"
            placeholder="Enter a name for this block"
          />
        </div>
        
        <div class="space-y-2">
          <label class="text-sm font-medium">Tags</label>
          <TagsInput v-model="tags">
            <TagsInputItem v-for="tag in tags" :key="tag" :value="tag">
              {{ tag }}
            </TagsInputItem>
            <TagsInputInput placeholder="Type and press enter to add tags" />
          </TagsInput>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            :disabled="name.length === 0"
            @click="handleSubmit"
          >
            Save
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template> 








