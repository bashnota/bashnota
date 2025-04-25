<script setup lang="ts">
import { ref, onMounted, computed, onBeforeMount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { formatDate, toast } from '@/lib/utils'
import { Share2, ChevronLeft, ChevronUp, ChevronDown, FileText } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import NotaContentViewer from '@/components/editor/NotaContentViewer.vue'
import { type PublishedNota } from '@/types/nota'
import { logger } from '@/services/logger'
import { statisticsService } from '@/services/statisticsService'
import { convertPublicPageLinks } from '@/components/editor/extensions/PageLinkExtension'
import VotersList from '@/components/nota/VotersList.vue'

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
const authStore = useAuthStore()
const nota = ref<ExtendedPublishedNota | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const parentNota = ref<PublishedNota | null>(null)
const viewRecorded = ref(false)

// Voting state
const likeCount = ref(0)
const dislikeCount = ref(0)
const userVote = ref<'like' | 'dislike' | null>(null)
const isVoting = ref(false)

// Meta information for SEO
const metaDescription = ref('')
const pageTitle = ref('Published Note')
const canonicalUrl = ref('')

// Create a computed property to check if we should show breadcrumbs
const showBreadcrumbs = computed(() => {
  return !!parentNota.value
})

// Get route parameters
const notaId = computed(() => {
  const id = route.params.id || route.params.notaId;
  return typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : '');
})
const userTag = computed(() => {
  const tag = route.params.userTag;
  return typeof tag === 'string' ? tag : (Array.isArray(tag) ? tag[0] : '');
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

// Determine the proper URL for this nota
const getPublicLink = (id: string): string => {
  if (userTag.value) {
    return `${window.location.origin}/@${userTag.value}/${id}`
  }
  return `${window.location.origin}/p/${id}`
}

// Update meta tags when nota changes
watch(() => nota.value, (newNota) => {
  if (newNota) {
    pageTitle.value = `${newNota.title} | BashNota`
    metaDescription.value = getMetaDescription(newNota.content)
    canonicalUrl.value = getPublicLink(newNota.id)
    
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
    
    if (!notaId.value) {
      error.value = 'No nota ID provided'
      return
    }

    const publishedNota = await notaStore.getPublishedNota(notaId.value)

    if (!publishedNota) {
      error.value = 'This nota does not exist or is no longer public'
      return
    }

    nota.value = publishedNota as ExtendedPublishedNota
    
    // Record view statistics (after a slight delay to ensure the page has loaded)
    setTimeout(() => {
      recordNotaView(notaId.value)
    }, 2000)
    
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

    // Load voting data
    await loadVotingData()
  } catch (err) {
    logger.error('Error loading public nota:', err)
    error.value = 'Failed to load the nota'
  } finally {
    isLoading.value = false
  }
})

// Record view statistics for this nota
const recordNotaView = async (id: string) => {
  // Only record once per session
  if (viewRecorded.value) return
  
  try {
    // Get user ID if the user is logged in
    const userId = authStore.currentUser?.uid || null
    
    // Get referrer if available
    const referrer = document.referrer || null
    
    // Record the view
    await statisticsService.recordView(id, userId, referrer)
    
    viewRecorded.value = true
  } catch (error) {
    // Don't show errors to users for stats tracking
    logger.error('Failed to record view statistics:', error)
  }
}

const goBack = async () => {
  if (parentNota.value) {
    // If we know the parent, go directly to it
    // Use the user tag format if available
    if (userTag.value) {
      await router.push(`/@${userTag.value}/${parentNota.value.id}`)
    } else {
      await router.push(`/p/${parentNota.value.id}`)
    }
    location.reload()
  } else if (userTag.value) {
    // Go to the user's profile if we came from there
    router.push(`/@${userTag.value}`)
  } else {
    // Otherwise go to home
    router.push('/')
  }
}

const shareNota = () => {
  if (!nota.value) return

  navigator.clipboard
    .writeText(getPublicLink(nota.value.id))
    .then(() => {
      alert('Link copied to clipboard')
    })
    .catch(() => {
      alert('Failed to copy link')
    })
}

const cloneNota = async () => {
  if (!nota.value) return
  
  try {
    // Show loading state
    isLoading.value = true
    
    // Call the store method to clone the nota
    const newNota = await notaStore.clonePublishedNota(notaId.value)
    
    // If successful, navigate to the newly created nota
    if (newNota) {
      // Small delay to allow for the toast to be visible
      setTimeout(() => {
        router.push(`/nota/${newNota.id}`)
      }, 1000)
    }
  } catch (error) {
    logger.error('Error cloning nota:', error)
    toast('Failed to clone nota')
  } finally {
    isLoading.value = false
  }
}

// Update author link to use tag if available
const getAuthorLink = computed(() => {
  if (!nota.value) return '#'
  
  if (userTag.value) {
    return `/@${userTag.value}`
  } else {
    return `/u/${nota.value.authorId}`
  }
})

// Initialize voting data
const loadVotingData = async () => {
  if (!notaId.value) return;
  
  try {
    // Get the statistics which include vote counts
    const stats = await statisticsService.getStatistics(notaId.value);
    likeCount.value = stats.likeCount || 0;
    dislikeCount.value = stats.dislikeCount || 0;
    
    // Get the user's vote if they're logged in
    if (authStore.isAuthenticated && authStore.currentUser?.uid) {
      const vote = await statisticsService.getUserVote(notaId.value, authStore.currentUser.uid);
      userVote.value = vote;
    }
  } catch (error) {
    logger.error('Failed to load voting data:', error);
  }
}

// Handle user voting
const handleVote = async (voteType: 'like' | 'dislike') => {
  // Must be logged in to vote
  if (!authStore.isAuthenticated || !authStore.currentUser?.uid) {
    toast('Please log in to vote', '', 'destructive');
    return;
  }
  
  // Must have a valid nota
  if (!notaId.value) return;
  
  try {
    isVoting.value = true;
    
    // Record the vote
    const result = await statisticsService.recordVote(
      notaId.value,
      authStore.currentUser.uid,
      voteType
    );
    
    // Update local state with the results
    likeCount.value = result.likeCount;
    dislikeCount.value = result.dislikeCount;
    userVote.value = result.userVote;
    
    // Show feedback to the user
    if (result.userVote === null) {
      toast('Vote removed');
    } else {
      toast(`You ${result.userVote}d this nota`);
    }
  } catch (error) {
    logger.error('Failed to record vote:', error);
    toast('Failed to record your vote', '', 'destructive');
  } finally {
    isVoting.value = false;
  }
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
              <meta itemprop="item" :content="parentNota ? getPublicLink(parentNota.id) : '/'" />
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
          <Button variant="outline" size="sm" @click="cloneNota" v-if="authStore.isAuthenticated">
            <FileText class="mr-2 h-4 w-4" />
            Clone
          </Button>
          <Button variant="outline" size="sm" @click="shareNota">
            <Share2 class="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </header>

      <!-- Meta information -->
      <div class="flex flex-wrap items-center justify-between text-sm text-muted-foreground">
        <div class="flex items-center gap-4">
          <div itemscope itemtype="https://schema.org/PublicationEvent">
            <span>Published: <time itemprop="datePublished" :datetime="new Date(nota.publishedAt).toISOString()">{{ formatDate(nota.publishedAt) }}</time></span>
            <span class="mx-2">•</span>
            <span>Last updated: <time itemprop="dateModified" :datetime="new Date(nota.updatedAt).toISOString()">{{ formatDate(nota.updatedAt) }}</time></span>
            <span class="mx-2">•</span>
            <span>
              By:
              <a
                @click="router.push(getAuthorLink)"
                class="underline cursor-pointer hover:text-black"
                itemprop="author"
                itemscope
                itemtype="https://schema.org/Person"
              >
                <span itemprop="name">
                  {{ userTag ? `@${userTag}` : nota.authorName }}
                </span>
              </a>
            </span>
          </div>
          
          <!-- Voting buttons moved next to metadata -->
          <div class="flex items-center gap-2">
            <div class="relative group">
              <Button
                :variant="userVote === 'like' ? 'default' : 'ghost'"
                :class="[
                  'transition-all duration-200 flex items-center gap-1 relative',
                  userVote === 'like' ? 'text-green-600 hover:text-green-700' : 'hover:text-green-600',
                  !authStore.isAuthenticated ? 'cursor-help' : ''
                ]"
                size="sm"
                :disabled="isVoting"
                @click="authStore.isAuthenticated ? handleVote('like') : null"
                @mouseenter="!authStore.isAuthenticated ? toast('Please login to vote', '', 'default') : null"
              >
                <ChevronUp 
                  class="h-5 w-5 transition-transform duration-200" 
                  :class="{ 'scale-125': userVote === 'like' }" 
                />
                <span class="font-medium">{{ likeCount }}</span>
                <span v-if="isVoting && userVote === 'like'" class="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-ping"></span>
              </Button>
              <div class="absolute -top-8 left-0 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                {{ userVote === 'like' ? 'Remove Upvote' : 'Upvote this nota' }}
              </div>
            </div>
            
            <div class="relative group">
              <Button
                :variant="userVote === 'dislike' ? 'default' : 'ghost'"
                :class="[
                  'transition-all duration-200 flex items-center gap-1 relative',
                  userVote === 'dislike' ? 'text-red-600 hover:text-red-700' : 'hover:text-red-600',
                  !authStore.isAuthenticated ? 'cursor-help' : ''
                ]"
                size="sm"
                :disabled="isVoting"
                @click="authStore.isAuthenticated ? handleVote('dislike') : null"
                @mouseenter="!authStore.isAuthenticated ? toast('Please login to vote', '', 'default') : null"
              >
                <ChevronDown 
                  class="h-5 w-5 transition-transform duration-200" 
                  :class="{ 'scale-125': userVote === 'dislike' }" 
                />
                <span class="font-medium">{{ dislikeCount }}</span>
                <span v-if="isVoting && userVote === 'dislike'" class="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping"></span>
              </Button>
              <div class="absolute -top-8 left-0 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                {{ userVote === 'dislike' ? 'Remove Downvote' : 'Downvote this nota' }}
              </div>
            </div>
            
            <!-- Show voters list button -->
            <VotersList :notaId="notaId" v-if="likeCount > 0 || dislikeCount > 0" />
          </div>
        </div>

        <!-- Tags display if available -->
        <div v-if="nota.tags && nota.tags.length > 0" class="mt-2 sm:mt-0">
          <span class="text-muted-foreground">Tags: </span>
          <span v-for="(tag, index) in nota.tags" :key="index" class="inline-block bg-muted/50 text-xs px-2 py-1 rounded-md mx-1">
            {{ tag }}
          </span>
        </div>
      </div>
      
      <!-- Login prompt for non-authenticated users -->
      <div v-if="!authStore.isAuthenticated" class="text-sm text-muted-foreground bg-muted/30 p-2 rounded text-center my-2">
        Please <button class="underline text-primary hover:text-primary/80" @click="router.push('/login')">login</button> to vote on this nota
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
            <a :href="getPublicLink(relatedNota.id)" class="block">
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
