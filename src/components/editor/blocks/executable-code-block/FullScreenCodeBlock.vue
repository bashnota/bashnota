<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, X, Play, Loader2 } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'

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

watch(() => props.code, (newCode) => {
    localCode.value = newCode
})

const updateCode = (newCode: string) => {
    localCode.value = newCode
    props.onUpdate(newCode)
}
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 bg-background flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-lg font-semibold">Code Editor</h2>
            <div class="flex items-center gap-2">
                <Button variant="default" size="sm" :disabled="isExecuting" @click="onExecute" class="h-8">
                    <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="isExecuting" />
                    <Play class="w-4 h-4 mr-2" v-else />
                    Run
                </Button>
                <Button variant="ghost" size="icon" @click="onClose">
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 overflow-hidden">
            <!-- Code Editor -->
            <div class="flex-1 h-full border-r overflow-hidden">
                <CodeMirror v-model="localCode" :language="language" @update:modelValue="updateCode" :fullScreen="true" />
            </div>

            <!-- Output -->
            <div class="w-1/2 flex flex-col h-full">
                <div class="p-2 border-b">
                    <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Output
                    </span>
                </div>
                <div v-if="output" class="flex-1 overflow-auto p-4 text-sm whitespace-pre-wrap break-words"
                    v-html="output" />
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
</style>