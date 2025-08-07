<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RotateCw, Pencil, Keyboard } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useShortcutsStore } from '@/stores/shortcutsStore'

const shortcutsStore = useShortcutsStore()

// Shortcuts editing state
const isEditingShortcut = ref(false)
const currentEditingShortcut = ref<{ id?: string; key: string; description: string; category?: string } | null>(null)
const newShortcutKey = ref('')

// Editor shortcuts
const editorShortcuts = computed(() => {
  return shortcutsStore.shortcuts.filter(shortcut => 
    shortcut.category === 'editor' || 
    ['bold-text', 'italic-text', 'commands-menu', 'focus-editor'].includes(shortcut.id || '')
  )
})

// Load shortcuts
onMounted(() => {
  shortcutsStore.loadShortcuts()
})

// Shortcut editing functions
function editShortcut(shortcut: { id?: string; key: string; description: string; category?: string }) {
  currentEditingShortcut.value = shortcut
  newShortcutKey.value = shortcut.key
  isEditingShortcut.value = true
}

function saveShortcut() {
  if (currentEditingShortcut.value && newShortcutKey.value) {
    const shortcutId = currentEditingShortcut.value.id || '';
    
    shortcutsStore.updateShortcut(
      shortcutId, 
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

function captureKey(event: KeyboardEvent) {
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
  
  // Update the shortcut key
  newShortcutKey.value = `${meta}${ctrl}${alt}${shift}${key}`
  
  // Visual feedback
  const inputElement = document.getElementById('shortcut-input')
  if (inputElement) {
    inputElement.classList.add('shortcut-flash')
    setTimeout(() => {
      inputElement.classList.remove('shortcut-flash')
    }, 200)
  }
}

function resetEditorShortcuts() {
  if (confirm('Are you sure you want to reset editor keyboard shortcuts to default?')) {
    // Reset only editor shortcuts
    editorShortcuts.value.forEach(shortcut => {
      if (shortcut.id) {
        shortcutsStore.resetShortcut(shortcut.id)
      }
    })
    
    toast({
      title: 'Shortcuts Reset',
      description: 'Editor keyboard shortcuts have been reset to default values',
      variant: 'default'
    })
  }
}

function formatShortcutKey(key: string) {
  return key.split('+').map(part => {
    return `<kbd class="px-2 py-1 mx-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">${part}</kbd>`
  }).join('')
}

// Reset to defaults
const resetToDefaults = () => {
  resetEditorShortcuts()
}

// Expose methods for parent components
defineExpose({
  resetToDefaults
})
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Overview -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <Keyboard class="h-5 w-5" />
              Editor Shortcuts
            </CardTitle>
            <CardDescription>
              Configure keyboard shortcuts for editor-specific actions
            </CardDescription>
          </div>
          <Button variant="outline" @click="resetEditorShortcuts" class="flex items-center gap-2">
            <RotateCw class="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardHeader>
    </Card>

    <!-- Editor Shortcuts Table -->
    <Card>
      <CardHeader>
        <CardTitle>Editor Actions</CardTitle>
        <CardDescription>Shortcuts for text editing and formatting</CardDescription>
      </CardHeader>
      <CardContent>
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
              <TableRow v-for="shortcut in editorShortcuts" :key="shortcut.id">
                <TableCell class="font-medium">{{ shortcut.description }}</TableCell>
                <TableCell>
                  <div v-html="formatShortcutKey(shortcut.key)"></div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" @click="editShortcut(shortcut)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <div v-if="editorShortcuts.length === 0" class="text-center py-8">
            <Keyboard class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p class="text-muted-foreground">No editor shortcuts configured</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Help -->
    <Card>
      <CardHeader>
        <CardTitle>Tips</CardTitle>
        <CardDescription>Getting the most out of editor shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 text-sm text-muted-foreground">
          <p>• Use Ctrl/Cmd + key combinations for most actions</p>
          <p>• Alt + key combinations are great for secondary actions</p>
          <p>• Avoid conflicts with browser shortcuts</p>
          <p>• Keep shortcuts memorable and consistent with other editors</p>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Edit Shortcut Dialog -->
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

.shortcut-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary), 0.3);
}

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