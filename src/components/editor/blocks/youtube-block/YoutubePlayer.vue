<template>
  <div class="youtube-player">
    <div v-if="loading" class="youtube-loading">
      <span class="loading-spinner"></span>
      <span class="sr-only">Loading video...</span>
    </div>
    
    <iframe
      v-else-if="videoId"
      :src="embedUrl"
      :title="`YouTube video player: ${videoId}`"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      @load="handleVideoLoaded"
      loading="lazy"
    ></iframe>
    
    <div v-else class="youtube-error">
      <p>Invalid YouTube URL</p>
      <p class="error-details" v-if="errorMessage">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

const embedUrl = computed(() => {
  const baseUrl = `https://www.youtube.com/embed/${props.videoId}`
  const params = new URLSearchParams()
  
  if (props.autoplay) {
    params.append('autoplay', '1')
  }
  
  if (props.startTime > 0) {
    params.append('start', props.startTime.toString())
  }
  
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
})

const handleVideoLoaded = () => {
  loading.value = false
}
</script>

<style scoped>
.youtube-player {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  width: 100%;
}

.youtube-player iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.youtube-loading, 
.youtube-error {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.youtube-error {
  padding: 1em;
  background-color: #fee;
  color: #c00;
  text-align: center;
}

.error-details {
  font-size: 0.9em;
  margin-top: 0.5em;
  opacity: 0.8;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 