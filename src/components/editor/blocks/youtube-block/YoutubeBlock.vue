<template>
  <node-view-wrapper class="youtube-block">
    <div class="youtube-container">
      <iframe
        v-if="videoId"
        :src="`https://www.youtube.com/embed/${videoId}`"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <div v-else class="youtube-error">
        Invalid YouTube URL
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps<{
  node: {
    attrs: {
      url: string
      videoId: string
    }
  }
}>()

const videoId = computed(() => props.node.attrs.videoId)
</script>

<style scoped>
.youtube-block {
  margin: 1em 0;
}

.youtube-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  max-width: 100%;
}

.youtube-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.youtube-error {
  padding: 1em;
  background-color: #fee;
  color: #c00;
  border-radius: 4px;
}
</style> 