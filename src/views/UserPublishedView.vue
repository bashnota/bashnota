<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ExternalLink } from 'lucide-vue-next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar' // Import Avatar components
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { type PublishedNota } from '@/types/nota'
import { logger } from '@/services/logger'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '@/services/firebase'

const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const publishedNotas = ref<PublishedNota[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const userId = ref<string | null>(null)

// Computed property to get author name from the first published nota
const authorName = computed(() => {
  if (publishedNotas.value.length > 0) {
    return publishedNotas.value[0].authorName
  }
  return 'Author'
})

// Computed property to generate initials from author name
const authorInitials = computed(() => {
  if (!authorName.value) return ''

  const nameParts = authorName.value.split(' ').filter((part) => part.length > 0)
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  } else if (nameParts.length === 1) {
    return nameParts[0][0].toUpperCase()
  }
  return ''
})

// Computed property to check which route parameter is available
const userTag = computed(() => {
  const tag = route.params.userTag;
  return typeof tag === 'string' ? tag : (Array.isArray(tag) ? tag[0] : '');
})
const legacyUserId = computed(() => {
  const id = route.params.userId;
  return typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : '');
})

// Determine correct URL format for sharing
const profileUrl = computed(() => {
  if (userTag.value) {
    return `/@${userTag.value}`
  }
  return `/u/${userId.value}`
})

// Convert user tag to user ID if needed
const getUserIdFromTag = async (tag: string): Promise<string | null> => {
  try {
    const userTagsRef = collection(firestore, 'userTags')
    const q = query(userTagsRef, where('userTag', '==', tag))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return doc.data().uid
    }
    
    return null
  } catch (err) {
    logger.error('Error fetching user ID from tag:', err)
    return null
  }
}

// Load user's published notas
const loadPublishedNotas = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // Determine which identifier to use
    let userIdToUse = userId.value
    
    if (!userIdToUse) {
      error.value = 'No user ID provided'
      return
    }

    const notas = await notaStore.getPublishedNotasByUser(userIdToUse)
    publishedNotas.value = notas

    if (notas.length === 0) {
      // This isn't an error, just an empty state
      isLoading.value = false
      return
    }
  } catch (err) {
    logger.error('Error loading published notas:', err)
    error.value = 'Failed to load published notas'
  } finally {
    isLoading.value = false
  }
}

// Watch for changes in route parameters
watch(
  () => route.params,
  async () => {
    await resolveUserId()
  }
)

// Resolve user ID from either direct ID or user tag
const resolveUserId = async () => {
  try {
    if (legacyUserId.value) {
      // Direct user ID provided
      userId.value = legacyUserId.value
    } else if (userTag.value) {
      // User tag provided, need to look up the ID
      const id = await getUserIdFromTag(userTag.value)
      if (id) {
        userId.value = id
      } else {
        error.value = 'User not found'
        isLoading.value = false
        return
      }
    } else {
      error.value = 'No valid user identifier provided'
      isLoading.value = false
      return
    }
    
    await loadPublishedNotas()
  } catch (err) {
    logger.error('Error resolving user ID:', err)
    error.value = 'Error finding user'
    isLoading.value = false
  }
}

onMounted(async () => {
  await resolveUserId()
})

const viewNota = (id: string) => {
  // Use the user tag in the URL if available
  if (userTag.value) {
    router.push(`/@${userTag.value}/${id}`)
  } else {
    router.push(`/p/${id}`)
  }
}
</script>

<template>
  <div class="container mx-auto max-w-6xl py-8 px-4">
    <header class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <!-- User Avatar (using initials from author name) -->
        <Avatar class="h-16 w-16">
          <AvatarFallback class="text-lg">
            {{ authorInitials || 'A' }}
          </AvatarFallback>
        </Avatar>

        <!-- User info from publishedNotas -->
        <div>
          <h1 class="text-3xl font-bold">{{ authorName }}'s Notas</h1>
          <p class="text-muted-foreground mt-1">
            <span v-if="userTag">@{{ userTag }} • </span>
            Published documents and notes
          </p>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <LoadingSpinner class="w-10 h-10" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <h2 class="text-red-600 text-xl font-semibold mb-2">{{ error }}</h2>
      <p class="text-gray-600 mb-4">There was an error loading the published notas.</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="publishedNotas.length === 0"
      class="bg-muted/50 border rounded-lg p-8 text-center"
    >
      <h2 class="text-xl font-semibold mb-2">No Published Notas</h2>
      <p class="text-muted-foreground mb-4">This user hasn't published any notas yet.</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <!-- Content state -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card v-for="nota in publishedNotas" :key="nota.id" class="flex flex-col">
        <CardHeader>
          <CardTitle class="line-clamp-2">{{ nota.title }}</CardTitle>
        </CardHeader>
        <CardContent class="flex-1">
          <p class="text-sm text-muted-foreground">Published: {{ formatDate(nota.publishedAt) }}</p>
          <p class="text-sm text-muted-foreground">
            Last updated: {{ formatDate(nota.updatedAt) }}
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" class="w-full" @click="viewNota(nota.id)">
            <ExternalLink class="mr-2 h-4 w-4" />
            View Nota
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
