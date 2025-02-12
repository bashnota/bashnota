<template>
  <node-view-wrapper class="image-block">
    <div 
      class="image-container"
      :class="{
        'subfigure-container': attrs.isSubfigureContainer,
        [attrs.layout]: true,
        [attrs.alignment]: true
      }"
    >
      <template v-if="!attrs.isSubfigureContainer">
        <div class="single-image">
          <div class="image-controls" v-if="attrs.src && !isLocked">
            <div class="control-group">
              <Tooltip content="Image size">
                <Select v-model="localWidth" @update:modelValue="updateWidth">
                  <SelectTrigger class="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25%">Small</SelectItem>
                    <SelectItem value="50%">Medium</SelectItem>
                    <SelectItem value="75%">Large</SelectItem>
                    <SelectItem value="100%">Full</SelectItem>
                  </SelectContent>
                </Select>
              </Tooltip>

              <Tooltip content="Alignment">
                <Select v-model="localAlignment" @update:modelValue="updateAlignment">
                  <SelectTrigger class="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">
                      <AlignLeftIcon class="w-4 h-4 mr-2" />
                      Left
                    </SelectItem>
                    <SelectItem value="center">
                      <AlignCenterIcon class="w-4 h-4 mr-2" />
                      Center
                    </SelectItem>
                    <SelectItem value="right">
                      <AlignRightIcon class="w-4 h-4 mr-2" />
                      Right
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Tooltip>

              <Tooltip content="Object fit">
                <Select v-model="localObjectFit" @update:modelValue="updateObjectFit">
                  <SelectTrigger class="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="fill">Fill</SelectItem>
                    <SelectItem value="scale-down">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </Tooltip>
            </div>
            
            <Tooltip :content="isLocked ? 'Unlock editing' : 'Lock editing'">
              <Button
                variant="ghost"
                size="icon"
                @click="toggleLock"
                class="ml-auto"
              >
                <LockIcon v-if="isLocked" class="h-4 w-4" />
                <UnlockIcon v-else class="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>

          <div 
            class="image-wrapper" 
            :style="{ 
              width: attrs.width,
              objectFit: attrs.objectFit || 'contain'
            }"
          >
            <img 
              v-if="attrs.src" 
              :src="attrs.src"
              :style="{ objectFit: attrs.objectFit || 'contain' }"
              @dblclick="handleDoubleClick"
            />
            <UploadZone 
              v-else
              @file-selected="handleImageUpload"
              @file-dropped="handleDrop"
            />
          </div>

          <div v-if="attrs.src" class="caption-section">
            <Input
              v-model="localLabel"
              @blur="updateLabel"
              placeholder="Figure label (e.g., Figure 1)"
              class="label-input"
              :disabled="isLocked"
            />
            <Input
              v-model="localCaption"
              @blur="updateCaption"
              placeholder="Add caption..."
              class="caption-input"
              :disabled="isLocked"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="subfigures-controls" v-if="!isLocked">
          <div class="flex items-center gap-4">
            <Tooltip content="Layout">
              <div class="flex items-center gap-2 bg-muted p-1 rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2"
                  :class="{ 'bg-background': localLayout === 'horizontal' }"
                  @click="updateLayout('horizontal')"
                >
                  <FlipHorizontalIcon class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2"
                  :class="{ 'bg-background': localLayout === 'vertical' }"
                  @click="updateLayout('vertical')"
                >
                  <FlipVerticalIcon class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2"
                  :class="{ 'bg-background': localLayout === 'grid' }"
                  @click="updateLayout('grid')"
                >
                  <LayoutGridIcon class="w-4 h-4" />
                </Button>
              </div>
            </Tooltip>

            <Tooltip content="Unify subfigure sizes">
              <div class="flex items-center gap-2">
                <Switch
                  v-model="localUnifiedSize"
                  @update:modelValue="updateUnifiedSize"
                />
                <span class="text-sm text-muted-foreground">Uniform size</span>
              </div>
            </Tooltip>
          </div>

          <div class="flex items-center gap-2">
            <Button @click="addSubfigure" variant="outline" size="sm">
              <PlusIcon class="w-4 h-4 mr-2" />
              Add Subfigure
            </Button>

            <Tooltip :content="isLocked ? 'Unlock editing' : 'Lock editing'">
              <Button
                variant="ghost"
                size="icon"
                @click="toggleLock"
              >
                <LockIcon v-if="isLocked" class="h-4 w-4" />
                <UnlockIcon v-else class="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>

        <div 
          class="subfigures-grid" 
          :class="[attrs.layout, { 'unified-size': attrs.unifiedSize }]"
        >
          <div 
            v-for="(subfig, index) in attrs.subfigures" 
            :key="index" 
            class="subfigure"
          >
            <div class="subfigure-content relative group">
              <img 
                v-if="subfig.src" 
                :src="subfig.src"
                :style="{ objectFit: attrs.objectFit || 'contain' }"
                @dblclick="handleDoubleClick"
                class="cursor-zoom-in transition-transform hover:scale-[1.02] rounded-md"
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

              <div class="subfigure-caption mt-2">
                <Input
                  v-if="subfig.src"
                  v-model="subfig.caption"
                  @blur="updateSubfigureCaption(index)"
                  :placeholder="getSubfigureLabel(index)"
                  class="caption-input text-sm"
                  :disabled="isLocked"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="main-caption-section mt-4">
          <Input
            v-model="localLabel"
            @blur="updateLabel"
            placeholder="Figure label (e.g., Figure 1)"
            class="label-input font-medium"
            :disabled="isLocked"
          />
          <Input
            v-model="localCaption"
            @blur="updateCaption"
            placeholder="Add main figure caption..."
            class="main-caption-input"
            :disabled="isLocked"
          />
        </div>
      </template>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
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
  UnlockIcon
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import UploadZone from './UploadZone.vue'
import ImageModal from './ImageModal.vue'
import type { ImageFit } from '../../extensions/types'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
}>()

const attrs = computed(() => props.node.attrs)
const localCaption = ref(props.node.attrs.caption || '')
const localLabel = ref(props.node.attrs.label || '')
const localLayout = ref(props.node.attrs.layout || 'horizontal')
const localWidth = ref(props.node.attrs.width || '100%')
const localAlignment = ref(props.node.attrs.alignment || 'center')
const localObjectFit = ref<ImageFit>(props.node.attrs.objectFit || 'contain')
const localUnifiedSize = ref(props.node.attrs.unifiedSize || false)
const isLocked = ref(props.node.attrs.isLocked || false)

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
        src: e.target?.result
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

// Update methods
const updateCaption = () => {
  props.updateAttributes({
    caption: localCaption.value
  })
}

const updateLabel = () => {
  props.updateAttributes({
    label: localLabel.value
  })
}

const updateLayout = (layout: string) => {
  localLayout.value = layout
  props.updateAttributes({
    layout: layout
  })
}

const updateWidth = () => {
  props.updateAttributes({
    width: localWidth.value
  })
}

const updateAlignment = () => {
  props.updateAttributes({
    alignment: localAlignment.value
  })
}

const updateObjectFit = () => {
  props.updateAttributes({
    objectFit: localObjectFit.value
  })
}

const updateUnifiedSize = () => {
  props.updateAttributes({
    unifiedSize: localUnifiedSize.value
  })
}

const toggleLock = () => {
  isLocked.value = !isLocked.value
  props.updateAttributes({
    isLocked: isLocked.value
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
    isSubfigureContainer: true
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
        src: e.target?.result as string
      }
      props.updateAttributes({ 
        subfigures,
        isSubfigureContainer: true
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

const updateSubfigureCaption = (index: number) => {
  const subfigures = [...(attrs.value.subfigures || [])]
  props.updateAttributes({ 
    subfigures,
    isSubfigureContainer: true
  })
}

const getSubfigureLabel = (index: number) => {
  return `${attrs.value.label || 'Figure X'}${String.fromCharCode(97 + index)}`
}

// Add a watcher for subfigures to ensure they're properly synced
watch(() => props.node.attrs.subfigures, (newSubfigures) => {
  if (newSubfigures) {
    props.updateAttributes({
      subfigures: newSubfigures.map((subfig: SubFigure) => ({
        ...subfig,
        src: subfig.src || '',
        caption: subfig.caption || '',
        label: subfig.label || '',
        alt: subfig.alt || '',
        title: subfig.title || ''
      }))
    })
  }
}, { deep: true })

// Initialize subfigures if they exist
onMounted(() => {
  if (props.node.attrs.isSubfigureContainer && !props.node.attrs.subfigures) {
    props.updateAttributes({
      subfigures: []
    })
  }
})

// Add keyboard shortcut handler
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    // Close modal if open
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  
  if (isLocked.value) {
    isLocked.value = false
    props.updateAttributes({
      isLocked: false
    })
  }
}
</script>

<style scoped>
.image-block {
  margin: 1em 0;
}

.image-container {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.image-container.left {
  align-items: flex-start;
}

.image-container.center {
  align-items: center;
}

.image-container.right {
  align-items: flex-end;
}

.image-controls {
  display: flex;
  gap: 1em;
  margin-bottom: 0.5em;
  justify-content: space-between;
}

.control-group {
  display: flex;
  gap: 0.5em;
  align-items: center;
}

.size-control,
.alignment-control {
  padding: 0.25em 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.image-wrapper {
  position: relative;
}

.image-wrapper img {
  max-width: 100%;
  height: auto;
  transition: transform 0.2s ease-in-out;
  user-select: none;
}

.image-wrapper img:hover {
  transform: scale(1.02);
}

.subfigure-container {
  border: 1px solid #ddd;
  padding: 1em;
  border-radius: 4px;
}

.subfigures-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  margin-bottom: 1em;
  padding: 0.5em;
  border-bottom: 1px solid var(--border);
}

.subfigures-grid {
  display: grid;
  gap: 1.5em;
}

.subfigures-grid.horizontal {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.subfigures-grid.vertical {
  grid-template-columns: 1fr;
}

.subfigures-grid.grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.subfigure-content {
  background: var(--muted);
  padding: 0.5em;
  border-radius: 0.5em;
  overflow: hidden;
}

.subfigure-caption {
  margin-top: 0.5em;
}

.caption-section,
.main-caption-section,
.subfigure-caption {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  width: 100%;
}

.label-input,
.caption-input,
.main-caption-input {
  width: 100%;
  padding: 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.label-input {
  font-weight: 600;
  margin-bottom: 0.5em;
}

.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1em;
  padding: 2em;
  border: 2px dashed #ddd;
  border-radius: 4px;
  background: #f8f8f8;
  transition: background-color 0.2s;
}

.upload-zone:hover {
  background: #f0f0f0;
}

.hidden {
  display: none;
}

.upload-zone.drag-over {
  background-color: #e0e0e0;
  border-color: #666;
}

.unified-size img {
  width: 100%;
  height: 200px;
  object-fit: var(--object-fit, contain);
}

input:disabled,
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.caption-input {
  background: transparent;
  border: 1px solid transparent;
}

.caption-input:hover:not(:disabled),
.caption-input:focus:not(:disabled) {
  border-color: var(--border);
  background: var(--background);
}
</style> 