<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, ChevronRight, ChevronDown, FileText, Palette, SparklesIcon, Plug, Keyboard, Settings } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import SettingsPanel from '@/features/settings/components/SettingsPanel.vue'

const route = useRoute()
const router = useRouter()

// Search functionality
const searchQuery = ref('')

// Settings categories
const settingsCategories = ref([
  {
    id: 'editor',
    title: 'Editor',
    icon: FileText,
    expanded: true,
    subcategories: [
      { id: 'unified-editor', title: 'All Settings', component: 'UnifiedEditorSettings', badge: 'New' },
      { id: 'text-editing', title: 'Text Editing', component: 'TextEditingSettings' },
      { id: 'code-editing', title: 'Code Editing', component: 'CodeEditingSettings' },
      { id: 'formatting', title: 'Formatting', component: 'FormattingSettings' }
    ]
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    expanded: false,
    subcategories: [
      { id: 'theme', title: 'Theme', component: 'ThemeSettings' },
      { id: 'interface', title: 'Interface', component: 'InterfaceSettings' }
    ]
  },
  {
    id: 'ai',
    title: 'AI Assistant',
    icon: SparklesIcon,
    expanded: true,
    subcategories: [
      { id: 'ai-providers', title: 'AI Providers', component: 'AIProvidersSettings' },
      { id: 'ai-actions', title: 'AI Actions', component: 'AIActionsSettings' },
      { id: 'ai-code-actions', title: 'AI Code Actions', component: 'AICodeActionsSettings' },
      { id: 'ai-generation', title: 'Generation Settings', component: 'AIGenerationSettings' }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Plug,
    expanded: false,
    subcategories: [
      { id: 'jupyter', title: 'Jupyter', component: 'JupyterSettings' },
      { id: 'external-tools', title: 'External Tools', component: 'ExternalToolsSettings' }
    ]
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    expanded: false,
    subcategories: [
      { id: 'editor-shortcuts', title: 'Editor', component: 'EditorShortcutsSettings' },
      { id: 'navigation-shortcuts', title: 'Navigation', component: 'NavigationShortcutsSettings' },
      { id: 'global-shortcuts', title: 'Global', component: 'GlobalShortcutsSettings' }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced',
    icon: Settings,
    expanded: false,
    subcategories: [
      { id: 'performance', title: 'Performance', component: 'PerformanceSettings' },
      { id: 'data-management', title: 'Data Management', component: 'DataManagementSettings' },
      { id: 'system-info', title: 'System Information', component: 'SystemInfoSettings' }
    ]
  }
])

// Currently selected setting - get from route params
const selectedSetting = computed(() => {
  return (route.params.section as string) || 'unified-editor'
})

// Filtered categories based on search
const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return settingsCategories.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return settingsCategories.value.map(category => ({
    ...category,
    subcategories: category.subcategories.filter(sub => 
      sub.title.toLowerCase().includes(query) ||
      category.title.toLowerCase().includes(query)
    )
  })).filter(category => category.subcategories.length > 0)
})

// Toggle category expansion
const toggleCategory = (categoryId: string) => {
  const category = settingsCategories.value.find(c => c.id === categoryId)
  if (category) {
    category.expanded = !category.expanded
  }
}

// Select a setting
const selectSetting = (settingId: string) => {
  // Navigate to the settings route with the section parameter
  router.push({ name: 'settings-detail', params: { section: settingId } })
  
  // Find and expand the parent category
  for (const category of settingsCategories.value) {
    const hasSubcategory = category.subcategories.some(sub => sub.id === settingId)
    if (hasSubcategory) {
      category.expanded = true
      break
    }
  }
}

// Handle route parameters for direct navigation
const handleRouteNavigation = () => {
  const section = route.params.section as string
  if (section) {
    // Check if the section exists and expand its parent category
    for (const category of settingsCategories.value) {
      const hasSubcategory = category.subcategories.some(sub => sub.id === section)
      if (hasSubcategory) {
        category.expanded = true
        break
      }
    }
  }
}

// Initialize
onMounted(() => {
  handleRouteNavigation()
})

// Watch for route changes
watch(() => route.params.section, () => {
  handleRouteNavigation()
})

// Get the current setting title
const currentSettingTitle = computed(() => {
  for (const category of settingsCategories.value) {
    for (const sub of category.subcategories) {
      if (sub.id === selectedSetting.value) {
        return sub.title
      }
    }
  }
  return ''
})

// Get the current setting component
const currentSettingComponent = computed(() => {
  for (const category of settingsCategories.value) {
    for (const sub of category.subcategories) {
      if (sub.id === selectedSetting.value) {
        return sub.component
      }
    }
  }
  return 'TextEditingSettings'
})
</script>

<template>
  <div class="h-screen bg-background flex">
    <!-- Sidebar -->
    <div class="w-80 border-r bg-muted/30 flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b">
        <h1 class="text-lg font-semibold mb-3">Settings</h1>
        <!-- Search -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search settings..."
            class="pl-9"
          />
        </div>
      </div>
      
      <!-- Categories -->
      <div class="flex-1 overflow-y-auto p-2">
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="mb-2"
        >
          <!-- Category Header -->
          <button
            @click="toggleCategory(category.id)"
            class="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-left"
          >
            <div class="flex items-center gap-2">
              <component :is="category.icon" class="h-4 w-4" />
              <span class="font-medium text-sm">{{ category.title }}</span>
            </div>
            <ChevronDown
              v-if="category.expanded"
              class="h-4 w-4 text-muted-foreground"
            />
            <ChevronRight
              v-else
              class="h-4 w-4 text-muted-foreground"
            />
          </button>
          
          <!-- Subcategories -->
          <div v-if="category.expanded" class="ml-6 mt-1">
            <button
              v-for="subcategory in category.subcategories"
              :key="subcategory.id"
              @click="selectSetting(subcategory.id)"
              :class="[
                'w-full text-left p-2 rounded-md text-sm transition-colors flex items-center justify-between',
                selectedSetting === subcategory.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted/50'
              ]"
            >
              <span>{{ subcategory.title }}</span>
              <Badge v-if="subcategory.badge" variant="secondary" class="text-xs">
                {{ subcategory.badge }}
              </Badge>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Content Header -->
      <div class="p-6 border-b">
        <h2 class="text-2xl font-bold">{{ currentSettingTitle }}</h2>
        <p class="text-muted-foreground mt-1">
          Configure {{ currentSettingTitle.toLowerCase() }} preferences
        </p>
      </div>
      
      <!-- Settings Panel -->
      <div class="flex-1 overflow-y-auto">
        <SettingsPanel
          :setting-id="selectedSetting"
          :component="currentSettingComponent"
        />
      </div>
    </div>
  </div>
</template> 







