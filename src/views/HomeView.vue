<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  FolderPlusIcon,
  DocumentTextIcon,
  XMarkIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
} from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useDebounceFn } from '@vueuse/core'
import Tag from '@/components/ui/tag/Tag.vue'

const store = useNotaStore()
const router = useRouter()
const searchQuery = ref('')
const isLoading = ref(true)
const viewType = ref<'grid' | 'list' | 'compact'>('grid')
const showFavorites = ref(false)
const selectedTag = ref('')

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
    year: now.getFullYear() !== d.getFullYear() ? 'numeric' : undefined,
  })
}

onMounted(async () => {
  await store.loadNotas()
  const savedView = localStorage.getItem('home-view-type')
  if (savedView) {
    viewType.value = savedView as 'grid' | 'list' | 'compact'
  }
})

watch(viewType, (newView) => {
  localStorage.setItem('home-view-type', newView)
})

watch(
  () => store.rootItems,
  () => {
    isLoading.value = false
  },
  { immediate: true },
)

const getNotaPreview = (content: string | undefined) => {
  if (!content) return 'No content'

  const div = document.createElement('div')
  div.innerHTML = content

  const textContent = div.textContent || div.innerText || ''
  return textContent.trim() || 'No content'
}

const toggleFavorite = async (id: string) => {
  const nota = store.rootItems.find((n) => n.id === id)
  if (nota) {
    await store.updateItem(id, {
      ...nota,
      favorite: !nota.favorite,
    })
  }
}

const openSettings = (id: string) => {
  router.push(`/nota/${id}/settings`)
}

const clearFilters = () => {
  showFavorites.value = false
  searchQuery.value = ''
  selectedTag.value = ''
}

const allTags = computed(() => {
  const tagSet = new Set<string>()
  recentNotas.value.forEach((nota) => {
    if (nota.tags) {
      nota.tags.forEach((tag) => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

const filteredNotas = computed(() => {
  if (!selectedTag.value) return recentNotas.value
  return recentNotas.value.filter((nota) => nota.tags?.includes(selectedTag.value))
})

const recentNotas = computed(() => {
  let filtered = store.rootItems.map((nota) => ({
    ...nota,
    tags: nota.tags || [],
  }))

  if (showFavorites.value) {
    filtered = filtered.filter((nota) => nota.favorite)
  }

  if (searchQuery.value) {
    filtered = filtered.filter(
      (nota) =>
        nota.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        nota.content?.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  return filtered.slice().sort((a, b) => {
    const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
    const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
    return dateB.getTime() - dateA.getTime()
  })
})

const createNewNota = async () => {
  const nota = await store.createItem('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}

const quickActions = [
  {
    title: 'New Nota',
    icon: PlusIcon,
    action: createNewNota,
  },
  {
    title: 'Import',
    icon: FolderPlusIcon,
    action: () => {}, // TODO: Implement import functionality
  },
  {
    title: 'Favorites',
    icon: StarIcon,
    action: () => {
      showFavorites.value = !showFavorites.value
    },
  },
]

const debouncedSearch = useDebounceFn((value: string) => {
  searchQuery.value = value
}, 300)

const clearSearch = () => {
  searchQuery.value = ''
}

const viewOptions = [
  { id: 'grid', icon: Squares2X2Icon, label: 'Grid View' },
  { id: 'list', icon: ListBulletIcon, label: 'List View' },
  { id: 'compact', icon: TableCellsIcon, label: 'Compact View' },
]
</script>

<template>
  <div class="container py-8 space-y-8">
    <div class="space-y-6">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between">
          <div class="space-y-4">
            <div>
              <h1 class="text-4xl font-bold tracking-tight">Welcome to BashNota</h1>
              <div class="mt-3">
                <p class="text-xl font-medium text-primary">More Than a Second Brain,</p>
                <p class="text-xl font-medium text-muted-foreground">
                  It's a Second Brain Cracked on Code
                </p>
              </div>
            </div>
            <p class="text-muted-foreground max-w-2xl">
              Transform your notes into powerful tools with code snippets, markdown support, and
              seamless organization.
            </p>
          </div>
          <Button @click="createNewNota" size="lg" class="gap-2">
            <PlusIcon class="h-5 w-5" />
            New Nota
          </Button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="relative flex-1">
          <MagnifyingGlassIcon
            class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            class-name="pl-10"
            placeholder="Search your notas..."
            @input="(e: Event) => debouncedSearch((e.target as HTMLInputElement).value)"
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

        <div class="flex items-center gap-2">
          <Button
            v-for="action in quickActions"
            :key="action.title"
            variant="ghost"
            size="icon"
            class="h-9 w-9"
            :class="[
              action.title === 'Favorites' &&
                showFavorites &&
                'bg-primary/10 text-primary hover:bg-primary/20',
            ]"
            :title="action.title"
            @click="action.action"
          >
            <component :is="action.icon" class="h-5 w-5" />
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <Button
            v-for="option in viewOptions"
            :key="option.id"
            variant="ghost"
            size="icon"
            :class="[
              'h-8 w-8',
              viewType === option.id && 'bg-primary/10 text-primary hover:bg-primary/20',
            ]"
            @click="viewType = option.id as 'grid' | 'list' | 'compact'"
            :title="option.label"
          >
            <component :is="option.icon" class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="relative flex-1">
        <select
          v-model="selectedTag"
          class="w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All tags</option>
          <option v-for="tag in allTags" :key="tag" :value="tag">
            {{ tag }}
          </option>
        </select>
        <Button
          v-if="selectedTag"
          variant="ghost"
          size="sm"
          class="absolute right-2 top-1/2 -translate-y-1/2"
          @click="selectedTag = ''"
        >
          <XMarkIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <ClockIcon class="h-5 w-5" />
              {{ showFavorites ? 'Favorite' : 'Recent' }} Notas
            </CardTitle>
            <CardDescription>
              {{ showFavorites ? 'Your starred notas' : 'Your recently updated notas' }}
            </CardDescription>
          </div>
          <Button
            v-if="showFavorites || searchQuery"
            variant="ghost"
            size="sm"
            @click="clearFilters"
            class="h-8"
          >
            Clear Filters
            <XMarkIcon class="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          v-if="!isLoading && recentNotas.length === 0"
          class="flex flex-col items-center justify-center p-12 text-center"
        >
          <component
            :is="showFavorites ? StarIcon : DocumentTextIcon"
            class="w-12 h-12 text-muted-foreground/50 mb-4"
          />
          <h3 class="text-lg font-semibold mb-2">
            {{ showFavorites ? 'No Favorites Yet' : 'No Notas Yet' }}
          </h3>
          <p class="text-muted-foreground mb-4">
            {{
              showFavorites
                ? 'Star your important notas for quick access'
                : 'Create your first nota to get started'
            }}
          </p>
          <Button v-if="!showFavorites" @click="createNewNota"> Create Nota </Button>
        </div>

        <div v-else-if="isLoading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div
          v-else-if="viewType === 'grid'"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <RouterLink v-for="nota in filteredNotas" :key="nota.id" :to="`/nota/${nota.id}`">
            <Card class="h-full hover:shadow-md transition-all group relative">
              <CardHeader>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 flex-1">
                    <DocumentTextIcon class="w-5 h-5 text-muted-foreground" />
                    <CardTitle class="text-lg truncate">{{ nota.title }}</CardTitle>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      @click.prevent="toggleFavorite(nota.id)"
                    >
                      <StarIcon
                        class="w-5 h-5"
                        :class="
                          nota.favorite
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground'
                        "
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      @click.prevent="openSettings(nota.id)"
                    >
                      <Cog6ToothIcon class="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <CardDescription class="line-clamp-2 mt-2">
                  {{ getNotaPreview(nota.content) }}
                </CardDescription>
                <div class="flex items-center text-sm text-muted-foreground mt-2">
                  <ClockIcon class="w-4 h-4 mr-1" />
                  {{ formatDate(nota.updatedAt) }}
                </div>
              </CardHeader>
              <CardContent>
                <div v-if="nota.tags?.length" class="flex flex-wrap gap-2">
                  <Tag
                    v-for="tag in nota.tags || []"
                    :key="tag"
                    class="hover:bg-primary/10 cursor-pointer transition-colors"
                    @click.prevent="selectedTag = tag"
                  >
                    {{ tag }}
                  </Tag>
                </div>
                <p v-else class="text-sm text-muted-foreground italic">No tags</p>
              </CardContent>
            </Card>
          </RouterLink>
        </div>

        <div v-else-if="viewType === 'list'" class="space-y-3">
          <RouterLink v-for="nota in filteredNotas" :key="nota.id" :to="`/nota/${nota.id}`">
            <div
              class="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <DocumentTextIcon class="w-5 h-5 text-muted-foreground mt-1" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 justify-between">
                  <div class="flex items-center gap-2 flex-1">
                    <h3 class="font-medium truncate">{{ nota.title }}</h3>
                    <StarIcon
                      v-if="nota.favorite"
                      class="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0"
                    />
                  </div>
                  <div
                    class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click.prevent="toggleFavorite(nota.id)"
                    >
                      <StarIcon
                        class="w-4 h-4"
                        :class="
                          nota.favorite
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground'
                        "
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click.prevent="openSettings(nota.id)"
                    >
                      <Cog6ToothIcon class="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {{ getNotaPreview(nota.content) }}
                </p>
                <div class="flex items-center gap-4 mt-2">
                  <span class="text-xs text-muted-foreground flex items-center">
                    <ClockIcon class="w-3 h-3 mr-1" />
                    {{ formatDate(nota.updatedAt) }}
                  </span>
                  <div class="flex flex-wrap gap-2">
                    <Tag
                      v-for="tag in nota.tags || []"
                      :key="tag"
                      class="hover:bg-primary/10 cursor-pointer transition-colors"
                      @click.prevent="selectedTag = tag"
                    >
                      {{ tag }}
                    </Tag>
                  </div>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>

        <div v-else class="divide-y">
          <RouterLink v-for="nota in filteredNotas" :key="nota.id" :to="`/nota/${nota.id}`">
            <div class="flex items-center gap-3 py-2 hover:bg-muted/50 transition-colors px-2">
              <DocumentTextIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="font-medium truncate">{{ nota.title }}</span>
              <StarIcon
                v-if="nota.favorite"
                class="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0"
              />
              <span class="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <ClockIcon class="w-3 h-3" />
                {{ formatDate(nota.updatedAt) }}
              </span>
              <div class="flex flex-wrap gap-2">
                <Tag v-for="tag in nota.tags || []" :key="tag">
                  {{ tag }}
                </Tag>
              </div>
            </div>
          </RouterLink>
        </div>

        <p v-if="searchQuery" class="text-sm text-muted-foreground mt-4">
          Found {{ recentNotas.length }} results
        </p>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.icon-btn {
  @apply p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors;
}

:deep(.tag) {
  @apply text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors;
}
</style>
