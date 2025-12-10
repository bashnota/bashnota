<template>
  <div class="three-panel-layout flex h-screen w-full overflow-hidden">
    <!-- Left Sidebar: Documents Panel -->
    <aside
      v-if="nav.leftSidebarOpen"
      class="left-panel flex-shrink-0 border-r bg-muted/40 transition-all duration-300"
      :class="leftPanelClass"
    >
      <slot name="documents">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-2">Documents</h2>
          <p class="text-sm text-muted-foreground">Document tree will appear here</p>
        </div>
      </slot>
    </aside>

    <!-- Main Content Area: Editor -->
    <main class="main-panel flex-1 flex flex-col overflow-hidden">
      <!-- Top Toolbar -->
      <header class="border-b bg-background px-4 py-2 flex items-center gap-2">
        <!-- Toggle left sidebar -->
        <button
          @click="nav.toggleLeftSidebar()"
          class="p-2 rounded hover:bg-muted"
          title="Toggle Documents Panel (Ctrl+B)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex-1">
          <slot name="toolbar">
            <span class="text-sm text-muted-foreground">Editor Toolbar</span>
          </slot>
        </div>

        <!-- Command palette trigger -->
        <button
          @click="nav.openCommandPalette()"
          class="p-2 rounded hover:bg-muted flex items-center gap-2"
          title="Open Command Palette (Ctrl+K)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          <kbd class="hidden sm:inline-flex px-2 py-1 text-xs font-semibold bg-muted rounded">⌘K</kbd>
        </button>

        <!-- Toggle right panel -->
        <button
          @click="toggleRightPanel"
          class="p-2 rounded hover:bg-muted"
          :class="{ 'bg-muted': nav.rightPanelContent !== 'none' }"
          title="Toggle AI Assistant (Ctrl+Shift+A)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      </header>

      <!-- Editor Content -->
      <div class="flex-1 overflow-auto">
        <slot name="editor">
          <div class="p-8">
            <h1 class="text-2xl font-bold mb-4">Editor</h1>
            <p class="text-muted-foreground">Editor content will appear here</p>
          </div>
        </slot>
      </div>

      <!-- Bottom Panel: Jupyter/Terminal -->
      <div
        v-if="nav.bottomPanelContent !== 'none'"
        class="bottom-panel border-t bg-background transition-all duration-300"
        :class="bottomPanelClass"
      >
        <div class="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
          <div class="flex items-center gap-2">
            <button
              v-for="panel in bottomPanels"
              :key="panel.value"
              @click="nav.toggleBottomPanel(panel.value)"
              class="px-3 py-1 rounded text-sm transition-colors"
              :class="nav.bottomPanelContent === panel.value 
                ? 'bg-background text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'"
            >
              {{ panel.label }}
            </button>
          </div>
          <button
            @click="nav.closeBottomPanel()"
            class="p-1 rounded hover:bg-muted"
            title="Close bottom panel"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-auto" style="height: calc(100% - 40px);">
          <slot name="bottom-panel" :content="nav.bottomPanelContent">
            <div class="p-4">
              <p class="text-sm text-muted-foreground">
                {{ nav.bottomPanelContent === 'jupyter' ? 'Jupyter Console' : 'Terminal' }} will appear here
              </p>
            </div>
          </slot>
        </div>
      </div>
    </main>

    <!-- Right Sidebar: AI Assistant Panel -->
    <aside
      v-if="nav.rightPanelContent === 'ai'"
      class="right-panel flex-shrink-0 border-l bg-muted/40 transition-all duration-300"
      :class="rightPanelClass"
    >
      <slot name="ai">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-2">AI Assistant</h2>
          <p class="text-sm text-muted-foreground">AI chat will appear here</p>
        </div>
      </slot>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSimplifiedNavigationStore } from '@/stores/simplifiedNavigationStore'

const nav = useSimplifiedNavigationStore()

// Panel sizing
const leftPanelClass = computed(() => 'w-64')
const rightPanelClass = computed(() => 'w-80')
const bottomPanelClass = computed(() => 'h-64')

// Bottom panel options
const bottomPanels = [
  { label: 'Jupyter', value: 'jupyter' as const },
  { label: 'Terminal', value: 'terminal' as const }
]

// Toggle right panel (AI assistant)
const toggleRightPanel = () => {
  if (nav.rightPanelContent === 'ai') {
    nav.closeRightPanel()
  } else {
    nav.toggleRightPanel('ai')
  }
}
</script>

<style scoped>
.three-panel-layout {
  /* Ensure proper layout */
}

/* Smooth transitions */
.left-panel,
.right-panel,
.bottom-panel {
  transition: all 0.3s ease-in-out;
}
</style>
