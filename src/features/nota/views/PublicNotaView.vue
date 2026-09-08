<script setup lang="ts">
import { ref, onMounted, computed, watch, shallowRef, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useAuthStore } from '@/features/auth/stores/auth'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { toast } from '@/services/toast'
import { Share2, ChevronLeft, ChevronUp, ChevronDown, FileText, FileCode } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import { type PublishedNota } from '@/features/nota/types/nota'
import { logger } from '@/services/logger'
import { getCommunityCloudApi, getPublicationCloudApi } from '@/services/cloud'
import { convertPublicPageLinks } from '@/features/nota/utils/publicPageLinks'
import CommentSection from '@/features/nota/components/CommentSection.vue'
import { useHead } from '@unhead/vue'
import CitationDialog from '@/features/nota/components/CitationDialog.vue'
import { normalizeCloudPublishedContent, type CloudPublishedContent } from '@/services/cloud/types'
import { loadNotaContentViewer } from './notaContentViewerLoader'

// Public pages render their read-only ProseMirror view only after the page has
// fetched its published nota. This keeps the initial public-route graph free of
// the editor stack while retaining the existing viewer once content is ready.
const VIEWER_TIMEOUT_MS = 15_000
const notaContentViewer = shallowRef<Component | null>(null)
const viewerStatus = ref<'idle' | 'loading' | 'error'>('idle')
const viewerError = ref('')
let viewerLoadAttempt = 0

async function loadViewer() {
  const attempt = ++viewerLoadAttempt
  notaContentViewer.value = null
  viewerStatus.value = 'loading'
  viewerError.value = ''
  try {
    const component = await Promise.race([
      loadNotaContentViewer(),
      new Promise<never>((_, reject) => window.setTimeout(
        () => reject(new Error('The reader took too long to load.')), VIEWER_TIMEOUT_MS,
      )),
    ])
    if (attempt === viewerLoadAttempt && nota.value) notaContentViewer.value = component
  } catch (error) {
    if (attempt === viewerLoadAttempt && nota.value) {
      viewerStatus.value = 'error'
      viewerError.value = error instanceof Error ? error.message : 'The reader could not be loaded.'
    }
  }
}

function retryViewer() {
  void loadViewer()
}

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
const metaKeywords = ref('')
const metaImage = ref('')

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
  return typeof tag === 'string' ? tag : (Array.isArray(tag) ? tag[0] : nota.value?.authorTag ?? '');
})

// Add origin URL computed property
const originUrl = computed(() => typeof window !== 'undefined' ? window.location.origin : '')

// Clone count
const cloneCount = ref(0)

// Get a short description from the content (first 160 characters)
const getMetaDescription = (content: CloudPublishedContent | string | null): string => {
  if (!content) {
    return 'Read this published note on BashNota - a powerful note-taking app for developers.'
  }
  
  try {
    // Parse the JSON content
    const contentObj = normalizeCloudPublishedContent(content)
    if (!contentObj) return 'Read this published note on BashNota - a powerful note-taking app for developers.'
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
    const description = extractedText.trim().replace(/\s+/g, ' ').substring(0, 157) + '...'
    return description || 'Read this published note on BashNota - a powerful note-taking app for developers.'
  } catch (e) {
    // Fallback if parsing fails
    return 'Read this published note on BashNota - a powerful note-taking app for developers.'
  }
}

// Extract keywords from content and tags
const getMetaKeywords = (nota: ExtendedPublishedNota): string => {
  const keywords = new Set<string>()
  
  // Add tags as keywords
  if (nota.tags && nota.tags.length > 0) {
    nota.tags.forEach(tag => keywords.add(tag))
  }
  
  // Add title words as keywords
  if (nota.title) {
    nota.title.split(' ').forEach(word => {
      if (word.length > 3) keywords.add(word.toLowerCase())
    })
  }
  
  // Add author name as keyword
  if (nota.authorName) {
    keywords.add(nota.authorName)
  }
  
  return Array.from(keywords).join(', ')
}

// Extract first image from content for social sharing
const getMetaImage = (content: CloudPublishedContent | string | null): string => {
  if (!content) return ''
  
  try {
    const contentObj = normalizeCloudPublishedContent(content)
    if (!contentObj) return ''
    let imageUrl = ''
    
    // Helper function to find first image
    const findImage = (node: any) => {
      if (node.type === 'image' && node.attrs?.src) {
        // Ensure the image URL is absolute
        const src = node.attrs.src
        imageUrl = src.startsWith('http') ? src : `${originUrl.value}${src}`
        return true
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.some(findImage)
      }
      return false
    }
    
    if (contentObj.content && Array.isArray(contentObj.content)) {
      contentObj.content.some(findImage)
    }
    
    return imageUrl
  } catch (e) {
    return ''
  }
}

const getContentBlockCount = (content: CloudPublishedContent | string | null): number => {
  const normalized = normalizeCloudPublishedContent(content)
  return Array.isArray(normalized?.content) ? normalized.content.length : 0
}

// Determine the proper URL for this nota
const getPublicLink = (id: string): string => {
  if (userTag.value) {
    return `${window.location.origin}/@${userTag.value}/${id}`
  }
  return `${window.location.origin}/p/${id}`
}

// Register head management during setup. The computed value stays reactive as
// the publication arrives without calling the composable from a later watcher.
useHead(computed(() => {
  const publishedNota = nota.value
  if (!publishedNota) return {}

  const title = `${publishedNota.title} | BashNota`
  const description = getMetaDescription(publishedNota.content)
  const canonicalUrl = getPublicLink(publishedNota.id)
  const keywords = getMetaKeywords(publishedNota)
  const image = getMetaImage(publishedNota.content)
  const imageMeta = image
    ? [
        { property: 'og:image', content: image },
        { property: 'og:image:alt', content: publishedNota.title },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:image', content: image },
        { name: 'twitter:image:alt', content: publishedNota.title },
      ]
    : []

  return {
    title,
    meta: [
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },
      { name: 'language', content: 'en' },
      { name: 'robots', content: 'index, follow' },
      { name: 'author', content: publishedNota.authorName },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:site_name', content: 'BashNota' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'article:published_time', content: new Date(publishedNota.publishedAt).toISOString() },
      { property: 'article:modified_time', content: new Date(publishedNota.updatedAt).toISOString() },
      { property: 'article:author', content: publishedNota.authorName },
      { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:site', content: '@bashnota' },
      { name: 'twitter:creator', content: `@${publishedNota.authorName}` },
      ...imageMeta,
    ],
    link: [{ rel: 'canonical', href: canonicalUrl }],
  }
}))

watch(nota, (publishedNota) => {
  if (publishedNota) void loadViewer()
  else {
    viewerLoadAttempt += 1
    notaContentViewer.value = null
    viewerStatus.value = 'idle'
  }
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
    // Get referrer if available
    const referrer = document.referrer || null
    
    const result = await (await getPublicationCloudApi()).statistics.recordView(id, referrer)
    if (result.ok) viewRecorded.value = true
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
  }
  return `/p/${nota.value.id}`
})

// Initialize voting data
const loadVotingData = async () => {
  if (!notaId.value) return;
  
  try {
    // Get the statistics which include vote counts
    const result = await (await getPublicationCloudApi()).statistics.getPublicationStats(notaId.value)
    if (!result.ok || !result.data) throw result.ok ? new Error('Publication not found') : result.error
    likeCount.value = result.data.likeCount || 0;
    dislikeCount.value = result.data.dislikeCount || 0;
    cloneCount.value = result.data.cloneCount || 0;
    
    userVote.value = null
    if (authStore.isAuthenticated && authStore.currentUser?.uid) {
      const voteResult = await (await getCommunityCloudApi()).notaVotes.getVote(notaId.value)
      if (!voteResult.ok) throw voteResult.error
      userVote.value = voteResult.data
    }
  } catch (error) {
    logger.error('Failed to load voting data:', error);
  }
}

// Handle user voting
const handleVote = async (voteType: 'like' | 'dislike') => {
  // Must be logged in to vote
  if (!authStore.isAuthenticated || !authStore.currentUser?.uid) {
    toast('Please log in to vote')
    return
  }
  
  // Must have a valid nota
  if (!notaId.value) return;
  
  try {
    isVoting.value = true;
    
    // Record the vote
    const result = await (await getCommunityCloudApi()).notaVotes.vote(notaId.value, voteType)
    if (!result.ok) throw result.error
    
    // Update local state with the results
    likeCount.value = result.data.likeCount;
    dislikeCount.value = result.data.dislikeCount;
    userVote.value = result.data.userVote;
    
    // Show feedback to the user
    if (result.data.userVote === null) {
      toast('Vote removed');
    } else {
      toast(`You ${result.data.userVote}d this nota`);
    }
  } catch (error) {
    logger.error('Failed to record vote:', error);
    toast('Failed to record your vote')
  } finally {
    isVoting.value = false;
  }
}

// Handle content rendered event from NotaContentViewer
const handleContentRendered = () => {
  // Once the content is rendered, convert the page links
  convertPublicPageLinks(document)
  logger.debug('Content rendered, converting public page links. Current path:', window.location.pathname)
}

// Reference to citation dialog component with type
const citationDialogRef = ref<InstanceType<typeof CitationDialog> | null>(null)

// Method to open citation dialog
const openCitationDialog = () => {
  // Use nextTick to ensure the component is fully available
  setTimeout(() => {
    if (citationDialogRef.value) {
      citationDialogRef.value.openDialog()
    }
  }, 0)
}
</script>

<template>
  <main class="container mx-auto py-8 px-4 max-h-screen flex flex-col">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64" aria-live="polite">
      <Skeleton class="w-10 h-10 rounded-full" />
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
    <article v-else-if="nota" class="flex-1 flex flex-col min-h-0" itemscope itemtype="https://schema.org/Article">
      <!-- Hidden structured data for SEO -->
      <meta itemprop="headline" :content="nota.title">
      <meta itemprop="description" :content="metaDescription">
      <meta itemprop="datePublished" :content="new Date(nota.publishedAt).toISOString()">
      <meta itemprop="dateModified" :content="new Date(nota.updatedAt).toISOString()">
      <meta itemprop="keywords" :content="metaKeywords">
      <meta itemprop="wordCount" :content="String(getContentBlockCount(nota.content))">
      <meta itemprop="inLanguage" content="en-US">
      <meta itemprop="isAccessibleForFree" content="true">
      <meta itemprop="license" content="https://creativecommons.org/licenses/by/4.0/">
      
      <div itemprop="author" itemscope itemtype="https://schema.org/Person">
        <meta itemprop="name" :content="nota.authorName">
        <meta v-if="userTag" itemprop="url" :content="`${originUrl}/@${userTag}`">
      </div>
      
      <div itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
        <meta itemprop="name" content="BashNota">
        <meta itemprop="url" :content="originUrl">
        <div itemprop="logo" itemscope itemtype="https://schema.org/ImageObject">
          <meta itemprop="url" :content="`${originUrl}/logo.png`">
        </div>
      </div>
      
      <meta itemprop="url" :content="canonicalUrl">
      
      <!-- Citations structured data if available -->
      <div v-if="nota.citations && nota.citations.length > 0" itemprop="citation" itemscope itemtype="https://schema.org/CreativeWork">
        <meta v-for="(citation, index) in nota.citations" :key="index" itemprop="citation" :content="citation.title">
      </div>
      
      <!-- Image structured data if available -->
      <div v-if="metaImage" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
        <meta itemprop="url" :content="metaImage">
        <meta itemprop="caption" :content="nota.title">
      </div>

      <!-- Fixed header section -->
      <div class="flex-shrink-0">
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
            <Button 
              variant="outline" 
              size="sm" 
              @click="openCitationDialog"
              title="Cite this nota"
            >
              <FileCode class="mr-2 h-4 w-4" />
              Cite
            </Button>
            <CitationDialog 
              v-if="nota" 
              :nota="nota"
              :showTrigger="false"
              ref="citationDialogRef"
            />
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
                  @mouseenter="!authStore.isAuthenticated ? toast('Please login to vote') : null"
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
                  @mouseenter="!authStore.isAuthenticated ? toast('Please login to vote') : null"
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
              
              <!-- Clone count display -->
              <div class="flex items-center gap-1 ml-2">
                <FileText class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm">{{ cloneCount }} clone{{ cloneCount !== 1 ? 's' : '' }}</span>
              </div>
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
      </div>

      <!-- Scrollable content area -->
      <div class="flex-1 overflow-y-auto min-h-0 space-y-6">
        <!-- Content area with itemprop for search engines -->
        <div itemprop="articleBody">
          <component
            :is="notaContentViewer"
            v-if="notaContentViewer"
            :content="nota.content" 
            :citations="nota.citations" 
            :isPublished="true" 
            readonly 
            @content-rendered="handleContentRendered"
          />
          <div v-else-if="viewerStatus === 'loading'" class="py-12 text-center" role="status" aria-live="polite" aria-busy="true">
            <Skeleton class="w-full h-24" />
            <span class="sr-only">Loading published note reader</span>
          </div>
          <div v-else-if="viewerStatus === 'error'" class="border rounded-lg p-6 text-center" role="alert" aria-live="assertive">
            <p class="font-medium">The published note reader could not be loaded.</p>
            <p class="text-sm text-muted-foreground my-2">{{ viewerError }} Your published note is still available to retry.</p>
            <Button variant="outline" @click="retryViewer">Retry reader</Button>
          </div>
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
        
        <!-- Comments Section -->
        <CommentSection v-if="nota" :nota-id="notaId" />
      </div>
    </article>
  </main>
</template>

<style>
/* Simple toast notification styles */
.toast {
  position: fixed;
  bottom:20px;
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
