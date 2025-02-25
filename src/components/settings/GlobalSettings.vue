<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServerIcon, CpuChipIcon, Cog6ToothIcon } from '@heroicons/vue/24/solid'
import { CommandLineIcon } from '@heroicons/vue/24/outline'
import { Keyboard } from 'lucide-vue-next'

// Import the shortcuts from ShortcutsDialog
const shortcuts = [
  { key: '⌘ K', description: 'Open global search' },
  { key: '⌘ N', description: 'Create new nota' },
  { key: '⌘ /', description: 'Focus editor' },
  { key: '/', description: 'Open commands menu (in editor)' },
  { key: '⌘ B', description: 'Bold text (in editor)' },
  { key: '⌘ I', description: 'Italic text (in editor)' },
  { key: 'Esc', description: 'Close dialogs / Cancel editing' },
]

const blockShortcuts = [
  { key: 'Ctrl+Shift+Alt+C', description: 'Insert code block' },
  { key: 'Ctrl+Shift+Alt+T', description: 'Insert table' },
  { key: 'Ctrl+Shift+Alt+I', description: 'Insert image' },
  { key: 'Ctrl+Shift+Alt+M', description: 'Insert math block' },
  { key: 'Ctrl+Shift+Alt+D', description: 'Insert Mermaid diagram' },
  { key: 'Ctrl+Shift+Alt+Y', description: 'Insert YouTube video' },
  { key: 'Ctrl+Shift+Alt+S', description: 'Insert scatter plot' },
  { key: 'Ctrl+Shift+Alt+F', description: 'Insert subfigures' },
  { key: 'Ctrl+Shift+Alt+H', description: 'Insert horizontal rule' },
  { key: 'Ctrl+Shift+Alt+Q', description: 'Insert blockquote' },
  { key: 'Ctrl+Shift+Alt+K', description: 'Insert task list' },
  { key: 'Ctrl+Shift+Alt+G', description: 'Insert Draw.io diagram' },
  { key: 'Ctrl+Shift+Alt+B', description: 'Insert data table' },
]
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold tracking-tight">Global Settings</h2>
      </div>

      <Tabs default-value="shortcuts" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="shortcuts">
            <div class="flex items-center justify-center gap-2 p-1">
              <CommandLineIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Keyboard Shortcuts</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <div class="flex items-center justify-center gap-2 p-1">
              <Cog6ToothIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Appearance</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <div class="flex items-center justify-center gap-2 p-1">
              <ServerIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Advanced</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <!-- Shortcuts Tab -->
        <TabsContent value="shortcuts">
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-medium mb-3">General</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div v-for="shortcut in shortcuts" :key="shortcut.key" class="flex items-center gap-3">
                      <kbd class="px-2 py-1 bg-muted border rounded text-sm font-mono min-w-16 text-center">
                        {{ shortcut.key }}
                      </kbd>
                      <span>{{ shortcut.description }}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-medium mb-3">Insert Blocks</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div v-for="shortcut in blockShortcuts" :key="shortcut.key" class="flex items-center gap-3">
                      <kbd class="px-2 py-1 bg-muted border rounded text-sm font-mono min-w-16 text-center">
                        {{ shortcut.key }}
                      </kbd>
                      <span>{{ shortcut.description }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Appearance Tab -->
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">Customize the look and feel of the application.</p>
              <!-- Add appearance settings here in the future -->
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Advanced Tab -->
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">Configure advanced application settings.</p>
              <!-- Add advanced settings here in the future -->
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style> 