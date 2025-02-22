<template>
  <node-view-wrapper class="my-4 w-full">
    <div class="flex flex-col gap-4 w-full">
      <div class="flex items-center justify-between w-full p-2 border-b">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1 bg-muted p-1 rounded-md">
            <Button
              v-for="layout in ['horizontal', 'vertical', 'grid']"
              :key="layout"
              variant="ghost"
              size="sm"
              class="h-8 px-2"
              :class="{ 'bg-background': localLayout === layout }"
              @click="updateLayout(layout)"
            >
              <FlipHorizontalIcon v-if="layout === 'horizontal'" class="w-4 h-4" />
              <FlipVerticalIcon v-if="layout === 'vertical'" class="w-4 h-4" />
              <LayoutGridIcon v-if="layout === 'grid'" class="w-4 h-4" />
            </Button>
          </div>

          <div class="flex items-center gap-2">
            <Switch v-model="localUnifiedSize" @update:modelValue="updateUnifiedSize" />
            <span class="text-sm text-muted-foreground">Uniform size</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button @click="addSubfigure" variant="outline" size="sm">
            <PlusIcon class="w-4 h-4 mr-2" />
            Add Subfigure
          </Button>

          <Button variant="ghost" size="icon" @click="toggleLock">
            <LockIcon v-if="isLocked" class="h-4 w-4" />
            <UnlockIcon v-else class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        class="grid gap-6"
        :class="{
          'grid-cols-1': attrs.layout === 'vertical',
          'grid-cols-2 md:grid-cols-3': attrs.layout === 'grid',
          'grid-cols-1 md:grid-cols-2': attrs.layout === 'horizontal',
        }"
      >
        <div v-for="(subfig, index) in attrs.subfigures" :key="index" class="relative group">
          <div class="relative bg-muted p-2 rounded-lg overflow-hidden">
            <img
              v-if="subfig.src"
              :src="subfig.src"
              :style="{ objectFit: attrs.objectFit || 'contain' }"
              :class="[
                'w-full rounded-md transition-transform hover:scale-102 cursor-zoom-in',
                { 'h-48': attrs.unifiedSize },
              ]"
              @dblclick="handleDoubleClick"
            />
            <UploadZone
              v-else
              @file-selected="(e) => handleSubfigureUpload(e, index)"
              @file-dropped="(e) => handleSubfigureDrop(e, index)"
              class="rounded-md"
            />

            <Button
              v-if="!isLocked && subfig.src"
              @click="removeSubfigure(index)"
              variant="destructive"
              size="icon"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <TrashIcon class="w-4 h-4" />
            </Button>

            <div v-if="subfig.src" class="mt-2">
              <div
                v-if="!isEditingSubfigureCaption[index]"
                class="text-sm hover:bg-muted/50 rounded px-2 py-1 cursor-text"
                @click="startEditingSubfigureCaption(index)"
              >
                {{ subfig.caption || getSubfigureLabel(index) }}
              </div>
              <Input
                v-else
                :value="subfig.caption"
                @input="
                  (e: any) => {
                    const subfigures = [...attrs.subfigures]
                    subfigures[index].caption = e.target.value
                    props.updateAttributes({ subfigures })
                  }
                "
                @blur="handleSubfigureCaptionBlur(index)"
                @keyup.enter="handleSubfigureCaptionBlur(index)"
                :placeholder="getSubfigureLabel(index)"
                class="text-sm bg-transparent hover:bg-background focus:bg-background transition-colors"
                :disabled="isLocked"
                autofocus
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 w-full mt-4">
        <div
          v-if="!isEditingLabel"
          class="font-medium text-base hover:bg-muted/50 rounded px-2 py-1 cursor-text"
          @click="isEditingLabel = true"
        >
          {{ localLabel || 'Click to add figure label' }}
        </div>
        <Input
          v-else
          :value="localLabel"
          @input="localLabel = $event.target.value"
          @blur="handleLabelBlur"
          @keyup.enter="handleLabelBlur"
          placeholder="Figure label (e.g., Figure 1)"
          class="font-medium"
          :disabled="isLocked"
        />

        <div
          v-if="!isEditingCaption"
          class="text-sm text-muted-foreground hover:bg-muted/50 rounded px-2 py-1 cursor-text"
          @click="isEditingCaption = true"
        >
          {{ localCaption || 'Click to add main caption' }}
        </div>
        <Input
          v-else
          :value="localCaption"
          @input="localCaption = $event.target.value"
          @blur="handleCaptionBlur"
          @keyup.enter="handleCaptionBlur"
          placeholder="Add main caption..."
          class="text-sm"
          :disabled="isLocked"
        />
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import {
  FlipHorizontalIcon,
  FlipVerticalIcon,
  LayoutGridIcon,
  PlusIcon,
  TrashIcon,
  LockIcon,
  UnlockIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import UploadZone from './UploadZone.vue'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
}>()

// Reactive state
const attrs = computed(() => props.node.attrs)
const localCaption = ref(props.node.attrs.caption || '')
const localLabel = ref(props.node.attrs.label || '')
const localLayout = ref(props.node.attrs.layout || 'horizontal')
const localUnifiedSize = ref(props.node.attrs.unifiedSize || false)
const isLocked = ref(props.node.attrs.isLocked || false)
const isEditingLabel = ref(false)
const isEditingCaption = ref(false)
const isEditingSubfigureCaption = ref<Record<number, boolean>>({})

// Caption handling methods
const handleLabelBlur = () => {
  isEditingLabel.value = false
  updateLabel()
}

const handleCaptionBlur = () => {
  isEditingCaption.value = false
  updateCaption()
}

// Update methods
const updateCaption = () => {
  props.updateAttributes({
    caption: localCaption.value,
  })
}

const updateLabel = () => {
  props.updateAttributes({
    label: localLabel.value,
  })
}

const updateLayout = (layout: string) => {
  localLayout.value = layout
  props.updateAttributes({ layout })
}

const updateUnifiedSize = () => {
  props.updateAttributes({
    unifiedSize: localUnifiedSize.value,
  })
}

const toggleLock = () => {
  isLocked.value = !isLocked.value
  props.updateAttributes({
    isLocked: isLocked.value,
  })
}

// Subfigure methods
const addSubfigure = () => {
  const subfigures = [...(attrs.value.subfigures || [])]
  subfigures.push({
    src: '',
    caption: '',
  })
  props.updateAttributes({ subfigures })
}

const removeSubfigure = (index: number) => {
  const subfigures = [...(attrs.value.subfigures || [])]
  subfigures.splice(index, 1)
  props.updateAttributes({ subfigures })
}

const handleSubfigureDrop = async (event: DragEvent, index: number) => {
  const file = event.dataTransfer?.files[0]
  if (file) {
    await handleSubfigureFileUpload(file, index)
  }
}

const handleSubfigureFileUpload = async (file: File, index: number) => {
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      const subfigures = [...(attrs.value.subfigures || [])]
      subfigures[index] = {
        ...subfigures[index],
        src: e.target?.result as string,
      }
      props.updateAttributes({ subfigures })
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error('Error uploading subfigure:', error)
  }
}

const handleSubfigureUpload = async (event: Event, index: number) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await handleSubfigureFileUpload(file, index)
  }
}

// Subfigure caption methods
const startEditingSubfigureCaption = (index: number) => {
  isEditingSubfigureCaption.value[index] = true
}

const handleSubfigureCaptionBlur = (index: number) => {
  isEditingSubfigureCaption.value[index] = false
}

const getSubfigureLabel = (index: number) => {
  return `${attrs.value.label || 'Figure X'}${String.fromCharCode(97 + index)}`
}

// Watchers
watch(
  () => props.node.attrs,
  (newAttrs) => {
    if (newAttrs.caption !== localCaption.value) {
      localCaption.value = newAttrs.caption || ''
    }
    if (newAttrs.label !== localLabel.value) {
      localLabel.value = newAttrs.label || ''
    }
    if (newAttrs.layout !== localLayout.value) {
      localLayout.value = newAttrs.layout || 'horizontal'
    }
    if (newAttrs.unifiedSize !== localUnifiedSize.value) {
      localUnifiedSize.value = newAttrs.unifiedSize || false
    }
    if (newAttrs.isLocked !== isLocked.value) {
      isLocked.value = newAttrs.isLocked || false
    }
  },
  { deep: true },
)

// Lifecycle hooks
onMounted(() => {
  if (!props.node.attrs.subfigures) {
    props.updateAttributes({
      subfigures: [],
    })
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Event handlers
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isEditingLabel.value = false
    isEditingCaption.value = false
    Object.keys(isEditingSubfigureCaption.value).forEach((index) => {
      isEditingSubfigureCaption.value[Number(index)] = false
    })
  }
}

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
</script>
