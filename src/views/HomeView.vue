<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClockIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'
import HomeHeader from '@/components/home/HomeHeader.vue'
import HomeSearchBar from '@/components/home/HomeSearchBar.vue'
import HomeTagFilter from '@/components/home/HomeTagFilter.vue'
import HomeNotaList from '@/components/home/HomeNotaList.vue'

const router = useRouter()
const store = useNotaStore()
const isLoading = ref(true)
const viewType = ref<'grid' | 'list' | 'compact'>('grid')
const showFavorites = ref(false)
const searchQuery = ref('')
const selectedTag = ref('')

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

const clearFilters = () => {
  showFavorites.value = false
  searchQuery.value = ''
  selectedTag.value = ''
}

const createNewNota = async () => {
  const nota = await store.createItem('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}
</script>

<template>
  <div class="container py-6 h-[calc(100vh-4rem)]">
    <!-- Main Grid Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6 h-full">
      <!-- Left Column: HomeHeader (spans 2 columns on xl) -->
      <div class="xl:col-span-2">
        <div class="sticky top-6">
          <HomeHeader @create-nota="createNewNota" class="h-full" />
        </div>
      </div>

      <!-- Right Column: Interactive Content (spans 3 columns on xl) -->
      <div class="xl:col-span-3 flex flex-col h-full gap-4">
        <!-- Search and Controls Bar -->
        <div class="flex gap-4 items-start shrink-0">
          <div class="flex-1">
            <HomeSearchBar
              v-model:search="searchQuery"
              v-model:view-type="viewType"
              v-model:show-favorites="showFavorites"
              @create-nota="createNewNota"
              class="w-full"
            />
          </div>
          <Button
            v-if="showFavorites || searchQuery || selectedTag"
            variant="ghost"
            size="sm"
            @click="clearFilters"
            class="h-10 shrink-0"
          >
            Clear Filters
            <XMarkIcon class="h-4 w-4 ml-2" />
          </Button>
        </div>

        <!-- Tag Filter -->
        <HomeTagFilter 
          v-model:selected-tag="selectedTag" 
          :notas="store.rootItems"
          class="bg-card rounded-lg border p-4 shrink-0" 
        />

        <!-- Notas List Card -->
        <Card class="overflow-hidden flex-1 flex flex-col">
          <CardHeader class="bg-card border-b px-6 shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="flex items-center gap-2">
                  <ClockIcon class="h-5 w-5 text-primary" />
                  {{ showFavorites ? 'Favorite' : 'Recent' }} Notas
                </CardTitle>
                <CardDescription>
                  {{ showFavorites ? 'Your starred notas' : 'Your recently updated notas' }}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent class="p-4 flex-1 overflow-auto">
            <HomeNotaList
              :is-loading="isLoading"
              :view-type="viewType"
              :show-favorites="showFavorites"
              :search-query="searchQuery"
              :selected-tag="selectedTag"
              :notas="store.rootItems"
              @create-nota="createNewNota"
              @update:selected-tag="selectedTag = $event"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
