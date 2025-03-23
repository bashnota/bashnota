<template>
  <!-- No changes to template section -->
</template>

<script setup>
import { defineProps, onMounted, onBeforeUnmount } from 'vue'
import { toast } from 'vue-hot-toast'
import { VibeTaskType, ActorType } from '@/types'
import { Planner, Coder } from '@/actors'
import { notaExtensionService } from '@/services/notaExtensionService'
import { logger } from '@/services/logger'

const props = defineProps({
  taskBoardId: String,
  editor: Object // Editor instance to pass to actors
})

// Initialize the extension service when the component is mounted
onMounted(() => {
  if (props.editor) {
    notaExtensionService.setEditor(props.editor)
  }
})

// Clean up when the component is unmounted
onBeforeUnmount(() => {
  notaExtensionService.clearEditor()
})

const executeTask = async (task) => {
  try {
    // Check if the task can be executed
    if (!canExecuteTask(task)) {
      toast({
        title: 'Cannot execute task',
        description: 'Dependencies are not completed yet',
        variant: 'destructive'
      })
      return
    }
    
    // Get the appropriate actor for the task type
    let actor
    switch (task.actorType) {
      case ActorType.PLANNER:
        actor = new Planner()
        break
      case ActorType.CODER:
        actor = new Coder()
        break
      // Add other actor types as they are implemented
      default:
        throw new Error(`Actor type ${task.actorType} not implemented yet`)
    }
    
    // Execute the task with the editor instance
    await actor.executeTask(task, props.editor)
    
    toast({
      title: 'Task completed',
      description: `Completed: ${task.title}`,
    })
  } catch (err) {
    logger.error('Error executing task:', err)
    toast({
      title: 'Task failed',
      description: err.message,
      variant: 'destructive'
    })
  }
}
</script> 