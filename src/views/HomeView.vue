<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  PlusIcon, 
  FolderIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  FolderPlusIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useDebounceFn } from '@vueuse/core'

const store = useNotaStore()
const router = useRouter()
const searchQuery = ref('')
const isLoading = ref(true)

const formatDate = (date: Date | string) => {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: now.getFullYear() !== d.getFullYear() ? 'numeric' : undefined
  })
}

const recentNotas = computed(() => {
  const filtered = searchQuery.value
    ? store.rootItems.filter(nota => 
        nota.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        nota.content?.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    : store.rootItems

  return filtered
    .slice()
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 5)
})

const createNewNota = async () => {
  const nota = await store.createItem('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}

const quickActions = [
  {
    title: 'New Nota',
    description: 'Create a blank nota',
    icon: PlusIcon,
    action: createNewNota
  },
  {
    title: 'Import',
    description: 'Import from file',
    icon: FolderPlusIcon,
    action: () => {} // TODO: Implement import functionality
  },
  {
    title: 'Favorites',
    description: 'View starred notas',
    icon: StarIcon,
    action: () => router.push('/favorites')
  }
]

const debouncedSearch = useDebounceFn((value: string) => {
  searchQuery.value = value
}, 300)

const clearSearch = () => {
  searchQuery.value = ''
}

// Add this to the store.rootItems watcher
watch(() => store.rootItems, () => {
  isLoading.value = false
}, { immediate: true })
</script>

<template>
  <div class="container py-8 space-y-8">
    <!-- Header Section -->
    <div class="space-y-6">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between">
          <div class="space-y-4">
            <div>
              <h1 class="text-4xl font-bold tracking-tight">Welcome to BashNota</h1>
              <div class="mt-3">
                <p class="text-xl font-medium text-primary">More Than a Second Brain,</p>
                <p class="text-xl font-medium text-muted-foreground">It's a Second Brain Cracked on Code</p>
              </div>
            </div>
            <p class="text-muted-foreground max-w-2xl">
              Transform your notes into powerful tools with code snippets, markdown support, and seamless organization.
            </p>
          </div>
          <Button @click="createNewNota" size="lg" class="gap-2">
            <PlusIcon class="h-5 w-5" />
            New Nota
          </Button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="relative">
        <MagnifyingGlassIcon class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          class="pl-10"
          placeholder="Search your notas..."
          @input="(e) => debouncedSearch(e.target.value)"
        />
        <Button
          v-if="searchQuery"
          variant="ghost"
          size="icon"
          class="absolute right-2 top-1/2 -translate-y-1/2"
          @click="clearSearch"
        >
          <XMarkIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="action in quickActions"
        :key="action.title"
        class="group hover:shadow-md transition-all cursor-pointer"
        @click="action.action"
      >
        <CardHeader>
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <component :is="action.icon" class="w-5 h-5 text-primary" />
            </div>
            <CardTitle class="text-lg">{{ action.title }}</CardTitle>
          </div>
          <CardDescription>{{ action.description }}</CardDescription>
        </CardHeader>
      </Card>
    </div>

    <!-- Recent Notas -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <ClockIcon class="h-5 w-5" />
          Recent Notas
        </CardTitle>
        <CardDescription>Your recently updated notas</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!isLoading && recentNotas.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
          <DocumentTextIcon class="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 class="text-lg font-semibold mb-2">No Notas Yet</h3>
          <p class="text-muted-foreground mb-4">Create your first nota to get started</p>
          <Button @click="createNewNota">Create Nota</Button>
        </div>
        <div v-else class="space-y-4">
          <div v-for="nota in recentNotas" :key="nota.id" class="group">
            <RouterLink :to="`/nota/${nota.id}`">
              <Card class="hover:shadow-md transition-all">
                <CardHeader>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <DocumentTextIcon class="w-5 h-5 text-muted-foreground" />
                      <CardTitle>{{ nota.title }}</CardTitle>
                    </div>
                    <div class="flex items-center text-sm text-muted-foreground">
                      <ClockIcon class="w-4 h-4 mr-1" />
                      {{ formatDate(nota.updatedAt) }}
                    </div>
                  </div>
                  <CardDescription class="line-clamp-2">
                    {{ nota.content || 'No content' }}
                  </CardDescription>
                </CardHeader>
              </Card>
            </RouterLink>
          </div>
        </div>
        <p v-if="searchQuery" class="text-sm text-muted-foreground mt-2">
          Found {{ recentNotas.length }} results
        </p>
      </CardContent>
    </Card>
  </div>
</template>
