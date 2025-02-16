<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StarIcon, DocumentTextIcon, Cog6ToothIcon, ClockIcon } from '@heroicons/vue/24/solid'
import { useNotaStore } from '@/stores/nota'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import type { Nota } from '@/types/nota'

const router = useRouter()
const store = useNotaStore()

const props = defineProps<{
  isLoading: boolean
  viewType: 'grid' | 'list' | 'compact'
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
}>()

defineEmits<{
  (e: 'create-nota'): void
  (e: 'update:selectedTag', value: string): void
}>()

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

const toggleFavorite = async (id: string) => {
  const nota = props.notas.find((n) => n.id === id)
  if (nota) {
    await store.saveItem({
      ...nota,
      favorite: !nota.favorite,
    })
  }
}

const openSettings = (id: string) => {
  router.push(`/nota/${id}/settings`)
}

const filteredNotas = computed(() => {
  let filtered = props.notas.map((nota) => ({
    ...nota,
    tags: nota.tags || [],
  }))

  if (props.showFavorites) {
    filtered = filtered.filter((nota) => nota.favorite)
  }

  if (props.searchQuery) {
    filtered = filtered.filter(
      (nota) =>
        nota.title.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
        nota.content?.toLowerCase().includes(props.searchQuery.toLowerCase()),
    )
  }

  if (props.selectedTag) {
    filtered = filtered.filter((nota) => nota.tags?.includes(props.selectedTag))
  }

  return filtered.slice().sort((a, b) => {
    const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
    const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
    return dateB.getTime() - dateA.getTime()
  })
})
</script>

<template>
  <div
    v-if="!isLoading && filteredNotas.length === 0"
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
    <Button v-if="!showFavorites" @click="$emit('create-nota')">Create Nota</Button>
  </div>

  <div v-else-if="isLoading" class="flex justify-center items-center py-12">
    <LoadingSpinner />
  </div>

  <div v-else-if="viewType === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <RouterLink v-for="nota in filteredNotas" :key="nota.id" :to="`/nota/${nota.id}`">
      <Card class="h-full hover:shadow-md transition-all group relative">
        <CardHeader>
          <div class="flex items-center justify-between flex-wrap">
            <div class="flex items-center gap-2">
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
                    nota.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
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
          <div class="flex items-center text-sm text-muted-foreground mt-2">
            <ClockIcon class="w-4 h-4 mr-1" />
            {{ formatDate(nota.updatedAt) }}
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="nota.tags.length > 0" class="flex flex-wrap gap-2">
            <Badge
              v-for="tag in nota.tags"
              :key="tag"
              @click.prevent="$emit('update:selectedTag', tag)"
              class="cursor-pointer transition-colors"
            >
              {{ tag }}
            </Badge>
          </div>
          <p v-else class="text-sm text-muted-foreground italic">No tags</p>
        </CardContent>
      </Card>
    </RouterLink>
  </div>

  <div v-else-if="viewType === 'list'" class="flex flex-col space-y-3">
    <RouterLink v-for="nota in filteredNotas" :key="nota.id" :to="`/nota/${nota.id}`">
      <div
        class="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors group border"
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
                    nota.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
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
          <div class="flex items-center gap-4 mt-2">
            <span class="text-xs text-muted-foreground flex items-center">
              <ClockIcon class="w-3 h-3 mr-1" />
              {{ formatDate(nota.updatedAt) }}
            </span>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="tag in nota.tags"
                :key="tag"
                @click.prevent="$emit('update:selectedTag', tag)"
                class="cursor-pointer transition-colors"
              >
                {{ tag }}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </RouterLink>
  </div>

  <div v-else class="divide-y">
    <RouterLink v-for="nota in filteredNotas" :key="nota.id" :to="`/nota/${nota.id}`">
      <div class="flex items-center gap-3 py-2 hover:bg-muted/50 transition-colors px-2 border-b">
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
      </div>
    </RouterLink>
  </div>

  <p v-if="searchQuery" class="text-sm text-muted-foreground mt-4">
    Found {{ filteredNotas.length }} results
  </p>
</template>

<style scoped>
.icon-btn {
  @apply p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors;
}

:deep(.tag) {
  @apply text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors;
}
</style>
