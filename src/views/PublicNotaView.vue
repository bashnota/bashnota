<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Share2 } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import NotaContentViewer from '@/components/editor/NotaContentViewer.vue'
import { type PublishedNota } from '@/types/nota'
import { logger } from '@/services/logger'

const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const nota = ref<PublishedNota | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    isLoading.value = true
    const notaId = route.params.id as string

    if (!notaId) {
      error.value = 'No nota ID provided'
      return
    }

    const publishedNota = await notaStore.getPublishedNota(notaId)

    if (!publishedNota) {
      error.value = 'This nota does not exist or is no longer public'
      return
    }

    nota.value = publishedNota
  } catch (err) {
    logger.error('Error loading public nota:', err)
    error.value = 'Failed to load the nota'
  } finally {
    isLoading.value = false
  }
})

const goBack = () => {
  router.push('/')
}

const shareNota = () => {
  if (!nota.value) return

  navigator.clipboard
    .writeText(notaStore.getPublicLink(nota.value.id))
    .then(() => {
      alert('Link copied to clipboard')
    })
    .catch(() => {
      alert('Failed to copy link')
    })
}
</script>

<template>
  <div class="container mx-auto py-8 px-4">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <LoadingSpinner class="w-10 h-10" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <h2 class="text-red-600 text-xl font-semibold mb-2">{{ error }}</h2>
      <p class="text-gray-600 mb-4">
        The nota you're looking for might have been deleted or made private.
      </p>
      <Button @click="goBack">Go Home</Button>
    </div>

    <!-- Content state -->
    <div v-else-if="nota" class="space-y-6">
      <!-- Header section -->
      <div class="flex items-center justify-between pb-4 border-b">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold tracking-tight">{{ nota.title }}</h1>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="shareNota">
            <Share2 class="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <!-- Meta information -->
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          <span>Published: {{ formatDate(nota.publishedAt) }}</span>
          <span class="mx-2">•</span>
          <span>Last updated: {{ formatDate(nota.updatedAt) }}</span>
          <span class="mx-2">•</span>
          <span>
            By:
            <a
              @click="router.push(`/u/${nota.authorId}`)"
              class="underline cursor-pointer hover:text-black"
            >
              {{ nota.authorName }}
            </a>
          </span>
        </div>
      </div>

      <hr class="border-t border-gray-200" />

      <!-- Content area -->
      <NotaContentViewer :content="nota.content" readonly />
    </div>
  </div>
</template>
