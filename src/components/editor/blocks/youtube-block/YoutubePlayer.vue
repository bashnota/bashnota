<template>
  <div class="youtube-player">
    <div v-if="loading" class="youtube-loading">
      <Spinner class="h-8 w-8 animate-spin" />
      <span class="sr-only">Loading video...</span>
    </div>
    
    <div v-else-if="videoId" class="iframe-container">
      <iframe
        :key="videoId"
        :src="embedUrl"
        :title="`YouTube video player: ${videoId}`"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        @load="handleVideoLoaded"
        referrerpolicy="origin"
      ></iframe>
    </div>
    
    <Alert v-else variant="destructive" class="youtube-error">
      <AlertTitle>Invalid YouTube URL</AlertTitle>
      <AlertDescription v-if="errorMessage">{{ errorMessage }}</AlertDescription>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Spinner from '@/components/LoadingSpinner.vue'
import { logger } from '@/services/logger'

interface Props {
  videoId: string
  autoplay?: boolean
  startTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
  startTime: 0
})

const loading = ref(true)
const errorMessage = ref('')
let loadingTimeout: number | null = null

// Reset loading state when video ID changes and set a fallback timeout
watch(() => props.videoId, (newId) => {
  logger.log('Video ID changed to:', newId)
  
  if (newId) {
    loading.value = true
    
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
    }
    
    // Set a fallback timeout to hide the loading spinner after 5 seconds
    // in case the load event doesn't fire
    loadingTimeout = window.setTimeout(() => {
      logger.log('Loading timeout reached, forcing loading to end')
      loading.value = false
    }, 5000)
  }
}, { immediate: true })

const embedUrl = computed(() => {
  // Format: https://www.youtube.com/embed/VIDEO_ID?param=value
  const baseUrl = `https://www.youtube.com/embed/${props.videoId}`
  const params = new URLSearchParams()
  
  // Essential parameters for embed
  params.append('enablejsapi', '1')
  params.append('origin', window.location.origin)
  params.append('rel', '0') // Don't show related videos
  
  if (props.autoplay) {
    params.append('autoplay', '1')
    params.append('mute', '1') // Required for autoplay in most browsers
  }
  
  if (props.startTime > 0) {
    params.append('start', props.startTime.toString())
  }
  
  // Do NOT add cache busting for YouTube - it can cause issues
  
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
})

const handleVideoLoaded = () => {
  logger.log('Video iframe loaded')
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
  }
  loading.value = false
}

// Clean up on component unmount
onUnmounted(() => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
  }
})

// Debug
onMounted(() => {
  logger.log('YoutubePlayer mounted with videoId:', props.videoId)
})
</script>

<style scoped>
.youtube-player {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  width: 100%;
}

.iframe-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.youtube-player iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.youtube-loading {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-secondary, #f5f5f5);
  border-radius: 4px;
}

.youtube-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 4px;
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