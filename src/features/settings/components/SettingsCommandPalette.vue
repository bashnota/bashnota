<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Command, 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Palette, 
  SparklesIcon, 
  Plug, 
  Keyboard, 
  Settings,
  Search,
  ArrowRight
} from 'lucide-vue-next'

interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'navigate', settingId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const router = useRouter()

// All available settings with enhanced metadata
const allSettings = [
  // Editor Settings
  {
    id: 'unified-editor',
    title: 'Editor - All Settings',
    component: 'UnifiedEditorSettings',
    category: 'Editor',
    icon: FileText,
    badge: 'Recommended',
    description: 'Unified editor settings with modern UI',
    keywords: ['editor', 'text', 'code', 'font', 'theme', 'unified', 'new']
  },
  {
    id: 'text-editing',
    title: 'Text Editing (Connected)',
    component: 'TextEditingSettings',
    category: 'Editor',
    icon: FileText,
    description: 'Text editing preferences connected to unified store',
    keywords: ['text', 'editing', 'font', 'color', 'size', 'connected']
  },
  {
    id: 'code-editing',
    title: 'Code Editing',
    component: 'CodeEditingSettings',
    category: 'Editor',
    icon: FileText,
    badge: 'Legacy',
    description: 'Code-specific editing features',
    keywords: ['code', 'syntax', 'highlighting', 'autocomplete']
  },
  {
    id: 'formatting',
    title: 'Formatting',
    component: 'FormattingSettings',
    category: 'Editor',
    icon: FileText,
    badge: 'Legacy',
    description: 'Code formatting and style preferences',
    keywords: ['formatting', 'indent', 'tabs', 'spaces', 'style']
  },

  // Appearance Settings
  {
    id: 'unified-appearance',
    title: 'Appearance - All Settings',
    component: 'UnifiedAppearanceSettings',
    category: 'Appearance',
    icon: Palette,
    badge: 'Recommended',
    description: 'Unified appearance and theme settings',
    keywords: ['appearance', 'theme', 'color', 'dark', 'light', 'interface', 'unified', 'new']
  },
  {
    id: 'theme',
    title: 'Theme',
    component: 'ThemeSettings',
    category: 'Appearance',
    icon: Palette,
    badge: 'Legacy',
    description: 'Color theme and mode preferences',
    keywords: ['theme', 'dark', 'light', 'color', 'mode']
  },
  {
    id: 'interface',
    title: 'Interface',
    component: 'InterfaceSettings',
    category: 'Appearance',
    icon: Palette,
    badge: 'Legacy',
    description: 'Interface layout and elements',
    keywords: ['interface', 'sidebar', 'layout', 'width', 'position']
  },

  // AI Settings
  {
    id: 'unified-ai',
    title: 'AI Provider Settings',
    component: 'UnifiedAISettings',
    category: 'AI Assistant',
    icon: SparklesIcon,
    badge: 'Recommended',
    description: 'Unified AI provider and model configuration',
    keywords: ['ai', 'assistant', 'provider', 'model', 'openai', 'gemini', 'webllm', 'unified', 'new']
  },
  {
    id: 'ai-actions',
    title: 'AI Actions',
    component: 'AIActionsSettings',
    category: 'AI Assistant',
    icon: SparklesIcon,
    description: 'AI-powered text enhancement actions',
    keywords: ['ai', 'actions', 'commands', 'assistant', 'text', 'enhance', 'rewrite', 'grammar']
  },
  {
    id: 'ai-code-actions',
    title: 'AI Code Actions',
    component: 'AICodeActionsSettings',
    category: 'AI Assistant',
    icon: SparklesIcon,
    description: 'AI-powered code enhancement actions',
    keywords: ['ai', 'code', 'actions', 'programming', 'refactor', 'optimize']
  },
  {
    id: 'ai-providers',
    title: 'AI Providers (Legacy)',
    component: 'AIProvidersSettings',
    category: 'AI Assistant',
    icon: SparklesIcon,
    badge: 'Legacy',
    description: 'Configure AI service providers',
    keywords: ['ai', 'providers', 'openai', 'gemini', 'api', 'key', 'legacy']
  },

  // Integration Settings
  {
    id: 'jupyter',
    title: 'Jupyter',
    component: 'JupyterSettings',
    category: 'Integrations',
    icon: Plug,
    description: 'Jupyter notebook integration',
    keywords: ['jupyter', 'notebook', 'integration', 'python']
  },

  // Keyboard Shortcuts
  {
    id: 'editor-shortcuts',
    title: 'Editor Shortcuts',
    component: 'EditorShortcutsSettings',
    category: 'Keyboard Shortcuts',
    icon: Keyboard,
    description: 'Editor keyboard shortcuts',
    keywords: ['keyboard', 'shortcuts', 'editor', 'hotkeys']
  },

  // Advanced Settings
  {
    id: 'performance',
    title: 'Performance',
    component: 'PerformanceSettings',
    category: 'Advanced',
    icon: Settings,
    description: 'Performance and optimization settings',
    keywords: ['performance', 'optimization', 'speed', 'memory']
  }
]

// Search functionality
const searchQuery = ref('')

const filteredSettings = computed(() => {
  if (!searchQuery.value) return allSettings

  const query = searchQuery.value.toLowerCase()
  return allSettings.filter(setting => {
    return (
      setting.title.toLowerCase().includes(query) ||
      setting.description.toLowerCase().includes(query) ||
      setting.category.toLowerCase().includes(query) ||
      setting.keywords.some(keyword => keyword.includes(query))
    )
  })
})

// Group settings by category
const groupedSettings = computed(() => {
  const groups: Record<string, typeof allSettings> = {}
  
  filteredSettings.value.forEach(setting => {
    if (!groups[setting.category]) {
      groups[setting.category] = []
    }
    groups[setting.category].push(setting)
  })
  
  return groups
})

// Handle selection
const handleSelect = (settingId: string) => {
  emit('navigate', settingId)
  emit('update:open', false)
  
  // Navigate to the setting
  router.push({ name: 'settings-detail', params: { section: settingId } })
}

// Handle dialog state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Clear search when dialog closes
watch(() => props.open, (open) => {
  if (!open) {
    searchQuery.value = ''
  }
})
</script>

<template>
  <CommandDialog v-model:open="isOpen">
    <CommandInput
      v-model="searchQuery"
      placeholder="Search settings..."
      class="h-14"
    />
    
    <CommandList class="max-h-96">
      <CommandEmpty>
        <div class="text-center py-6">
          <Search class="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p class="text-sm text-muted-foreground">No settings found</p>
          <p class="text-xs text-muted-foreground">Try searching for "theme", "ai", or "editor"</p>
        </div>
      </CommandEmpty>
      
      <!-- Grouped Results -->
      <div v-for="(settings, category) in groupedSettings" :key="category">
        <CommandGroup :heading="category">
          <CommandItem
            v-for="setting in settings"
            :key="setting.id"
            :value="`${setting.title} ${setting.description} ${setting.keywords.join(' ')}`"
            @select="handleSelect(setting.id)"
            class="flex items-center gap-3 px-3 py-3 cursor-pointer"
          >
            <component :is="setting.icon" class="h-4 w-4 text-muted-foreground" />
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">{{ setting.title }}</span>
                <Badge 
                  v-if="setting.badge" 
                  :variant="setting.badge === 'Recommended' ? 'default' : 'secondary'"
                  class="text-xs"
                >
                  {{ setting.badge }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ setting.description }}</p>
            </div>
            
            <ArrowRight class="h-3 w-3 text-muted-foreground" />
          </CommandItem>
        </CommandGroup>
      </div>
      
      <!-- Quick Actions -->
      <CommandGroup v-if="!searchQuery" heading="Quick Actions">
        <CommandItem
          value="reset all settings"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer text-destructive"
        >
          <Settings class="h-4 w-4" />
          <span class="text-sm">Reset All Settings</span>
        </CommandItem>
        
        <CommandItem
          value="export settings"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer"
        >
          <FileText class="h-4 w-4" />
          <span class="text-sm">Export Settings</span>
        </CommandItem>
        
        <CommandItem
          value="import settings"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer"
        >
          <FileText class="h-4 w-4" />
          <span class="text-sm">Import Settings</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>