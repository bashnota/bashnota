<template>
  <Dialog :open="props.show" @update:open="emit('update:show', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogDescription>Are you sure you want to delete this Vibe agent?</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:show', false)" class="mr-2">Cancel</Button>
        <Button variant="destructive" @click="emit('confirm')">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'confirm': []
}>()
</script> 