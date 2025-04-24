<script setup lang="ts">
import { ref, onMounted, computed, onBeforeMount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Share2, ChevronLeft } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import NotaContentViewer from '@/components/editor/NotaContentViewer.vue'
import { type PublishedNota } from '@/types/nota'
import { logger } from '@/services/logger'
import { convertPublicPageLinks } from '@/components/editor/extensions/PageLinkExtension'

// Define extended PublishedNota type with optional fields we need
interface ExtendedPublishedNota extends PublishedNota {
  tags?: string[];
  relatedNotas?: {
    id: string;
    title: string;
    updatedAt: string;
  }[];
}

const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const nota = ref<ExtendedPublishedNota | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const parentNota = ref<PublishedNota | null>(null)

// Meta information for SEO
const metaDescription = ref('')
const pageTitle = ref('Published Note')
const canonicalUrl = ref('')

// Create a computed property to check if we should show breadcrumbs
const showBreadcrumbs = computed(() => {
  return !!parentNota.value
})

// Get a short description from the content (first 160 characters)
const getMetaDescription = (content: string | null): string => {
  if (!content) {
    return 'Read this published note on BashNota - a powerful note-taking app for developers.'
  }
  
  try {
    // Parse the JSON content
    const contentObj = JSON.parse(content)
    let extractedText = ''

    // Helper function to recursively extract text from content
    const extractText = (node: any) => {
      if (node.text) {
        extractedText += node.text + ' '
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extractText)
      }
    }

    if (contentObj.content && Array.isArray(contentObj.content)) {
      contentObj.content.forEach(extractText)
    }

    // Clean up and limit to 160 characters
    return extractedText.trim().replace(/\s+/g, ' ').substring(0, 157) + '...'
  } catch (e) {
    // Fallback if parsing fails
    return 'Read this published note on BashNota - a powerful note-taking app for developers.'
  }
}

// Update meta tags when nota changes
watch(() => nota.value, (newNota) => {
  if (newNota) {
    pageTitle.value = `${newNota.title} | BashNota`
    metaDescription.value = getMetaDescription(newNota.content)
    canonicalUrl.value = notaStore.getPublicLink(newNota.id)
    
    // Set meta tags in document head
    updateMetaTags()
  }
}, { immediate: true })

// Update the document's meta tags
const updateMetaTags = () => {
  if (!nota.value) return

  // Set document title
  document.title = pageTitle.value

  // Helper function to create or update meta tags
  const setMetaTag = (name: string, content: string) => {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = name
      document.head.appendChild(meta)
    }
    meta.content = content
  }

  // Set primary meta tags
  setMetaTag('description', metaDescription.value)

  // Set Open Graph meta tags
  const setOgMetaTag = (property: string, content: string) => {
    let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('property', property)
      document.head.appendChild(meta)
    }
    meta.content = content
  }

  setOgMetaTag('og:title', nota.value.title)
  setOgMetaTag('og:description', metaDescription.value)
  setOgMetaTag('og:type', 'article')
  setOgMetaTag('og:url', canonicalUrl.value)
  
  // Set Twitter card tags
  setMetaTag('twitter:card', 'summary')
  setMetaTag('twitter:title', nota.value.title)
  setMetaTag('twitter:description', metaDescription.value)

  // Set article metadata
  setMetaTag('article:published_time', new Date(nota.value.publishedAt).toISOString())
  setMetaTag('article:modified_time', new Date(nota.value.updatedAt).toISOString())
  setMetaTag('article:author', nota.value.authorName)

  // Set canonical URL
  let canonicalElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
  if (!canonicalElement) {
    canonicalElement = document.createElement('link')
    canonicalElement.rel = 'canonical'
    document.head.appendChild(canonicalElement)
  }
  canonicalElement.href = canonicalUrl.value
}

// Clean up meta tags when component is unmounted
onBeforeMount(() => {
  // Reset the document title when leaving
  const originalTitle = 'BashNota'
  document.title = originalTitle
  
  // Remove added meta tags
  document.querySelector('meta[name="description"]')?.remove()
  document.querySelector('link[rel="canonical"]')?.remove()
  document.querySelectorAll('meta[property^="og:"]').forEach(el => el.remove())
  document.querySelectorAll('meta[name^="twitter:"]').forEach(el => el.remove())
  document.querySelectorAll('meta[name^="article:"]').forEach(el => el.remove())
})

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

    nota.value = publishedNota as ExtendedPublishedNota
    
    // Get information about parent nota if this is a sub-page
    if (publishedNota.parentId) {
      try {
        const parentPublishedNota = await notaStore.getPublishedNota(publishedNota.parentId)
        if (parentPublishedNota) {
          parentNota.value = parentPublishedNota
        }
      } catch (err) {
        logger.error('Parent nota is not published or accessible:', err)
        // We don't need to throw an error here, just means we won't show breadcrumbs
      }
    }

    // Convert links in the content after it's rendered
    setTimeout(() => {
      convertPublicPageLinks(document)
    }, 100)
  } catch (err) {
    logger.error('Error loading public nota:', err)
    error.value = 'Failed to load the nota'
  } finally {
    isLoading.value = false
  }
})

const goBack = async () => {
  if (parentNota.value) {
    // If we know the parent, go directly to it
    await router.push(`/p/${parentNota.value.id}`)
    location.reload()
  } else {
    // Otherwise go to home
    router.push('/')
  }
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
  <main class="container mx-auto py-8 px-4">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64" aria-live="polite">
      <LoadingSpinner class="w-10 h-10" />
      <span class="sr-only">Loading note content</span>
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
    <article v-else-if="nota" class="space-y-6" itemscope itemtype="https://schema.org/Article">
      <!-- Hidden structured data for SEO -->
      <meta itemprop="headline" :content="nota.title">
      <meta itemprop="description" :content="metaDescription">
      <meta itemprop="datePublished" :content="new Date(nota.publishedAt).toISOString()">
      <meta itemprop="dateModified" :content="new Date(nota.updatedAt).toISOString()">
      <div itemprop="author" itemscope itemtype="https://schema.org/Person">
        <meta itemprop="name" :content="nota.authorName">
      </div>
      <meta itemprop="url" :content="canonicalUrl">

      <!-- Breadcrumbs for sub-pages -->
      <nav v-if="showBreadcrumbs" aria-label="Breadcrumb" class="flex items-center text-sm mb-4">
        <ol class="flex items-center" itemscope itemtype="https://schema.org/BreadcrumbList">
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <Button variant="ghost" size="sm" class="flex items-center gap-1" @click="goBack">
              <ChevronLeft class="h-4 w-4" />
              <span itemprop="name">Back to {{ parentNota?.title || 'Parent' }}</span>
              <meta itemprop="position" content="1" />
              <meta itemprop="item" :content="parentNota ? notaStore.getPublicLink(parentNota.id) : '/'" />
            </Button>
          </li>
        </ol>
      </nav>

      <!-- Header section -->
      <header class="flex items-center justify-between pb-4 border-b">
        <div class="flex items-center gap-4">
          <h1 itemprop="name" class="text-2xl font-bold tracking-tight">{{ nota.title }}</h1>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="shareNota">
            <Share2 class="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </header>

      <!-- Meta information -->
      <div class="flex flex-wrap items-center justify-between text-sm text-muted-foreground">
        <div itemscope itemtype="https://schema.org/PublicationEvent">
          <span>Published: <time itemprop="datePublished" :datetime="new Date(nota.publishedAt).toISOString()">{{ formatDate(nota.publishedAt) }}</time></span>
          <span class="mx-2">•</span>
          <span>Last updated: <time itemprop="dateModified" :datetime="new Date(nota.updatedAt).toISOString()">{{ formatDate(nota.updatedAt) }}</time></span>
          <span class="mx-2">•</span>
          <span>
            By:
            <a
              @click="router.push(`/u/${nota.authorId}`)"
              class="underline cursor-pointer hover:text-black"
              itemprop="author"
              itemscope
              itemtype="https://schema.org/Person"
            >
              <span itemprop="name">{{ nota.authorName }}</span>
            </a>
          </span>
        </div>
        
        <!-- Tags display if available -->
        <div v-if="nota.tags && nota.tags.length > 0" class="mt-2 sm:mt-0">
          <span class="text-muted-foreground">Tags: </span>
          <span v-for="(tag, index) in nota.tags" :key="index" class="inline-block bg-muted/50 text-xs px-2 py-1 rounded-md mx-1">
            {{ tag }}
          </span>
        </div>
      </div>

      <hr class="border-t border-gray-200" />

      <!-- Content area with itemprop for search engines -->
      <div itemprop="articleBody">
        <NotaContentViewer :content="nota.content" :citations="nota.citations" readonly />
      </div>
      
      <!-- Footer with related/related articles if available -->
      <footer v-if="nota.relatedNotas && nota.relatedNotas.length > 0" class="mt-8 pt-6 border-t">
        <h2 class="text-xl font-semibold mb-4">Related Notes</h2>
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <li v-for="(relatedNota, index) in nota.relatedNotas" :key="index" class="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
            <a :href="notaStore.getPublicLink(relatedNota.id)" class="block">
              <h3 class="font-medium text-lg">{{ relatedNota.title }}</h3>
              <p class="text-sm text-muted-foreground mt-1">{{ formatDate(relatedNota.updatedAt) }}</p>
            </a>
          </li>
        </ul>
      </footer>
    </article>
  </main>
</template>

<style>
/* Simple toast notification styles */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.toast.show {
  opacity: 1;
}

.toast-header {
  font-weight: 500;
  margin-bottom: 2px;
}

.toast-body {
  font-size: 0.875rem;
}
</style>
