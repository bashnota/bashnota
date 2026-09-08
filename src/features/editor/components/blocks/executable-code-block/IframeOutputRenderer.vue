<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  createIframeOutputChannel,
  createIframeOutputDocument,
  getTrustedIframeOutputHeight,
  IFRAME_OUTPUT_SANDBOX,
} from './iframeOutputSecurity'

interface Props {
  content: string
  type: 'html' | 'dataframe' | 'matplotlib' | 'widget'
  height?: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  width: '100%',
})

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isLoaded = ref(false)
const messageChannel = ref(createIframeOutputChannel())
const iframeDocument = computed(() => createIframeOutputDocument(props.content || '', messageChannel.value))

const handleMessage = (event: MessageEvent<unknown>) => {
  const iframe = iframeRef.value
  if (!iframe) return

  const trustedHeight = getTrustedIframeOutputHeight(
    event,
    iframe.contentWindow,
    messageChannel.value,
  )
  if (trustedHeight === null) return

  iframe.style.height = `${trustedHeight}px`
}

const handleLoad = () => {
  isLoaded.value = true
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})

watch([() => props.content, () => props.type], () => {
  isLoaded.value = false
  // A navigation keeps the same WindowProxy, so rotate the unguessable channel
  // to reject any delayed messages from the previous srcdoc document.
  messageChannel.value = createIframeOutputChannel()
})
</script>

<template>
  <div class="iframe-output-container">
    <iframe
      ref="iframeRef"
      :width="width"
      :height="height"
      frameborder="0"
      :sandbox="IFRAME_OUTPUT_SANDBOX"
      :srcdoc="iframeDocument"
      class="output-iframe"
      title="Code execution output"
      @load="handleLoad"
    ></iframe>

    <div v-if="!isLoaded" class="iframe-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading output...</div>
    </div>
  </div>
</template>

<style scoped>
.iframe-output-container {
  position: relative;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.output-iframe {
  width: 100%;
  display: block;
  transition: height 0.2s ease;
  min-height: 100px;
}

.iframe-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.9);
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
  .iframe-output-container {
    border-color: #374151;
    background: #1f2937;
  }

  .iframe-loading {
    background: rgba(31, 41, 55, 0.9);
  }

  .loading-text {
    color: #9ca3af;
  }

  .loading-spinner {
    border-color: #374151;
    border-top-color: #60a5fa;
  }
}
</style>
