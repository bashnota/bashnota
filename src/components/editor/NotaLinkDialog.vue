<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent 
      class="sm:max-w-[600px] p-0"
      ref="dialogContentRef"
      @pointerdown.stop
      @keydown.stop
    >
      <div class="flex flex-col">
        <div class="border-b p-4">
          <DialogTitle class="text-lg font-semibold">Link to Nota</DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground mt-1">
            Search and select a nota to link to
          </DialogDescription>
        </div>

        <div class="p-4 space-y-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref="searchInputRef"
              v-model="searchQuery"
              placeholder="Search notas..."
              class="pl-9 h-9"
              @keydown.down.prevent="moveSelection(1)"
              @keydown.up.prevent="moveSelection(-1)"
              @keydown.enter.prevent="selectCurrentNota"
              @keydown.esc.prevent="closeDialog"
              @keydown.stop
            />
          </div>

          <ScrollArea class="h-[300px] rounded-md border">
            <div v-if="isLoading" class="flex h-full items-center justify-center p-4">
              <div class="flex flex-col items-center gap-2">
                <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
                <p class="text-sm text-muted-foreground">Loading notas...</p>
              </div>
            </div>

            <div v-else-if="filteredNotas.length === 0" class="flex h-full items-center justify-center p-4">
              <div class="flex flex-col items-center gap-2">
                <FileSearch class="h-6 w-6 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">No notas found</p>
                <p class="text-xs text-muted-foreground">Try a different search term</p>
              </div>
            </div>

            <div v-else class="divide-y">
              <div
                v-for="(nota, index) in filteredNotas"
                :key="nota.id"
                class="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                :class="{ 'bg-muted': index === selectedIndex }"
                @click="selectNota(nota)"
                @mouseenter="selectedIndex = index"
                @keydown.enter.prevent="selectNota(nota)"
                @keydown.space.prevent="selectNota(nota)"
                @keydown.stop
                tabindex="0"
              >
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ nota.title }}</p>
                  <p class="text-sm text-muted-foreground truncate mt-0.5">{{ nota.preview }}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="ml-2 h-8 w-8"
                  @click.stop="selectNota(nota)"
                >
                  <Link class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div class="border-t p-4 flex justify-end">
          <Button variant="outline" @click="closeDialog">Cancel</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { logger } from '@/services/logger'
import { toast } from '@/lib/utils'
import { Search, Loader2, FileSearch, Link } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Nota {
  id: string
  title: string
  preview: string
}

const props = defineProps<{
  modelValue: boolean
  onSelect?: (nota: Nota) => void
  onUpdate?: (value: boolean) => void
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', nota: Nota): void
}>()

const notaStore = useNotaStore()
const searchQuery = ref('')
const notas = ref<Nota[]>([])
const selectedIndex = ref(0)
const isLoading = ref(false)
const dialogContentRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    if (props.onUpdate) {
      props.onUpdate(value)
    }
  }
})

const filteredNotas = computed(() => {
  if (!searchQuery.value.trim()) return notas.value
  const query = searchQuery.value.toLowerCase().trim()
  return notas.value.filter(nota => 
    nota.title.toLowerCase().includes(query) ||
    (nota.preview && nota.preview.toLowerCase().includes(query))
  )
})

const handleOpenChange = (value: boolean) => {
  if (!value) {
    closeDialog()
  }
}

const closeDialog = () => {
  isOpen.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

const selectNota = (nota: Nota) => {
  if (props.onSelect) {
    props.onSelect(nota)
  }
  emit('select', nota)
  closeDialog()
}

const moveSelection = (direction: number) => {
  const newIndex = selectedIndex.value + direction
  if (newIndex >= 0 && newIndex < filteredNotas.value.length) {
    selectedIndex.value = newIndex
    // Scroll the selected item into view
    const selectedElement = document.querySelector('.bg-muted')
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }
}

const selectCurrentNota = () => {
  if (filteredNotas.value[selectedIndex.value]) {
    selectNota(filteredNotas.value[selectedIndex.value])
  }
}

// Load notas when dialog opens
watch(() => props.modelValue, async (isOpen: boolean) => {
  if (isOpen) {
    logger.info('Opening nota link dialog')
    isLoading.value = true
    try {
      logger.info('Loading notas from store...')
      const loadedNotas = await notaStore.loadNotas()
      logger.info(`Loaded ${loadedNotas.length} notas`)
      
      notas.value = notaStore.rootItems.map(nota => ({
        id: nota.id,
        title: nota.title,
        preview: nota.content ? JSON.stringify(nota.content).slice(0, 100) : 'No content'
      }))
      
      logger.info('Mapped notas for display:', notas.value)
    } catch (error) {
      logger.error('Failed to load notas:', error)
      toast('Failed to load notas')
    } finally {
      isLoading.value = false
    }
  }
})

// Handle keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) return
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      moveSelection(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      moveSelection(-1)
      break
    case 'Enter':
      e.preventDefault()
      selectCurrentNota()
      break
    case 'Escape':
      e.preventDefault()
      closeDialog()
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script> 