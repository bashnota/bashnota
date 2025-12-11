<template>
  <div class="simplified-menubar border-b bg-background">
    <div class="flex items-center justify-between px-4 py-2">
      <!-- Left: App name and main actions -->
      <div class="flex items-center gap-4">
        <h1 class="text-lg font-semibold">BashNota</h1>
        
        <!-- Main actions dropdown -->
        <div class="relative" ref="actionsMenuRef">
          <button
            @click="toggleActionsMenu"
            class="px-3 py-1.5 rounded hover:bg-muted flex items-center gap-2 text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Actions
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Actions dropdown menu -->
          <div
            v-if="actionsMenuOpen"
            class="absolute left-0 top-full mt-1 w-56 bg-background border rounded-md shadow-lg z-50"
          >
            <div class="py-1">
              <!-- File actions -->
              <div class="px-3 py-1.5 text-xs font-semibold text-muted-foreground">File</div>
              <button
                v-for="action in fileActions"
                :key="action.id"
                @click="executeAction(action)"
                class="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center justify-between group"
              >
                <span>{{ action.label }}</span>
                <kbd v-if="action.shortcut" class="text-xs text-muted-foreground">{{ action.shortcut }}</kbd>
              </button>

              <div class="border-t my-1"></div>

              <!-- View actions -->
              <div class="px-3 py-1.5 text-xs font-semibold text-muted-foreground">View</div>
              <button
                v-for="action in viewActions"
                :key="action.id"
                @click="executeAction(action)"
                class="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center justify-between group"
              >
                <span>{{ action.label }}</span>
                <kbd v-if="action.shortcut" class="text-xs text-muted-foreground">{{ action.shortcut }}</kbd>
              </button>

              <div class="border-t my-1"></div>

              <!-- Tools -->
              <div class="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Tools</div>
              <button
                v-for="action in toolActions"
                :key="action.id"
                @click="executeAction(action)"
                class="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center justify-between group"
              >
                <span>{{ action.label }}</span>
                <kbd v-if="action.shortcut" class="text-xs text-muted-foreground">{{ action.shortcut }}</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Current view/breadcrumb (optional) -->
      <div class="flex-1 px-4">
        <slot name="center">
          <span class="text-sm text-muted-foreground">{{ currentRoute }}</span>
        </slot>
      </div>

      <!-- Right: Quick actions and user menu -->
      <div class="flex items-center gap-2">
        <!-- Command palette shortcut -->
        <button
          @click="nav.openCommandPalette()"
          class="px-3 py-1.5 rounded hover:bg-muted flex items-center gap-2 text-sm"
          title="Command Palette (Ctrl+K)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <kbd class="hidden md:inline-flex px-2 py-0.5 text-xs font-semibold bg-muted rounded">⌘K</kbd>
        </button>

        <!-- Help -->
        <button
          @click="openHelp"
          class="p-2 rounded hover:bg-muted"
          title="Help & Documentation (F1)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- Settings -->
        <button
          @click="router.push('/settings')"
          class="p-2 rounded hover:bg-muted"
          title="Settings"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <!-- User menu (optional slot) -->
        <slot name="user-menu" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSimplifiedNavigationStore } from '@/stores/simplifiedNavigationStore'
import { useRouter, useRoute } from 'vue-router'
import { useFeatureFlags } from '@/composables/useFeatureFlags'

const nav = useSimplifiedNavigationStore()
const router = useRouter()
const route = useRoute()
const { useNewStorage, useSimplifiedNavigation, useConsolidatedSettings } = useFeatureFlags()

// Emit event for opening help
const emit = defineEmits<{
  'open-help': []
}>()

// Actions menu state
const actionsMenuOpen = ref(false)
const actionsMenuRef = ref<HTMLElement>()

const toggleActionsMenu = () => {
  actionsMenuOpen.value = !actionsMenuOpen.value
}

// Open help function
const openHelp = () => {
  emit('open-help')
}

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (actionsMenuRef.value && !actionsMenuRef.value.contains(event.target as Node)) {
    actionsMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Current route display
const currentRoute = computed(() => {
  return route.name?.toString() || 'Home'
})

// Menu actions
interface MenuAction {
  id: string
  label: string
  shortcut?: string
  action: () => void
}

const fileActions = ref<MenuAction[]>([
  {
    id: 'new-nota',
    label: 'New Nota',
    shortcut: 'Ctrl+N',
    action: () => {
      router.push('/nota/new')
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'import',
    label: 'Import...',
    action: () => {
      // Trigger import dialog
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'export',
    label: 'Export...',
    action: () => {
      // Trigger export dialog
      actionsMenuOpen.value = false
    }
  }
])

const viewActions = ref<MenuAction[]>([
  {
    id: 'toggle-docs',
    label: 'Toggle Documents',
    shortcut: 'Ctrl+B',
    action: () => {
      nav.toggleLeftSidebar()
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'toggle-ai',
    label: 'Toggle AI Assistant',
    shortcut: 'Ctrl+Shift+A',
    action: () => {
      nav.toggleRightPanel('ai')
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'toggle-jupyter',
    label: 'Toggle Jupyter',
    shortcut: 'Ctrl+J',
    action: () => {
      nav.toggleBottomPanel('jupyter')
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'command-palette',
    label: 'Command Palette',
    shortcut: 'Ctrl+K',
    action: () => {
      nav.openCommandPalette()
      actionsMenuOpen.value = false
    }
  }
])

const toolActions = ref<MenuAction[]>([
  {
    id: 'help',
    label: 'Help & Documentation',
    shortcut: 'F1',
    action: () => {
      openHelp()
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'feature-flags',
    label: 'Feature Flags',
    action: () => {
      console.log('Feature Flags:', {
        useNewStorage: useNewStorage.value,
        useSimplifiedNavigation: useSimplifiedNavigation.value,
        useConsolidatedSettings: useConsolidatedSettings.value
      })
      actionsMenuOpen.value = false
    }
  },
  {
    id: 'settings',
    label: 'Settings',
    shortcut: 'Ctrl+,',
    action: () => {
      router.push('/settings')
      actionsMenuOpen.value = false
    }
  }
])

const executeAction = (action: MenuAction) => {
  action.action()
}
</script>

<style scoped>
.simplified-menubar {
  /* Ensure menubar stays on top */
  z-index: 40;
}
</style>
