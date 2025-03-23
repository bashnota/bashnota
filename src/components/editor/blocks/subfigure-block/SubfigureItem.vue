<template>
  <div class="relative group" v-show="subfigure.src || !isReadOnly">
    <div class="relative bg-muted p-2 rounded-lg overflow-hidden">
      <img
        v-if="subfigure.src"
        :src="subfigure.src"
        :style="imageStyle"
        :class="[
          'w-full rounded-md',
          isReadOnly ? '' : 'transition-transform hover:scale-102 cursor-zoom-in',
          { 'h-48': unifiedSize },
        ]"
        @dblclick="handleDoubleClick"
        @click="handleImageClick"
      />
      <UploadZone
        v-else-if="!isReadOnly"
        @file-selected="handleFileSelected"
        @file-dropped="handleFileDrop"
        @files-selected="handleMultipleFilesSelected"
        :allow-multiple="true"
        class="rounded-md"
        :disabled="isLocked"
      />

      <Button
        v-if="!isLocked && subfigure.src && !isReadOnly"
        @click="$emit('remove')"
        variant="destructive"
        size="icon"
        class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <TrashIcon class="w-4 h-4" />
      </Button>

      <!-- Only show subfigure caption if not the only item -->
      <div v-if="subfigure.src && !isOnlySubfigure" class="mt-2">
        <!-- Read-only subfigure caption -->
        <div v-if="isReadOnly" class="text-sm px-2 py-1">
          <span v-if="subfigure.caption">{{ subfigure.caption }}</span>
          <span v-else class="font-medium">{{ defaultLabel }}</span>
        </div>

        <!-- Editable subfigure caption -->
        <div
          v-else-if="!isEditingCaption"
          class="text-sm rounded px-2 py-1"
          :class="isLocked ? 'cursor-lock' : 'hover:bg-muted/50 cursor-text'"
          @click="startEditingCaption"
        >
          <div class="flex items-center gap-1">
            <LockIcon v-if="isLocked" class="w-3 h-3 opacity-50" />
            <span v-if="subfigure.caption">{{ subfigure.caption }}</span>
            <span v-else class="font-medium">{{ defaultLabel }}</span>
          </div>
        </div>
        <Input
          v-else
          :value="localCaption"
          @input="handleCaptionInput"
          @blur="finishEditingCaption"
          @keyup.enter="finishEditingCaption"
          @keyup.esc="cancelEditingCaption"
          :placeholder="defaultLabel"
          class="text-sm bg-transparent hover:bg-background focus:bg-background transition-colors"
          :disabled="isLocked"
          autofocus
        />
      </div>
    </div>

    <!-- Image Preview Modal -->
    <ImagePreviewModal
      :is-open="isPreviewOpen"
      @update:is-open="isPreviewOpen = $event"
      :image-src="subfigure.src"
      :image-alt="defaultLabel"
      :image-caption="subfigure.caption || defaultLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { TrashIcon, LockIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import UploadZone from '@/components/UploadZone.vue'
import ImagePreviewModal from '@/components/ImagePreviewModal.vue'

type ObjectFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

interface SubfigureData {
  src: string
  caption: string
}

const props = defineProps<{
  subfigure: SubfigureData
  index: number
  defaultLabel: string
  objectFit: ObjectFitType
  unifiedSize: boolean
  isLocked: boolean
  isReadOnly: boolean
  totalSubfigures?: number
}>()

const emit = defineEmits<{
  'update:subfigure': [value: SubfigureData]
  'remove': []
  'unlock': []
  'add-multiple-subfigures': [files: File[]]
}>()

// Local state
const localCaption = ref(props.subfigure.caption || '')
const isEditingCaption = ref(false)
const isPreviewOpen = ref(false)

// Computed properties
const imageStyle = computed(() => ({
  objectFit: props.objectFit || 'contain' as ObjectFitType
}))

// Determine if this is the only subfigure
const isOnlySubfigure = computed(() => {
  return props.totalSubfigures === 1
})

// Watch for external changes
watch(
  () => props.subfigure,
  (newValue) => {
    if (newValue.caption !== localCaption.value) {
      localCaption.value = newValue.caption || ''
    }
  },
  { deep: true, immediate: true }
)

// Image preview methods
const handleImageClick = (event: MouseEvent) => {
  // Always allow preview, even when locked
  event.preventDefault()
  event.stopPropagation()
  
  // If in edit mode and locked, a single click should open the preview
  // Double click will still trigger the unlock event separately
  isPreviewOpen.value = true
}

// Caption methods
const startEditingCaption = () => {
  if (props.isLocked) {
    emit('unlock')
    return
  }
  isEditingCaption.value = true
}

const finishEditingCaption = () => {
  isEditingCaption.value = false
  updateSubfigure({ caption: localCaption.value })
}

const cancelEditingCaption = () => {
  isEditingCaption.value = false
  localCaption.value = props.subfigure.caption || ''
}

const handleCaptionInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localCaption.value = target.value
}

// Update methods
const updateSubfigure = (data: Partial<SubfigureData>) => {
  emit('update:subfigure', {
    ...props.subfigure,
    ...data
  })
}

// File handling methods
const handleFileDrop = async (event: DragEvent) => {
  if (props.isLocked) {
    emit('unlock')
    return
  }
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    await handleFileUpload(file)
  }
}

const handleFileSelected = async (event: Event) => {
  if (props.isLocked) {
    emit('unlock')
    return
  }
  
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await handleFileUpload(file)
  }
}

const handleMultipleFilesSelected = async (files: File[]) => {
  if (props.isLocked) {
    emit('unlock')
    return
  }
  
  if (files.length === 0) return
  
  // If this subfigure doesn't have an image yet, use the first image for it
  if (!props.subfigure.src && files.length > 0) {
    await handleFileUpload(files[0])
    
    // If there are additional files, emit them to be added as new subfigures
    if (files.length > 1) {
      emit('add-multiple-subfigures', files.slice(1))
    }
  } else {
    // If this subfigure already has an image, emit all files to be added as new subfigures
    emit('add-multiple-subfigures', files)
  }
}

const handleFileUpload = async (file: File) => {
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      updateSubfigure({
        src: e.target?.result as string
      })
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error('Error uploading subfigure:', error)
  }
}

// Event handlers
const handleDoubleClick = (event: MouseEvent) => {
  if (props.isReadOnly) return

  event.preventDefault()
  event.stopPropagation()

  // Close the preview if it's open
  if (isPreviewOpen.value) {
    isPreviewOpen.value = false
  }

  // Unlock if locked
  if (props.isLocked) {
    emit('unlock')
  }
}
</script>

<style scoped>
.cursor-lock {
  cursor: not-allowed;
}
</style>