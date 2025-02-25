<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServerIcon, CpuChipIcon, Cog6ToothIcon, ArrowPathIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/vue/24/solid'
import { CommandLineIcon, PaintBrushIcon, AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { Keyboard, Code2, Database, Palette, Monitor, Cpu } from 'lucide-vue-next'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useNotaStore } from '@/stores/nota'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PencilIcon } from '@heroicons/vue/24/outline'

// Use shortcuts from the store instead of duplicating them
const shortcutsStore = useShortcutsStore()
const notaStore = useNotaStore()

// Theme settings
const theme = ref('system')
const availableThemes = [
  { value: 'light', label: 'Light', icon: Palette },
  { value: 'dark', label: 'Dark', icon: Palette },
  { value: 'system', label: 'System', icon: Monitor },
]

// Interface settings
const interfaceSettings = ref({
  sidebarWidth: [280],
  animationSpeed: [0.5],
  compactMode: false,
  showLineNumbers: true,
})

// Editor settings
const editorSettings = ref({
  autoSave: true,
  dragHandleWidth: [24],
  fontSize: [16],
  lineHeight: [1.6],
  spellCheck: true,
  tabSize: [2],
  indentWithTabs: false,
  wordWrap: true,
})

// Keyboard shortcuts
const isEditingShortcut = ref(false)
const currentEditingShortcut = ref(null)
const newShortcutKey = ref('')

// Computed properties for display
const animationSpeedLabel = computed(() => {
  if (interfaceSettings.value.animationSpeed[0] < 0.3) return 'Slow'
  if (interfaceSettings.value.animationSpeed[0] > 0.7) return 'Fast'
  return 'Normal'
})

onMounted(() => {
  // Load saved theme preference
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.value = savedTheme
  }
  
  // Load saved interface settings
  const savedInterfaceSettings = localStorage.getItem('interface-settings')
  if (savedInterfaceSettings) {
    try {
      interfaceSettings.value = { ...interfaceSettings.value, ...JSON.parse(savedInterfaceSettings) }
    } catch (e) {
      console.error('Failed to parse saved interface settings', e)
    }
  }
  
  // Load saved editor settings
  const savedEditorSettings = localStorage.getItem('editor-settings')
  if (savedEditorSettings) {
    try {
      editorSettings.value = { ...editorSettings.value, ...JSON.parse(savedEditorSettings) }
    } catch (e) {
      console.error('Failed to parse saved editor settings', e)
    }
  }

  // Load shortcuts on mount
  shortcutsStore.loadShortcuts()
})

// Update theme
const updateTheme = (newTheme) => {
  theme.value = newTheme
  document.documentElement.classList.toggle('dark', newTheme === 'dark' || 
    (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
  localStorage.setItem('theme', newTheme)
  toast({
    title: 'Theme Updated',
    description: `Theme set to ${newTheme}`,
    variant: 'default'
  })
}

// Update interface settings
const saveInterfaceSettings = () => {
  localStorage.setItem('interface-settings', JSON.stringify(interfaceSettings.value))
  
  // Apply sidebar width immediately
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('interface-settings-changed', { 
      detail: interfaceSettings.value 
    }))
  }
}

// Update editor settings
const saveEditorSettings = () => {
  localStorage.setItem('editor-settings', JSON.stringify(editorSettings.value))
  
  // Apply editor settings immediately
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('editor-settings-changed', { 
      detail: editorSettings.value 
    }))
  }
}

// Clear cache
const clearCache = () => {
  localStorage.removeItem('recent-searches')
  localStorage.removeItem('temp-data')
  toast({
    title: 'Cache Cleared',
    description: 'Application cache has been cleared',
    variant: 'default'
  })
}

// Reset all settings
const resetAllSettings = () => {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    // Reset theme
    theme.value = 'system'
    updateTheme('system')
    
    // Reset interface settings
    interfaceSettings.value = {
      sidebarWidth: [280],
      animationSpeed: [0.5],
      compactMode: false,
      showLineNumbers: true,
    }
    saveInterfaceSettings()
    
    // Reset editor settings
    editorSettings.value = {
      autoSave: true,
      dragHandleWidth: [24],
      fontSize: [16],
      lineHeight: [1.6],
      spellCheck: true,
      tabSize: [2],
      indentWithTabs: false,
      wordWrap: true,
    }
    saveEditorSettings()
    
    toast({
      title: 'Settings Reset',
      description: 'All settings have been reset to default values',
      variant: 'default'
    })
  }
}

function updateFontSize(newSize) {
  editorSettings.value.fontSize = [newSize]
}

// Add this function to edit a shortcut
function editShortcut(shortcut) {
  currentEditingShortcut.value = shortcut
  newShortcutKey.value = shortcut.key
  isEditingShortcut.value = true
}

// Add this function to save the edited shortcut
function saveShortcut() {
  if (currentEditingShortcut.value && newShortcutKey.value) {
    shortcutsStore.updateShortcut(
      currentEditingShortcut.value.id, 
      { ...currentEditingShortcut.value, key: newShortcutKey.value }
    )
    
    toast({
      title: 'Shortcut Updated',
      description: `${currentEditingShortcut.value.description} is now ${newShortcutKey.value}`,
      variant: 'default'
    })
  }
  
  isEditingShortcut.value = false
  currentEditingShortcut.value = null
  newShortcutKey.value = ''
}

// Update the captureKey function to provide visual feedback
function captureKey(event) {
  event.preventDefault()
  event.stopPropagation()
  
  // Get the key combination
  const ctrl = event.ctrlKey ? 'Ctrl+' : ''
  const alt = event.altKey ? 'Alt+' : ''
  const shift = event.shiftKey ? 'Shift+' : ''
  const meta = event.metaKey ? '⌘+' : ''
  
  let key = event.key
  
  // Format special keys
  if (key === ' ') key = 'Space'
  else if (key === 'Escape') key = 'Esc'
  else if (key === 'ArrowUp') key = '↑'
  else if (key === 'ArrowDown') key = '↓'
  else if (key === 'ArrowLeft') key = '←'
  else if (key === 'ArrowRight') key = '→'
  else if (key === 'Enter') key = 'Enter'
  else if (key === 'Backspace') key = 'Backspace'
  else if (key === 'Delete') key = 'Delete'
  else if (key === 'Tab') key = 'Tab'
  else if (key.length === 1) key = key.toUpperCase()
  
  // Don't capture modifier keys alone
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return
  }
  
  // Update the shortcut key with visual feedback
  newShortcutKey.value = `${meta}${ctrl}${alt}${shift}${key}`
  
  // Add visual feedback
  const inputElement = document.getElementById('shortcut-input')
  if (inputElement) {
    // Add a flash effect
    inputElement.classList.add('shortcut-flash')
    setTimeout(() => {
      inputElement.classList.remove('shortcut-flash')
    }, 200)
  }
}

// Add this function to reset shortcuts
function resetShortcuts() {
  if (confirm('Are you sure you want to reset all keyboard shortcuts to default?')) {
    shortcutsStore.resetToDefaults()
    toast({
      title: 'Shortcuts Reset',
      description: 'All keyboard shortcuts have been reset to default values',
      variant: 'default'
    })
  }
}

// Add this function to format the shortcut key for display
function formatShortcutKey(key) {
  return key.split('+').map(part => {
    return `<kbd class="px-2 py-1 mx-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">${part}</kbd>`
  }).join('')
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Settings</h2>
          <p class="text-muted-foreground mt-1">Customize your BashNota experience</p>
        </div>
        <Button variant="outline" @click="resetAllSettings" class="flex items-center gap-2">
          <ArrowPathIcon class="h-4 w-4" />
          Reset All
        </Button>
      </div>

      <Tabs default-value="appearance" class="w-full">
        <TabsList class="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="appearance" class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <div class="flex items-center justify-center gap-2 p-2">
              <PaintBrushIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm font-medium">Appearance</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="editor" class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <div class="flex items-center justify-center gap-2 p-2">
              <Code2 class="w-4 h-4 shrink-0" />
              <span class="text-sm font-medium">Editor</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="advanced" class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <div class="flex items-center justify-center gap-2 p-2">
              <Cpu class="w-4 h-4 shrink-0" />
              <span class="text-sm font-medium">Advanced</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <!-- Appearance Tab -->
        <TabsContent value="appearance" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Theme Card -->
            <Card class="overflow-hidden border-2 hover:border-primary/50 transition-all">
              <CardHeader class="bg-muted/50">
                <CardTitle class="flex items-center gap-2">
                  <Palette class="h-5 w-5 text-primary" />
                  Theme
                </CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent class="pt-6">
                <div class="space-y-4">
                  <div class="space-y-2">
                    <Label for="theme-select">Application Theme</Label>
                    <Select v-model="theme" @update:modelValue="updateTheme">
                      <SelectTrigger id="theme-select" class="w-full">
                        <SelectValue :placeholder="theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="t in availableThemes" :key="t.value" :value="t.value" class="flex items-center gap-2">
                          <component :is="t.icon" class="h-4 w-4 mr-2" />
                          {{ t.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div class="pt-2">
                    <div class="grid grid-cols-3 gap-2">
                      <div 
                        class="aspect-video rounded-md bg-white border-2 cursor-pointer transition-all hover:scale-105"
                        :class="{ 'border-primary': theme === 'light', 'border-muted': theme !== 'light' }"
                        @click="updateTheme('light')"
                      ></div>
                      <div 
                        class="aspect-video rounded-md bg-slate-900 border-2 cursor-pointer transition-all hover:scale-105"
                        :class="{ 'border-primary': theme === 'dark', 'border-muted': theme !== 'dark' }"
                        @click="updateTheme('dark')"
                      ></div>
                      <div 
                        class="aspect-video rounded-md bg-gradient-to-r from-white to-slate-900 border-2 cursor-pointer transition-all hover:scale-105"
                        :class="{ 'border-primary': theme === 'system', 'border-muted': theme !== 'system' }"
                        @click="updateTheme('system')"
                      ></div>
                    </div>
                    <p class="text-xs text-muted-foreground mt-2">Click on a theme to apply it</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Interface Card -->
            <Card class="overflow-hidden border-2 hover:border-primary/50 transition-all">
              <CardHeader class="bg-muted/50">
                <CardTitle class="flex items-center gap-2">
                  <AdjustmentsHorizontalIcon class="h-5 w-5 text-primary" />
                  Interface
                </CardTitle>
                <CardDescription>Adjust the user interface</CardDescription>
              </CardHeader>
              <CardContent class="pt-6">
                <div class="space-y-6">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="sidebar-width">Sidebar Width</Label>
                      <Badge variant="outline">{{ interfaceSettings.sidebarWidth[0] }}px</Badge>
                    </div>
                    <Slider 
                      id="sidebar-width" 
                      v-model="interfaceSettings.sidebarWidth" 
                      :min="200" 
                      :max="400" 
                      :step="10"
                      @update:modelValue="(value) => { 
                        saveInterfaceSettings()
                      }"
                    />
                  </div>
                  
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="animation-speed">Animation Speed</Label>
                      <Badge variant="outline">{{ animationSpeedLabel }}</Badge>
                    </div>
                    <Slider 
                      id="animation-speed" 
                      v-model="interfaceSettings.animationSpeed" 
                      :min="0.1" 
                      :max="2" 
                      :step="0.1"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div class="flex items-center justify-between pt-2">
                    <div class="space-y-0.5">
                      <Label for="compact-mode">Compact Mode</Label>
                      <p class="text-sm text-muted-foreground">Reduce spacing for more content</p>
                    </div>
                    <Switch 
                      id="compact-mode" 
                      v-model="interfaceSettings.compactMode" 
                      @update:modelValue="saveInterfaceSettings"
                    />
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                      <Label for="show-line-numbers">Show Line Numbers</Label>
                      <p class="text-sm text-muted-foreground">Display line numbers in code blocks</p>
                    </div>
                    <Switch 
                      id="show-line-numbers" 
                      v-model="interfaceSettings.showLineNumbers" 
                      @update:modelValue="saveInterfaceSettings"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <!-- Keyboard Shortcuts Card -->
          <Card class="card">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Keyboard class="h-5 w-5 text-primary" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>Customize keyboard shortcuts for common actions</CardDescription>
            </CardHeader>
            <CardContent class="pt-6">
              <div class="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Shortcut</TableHead>
                      <TableHead class="w-[100px]">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="shortcut in shortcutsStore.shortcuts" :key="shortcut.id">
                      <TableCell class="font-medium">{{ shortcut.description }}</TableCell>
                      <TableCell>
                        <div v-html="formatShortcutKey(shortcut.key)"></div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" @click="editShortcut(shortcut)">
                          <PencilIcon class="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div class="flex justify-end">
                  <Button variant="outline" @click="resetShortcuts" class="flex items-center gap-2">
                    <ArrowPathIcon class="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Editor Tab -->
        <TabsContent value="editor" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Text Editing Card -->
            <Card class="overflow-hidden border-2 hover:border-primary/50 transition-all">
              <CardHeader class="bg-muted/50">
                <CardTitle class="flex items-center gap-2">
                  <Code2 class="h-5 w-5 text-primary" />
                  Text Editing
                </CardTitle>
                <CardDescription>Configure text editing preferences</CardDescription>
              </CardHeader>
              <CardContent class="pt-6">
                <div class="space-y-6">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="font-size">Font Size</Label>
                      <Badge variant="outline">{{ editorSettings.fontSize[0] }}px</Badge>
                    </div>
                    <Slider 
                      id="font-size" 
                      v-model="editorSettings.fontSize" 
                      :min="12" 
                      :max="24" 
                      :step="1" 
                      class="flex-1"
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                  
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="line-height">Line Height</Label>
                      <Badge variant="outline">{{ editorSettings.lineHeight[0] }}</Badge>
                    </div>
                    <Slider 
                      id="line-height" 
                      v-model="editorSettings.lineHeight" 
                      :min="1" 
                      :max="2" 
                      :step="0.1" 
                      class="flex-1"
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                      <Label for="word-wrap">Word Wrap</Label>
                      <p class="text-sm text-muted-foreground">Wrap text to fit the editor width</p>
                    </div>
                    <Switch 
                      id="word-wrap" 
                      v-model="editorSettings.wordWrap" 
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                      <Label for="spell-check">Spell Check</Label>
                      <p class="text-sm text-muted-foreground">Enable spell checking in the editor</p>
                    </div>
                    <Switch 
                      id="spell-check" 
                      v-model="editorSettings.spellCheck" 
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Code Editing Card -->
            <Card class="overflow-hidden border-2 hover:border-primary/50 transition-all">
              <CardHeader class="bg-muted/50">
                <CardTitle class="flex items-center gap-2">
                  <CpuChipIcon class="h-5 w-5 text-primary" />
                  Code Editing
                </CardTitle>
                <CardDescription>Configure code-specific settings</CardDescription>
              </CardHeader>
              <CardContent class="pt-6">
                <div class="space-y-6">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="tab-size">Tab Size</Label>
                      <Badge variant="outline">{{ editorSettings.tabSize[0] }} spaces</Badge>
                    </div>
                    <Slider 
                      id="tab-size" 
                      v-model="editorSettings.tabSize" 
                      :min="2" 
                      :max="8" 
                      :step="2" 
                      class="flex-1"
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                  
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="drag-handle-width">Drag Handle Width</Label>
                      <Badge variant="outline">{{ editorSettings.dragHandleWidth[0] }}px</Badge>
                    </div>
                    <Slider 
                      id="drag-handle-width" 
                      v-model="editorSettings.dragHandleWidth" 
                      :min="16" 
                      :max="40" 
                      :step="2" 
                      class="flex-1"
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                      <Label for="indent-with-tabs">Indent with Tabs</Label>
                      <p class="text-sm text-muted-foreground">Use tabs instead of spaces for indentation</p>
                    </div>
                    <Switch 
                      id="indent-with-tabs" 
                      v-model="editorSettings.indentWithTabs" 
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                      <Label for="auto-save">Auto Save</Label>
                      <p class="text-sm text-muted-foreground">Automatically save changes as you type</p>
                    </div>
                    <Switch 
                      id="auto-save" 
                      v-model="editorSettings.autoSave" 
                      @update:modelValue="saveEditorSettings"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <!-- Advanced Tab -->
        <TabsContent value="advanced" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Data Management Card -->
            <Card class="overflow-hidden border-2 hover:border-primary/50 transition-all">
              <CardHeader class="bg-muted/50">
                <CardTitle class="flex items-center gap-2">
                  <Database class="h-5 w-5 text-primary" />
                  Data Management
                </CardTitle>
                <CardDescription>Manage your data and backups</CardDescription>
              </CardHeader>
              <CardContent class="pt-6">
                <div class="space-y-6">
                  <div class="space-y-2">
                    <h3 class="text-base font-medium">Export Data</h3>
                    <p class="text-sm text-muted-foreground mb-2">Export all your notas and settings as a backup</p>
                    <Button variant="default" @click="notaStore.exportAllNotas()" class="w-full flex items-center justify-center gap-2">
                      <DocumentDuplicateIcon class="h-4 w-4" />
                      Export All Data
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div class="space-y-2">
                    <h3 class="text-base font-medium">Cache Management</h3>
                    <p class="text-sm text-muted-foreground mb-2">Clear application cache to free up space</p>
                    <Button variant="outline" @click="clearCache" class="w-full flex items-center justify-center gap-2">
                      <TrashIcon class="h-4 w-4" />
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- System Information Card -->
            <Card class="overflow-hidden border-2 hover:border-primary/50 transition-all">
              <CardHeader class="bg-muted/50">
                <CardTitle class="flex items-center gap-2">
                  <ServerIcon class="h-5 w-5 text-primary" />
                  System Information
                </CardTitle>
                <CardDescription>View system details and performance</CardDescription>
              </CardHeader>
              <CardContent class="pt-6">
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <p class="text-sm text-muted-foreground">App Version</p>
                      <p class="font-medium">1.0.0</p>
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm text-muted-foreground">Storage Used</p>
                      <p class="font-medium">2.4 MB</p>
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm text-muted-foreground">Browser</p>
                      <p class="font-medium">{{ navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other' }}</p>
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm text-muted-foreground">Platform</p>
                      <p class="font-medium">{{ navigator.platform }}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div class="space-y-2">
                    <h3 class="text-base font-medium">Reset Application</h3>
                    <p class="text-sm text-muted-foreground mb-2">Reset all settings to their default values</p>
                    <Button variant="destructive" @click="resetAllSettings" class="w-full flex items-center justify-center gap-2">
                      <ArrowPathIcon class="h-4 w-4" />
                      Reset All Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>

  <!-- Add this dialog component at the end of the template, before the closing </template> tag -->
  <Dialog v-model:open="isEditingShortcut">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Keyboard Shortcut</DialogTitle>
        <DialogDescription v-if="currentEditingShortcut">
          Change the keyboard shortcut for "{{ currentEditingShortcut.description }}"
        </DialogDescription>
      </DialogHeader>
      
      <div class="py-4">
        <Label>Press the new key combination</Label>
        <Input 
          id="shortcut-input"
          v-model="newShortcutKey" 
          class="mt-2 shortcut-input" 
          placeholder="Press keys..." 
          @keydown.stop="captureKey" 
          @keydown.enter.prevent
          @keydown.space.prevent
          @keydown.tab.prevent
          readonly
        />
        
        <div v-if="newShortcutKey" class="mt-4 text-center">
          <p class="text-sm text-muted-foreground mb-2">New shortcut:</p>
          <div class="p-3 bg-muted/30 rounded-md inline-block" v-html="formatShortcutKey(newShortcutKey)"></div>
        </div>
        
        <p class="text-sm text-muted-foreground mt-4">
          Press the desired key combination (e.g., Ctrl+S, Alt+P)
        </p>
      </div>
      
      <DialogFooter>
        <Button variant="outline" @click="isEditingShortcut = false">Cancel</Button>
        <Button @click="saveShortcut">Save Changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  display: inline-block;
  min-width: 2.5em;
  text-align: center;
}

.card {
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.shortcut-input {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  text-align: center;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  background-color: var(--background);
  border: 2px solid var(--border);
}

.shortcut-flash {
  background-color: rgba(var(--primary), 0.1);
  border-color: var(--primary);
  transition: all 0.2s ease;
}

/* Add a hint that the input is waiting for keypress */
.shortcut-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary), 0.3);
}

/* Style for the shortcut preview */
.shortcut-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background-color: var(--muted);
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}

/* Make the kbd elements look nicer */
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  display: inline-block;
  min-width: 1.5em;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  color: var(--foreground);
  text-align: center;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  margin: 0 0.125rem;
}
</style> 