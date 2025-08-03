<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center text-xl font-semibold">
        <component :is="icon" class="mr-2 h-5 w-5" /> 
        {{ title }}
      </CardTitle>
      <CardDescription>
        {{ description }}
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <slot name="content" :props="{ 
        isConnected, 
        isLoading, 
        connectionStatus,
        handleSave: saveSettings,
        handleTest: testConnection,
        handleRefresh: refreshModels
      }" />
    </CardContent>
    
    <CardFooter v-if="showActions">
      <div class="flex justify-between w-full">
        <slot name="actions-left" />
        <div class="flex gap-2">
          <Button 
            v-if="showTestButton" 
            variant="outline" 
            @click="testConnection"
            :disabled="isLoading || isTesting"
          >
            <RefreshCwIcon :class="{'animate-spin': isTesting}" class="mr-2 h-4 w-4" />
            {{ testButtonText }}
          </Button>
          <Button 
            @click="saveSettings"
            :disabled="isLoading || !hasChanges"
          >
            <Save class="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { RefreshCwIcon, Save } from 'lucide-vue-next'

export interface BaseProviderSettingsProps {
  title: string
  description: string
  icon: any
  providerId: string
  showActions?: boolean
  showTestButton?: boolean
  testButtonText?: string
}

export interface BaseProviderSettingsEmits {
  (e: 'save', settings: Record<string, any>): void
  (e: 'test'): Promise<boolean>
  (e: 'refresh'): Promise<void>
  (e: 'connection-changed', isConnected: boolean): void
}

const props = withDefaults(defineProps<BaseProviderSettingsProps>(), {
  showActions: true,
  showTestButton: true,
  testButtonText: 'Test Connection'
})

const emit = defineEmits<BaseProviderSettingsEmits>()

// State
const isLoading = ref(false)
const isTesting = ref(false)
const isConnected = ref(false)
const hasChanges = ref(false)

// Computed
const connectionStatus = computed(() => ({
  connected: isConnected.value,
  loading: isLoading.value,
  testing: isTesting.value
}))

// Methods
const saveSettings = async () => {
  try {
    isLoading.value = true
    // Emit save event to parent component
    emit('save', {})
    hasChanges.value = false
    
    toast({
      title: 'Settings Saved',
      description: `${props.title} settings have been updated.`,
    })
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to save settings.',
      variant: 'destructive'
    })
  } finally {
    isLoading.value = false
  }
}

const testConnection = async () => {
  try {
    isTesting.value = true
    const result = await emit('test')
    isConnected.value = result
    emit('connection-changed', result)
    
    toast({
      title: result ? 'Connection Successful' : 'Connection Failed',
      description: result 
        ? `Successfully connected to ${props.title}.`
        : `Failed to connect to ${props.title}.`,
      variant: result ? 'default' : 'destructive'
    })
  } catch (error) {
    isConnected.value = false
    emit('connection-changed', false)
    
    toast({
      title: 'Connection Error',
      description: 'An error occurred while testing the connection.',
      variant: 'destructive'
    })
  } finally {
    isTesting.value = false
  }
}

const refreshModels = async () => {
  try {
    isLoading.value = true
    await emit('refresh')
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to refresh models.',
      variant: 'destructive'
    })
  } finally {
    isLoading.value = false
  }
}

// Expose methods for parent components
defineExpose({
  setConnected: (connected: boolean) => {
    isConnected.value = connected
  },
  setLoading: (loading: boolean) => {
    isLoading.value = loading
  },
  setHasChanges: (changes: boolean) => {
    hasChanges.value = changes
  }
})
</script> 








