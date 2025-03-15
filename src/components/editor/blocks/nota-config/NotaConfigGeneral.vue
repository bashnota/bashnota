<script setup lang="ts">
import { ref } from 'vue'
import type { JupyterServer, KernelSpec, KernelConfig } from '@/types/jupyter'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useNotaStore } from '@/stores/nota'
import { toast } from '@/lib/utils'

const props = defineProps<{
  notaId: string
  config: {
    jupyterServers: JupyterServer[]
    kernels: Record<string, KernelSpec[]>
    kernelPreferences: Record<string, KernelConfig>
    savedSessions: Array<{ id: string; name: string }>
    settings?: {
      autoSave: boolean
      defaultKernel?: string
      theme?: 'light' | 'dark' | 'system'
      fontSize?: number
      lineNumbers?: boolean
    }
  }
}>()

const store = useNotaStore()

// Settings form
const settingsForm = ref({
  autoSave: props.config.settings?.autoSave ?? true,
  defaultKernel: props.config.settings?.defaultKernel ?? '',
  theme: props.config.settings?.theme ?? 'system',
  fontSize: props.config.settings?.fontSize ?? 14,
  lineNumbers: props.config.settings?.lineNumbers ?? true,
})

// Save settings
const saveSettings = async () => {
  await store.updateNotaConfig(props.notaId, (config) => {
    config.settings = {
      autoSave: settingsForm.value.autoSave,
      defaultKernel: settingsForm.value.defaultKernel,
      theme: settingsForm.value.theme,
      fontSize: settingsForm.value.fontSize,
      lineNumbers: settingsForm.value.lineNumbers
    }
  })
  toast('Settings saved successfully')
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>General Settings</CardTitle>
      <CardDescription>Configure general settings for your Nota</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="saveSettings" class="space-y-6">
        <!-- Auto Save -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Auto Save</Label>
            <p class="text-sm text-muted-foreground">
              Automatically save changes to your notebooks
            </p>
          </div>
          <Switch v-model="settingsForm.autoSave" />
        </div>

        <!-- Theme -->
        <div class="space-y-2">
          <Label>Theme</Label>
          <select
            v-model="settingsForm.theme"
            class="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <!-- Font Size -->
        <div class="space-y-2">
          <Label>Font Size</Label>
          <Input
            v-model="settingsForm.fontSize"
            type="number"
            min="8"
            max="32"
            class="w-32"
          />
        </div>

        <!-- Line Numbers -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Show Line Numbers</Label>
            <p class="text-sm text-muted-foreground">
              Display line numbers in code cells
            </p>
          </div>
          <Switch v-model="settingsForm.lineNumbers" />
        </div>

        <!-- Default Kernel -->
        <div class="space-y-2">
          <Label>Default Kernel</Label>
          <select
            v-model="settingsForm.defaultKernel"
            class="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="">Auto Select</option>
            <template v-for="server in config.jupyterServers" :key="server.ip">
              <template v-for="kernel in config.kernels[`${server.ip}:${server.port}`] || []" :key="kernel.name">
                <option :value="kernel.name">
                  {{ kernel.spec.display_name }} ({{ server.ip }}:{{ server.port }})
                </option>
              </template>
            </template>
          </select>
          <p class="text-sm text-muted-foreground">
            Choose the default kernel for new notebooks
          </p>
        </div>

        <div class="flex justify-end">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template> 