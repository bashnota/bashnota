<template>
  <node-view-wrapper class="my-4 w-full">
    <div class="flex flex-col gap-4 w-full">
      <template v-if="!attrs.isSubfigureContainer">
        <div
          class="flex flex-col gap-2 w-full"
          :class="{
            'items-start': attrs.alignment === 'left',
            'items-center': attrs.alignment === 'center',
            'items-end': attrs.alignment === 'right',
          }"
        >
          <div
            v-if="attrs.src && !isLocked"
            class="flex items-center gap-1 mb-2 p-0.5 bg-muted/50 rounded-md w-fit"
          >
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

            <Button variant="ghost" size="sm" class="px-2 h-8" @click="toggleLock">
              <LockIcon v-if="isLocked" class="h-4 w-4" />
              <UnlockIcon v-else class="h-4 w-4" />
            </Button>
          </div>

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
              :value="localLabel"
              @input="localLabel = $event.target.value"
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
              :value="localCaption"
              @input="localCaption = $event.target.value"
              @blur="handleCaptionBlur"
              @keyup.enter="handleCaptionBlur"
              placeholder="Add caption..."
              class="text-sm"
              :disabled="isLocked"
              autofocus
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="!isLocked" class="flex items-center justify-between w-full p-2 border-b">
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
      </template>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, onMounted, watch, onUnmounted, type FunctionalComponent } from 'vue'
import type { SubFigure } from '../../extensions/ImageExtension'
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  LayoutGridIcon,
  PlusIcon,
  TrashIcon,
  LockIcon,
  UnlockIcon,
  ImageIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
const localWidth = ref(props.node.attrs.width || '100%')
const localAlignment = ref(props.node.attrs.alignment || 'center')
const localUnifiedSize = ref(props.node.attrs.unifiedSize || false)
const isLocked = ref(props.node.attrs.isLocked || false)
const isEditingLabel = ref(false)
const isEditingCaption = ref(false)
const isEditingSubfigureCaption = ref<Record<number, boolean>>({})

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
  props.updateAttributes({
    layout,
  })
}

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
    alt: '',
    title: '',
    label: '',
  })
  props.updateAttributes({
    subfigures,
    isSubfigureContainer: true,
  })
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
      props.updateAttributes({
        subfigures,
        isSubfigureContainer: true,
      })
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

// New subfigure caption methods
const startEditingSubfigureCaption = (index: number) => {
  isEditingSubfigureCaption.value[index] = true
}

const handleSubfigureCaptionBlur = (index: number) => {
  isEditingSubfigureCaption.value[index] = false
  updateSubfigureCaption()
}

const updateSubfigureCaption = () => {
  const subfigures = [...(attrs.value.subfigures || [])]
  props.updateAttributes({
    subfigures,
    isSubfigureContainer: true,
  })
}

const getSubfigureLabel = (index: number) => {
  return `${attrs.value.label || 'Figure X'}${String.fromCharCode(97 + index)}`
}

// Watchers
watch(
  () => props.node.attrs.subfigures,
  (newSubfigures) => {
    if (newSubfigures) {
      props.updateAttributes({
        subfigures: newSubfigures.map((subfig: SubFigure) => ({
          ...subfig,
          src: subfig.src || '',
          caption: subfig.caption || '',
          label: subfig.label || '',
        })),
      })
    }
  },
  { deep: true },
)

// Lifecycle hooks
onMounted(() => {
  if (props.node.attrs.isSubfigureContainer && !props.node.attrs.subfigures) {
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
    // Reset all subfigure caption editing states
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
