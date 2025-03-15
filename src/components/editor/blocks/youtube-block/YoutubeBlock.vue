<template>
  <node-view-wrapper class="youtube-block">
    <div class="youtube-block-container">
      <div v-if="isEditing" class="youtube-url-input">
        <input
          ref="urlInput"
          v-model="urlInput"
          type="text"
          placeholder="Paste YouTube URL here"
          @keydown.enter="applyUrl"
          @blur="applyUrl"
        />
        <button class="apply-button" @click="applyUrl">Apply</button>
        <p v-if="parserError" class="url-error">{{ parserError }}</p>
      </div>
      
      <div v-else class="youtube-content">
        <youtube-player 
          :video-id="videoId" 
          :start-time="startTime"
          :autoplay="autoplay"
        />
        
        <div class="youtube-controls">
          <button class="edit-button" @click="startEditing" title="Edit URL">
            <span class="sr-only">Edit URL</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, ref, onMounted, nextTick } from 'vue'
import YoutubePlayer from './YoutubePlayer.vue'
import { useYoutubeParser } from '@/components/editor/blocks/youtube-block/useYoutubeParser'

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
  if (!urlInput.value) {
    isEditing.value = false
    return
  }
  
  const result = parseYoutubeUrl(urlInput.value)
  
  if (result) {
    props.updateAttributes({
      url: urlInput.value,
      videoId: result.videoId,
      startTime: result.startTime
    })
    
    isEditing.value = false
    
    // Return focus to editor
    props.editor.commands.focus()
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
  background-color: #f5f5f5;
  border-radius: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}

.youtube-url-input input {
  flex: 1;
  min-width: 200px;
  padding: 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.youtube-url-input .apply-button {
  padding: 0.5em 1em;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.youtube-url-input .apply-button:hover {
  background-color: #3367d6;
}

.url-error {
  width: 100%;
  color: #c00;
  margin: 0.5em 0 0;
  font-size: 0.9em;
}

.youtube-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.youtube-content {
  position: relative;
}

.youtube-content:hover .youtube-controls {
  opacity: 1;
}

.edit-button {
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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