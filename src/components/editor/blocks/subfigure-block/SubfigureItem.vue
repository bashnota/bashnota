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
      />
      <UploadZone
        v-else-if="!isReadOnly"
        @file-selected="handleFileSelected"
        @file-dropped="handleFileDrop"
        class="rounded-md"
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

      <div v-if="subfigure.src" class="mt-2">
        <!-- Read-only subfigure caption -->
        <div v-if="isReadOnly" class="text-sm px-2 py-1">
          {{ subfigure.caption || defaultLabel }}
        </div>

        <!-- Editable subfigure caption -->
        <div
          v-else-if="!isEditingCaption"
          class="text-sm hover:bg-muted/50 rounded px-2 py-1 cursor-text"
          @click="startEditingCaption"
        >
          {{ subfigure.caption || defaultLabel }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { TrashIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import UploadZone from '@/components/UploadZone.vue'

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
}>()

const emit = defineEmits<{
  'update:subfigure': [value: SubfigureData]
  'remove': []
  'unlock': []
}>()

// Local state
const localCaption = ref(props.subfigure.caption || '')
const isEditingCaption = ref(false)

// Computed properties
const imageStyle = computed(() => ({
  objectFit: props.objectFit || 'contain' as ObjectFitType
}))

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

// Caption methods
const startEditingCaption = () => {
  if (props.isLocked) return
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
  const file = event.dataTransfer?.files[0]
  if (file) {
    await handleFileUpload(file)
  }
}

const handleFileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await handleFileUpload(file)
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

  if (props.isLocked) {
    emit('unlock')
  }
}
</script> 