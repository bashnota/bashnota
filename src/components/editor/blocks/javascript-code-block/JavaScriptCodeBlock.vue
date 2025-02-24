<script setup lang="ts">
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import CodeMirror from '../executable-code-block/CodeMirror.vue'
import { Button } from '@/components/ui/button'
import { Play, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-vue-next'

const props = defineProps<{
    node: any
    updateAttributes: (attrs: any) => void
    editor: any
    getPos: () => number | undefined
}>()

const isExecuting = ref(false)
const isCodeVisible = ref(true)
const isCopied = ref(false)
const output = ref(props.node.attrs.output)

const code = computed(() => props.node.textContent || '')

const updateCode = (newCode: string) => {
    const pos = props.getPos()
    if (typeof pos !== 'number') return

    const transaction = props.editor.state.tr
        .deleteRange(pos + 1, pos + props.node.nodeSize - 1)
        .insertText(newCode, pos + 1)

    props.editor.view.dispatch(transaction)
}

const handleExecution = async () => {
    isExecuting.value = true
    try {
        // Create a new Function to execute the code in a sandboxed environment
        const sandboxedFunction = new Function(`
      try {
        ${code.value}
      } catch (error) {
        return { error: error.message }
      }
    `)

        // Capture console.log output
        const logs: string[] = []
        const originalConsoleLog = console.log
        console.log = (...args) => {
            logs.push(args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '))
        }

        // Execute the code
        const result = sandboxedFunction()
        console.log = originalConsoleLog

        // Handle the output
        if (result?.error) {
            output.value = `Error: ${result.error}`
        } else {
            output.value = logs.join('\n')
        }

        props.updateAttributes({ output: output.value })
    } catch (error) {
        output.value = `Error: ${error instanceof Error ? error.message : String(error)}`
        props.updateAttributes({ output: output.value })
    } finally {
        isExecuting.value = false
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

                <Button variant="default" size="sm" :disabled="isExecuting" @click="handleExecution" class="h-8">
                    <Loader2 v-if="isExecuting" class="w-4 h-4 animate-spin mr-2" />
                    <Play v-else class="w-4 h-4 mr-2" />
                    Run
                </Button>
            </div>

            <!-- Code Editor -->
            <div v-show="isCodeVisible">
                <CodeMirror v-model="code" :language="'javascript'" :disabled="isExecuting"
                    @update:modelValue="updateCode" />
            </div>

            <!-- Output -->
            <div v-if="output" class="border-t">
                <div class="flex items-center p-2 border-b">
                    <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Output
                    </span>
                </div>
                <div class="text-sm whitespace-pre-wrap break-words p-4"
                    :class="{ 'text-destructive': output.startsWith('Error:') }" v-text="output" />
            </div>
        </div>
    </node-view-wrapper>
</template>