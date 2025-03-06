<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, X, Play, Loader2, Save } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'
import { useEventListener } from '@vueuse/core'

const props = defineProps<{
    code: string
    output: string | null | undefined
    isOpen: boolean
    language: string
    onClose: () => void
    onUpdate: (code: string) => void
    onExecute: () => Promise<void>
    isExecuting?: boolean
}>()

const emit = defineEmits(['update:isOpen'])
const localCode = ref(props.code)
const resizing = ref(false)
const splitPosition = ref(50) // Default split at 50%
const startX = ref(0)

// Watch for external code changes
watch(() => props.code, (newCode) => {
    localCode.value = newCode
})

// Update code and notify parent
const updateCode = (newCode: string) => {
    localCode.value = newCode
    props.onUpdate(newCode)
}

// Helper function to detect Mac OS
const isMac = () => {
    return typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
}

// Handle keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return
    
    // Escape key to close
    if (e.key === 'Escape' && !props.isExecuting) {
        props.onClose()
    }
    
    // Ctrl+Shift+Alt+Enter to run code
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key === 'Enter' && !props.isExecuting) {
        e.preventDefault()
        props.onExecute()
    }
}

// Start resizing panels
const startResize = (e: MouseEvent) => {
    resizing.value = true
    startX.value = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
}

// Handle resize movement
const handleResize = (e: MouseEvent) => {
    if (!resizing.value) return
    
    const containerWidth = document.querySelector('.editor-container')?.clientWidth || 0
    const deltaX = e.clientX - startX.value
    const newPosition = (splitPosition.value * containerWidth / 100 + deltaX) / containerWidth * 100
    
    // Limit the resize range (10% to 90%)
    splitPosition.value = Math.min(Math.max(newPosition, 10), 90)
    startX.value = e.clientX
}

// End resizing
const endResize = () => {
    resizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
}

// Setup event listeners
onMounted(() => {
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', endResize)
    document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', endResize)
    document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
    <div v-if="isOpen" 
         class="fixed inset-0 z-50 bg-background flex flex-col"
         role="dialog"
         aria-modal="true"
         aria-label="Code Editor">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-lg font-semibold">Code Editor <span class="text-xs ml-2 text-muted-foreground">{{ language }}</span></h2>
            <div class="flex items-center gap-2">
                <div class="text-xs text-muted-foreground mr-2">
                    <kbd class="px-1.5 py-0.5 border rounded">{{ isMac() ? '⌘' : 'Ctrl' }}+Shift+Alt+Enter</kbd> to run
                </div>
                <Button variant="default" size="sm" :disabled="isExecuting" @click="onExecute" class="h-8" aria-label="Run code">
                    <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="isExecuting" />
                    <Play class="w-4 h-4 mr-2" v-else />
                    Run
                </Button>
                <Button variant="ghost" size="icon" @click="onClose" aria-label="Close editor">
                    <X class="h-4 w-4" />
                    <span class="sr-only">Close</span>
                </Button>
            </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 overflow-hidden editor-container">
            <!-- Code Editor -->
            <div class="h-full overflow-hidden" :style="{ width: `${splitPosition}%` }">
                <CodeMirror 
                    v-model="localCode" 
                    :language="language" 
                    @update:modelValue="updateCode" 
                    :fullScreen="true"
                    aria-label="Code editor" 
                />
            </div>

            <!-- Resize handle -->
            <div 
                class="w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
                @mousedown="startResize"
                aria-hidden="true"
            ></div>

            <!-- Output -->
            <div class="flex flex-col h-full" :style="{ width: `${100 - splitPosition}%` }">
                <div class="p-2 border-b bg-muted/30">
                    <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Output
                    </span>
                </div>
                <div 
                    v-if="output" 
                    class="flex-1 overflow-auto p-4 text-sm whitespace-pre-wrap break-words"
                    v-html="output"
                    aria-live="polite"
                    role="status"
                />
                <div v-else class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    No output to display
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Ensure the CodeMirror component takes full height */
:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  height: 100% !important;
}

:deep(.cm-gutters) {
  height: auto !important;
  min-height: 100% !important;
}

/* Add transition for smooth resizing */
.editor-container > div {
  transition: width 0.05s ease;
}

/* When actively resizing, disable transitions for better performance */
.editor-container:has(+ .resizing) > div {
  transition: none;
}
</style>