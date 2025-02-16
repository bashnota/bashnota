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
  <div class="container py-8 space-y-8">
    <HomeHeader @create-nota="createNewNota" />

    <HomeSearchBar
      v-model:search="searchQuery"
      v-model:view-type="viewType"
      v-model:show-favorites="showFavorites"
      @create-nota="createNewNota"
    />

    <HomeTagFilter v-model:selected-tag="selectedTag" :notas="store.rootItems" />

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
</template>
