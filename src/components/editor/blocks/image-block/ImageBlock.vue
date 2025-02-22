<template>
  <node-view-wrapper class="my-4 w-full">
    <div class="flex flex-col gap-4 w-full">
      <div
        class="flex flex-col gap-2 w-full"
        :class="{
          'items-start': attrs.alignment === 'left',
          'items-center': attrs.alignment === 'center',
          'items-end': attrs.alignment === 'right',
        }"
      >
        <!-- Controls -->
        <div
          v-if="attrs.src && !isLocked"
          class="flex items-center gap-1 mb-2 p-0.5 bg-muted/50 rounded-md w-fit"
        >
          <!-- Width controls -->
          <Button
            v-for="size in ['25%', '50%', '75%', '100%']"
            :key="size"
            variant="ghost"
            size="sm"
            class="px-2 h-8"
            :class="{ 'bg-background': localWidth === size }"
            @click="updateWidth(size)"
          >
            <ImageIcon v-if="size === '25%'" class="w-3 h-3" />
            <ImageIcon v-if="size === '50%'" class="w-4 h-4" />
            <ImageIcon v-if="size === '75%'" class="w-5 h-5" />
            <ImageIcon v-if="size === '100%'" class="w-6 h-6" />
          </Button>

          <Separator orientation="vertical" class="mx-0.5 h-6" />

          <!-- Alignment controls -->
          <Button
            v-for="align in ['left', 'center', 'right']"
            :key="align"
            variant="ghost"
            size="sm"
            class="px-2 h-8"
            :class="{ 'bg-background': localAlignment === align }"
            @click="updateAlignment(align)"
          >
            <component :is="alignmentIcons[align]" class="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" class="mx-0.5 h-6" />

          <!-- Lock control -->
          <Button variant="ghost" size="sm" class="px-2 h-8" @click="toggleLock">
            <LockIcon v-if="isLocked" class="h-4 w-4" />
            <UnlockIcon v-else class="h-4 w-4" />
          </Button>
        </div>

        <!-- Image container -->
        <div class="relative" :style="{ width: attrs.width }">
          <img
            v-if="attrs.src"
            :src="attrs.src"
            :style="{ objectFit: attrs.objectFit || 'contain' }"
            class="w-full h-auto rounded-md"
            @dblclick="handleDoubleClick"
          />
          <UploadZone v-else @file-selected="handleImageUpload" @file-dropped="handleDrop" />
        </div>

        <!-- Caption and label -->
        <div v-if="attrs.src" class="flex flex-col gap-1 w-full mt-2">
          <div
            v-if="!isEditingLabel"
            class="font-medium text-base hover:bg-muted/50 rounded px-2 py-1 cursor-text"
            @click="isEditingLabel = true"
          >
            {{ localLabel || 'Click to add figure label' }}
          </div>
          <Input
            v-else
            v-model="localLabel"
            @blur="handleLabelBlur"
            @keyup.enter="handleLabelBlur"
            placeholder="Figure label (e.g., Figure 1)"
            class="font-medium"
            :disabled="isLocked"
            autofocus
          />

          <div
            v-if="!isEditingCaption"
            class="text-sm text-muted-foreground hover:bg-muted/50 rounded px-2 py-1 cursor-text"
            @click="isEditingCaption = true"
          >
            {{ localCaption || 'Click to add caption' }}
          </div>
          <Input
            v-else
            v-model="localCaption"
            @blur="handleCaptionBlur"
            @keyup.enter="handleCaptionBlur"
            placeholder="Add caption..."
            class="text-sm"
            :disabled="isLocked"
            autofocus
          />
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, onMounted, watch, onUnmounted, type FunctionalComponent } from 'vue'
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  LockIcon,
  UnlockIcon,
  ImageIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import UploadZone from '@/components/UploadZone.vue'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
}>()

// Reactive state
const attrs = computed(() => props.node.attrs)
const localCaption = ref(props.node.attrs.caption || '')
const localLabel = ref(props.node.attrs.label || '')
const localWidth = ref(props.node.attrs.width || '100%')
const localAlignment = ref(props.node.attrs.alignment || 'center')
const isLocked = ref(props.node.attrs.isLocked || false)
const isEditingLabel = ref(false)
const isEditingCaption = ref(false)

// UI helpers
const alignmentIcons: Record<string, FunctionalComponent> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
}

// File handling methods
const handleDrop = async (event: DragEvent) => {
  const file = event.dataTransfer?.files[0]
  if (file) {
    await handleFileUpload(file)
  }
}

const handleFileUpload = async (file: File) => {
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      props.updateAttributes({
        src: e.target?.result,
      })
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error('Error uploading image:', error)
  }
}

const handleImageUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await handleFileUpload(file)
  }
}

// Caption and label methods
const handleLabelBlur = () => {
  isEditingLabel.value = false
  props.updateAttributes({
    label: localLabel.value,
  })
}

const handleCaptionBlur = () => {
  isEditingCaption.value = false
  props.updateAttributes({
    caption: localCaption.value,
  })
}

// Update methods
const updateWidth = (width: string) => {
  localWidth.value = width
  props.updateAttributes({
    width,
  })
}

const updateAlignment = (alignment: string) => {
  localAlignment.value = alignment
  props.updateAttributes({
    alignment,
  })
}

const toggleLock = () => {
  isLocked.value = !isLocked.value
  props.updateAttributes({
    isLocked: isLocked.value,
  })
}

// Event handlers
const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()

  if (isLocked.value) {
    isLocked.value = false
    props.updateAttributes({
      isLocked: false,
    })
  }
}

// Watch for external changes
watch(
  () => props.node.attrs,
  (newAttrs) => {
    if (newAttrs.caption !== localCaption.value) {
      localCaption.value = newAttrs.caption || ''
    }
    if (newAttrs.label !== localLabel.value) {
      localLabel.value = newAttrs.label || ''
    }
    if (newAttrs.width !== localWidth.value) {
      localWidth.value = newAttrs.width || '100%'
    }
    if (newAttrs.alignment !== localAlignment.value) {
      localAlignment.value = newAttrs.alignment || 'center'
    }
    if (newAttrs.isLocked !== isLocked.value) {
      isLocked.value = newAttrs.isLocked || false
    }
  },
  { deep: true },
)

// Keyboard handling
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isEditingLabel.value = false
    isEditingCaption.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
