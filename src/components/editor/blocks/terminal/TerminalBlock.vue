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
                    <Button v-if="xterm" size="sm" variant="ghost" class="absolute top-2 right-2 z-10"
                        @click="copyOutput">
                        <Copy v-if="!isCopied" class="h-4 w-4" />
                        <Check v-else class="h-4 w-4" />
                        <span class="sr-only">Copy output</span>
                    </Button>

                    <div ref="terminalDiv" class="terminal-output" tabindex="0" @click="xterm?.focus()"></div>
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
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

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

const terminalDiv = ref<HTMLElement>()
const xterm = ref<XTerm>()
const fitAddon = ref<FitAddon>()

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

const initializeXTerm = () => {
    if (!terminalDiv.value) return

    xterm.value = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        convertEol: true,
        theme: {
            background: '#1e1e1e',
            foreground: '#ffffff',
            cursor: '#ffffff',
        }
    })

    fitAddon.value = new FitAddon()
    xterm.value.loadAddon(fitAddon.value)
    xterm.value.open(terminalDiv.value)
    fitAddon.value.fit()

    // Focus terminal on click
    terminalDiv.value.addEventListener('click', () => {
        xterm.value?.focus()
    })

    // Handle terminal input
    xterm.value.onData((data) => {
        if (ws.value && isConnected.value) {
            // Echo the input locally
            xterm.value?.write(data)
            // Send to server
            ws.value.send(JSON.stringify(['stdin', data]))
        }
    })

    // Handle terminal key input
    xterm.value.onKey(({ key, domEvent }) => {
        const ev = domEvent as KeyboardEvent

        // Handle special keys
        if (ev.keyCode === 13) { // Enter
            if (ws.value && isConnected.value) {
                ws.value.send(JSON.stringify(['stdin', '\r\n']))
            }
        } else if (ev.keyCode === 8) { // Backspace
            if (ws.value && isConnected.value) {
                ws.value.send(JSON.stringify(['stdin', '\b']))
            }
        }
    })
}

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
            if (xterm.value) {
                try {
                    // Parse the incoming messages
                    const messages = event.data.split('][').map((msg: string) => {
                        // Clean up the message format
                        msg = msg.replace(/^\[|\]$/g, '')
                        return JSON.parse(`[${msg}]`)
                    })

                    // Process each message
                    messages.forEach((msg: [string, any]) => {
                        const [msgType, content] = msg
                        switch (msgType) {
                            case 'stdout':
                            case 'stderr':
                                xterm.value?.write(content)
                                break
                            case 'setup':
                                // Setup messages can be ignored
                                break
                            default:
                                console.log('Unknown message type:', msgType)
                        }
                    })
                } catch (error) {
                    console.error('Failed to parse terminal message:', error)
                    // If parsing fails, write the raw data
                    xterm.value.write(event.data)
                }
            }
        }
        ws.value.onopen = () => {
            isConnected.value = true
            if (xterm.value) {
                xterm.value.write('Connected to terminal\r\n')
                xterm.value.focus()
            }
        }
        ws.value.onclose = () => {
            isConnected.value = false
            if (xterm.value) {
                xterm.value.write('\r\nDisconnected from terminal\r\n')
            }
        }
    } catch (error: any) {
        console.error('Failed to connect to terminal:', error)
        if (xterm.value) {
            xterm.value.write(`Error: ${error.message || 'Failed to connect'}\r\n`)
        }
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

const scrollToBottom = () => {
    if (outputRef.value) {
        outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
}

const copyOutput = async () => {
    if (!xterm.value) return
    try {
        const selection = xterm.value.getSelection()
        await navigator.clipboard.writeText(selection)
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (error) {
        console.error('Failed to copy output:', error)
    }
}

onMounted(() => {
    initializeXTerm()

    if (props.node.attrs.serverId) {
        selectedServerId.value = props.node.attrs.serverId
    }

    if (props.node.attrs.terminalId && selectedServer.value) {
        connectTerminal()
    }

    // Handle window resize
    const handleResize = () => {
        if (fitAddon.value) {
            fitAddon.value.fit()
        }
    }
    window.addEventListener('resize', handleResize)

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize)
        disconnectTerminal()
        if (xterm.value) {
            xterm.value.dispose()
        }
    })
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
    min-height: 300px;
    background-color: #1e1e1e;
    position: relative;
}

/* Make sure xterm fits properly in the container */
:deep(.xterm) {
    padding: 8px;
    height: 300px;
}

:deep(.xterm-cursor) {
    background-color: #fff;
}

:deep(.xterm-cursor.xterm-cursor-blink) {
    animation: blink 1s step-end infinite;
}

@keyframes blink {
    0% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

:deep(.terminal-container) {
    @apply border-2;
}

:deep(.dark .terminal-container) {
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