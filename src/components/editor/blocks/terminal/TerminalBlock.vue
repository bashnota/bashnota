<template>
    <node-view-wrapper class="terminal-block">
        <Card class="terminal-container">
            <CardHeader class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <Terminal class="h-4 w-4" />
                    <span class="text-sm font-medium">Terminal {{ node.attrs.name }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <Select v-model="selectedServerId" :disabled="isConnected">
                        <SelectTrigger class="w-[180px]">
                            <SelectValue placeholder="Select server" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Server</SelectItem>
                            <SelectItem v-for="server in availableServers" :key="server.displayName"
                                :value="server.displayName">
                                {{ server.displayName }}
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Button v-if="!isConnected" size="sm" variant="outline" :disabled="!selectedServer"
                        @click="connectTerminal">
                        Connect
                    </Button>
                    <Button v-else size="sm" variant="destructive" @click="disconnectTerminal">
                        Disconnect
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                <div class="relative">
                    <!-- Copy button -->
                    <Button v-if="output.length > 0" size="sm" variant="ghost" class="absolute top-2 right-2 z-10"
                        @click="copyOutput">
                        <Copy v-if="!isCopied" class="h-4 w-4" />
                        <Check v-else class="h-4 w-4" />
                        <span class="sr-only">Copy output</span>
                    </Button>

                    <div class="terminal-output" ref="outputRef">
                        <div v-for="(line, index) in output" :key="index" class="terminal-line">
                            {{ line }}
                        </div>
                    </div>
                </div>

                <div class="terminal-input">
                    <input v-model="command" @keyup.enter="sendCommand" :disabled="!isConnected"
                        placeholder="Enter command..." class="w-full bg-transparent border-none focus:outline-none" />
                </div>
            </CardContent>
        </Card>
    </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Terminal, Copy, Check } from 'lucide-vue-next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TerminalService } from '@/services/terminalService'
import { useNotaStore } from '@/stores/nota'
import { useRoute } from 'vue-router'
import type { JupyterServer } from '@/types/jupyter'

const props = defineProps<{
    node: any
    updateAttributes: (attrs: any) => void
}>()

const route = useRoute()
const notaStore = useNotaStore()
const terminalService = new TerminalService()

const command = ref('')
const output = ref<string[]>([])
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
const outputRef = ref<HTMLElement>()
const selectedServerId = ref<string>('none')
const isCopied = ref(false)

const rootNotaId = computed(() => {
    const currentNota = notaStore.getCurrentNota(route.params.id as string)
    if (!currentNota?.parentId) return route.params.id as string
    return notaStore.getRootNotaId(currentNota.parentId)
})

const notaConfig = computed(() => {
    const nota = notaStore.getCurrentNota(rootNotaId.value)
    if (!nota?.config) {
        return {
            jupyterServers: [],
        }
    }
    return nota.config
})

const availableServers = computed(() => {
    return notaConfig.value.jupyterServers.map((server) => ({
        ...server,
        displayName: `${server.ip}:${server.port}`,
    }))
})

const selectedServer = computed(() => {
    if (selectedServerId.value === 'none') return null
    return availableServers.value.find(s => s.displayName === selectedServerId.value)
})

const connectTerminal = async () => {
    if (!selectedServer.value) return

    try {
        const terminal = await terminalService.createTerminal(selectedServer.value)
        props.updateAttributes({
            terminalId: terminal.name,
            serverId: selectedServer.value.displayName
        })

        ws.value = terminalService.connectToTerminal(selectedServer.value, terminal.name)
        ws.value.onmessage = (event) => {
            output.value.push(event.data)
            scrollToBottom()
        }
        ws.value.onopen = () => {
            isConnected.value = true
            output.value.push('Connected to terminal')
        }
        ws.value.onclose = () => {
            isConnected.value = false
            output.value.push('Disconnected from terminal')
        }
    } catch (error: any) {
        console.error('Failed to connect to terminal:', error)
        output.value.push(`Error: ${error.message || 'Failed to connect'}`)
    }
}

const disconnectTerminal = async () => {
    if (ws.value) {
        ws.value.close()
        ws.value = null
    }
    if (selectedServer.value && props.node.attrs.terminalId) {
        try {
            await terminalService.deleteTerminal(selectedServer.value, props.node.attrs.terminalId)
        } catch (error: any) {
            console.error('Failed to delete terminal:', error)
        }
    }
    isConnected.value = false
    props.updateAttributes({ terminalId: null })
}

const sendCommand = () => {
    if (ws.value && command.value) {
        ws.value.send(command.value + '\n')
        output.value.push(`$ ${command.value}`)
        command.value = ''
    }
}

const scrollToBottom = () => {
    if (outputRef.value) {
        outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
}

const copyOutput = async () => {
    try {
        await navigator.clipboard.writeText(output.value.join('\n'))
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (error) {
        console.error('Failed to copy output:', error)
    }
}

onMounted(() => {
    if (props.node.attrs.serverId) {
        selectedServerId.value = props.node.attrs.serverId
    }

    if (props.node.attrs.terminalId && selectedServer.value) {
        connectTerminal()
    }
})

onBeforeUnmount(() => {
    disconnectTerminal()
})

watch(selectedServerId, (newValue) => {
    if (isConnected.value) {
        disconnectTerminal()
    }
    props.updateAttributes({ serverId: newValue })
})
</script>

<style scoped>
.terminal-block {
    margin: 1em 0;
}

.terminal-output {
    background-color: #1e1e1e;
    color: #fff;
    padding: 1em;
    font-family: monospace;
    height: 300px;
    overflow-y: auto;
    position: relative;
    /* For copy button positioning */
}

.terminal-input {
    background-color: #1e1e1e;
    color: #fff;
    padding: 0.5em 1em;
    font-family: monospace;
    border-top: 1px solid #333;
}

.terminal-line {
    white-space: pre-wrap;
    word-break: break-all;
}

:deep(.terminal-container) {
    @apply border-2;
}

:deep(.dark .terminal-output),
:deep(.dark .terminal-input) {
    background-color: #000;
}

/* Add hover effect for copy button */
:deep(.terminal-container:hover) .copy-button {
    opacity: 1;
}

.copy-button {
    opacity: 0;
    transition: opacity 0.2s;
}
</style>