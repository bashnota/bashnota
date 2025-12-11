<template>
  <Teleport to="body">
    <div
      v-if="nav.commandPaletteOpen"
      class="command-palette-overlay fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm"
      @click.self="nav.closeCommandPalette()"
    >
      <div
        class="command-palette w-full max-w-2xl bg-background border rounded-lg shadow-lg overflow-hidden"
        @click.stop
      >
        <!-- Search Input -->
        <div class="p-4 border-b">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Type a command or search..."
              class="w-full pl-10 pr-4 py-2 bg-muted rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-ring"
              @keydown.down.prevent="selectNext"
              @keydown.up.prevent="selectPrevious"
              @keydown.enter.prevent="executeSelected"
              @keydown.esc="nav.closeCommandPalette()"
            />
          </div>
        </div>

        <!-- Commands List -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="filteredCommands.length === 0" class="p-8 text-center text-muted-foreground">
            No commands found
          </div>

          <div v-else>
            <button
              v-for="(command, index) in filteredCommands"
              :key="command.id"
              :ref="(el) => setCommandRef(el, index)"
              class="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 group"
              :class="{ 'bg-muted': selectedIndex === index }"
              @click="executeCommand(command)"
              @mouseenter="selectedIndex = index"
            >
              <!-- Icon -->
              <div class="w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary">
                <component :is="command.icon" v-if="command.icon" class="w-5 h-5" />
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <!-- Command Info -->
              <div class="flex-1 min-w-0">
                <div class="font-medium">{{ command.label }}</div>
                <div v-if="command.description" class="text-sm text-muted-foreground truncate">
                  {{ command.description }}
                </div>
              </div>

              <!-- Keyboard Shortcut -->
              <div v-if="command.shortcut" class="flex items-center gap-1">
                <kbd
                  v-for="(key, i) in command.shortcut.split('+')"
                  :key="i"
                  class="px-2 py-1 text-xs font-semibold bg-muted-foreground/10 rounded"
                >
                  {{ key }}
                </kbd>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 border-t bg-muted/40 text-xs text-muted-foreground flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span><kbd class="px-1.5 py-0.5 bg-background rounded">↑↓</kbd> Navigate</span>
            <span><kbd class="px-1.5 py-0.5 bg-background rounded">⏎</kbd> Select</span>
            <span><kbd class="px-1.5 py-0.5 bg-background rounded">Esc</kbd> Close</span>
          </div>
          <div>{{ filteredCommands.length }} commands</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSimplifiedNavigationStore } from '@/stores/simplifiedNavigationStore'
import { useRouter } from 'vue-router'

const nav = useSimplifiedNavigationStore()
const router = useRouter()

// Search state
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement>()
const commandRefs = ref<(HTMLElement | null)[]>([])

// Set command ref for keyboard navigation
const setCommandRef = (el: any, index: number) => {
  if (el) {
    commandRefs.value[index] = el as HTMLElement
  }
}

// Available commands
interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon?: any
  action: () => void
  tags?: string[]
}

const commands = ref<Command[]>([
  // Navigation
  {
    id: 'toggle-left',
    label: 'Toggle Documents Panel',
    description: 'Show or hide the documents sidebar',
    shortcut: 'Ctrl+B',
    tags: ['view', 'sidebar', 'documents'],
    action: () => nav.toggleLeftSidebar()
  },
  {
    id: 'toggle-ai',
    label: 'Toggle AI Assistant',
    description: 'Show or hide the AI assistant panel',
    shortcut: 'Ctrl+Shift+A',
    tags: ['view', 'ai', 'assistant'],
    action: () => nav.toggleRightPanel('ai')
  },
  {
    id: 'toggle-jupyter',
    label: 'Toggle Jupyter Console',
    description: 'Show or hide the Jupyter console',
    shortcut: 'Ctrl+J',
    tags: ['view', 'jupyter', 'console'],
    action: () => nav.toggleBottomPanel('jupyter')
  },
  {
    id: 'toggle-terminal',
    label: 'Toggle Terminal',
    description: 'Show or hide the terminal',
    shortcut: 'Ctrl+`',
    tags: ['view', 'terminal', 'console'],
    action: () => nav.toggleBottomPanel('terminal')
  },
  {
    id: 'close-all',
    label: 'Close All Panels',
    description: 'Close all sidebars and panels',
    tags: ['view', 'close'],
    action: () => nav.closeAllPanels()
  },
  {
    id: 'reset-layout',
    label: 'Reset Layout',
    description: 'Reset to default layout',
    tags: ['view', 'reset', 'layout'],
    action: () => nav.resetToDefault()
  },

  // Navigation routes (examples)
  {
    id: 'go-home',
    label: 'Go to Home',
    description: 'Navigate to home page',
    tags: ['navigate', 'home'],
    action: () => {
      router.push('/')
      nav.closeCommandPalette()
    }
  },
  {
    id: 'go-settings',
    label: 'Open Settings',
    description: 'Navigate to settings page',
    shortcut: 'Ctrl+,',
    tags: ['navigate', 'settings'],
    action: () => {
      router.push('/settings')
      nav.closeCommandPalette()
    }
  }
])

// Filter commands based on search
const filteredCommands = computed(() => {
  if (!searchQuery.value) {
    return commands.value
  }

  const query = searchQuery.value.toLowerCase()
  return commands.value.filter(cmd => {
    const matchLabel = cmd.label.toLowerCase().includes(query)
    const matchDescription = cmd.description?.toLowerCase().includes(query)
    const matchTags = cmd.tags?.some(tag => tag.toLowerCase().includes(query))
    return matchLabel || matchDescription || matchTags
  })
})

// Keyboard navigation
const selectNext = () => {
  selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length
  scrollToSelected()
}

const selectPrevious = () => {
  selectedIndex.value = selectedIndex.value === 0 
    ? filteredCommands.value.length - 1 
    : selectedIndex.value - 1
  scrollToSelected()
}

const scrollToSelected = () => {
  nextTick(() => {
    const element = commandRefs.value[selectedIndex.value]
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}

const executeSelected = () => {
  const command = filteredCommands.value[selectedIndex.value]
  if (command) {
    executeCommand(command)
  }
}

const executeCommand = (command: Command) => {
  command.action()
  nav.closeCommandPalette()
}

// Focus search input when opened
watch(() => nav.commandPaletteOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      searchInput.value?.focus()
      selectedIndex.value = 0
      searchQuery.value = ''
    })
  }
})

// Global keyboard shortcut (Ctrl+K)
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    nav.openCommandPalette()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.command-palette-overlay {
  animation: fadeIn 0.2s ease-out;
}

.command-palette {
  animation: slideDown 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Smooth scroll */
.max-h-96 {
  scroll-behavior: smooth;
}
</style>
