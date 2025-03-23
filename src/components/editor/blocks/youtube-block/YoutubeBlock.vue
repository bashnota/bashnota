<template>
  <node-view-wrapper class="youtube-block">
    <div class="youtube-block-container">
      <div v-if="isEditing" class="youtube-url-input">
        <div class="flex gap-2 w-full">
          <Input
            ref="urlInputRef"
            :modelValue="urlInput"
            @update:modelValue="urlInput = String($event)"
            placeholder="Paste YouTube URL here"
            @keydown.enter="applyUrl"
            @blur="applyUrl"
            class="w-full"
          />
          <Button @click="applyUrl" variant="default">Apply</Button>
        </div>
        <Alert v-if="parserError" variant="destructive" class="mt-2">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ parserError }}</AlertDescription>
        </Alert>
      </div>
      
      <div v-else class="youtube-content">
        <YoutubePlayer 
          :video-id="videoId" 
          :start-time="startTime"
          :autoplay="autoplay"
        />
        
        <div class="youtube-controls">
          <Button variant="ghost" size="icon" class="edit-button" @click="startEditing" title="Edit URL">
            <span class="sr-only">Edit URL</span>
            <Edit class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, ref, onMounted, nextTick } from 'vue'
import YoutubePlayer from './YoutubePlayer.vue'
import { useYoutubeParser } from './useYoutubeParser'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Edit } from 'lucide-vue-next'
import { logger } from '@/services/logger'

interface NodeAttrs {
  url: string
  videoId: string
  startTime?: number
  autoplay?: boolean
}

// Define props without extending NodeViewProps to avoid type conflicts
interface Props {
  node: {
    attrs: NodeAttrs
  }
  updateAttributes: (attrs: Partial<NodeAttrs>) => void
  editor: {
    commands: {
      focus: () => void
    }
  }
}

const props = defineProps<Props>()

// State
const isEditing = ref(false)
const urlInput = ref('')
const urlInputRef = ref<HTMLInputElement | null>(null)

// Use the YouTube parser composable
const { parseYoutubeUrl, error: parserError } = useYoutubeParser()

// Computed properties
const videoId = computed(() => props.node.attrs.videoId)
const startTime = computed(() => props.node.attrs.startTime || 0)
const autoplay = computed(() => props.node.attrs.autoplay || false)

// Methods
const startEditing = () => {
  isEditing.value = true
  urlInput.value = props.node.attrs.url || ''
  
  // Focus the input on next tick
  nextTick(() => {
    if (urlInputRef.value) {
      urlInputRef.value.focus()
    }
  })
}

const applyUrl = () => {
  const trimmedInput = urlInput.value.trim()
  
  if (!trimmedInput) {
    isEditing.value = false
    return
  }
  
  logger.debug('Parsing URL:', trimmedInput)
  const result = parseYoutubeUrl(trimmedInput)
  
  if (result && result.videoId) {
    logger.debug('Successfully parsed YouTube URL:', result)
    
    // Update the node attributes with the new video information
    props.updateAttributes({
      url: trimmedInput,
      videoId: result.videoId,
      startTime: result.startTime
    })
    
    // Exit editing mode after successful URL parsing
    isEditing.value = false
    
    // Ensure the UI updates after attribute change
    nextTick(() => {
      logger.debug('Attributes updated, videoId is now:', props.node.attrs.videoId)
      // Return focus to editor
      props.editor.commands.focus()
    })
  } else {
    logger.error('Failed to parse YouTube URL:', trimmedInput, 'Error:', parserError.value)
    // Stay in editing mode to allow user to correct the URL
  }
}

// Initialize with URL parsing if needed
onMounted(() => {
  // If we have a URL but no videoId, try to parse it
  if (props.node.attrs.url && !props.node.attrs.videoId) {
    const result = parseYoutubeUrl(props.node.attrs.url)
    if (result) {
      props.updateAttributes({
        videoId: result.videoId,
        startTime: result.startTime
      })
    }
  }
  
  // Debug parser with various URL formats
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
  ]
  
  if (import.meta.env.DEV) {
    logger.debug('==== Testing YouTube URL Parser ====')
    testUrls.forEach(url => {
      const result = parseYoutubeUrl(url)
      logger.debug(`URL: ${url}`)
      logger.debug(`Result: ${result ? `ID: ${result.videoId}, Time: ${result.startTime}` : 'Failed to parse'}`)
    })
    logger.debug('==== End Parser Test ====')
  }
})
</script>

<style scoped>
.youtube-block {
  margin: 1.5em 0;
}

.youtube-block-container {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.youtube-url-input {
  padding: 1em;
  background-color: var(--background-secondary);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.youtube-content {
  position: relative;
}

.youtube-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.youtube-content:hover .youtube-controls {
  opacity: 1;
}

.edit-button {
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
}

.edit-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style> 