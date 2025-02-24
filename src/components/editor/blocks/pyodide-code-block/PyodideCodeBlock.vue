<script setup lang="ts">
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import CodeMirror from '../executable-code-block/CodeMirror.vue'
import { Button } from '@/components/ui/button'
import { Play, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-vue-next'
import { usePyodide } from '@/composables/usePyodide'

const props = defineProps<{
    node: any
    updateAttributes: (attrs: any) => void
    editor: any
    getPos: () => number | undefined
}>()

const { execute, isLoading, initializePyodide } = usePyodide()
const isCodeVisible = ref(true)
const isCopied = ref(false)
const localOutput = ref(props.node.attrs.output)

// Use computed for read-only values
const code = computed(() => props.node.textContent || '')

// Initialize Pyodide when component is mounted
initializePyodide()

const updateCode = (newCode: string) => {
    const pos = props.getPos()
    if (typeof pos !== 'number') return

    const transaction = props.editor.state.tr
        .deleteRange(pos + 1, pos + props.node.nodeSize - 1)
        .insertText(newCode, pos + 1)

    props.editor.view.dispatch(transaction)
}

const handleExecution = async () => {
    try {
        const result = await execute(code.value)
        // Update both local ref and node attributes
        localOutput.value = result
        props.updateAttributes({ output: result })
    } catch (error) {
        const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`
        localOutput.value = errorMessage
        props.updateAttributes({ output: errorMessage })
    }
}

const copyCode = async () => {
    await navigator.clipboard.writeText(code.value)
    isCopied.value = true
    setTimeout(() => {
        isCopied.value = false
    }, 2000)
}
</script>

<template>
    <node-view-wrapper class="my-6">
        <div class="border rounded-md overflow-hidden">
            <!-- Controls -->
            <div class="flex items-center gap-2 p-2 bg-muted/50 border-b">
                <Button variant="outline" size="sm" class="gap-2 h-8" @click="isCodeVisible = !isCodeVisible"
                    :title="isCodeVisible ? 'Hide Code' : 'Show Code'">
                    <Eye v-if="isCodeVisible" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                </Button>

                <div class="flex-1"></div>

                <Button variant="ghost" size="sm" @click="copyCode" class="h-8 w-8 p-0">
                    <Copy v-if="!isCopied" class="h-4 w-4" />
                    <Check v-else class="h-4 w-4" />
                </Button>

                <Button variant="default" size="sm" :disabled="isLoading" @click="handleExecution" class="h-8">
                    <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
                    <Play v-else class="w-4 h-4 mr-2" />
                    Run
                </Button>
            </div>

            <!-- Code Editor -->
            <div v-show="isCodeVisible">
                <CodeMirror v-model="code" :language="'python'" :disabled="isLoading" @update:modelValue="updateCode" />
            </div>

            <!-- Output -->
            <div v-if="localOutput" class="border-t">
                <div class="flex items-center p-2 border-b">
                    <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Output
                    </span>
                </div>
                <div class="text-sm whitespace-pre-wrap break-words p-4" v-text="localOutput" />
            </div>
        </div>
    </node-view-wrapper>
</template>