<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive, watchEffect } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { ActorType, type ActorConfig, type CustomActor } from '@/types/vibe'
import { Brain, FileText, BarChart, Code, ListTodo, CheckCheck, BarChart2, RefreshCcw, Plus, Trash2, Settings as SettingsIcon, Edit, Import, Download } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { aiService } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { v4 as uuidv4 } from 'uuid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const vibeStore = useVibeStore()
const aiSettings = useAISettingsStore()

// Wait for the database to initialize before loading configs
const loading = ref(!vibeStore.initialized)

// Create deep copies of actorConfigs and customActors
const actorConfigs = ref<Record<string, ActorConfig>>({})
const customActors = ref<CustomActor[]>([])

// Actor being edited and configuration
const selectedActorType = ref<ActorType>(ActorType.COMPOSER)
const selectedCustomActorId = ref<string | null>(null)
const selectedActorTab = ref<string>('settings')
const editingPrompt = ref(false)

// New custom actor form data
const newActorDialog = ref(false)
const newActorName = ref('')
const newActorDescription = ref('')
const newActorInstructions = ref('')

// Custom prompt editing
const actorPrompt = ref<string>('')

// Add a reactive variable for the selected view (config or prompts)
const selectedView = ref('config')

// Add a reactive map of actor prompts for editing
const actorPrompts = reactive<Record<string, string>>({})
// Store original prompts to enable reset functionality
const originalPrompts = reactive<Record<string, string>>({})
// Track which prompts have been modified
const modifiedPrompts = reactive<Record<string, boolean>>({})

// Default prompts for built-in actors
const defaultPrompts: Record<ActorType, string> = {
  [ActorType.PLANNER]: 'You are a strategic Planning AI assistant that creates detailed, actionable work plans for complex tasks. You excel at breaking down large objectives into logical, manageable subtasks.\n\nYour mission is to create a comprehensive, executable plan to accomplish this task effectively. The plan should be optimized for completeness, logical sequencing, dependency management, and appropriate task assignment.',
  [ActorType.RESEARCHER]: 'You are an expert Research AI assistant that excels at gathering, synthesizing, and organizing information on any topic. You provide comprehensive and factual information with proper citations when available.\n\nYour goal is to collect relevant information about the topic and present it in a clear, well-structured format that addresses all aspects of the query.',
  [ActorType.ANALYST]: 'You are an analytical AI assistant that specializes in examining data, identifying patterns, and drawing insightful conclusions. You excel at statistical analysis, data interpretation, and generating meaningful visualizations.\n\nYour task is to analyze the provided information critically, identify key trends and patterns, and provide actionable insights based on your analysis.',
  [ActorType.CODER]: 'You are an expert Coding AI assistant that specializes in generating clean, efficient, and well-documented code. You excel at implementing algorithms, debugging issues, and providing practical software solutions.\n\nYour task is to create functional, optimized code that follows best practices and solves the specific programming challenge presented to you.',
  [ActorType.COMPOSER]: 'You are an Orchestration AI assistant that coordinates and composes various elements into cohesive outputs. You excel at organizing information, structuring content, and ensuring consistency across different components.\n\nYour task is to take various inputs and compose them into a unified, coherent result that meets the specified requirements and goals.',
  [ActorType.WRITER]: 'You are a professional Writer AI assistant that specializes in creating comprehensive, well-structured reports in markdown format. You excel at organizing information logically, incorporating visualizations effectively, and presenting complex topics in an accessible manner.\n\nYour task is to create a cohesive report that integrates findings from various sources, includes appropriate visualizations with subfigure arrangements where helpful, and presents the information in a polished, professional format.',
  [ActorType.CUSTOM]: 'You are a custom AI assistant with specialized capabilities. Your role is to perform the specific task assigned to you based on your custom instructions.'
}

// Available models with reactive variables
const availableModels = ref(aiService.getAvailableGeminiModels())
const loadingModels = ref(false)

// Actor type descriptions
const actorDescriptions: Record<ActorType, string> = {
  [ActorType.PLANNER]: 'Creates detailed task plans with logical dependencies and workflow sequencing',
  [ActorType.RESEARCHER]: 'Specializes in gathering information, literature reviews, and comprehensive knowledge synthesis',
  [ActorType.ANALYST]: 'Analyzes data, creates visualizations, and extracts insights from information',
  [ActorType.CODER]: 'Generates code, implements algorithms, and provides technical solutions',
  [ActorType.COMPOSER]: 'Orchestrates and coordinates execution across multiple tasks',
  [ActorType.WRITER]: 'Creates comprehensive reports with markdown formatting and visualization integration',
  [ActorType.CUSTOM]: 'User-defined custom actor with specialized instructions'
}

// Initialize data from store when initialized
watch(() => vibeStore.initialized, (initialized) => {
  if (initialized && loading.value) {
    loading.value = false
    initializeFromStore()
  }
})

// Update selected actor enabled status
const updateActorEnabled = (value: boolean) => {
  if (selectedActorConfig.value) {
    selectedActorConfig.value.enabled = value
  }
}

// Update selected actor model ID
const setModelId = (value: string) => {
  if (selectedActorConfig.value) {
    selectedActorConfig.value.modelId = value
  }
}

// Update selected actor temperature
const setTemperature = (value: number) => {
  if (selectedActorConfig.value) {
    selectedActorConfig.value.temperature = value
  }
}

// Update selected actor max tokens
const setMaxTokens = (value: string | number) => {
  if (selectedActorConfig.value) {
    selectedActorConfig.value.maxTokens = typeof value === 'string' ? parseInt(value) : value
  }
}

// Confirm deletion of a custom actor
const confirmDeleteCustomActor = () => {
  if (selectedCustomActorId.value) {
    deleteCustomActor()
  }
}

// Function to initialize from store
function initializeFromStore() {
  actorConfigs.value = JSON.parse(JSON.stringify(vibeStore.actorConfigs))
  customActors.value = JSON.parse(JSON.stringify(vibeStore.getCustomActors()))
}

// Function to fetch Gemini models from API
const fetchGeminiModels = async () => {
  const apiKey = aiSettings.getApiKey('gemini')
  if (!apiKey) {
    toast({
      title: 'API Key Required',
      description: 'Please enter a Gemini API key in AI Settings to fetch available models.',
      variant: 'destructive'
    })
    return
  }
  
  try {
    loadingModels.value = true
    const models = await aiService.fetchAvailableGeminiModels(apiKey)
    availableModels.value = models
    
    toast({
      title: 'Models Loaded',
      description: `Found ${models.length} Gemini models.`
    })
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to fetch Gemini models. Using default models instead.',
      variant: 'destructive'
    })
  } finally {
    loadingModels.value = false
  }
}

// Function to get actor icon
const getActorIcon = (actorType: ActorType) => {
  switch (actorType) {
    case ActorType.PLANNER: return Brain
    case ActorType.RESEARCHER: return FileText
    case ActorType.ANALYST: return BarChart
    case ActorType.CODER: return Code
    case ActorType.COMPOSER: return ListTodo
    case ActorType.WRITER: return CheckCheck
    default: return Brain
  }
}

// Get the description for an actor type
const getActorDescription = (actorType: ActorType): string => {
  return actorDescriptions[actorType] || 'No description available'
}

// Get selected actor config
const selectedActorConfig = computed<ActorConfig>(() => {
  if (selectedCustomActorId.value) {
    const customActor = customActors.value.find(actor => actor.id === selectedCustomActorId.value)
    return customActor?.config || {
      enabled: false,
      modelId: '',
      temperature: 0.7,
      maxTokens: 4000
    }
  }
  return actorConfigs.value[selectedActorType.value] || {
    enabled: false,
    modelId: '',
    temperature: 0.7,
    maxTokens: 4000
  }
})

// Get the prompt for the selected actor
const getSelectedActorPrompt = () => {
  if (selectedCustomActorId.value) {
    const customActor = customActors.value.find(actor => actor.id === selectedCustomActorId.value)
    return customActor?.config?.customInstructions || defaultPrompts[ActorType.CUSTOM]
  }
  
  const config = actorConfigs.value[selectedActorType.value]
  return config?.customInstructions || defaultPrompts[selectedActorType.value]
}

// Watch for actor selection changes to update the prompt
watch([selectedActorType, selectedCustomActorId], () => {
  actorPrompt.value = getSelectedActorPrompt()
})

// Combined list of actors for the sidebar
const allActors = computed(() => {
  const builtInActors = Object.values(ActorType)
    .filter(type => type !== ActorType.CUSTOM) // Exclude the CUSTOM type itself
    .map(type => {
      const config = actorConfigs.value[type]
      return {
        id: type,
        name: getActorName(type),
        icon: getActorIcon(type),
        description: getActorDescription(type),
        isCustom: false,
        enabled: config?.enabled ?? true
      }
    })
    
  const customActorsList = customActors.value.map(actor => ({
    id: actor.id,
    name: actor.name,
    icon: SettingsIcon, // Use Settings icon for custom actors
    description: actor.description,
    isCustom: true,
    enabled: actor.config?.enabled ?? true
  }))
  
  return [...builtInActors, ...customActorsList]
})

// Save all actor configurations
const saveSettings = async () => {
  // Update prompt for the current actor
  updatePromptForCurrentActor()
  
  // Save all actors
  try {
    // Update all built-in actor configs
    for (const [type, config] of Object.entries(actorConfigs.value)) {
      await vibeStore.updateActorConfig(type as ActorType, config as ActorConfig)
    }
    
    // Update all custom actors
    for (const actor of customActors.value) {
      const existingActor = vibeStore.getCustomActor(actor.id)
      if (existingActor) {
        await vibeStore.updateCustomActor(actor.id, actor)
      } else {
        // Add new custom actor
        await vibeStore.addCustomActor(actor.name, actor.description, actor.config)
      }
    }
    
    // Remove any custom actors that were deleted
    const currentCustomActors = vibeStore.getCustomActors()
    for (const existingActor of currentCustomActors) {
      if (!customActors.value.some(actor => actor.id === existingActor.id)) {
        await vibeStore.removeCustomActor(existingActor.id)
      }
    }
    
    // Save all changes to the database
    await vibeStore.saveActorConfigs()

    // Show success toast
    toast({
      title: "Vibe Settings Saved",
      description: "Your Vibe actor configurations have been updated.",
      variant: "default"
    })
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save settings. Please try again.",
      variant: "destructive"
    })
  }
}

// Save the current prompt to the actor config
const updatePromptForCurrentActor = () => {
  if (editingPrompt.value) {
    if (selectedCustomActorId.value) {
      // Update custom actor prompt
      const index = customActors.value.findIndex(a => a.id === selectedCustomActorId.value)
      if (index !== -1) {
        customActors.value[index].config.customInstructions = actorPrompt.value
      }
    } else {
      // Update built-in actor prompt
      actorConfigs.value[selectedActorType.value].customInstructions = actorPrompt.value
    }
    
    editingPrompt.value = false
  }
}

// Reset the current prompt to default
const resetPromptToDefault = () => {
  if (selectedCustomActorId.value) {
    // For custom actors, use their description as basis
    const customActor = customActors.value.find(a => a.id === selectedCustomActorId.value)
    if (customActor) {
      actorPrompt.value = `You are a custom AI assistant named "${customActor.name}" with the following purpose:
${customActor.description}

Your task is to respond with the result of your work on the assigned task.`
    }
  } else {
    // For built-in actors, use the default prompt
    actorPrompt.value = defaultPrompts[selectedActorType.value]
  }
  
  // Immediately update the actor configuration
  updatePromptForCurrentActor()
  
  toast({
    title: "Prompt Reset",
    description: "The prompt has been reset to the default.",
    variant: "default"
  })
}

// Reset all actor configurations to defaults
const resetSettings = async () => {
  try {
    // Reload from the store
    await vibeStore.loadActorConfigs()
    initializeFromStore()
    
    // Reset the current prompt
    actorPrompt.value = getSelectedActorPrompt()
    editingPrompt.value = false
    
    toast({
      title: "Settings Reset",
      description: "Vibe settings have been reset to their current state.",
      variant: "default"
    })
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to reset settings. Please try again.",
      variant: "destructive"
    })
  }
}

// Handle temperature change with proper formatting
const temperatureFormatted = computed(() => {
  const temp = selectedActorConfig.value.temperature
  return temp !== undefined ? temp.toFixed(1) : "0.7"
})

// Temperature descriptions for the UI
const getTemperatureDescription = (temp: number): string => {
  if (temp <= 0.3) return "More precise, less creative"
  if (temp >= 0.7) return "More creative, less precise"
  return "Balanced precision and creativity"
}

// Handle actor selection
const selectActor = (actorId: string, isCustom: boolean) => {
  // Save current prompt if editing
  updatePromptForCurrentActor()
  
  if (isCustom) {
    selectedActorType.value = ActorType.CUSTOM
    selectedCustomActorId.value = actorId
  } else {
    selectedActorType.value = actorId as ActorType
    selectedCustomActorId.value = null
  }
  
  // Update the prompt for the newly selected actor
  actorPrompt.value = getSelectedActorPrompt()
  editingPrompt.value = false
}

// Edit prompt
const startEditingPrompt = () => {
  editingPrompt.value = true
}

// Cancel editing prompt
const cancelEditingPrompt = () => {
  // Revert to the original prompt
  actorPrompt.value = getSelectedActorPrompt()
  editingPrompt.value = false
}

// Save prompt
const savePrompt = () => {
  updatePromptForCurrentActor()
  
  toast({
    title: "Prompt Saved",
    description: "The prompt has been updated.",
    variant: "default"
  })
}

// Add new custom actor
const addCustomActor = async () => {
  if (!newActorName.value.trim()) {
    toast({
      title: "Error",
      description: "Actor name is required",
      variant: "destructive"
    })
    return
  }
  
  const newActor: CustomActor = {
    id: uuidv4(),
    name: newActorName.value,
    description: newActorDescription.value,
    config: {
      enabled: true,
      modelId: aiSettings.settings.geminiModel || 'google/gemini-pro',
      temperature: 0.5,
      maxTokens: 4000,
      name: newActorName.value,
      description: newActorDescription.value,
      customInstructions: newActorInstructions.value || `You are a custom AI assistant named "${newActorName.value}" with the following purpose:
${newActorDescription.value}

Your task is to respond with the result of your work on the assigned task.`,
      isCustom: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  customActors.value.push(newActor)
  
  // Select the new actor
  selectActor(newActor.id, true)
  
  // Reset form
  newActorName.value = ''
  newActorDescription.value = ''
  newActorInstructions.value = ''
  newActorDialog.value = false
  
  toast({
    title: "Custom Actor Added",
    description: `${newActor.name} has been added to your actors list`,
    variant: "default"
  })
}

// Delete selected custom actor
const deleteCustomActor = async () => {
  if (!selectedCustomActorId.value) return
  
  const actorToDelete = customActors.value.find(actor => actor.id === selectedCustomActorId.value)
  if (!actorToDelete) return
  
  const actorName = actorToDelete.name
  
  // Remove from the list
  customActors.value = customActors.value.filter(actor => actor.id !== selectedCustomActorId.value)
  
  // Select the first actor
  if (customActors.value.length > 0) {
    selectActor(customActors.value[0].id, true)
  } else {
    selectActor(ActorType.COMPOSER, false)
  }
  
  toast({
    title: "Custom Actor Deleted",
    description: `${actorName} has been removed from your actors list`,
    variant: "default"
  })
}

// Try to load models on mount
onMounted(async () => {
  // Initialize from store if already initialized
  if (vibeStore.initialized) {
    loading.value = false
    initializeFromStore()
  } else {
    // Wait for initialization
    await vibeStore.loadActorConfigs()
    loading.value = false
    initializeFromStore()
  }
  
  // Load prompt for initially selected actor
  actorPrompt.value = getSelectedActorPrompt()
  
  // Load models if API key is available
  const apiKey = aiSettings.getApiKey('gemini')
  if (apiKey) {
    fetchGeminiModels()
  }
  
  // Set default model to match user's AI settings preferred model
  const preferredModel = aiSettings.settings.geminiModel
  if (preferredModel) {
    // Update all actor configs to use the preferred model
    Object.keys(actorConfigs.value).forEach(actorType => {
      actorConfigs.value[actorType].modelId = preferredModel
    })
  }
})

// Export actor configurations
const exportConfigurations = () => {
  try {
    // Create export object with both built-in and custom actors
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      actorConfigs: actorConfigs.value,
      customActors: customActors.value
    }
    
    // Convert to JSON string
    const jsonContent = JSON.stringify(exportData, null, 2)
    
    // Create a blob and download link
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    // Create a temporary link and trigger download
    const a = document.createElement('a')
    a.href = url
    a.download = `vibe-actors-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    
    // Clean up
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Export Successful",
      description: "Actor configurations have been exported",
      variant: "default"
    })
  } catch (error) {
    toast({
      title: "Export Failed",
      description: "Failed to export actor configurations",
      variant: "destructive"
    })
  }
}

// Import actor configurations
const importConfigurations = async (event: Event) => {
  const fileInput = event.target as HTMLInputElement
  const file = fileInput.files?.[0]
  
  if (!file) {
    toast({
      title: "Import Failed",
      description: "No file selected",
      variant: "destructive"
    })
    return
  }
  
  try {
    // Read the file content
    const content = await file.text()
    const importData = JSON.parse(content)
    
    // Validate the import data
    if (!importData.version || !importData.actorConfigs) {
      throw new Error("Invalid import file format")
    }
    
    // Update the actor configurations
    if (importData.actorConfigs) {
      // Validate each actor config and only import valid ones
      Object.entries(importData.actorConfigs).forEach(([type, config]) => {
        if (type in ActorType) {
          // Ensure config has the required properties with default values if missing
          const safeConfig: ActorConfig = {
            enabled: (config as any)?.enabled ?? true,
            modelId: (config as any)?.modelId ?? 'claude-3-5-sonnet',
            temperature: (config as any)?.temperature ?? 0.7,
            maxTokens: (config as any)?.maxTokens ?? 4000,
            customInstructions: (config as any)?.customInstructions ?? '',
            name: (config as any)?.name ?? '',
            description: (config as any)?.description ?? '',
            isCustom: (config as any)?.isCustom ?? false
          };
          
          actorConfigs.value[type] = safeConfig;
        }
      })
    }
    
    // Update custom actors
    if (importData.customActors && Array.isArray(importData.customActors)) {
      // Add imported custom actors, avoiding duplicates by checking IDs
      const existingIds = new Set(customActors.value.map(a => a.id))
      
      importData.customActors.forEach((actor: any) => {
        if (actor.id && actor.name && actor.config) {
          const safeConfig: ActorConfig = {
            enabled: actor.config?.enabled ?? true,
            modelId: actor.config?.modelId ?? 'claude-3-5-sonnet',
            temperature: actor.config?.temperature ?? 0.7,
            maxTokens: actor.config?.maxTokens ?? 4000,
            customInstructions: actor.config?.customInstructions ?? '',
            name: actor.config?.name ?? '',
            description: actor.config?.description ?? '',
            isCustom: true
          };
          
          if (!existingIds.has(actor.id)) {
            customActors.value.push({
              id: actor.id,
              name: actor.name,
              description: actor.description || '',
              config: safeConfig,
              createdAt: new Date(actor.createdAt) || new Date(),
              updatedAt: new Date()
            })
          }
        }
      })
    }
    
    // Reset the file input
    fileInput.value = ''
    
    // Save changes to the database
    saveSettings();
    
    toast({
      title: "Import Successful",
      description: "Actor configurations have been imported",
      variant: "default"
    })
  } catch (error) {
    toast({
      title: "Import Failed",
      description: error instanceof Error ? error.message : "Failed to import actor configurations",
      variant: "destructive"
    })
    
    // Reset the file input
    fileInput.value = ''
  }
}

// Helper function to get actor enabled status
const getActorEnabled = (actor: { id: string; isCustom: boolean; enabled?: boolean }) => {
  return actor.enabled ?? false
}

// Track if the actor being edited is custom
const isEditingCustomActor = computed(() => {
  return selectedCustomActorId.value?.startsWith('CUSTOM')
})

// Load the actor prompts when the component is mounted or when the selected actor changes
watchEffect(async () => {
  if (selectedActorType.value) {
    const actorId = selectedActorType.value
    const isCustom = actorId === ActorType.CUSTOM
    const effectiveId = isCustom && selectedCustomActorId.value ? 
      selectedCustomActorId.value : actorId
    
    const config = vibeStore.getActorConfig(actorId as ActorType)
    if (config) {
      actorPrompts[effectiveId] = config.customInstructions || ''
      originalPrompts[effectiveId] = config.customInstructions || ''
      modifiedPrompts[effectiveId] = false
    }
  }
})

// Update the actor prompt
function updateActorPrompt(actorId: string, prompt: string) {
  actorPrompts[actorId] = prompt
  modifiedPrompts[actorId] = prompt !== originalPrompts[actorId]
}

// Save the edited actor prompt
async function saveActorPrompt(actorId: string) {
  try {
    if (!actorPrompts[actorId]) return
    
    const config = vibeStore.getActorConfig(actorId as ActorType)
    
    if (config) {
      config.customInstructions = actorPrompts[actorId]
      await vibeStore.updateActorConfig(actorId as ActorType, config)
      
      originalPrompts[actorId] = actorPrompts[actorId]
      modifiedPrompts[actorId] = false
      
      toast({
        title: "Prompt Saved",
        description: `The prompt for "${getActorName(actorId)}" has been saved.`
      })
    }
  } catch (error) {
    console.error("Error saving actor prompt:", error)
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to save the actor prompt."
    })
  }
}

// Reset the actor prompt to its original value
function resetActorPrompt(actorId: string) {
  actorPrompts[actorId] = originalPrompts[actorId]
  modifiedPrompts[actorId] = false
}

// Get the actor name based on type
function getActorName(actorType: string): string {
  if (actorType === ActorType.CUSTOM && selectedCustomActorId.value) {
    const customActor = customActors.value.find(actor => actor.id === selectedCustomActorId.value)
    return customActor ? customActor.name : 'Custom Actor'
  }
  
  // Return normal actor names
  return actorDescriptions[actorType as ActorType] || actorType
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex flex-col h-full space-y-4 p-4">
      <!-- Tabs for switching between configuration and prompts -->
      <Tabs v-model="selectedView" class="w-full h-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="prompts">Actor Prompts</TabsTrigger>
        </TabsList>
        
        <!-- Configuration Tab -->
        <TabsContent value="config" class="h-full overflow-hidden">
          <!-- Existing configuration UI -->
          <div class="grid grid-cols-4 gap-4 h-full">
            <!-- Actor Selection Sidebar -->
            <div class="flex flex-col h-full border-r dark:border-gray-700 overflow-y-auto">
              <div class="p-2">
                <h3 class="text-xl font-semibold mb-4">Actors</h3>
                <div class="flex flex-col space-y-2">
                  <!-- Built-in Actors -->
                  <div class="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">
                    Built-in Actors
                  </div>
                  <button
                    v-for="type in Object.values(ActorType)"
                    :key="type"
                    class="flex items-center rounded-lg py-2 px-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="selectedActorType === type ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''"
                    @click="selectedCustomActorId = null; selectedActorType = type"
                  >
                    <span v-if="vibeStore.getActorConfig(type as ActorType)?.enabled" class="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                    <span v-else class="mr-2 h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    {{ type }}
                  </button>
  
                  <!-- Custom Actors -->
                  <div v-if="customActors.length > 0" class="text-sm font-medium mt-4 mb-1 text-gray-500 dark:text-gray-400">
                    Custom Actors
                  </div>
                  <button
                    v-for="actor in customActors"
                    :key="actor.id"
                    class="flex items-center rounded-lg py-2 px-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="selectedCustomActorId === actor.id ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''"
                    @click="selectedCustomActorId = actor.id; selectedActorType = ActorType.CUSTOM"
                  >
                    <span v-if="actor.config.enabled" class="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                    <span v-else class="mr-2 h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    {{ actor.name }}
                  </button>
  
                  <!-- Add Custom Actor Button -->
                  <Button @click="newActorDialog = true" class="mt-2">
                    <i class="i-lucide-plus mr-1"></i> Add Custom Actor
                  </Button>
                </div>
              </div>
            </div>
  
            <!-- Actor Configuration -->
            <div class="col-span-3 flex flex-col h-full px-4">
              <!-- Config Editor -->
              <div v-if="selectedActorType">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-2xl font-bold">
                    {{ getActorName(selectedActorType) }} Configuration
                  </h2>
                  <div class="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click="resetSettings"
                    >
                      <i class="i-lucide-rotate-ccw mr-1"></i> Reset
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      @click="saveSettings"
                    >
                      <i class="i-lucide-save mr-1"></i> Save
                    </Button>
                  </div>
                </div>
                
                <Card class="mb-6">
                  <CardHeader>
                    <CardTitle>Activation</CardTitle>
                    <CardDescription>Enable or disable this actor in the Vibe system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div class="flex items-center space-x-2">
                      <Switch 
                        id="actor-enabled"
                        v-model="selectedActorConfig.enabled"
                        @update:model-value="updateActorEnabled"
                      />
                      <Label for="actor-enabled">{{ selectedActorConfig.enabled ? 'Enabled' : 'Disabled' }}</Label>
                    </div>
                  </CardContent>
                </Card>
                
                <Card class="mb-6">
                  <CardHeader>
                    <CardTitle>AI Model Settings</CardTitle>
                    <CardDescription>Select which model to use for this actor and adjust parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <Label for="model-id">Model</Label>
                        <Select 
                          v-model="selectedActorConfig.modelId"
                          @update:model-value="setModelId"
                        >
                          <SelectTrigger id="model-id">
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem 
                              v-for="model in availableModels" 
                              :key="model.id" 
                              :value="model.id"
                            >
                              {{ model.name }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div class="space-y-2">
                        <Label>Temperature: {{ selectedActorConfig.temperature?.toFixed(1) || '0.7' }}</Label>
                        <Slider
                          :model-value="[selectedActorConfig.temperature || 0.7]"
                          :min="0"
                          :max="1"
                          :step="0.1"
                          @update:model-value="value => value && setTemperature(value[0])"
                        />
                        <div class="flex justify-between text-xs text-gray-500">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                      </div>
                      
                      <div class="space-y-2">
                        <Label for="max-tokens">Max Tokens: {{ selectedActorConfig.maxTokens || '2000' }}</Label>
                        <Input
                          id="max-tokens"
                          :value="selectedActorConfig.maxTokens"
                          type="number"
                          :min="100"
                          :max="8000"
                          @update:model-value="setMaxTokens"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <!-- Delete Button for Custom Actors -->
                <Button 
                  v-if="selectedActorType === ActorType.CUSTOM && selectedCustomActorId"
                  variant="destructive"
                  class="mt-4"
                  @click="confirmDeleteCustomActor"
                >
                  <i class="i-lucide-trash-2 mr-1"></i> Delete Custom Actor
                </Button>
              </div>
              
              <div v-else class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="i-lucide-settings-2 text-6xl mb-4"></i>
                <p class="text-lg">Select an actor to configure</p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <!-- Prompts Tab -->
        <TabsContent value="prompts" class="h-full overflow-hidden">
          <div class="grid grid-cols-4 gap-4 h-full">
            <!-- Actor Selection Sidebar -->
            <div class="flex flex-col h-full border-r dark:border-gray-700 overflow-y-auto">
              <div class="p-2">
                <h3 class="text-xl font-semibold mb-4">Select Actor</h3>
                <div class="flex flex-col space-y-2">
                  <!-- Built-in Actors -->
                  <div class="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">
                    Built-in Actors
                  </div>
                  <button
                    v-for="type in Object.values(ActorType)"
                    :key="type"
                    class="flex items-center rounded-lg py-2 px-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="selectedActorType === type ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''"
                    @click="selectedCustomActorId = null; selectedActorType = type"
                  >
                    <span v-if="vibeStore.getActorConfig(type as ActorType)?.enabled" class="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                    <span v-else class="mr-2 h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    {{ type }}
                  </button>

                  <!-- Custom Actors -->
                  <div v-if="customActors.length > 0" class="text-sm font-medium mt-4 mb-1 text-gray-500 dark:text-gray-400">
                    Custom Actors
                  </div>
                  <button
                    v-for="actor in customActors"
                    :key="actor.id"
                    class="flex items-center rounded-lg py-2 px-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    :class="selectedCustomActorId === actor.id ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''"
                    @click="selectedCustomActorId = actor.id; selectedActorType = ActorType.CUSTOM"
                  >
                    <span v-if="actor.config.enabled" class="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                    <span v-else class="mr-2 h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    {{ actor.name }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Prompt Editor -->
            <div class="col-span-3 flex flex-col h-full px-4 overflow-y-auto">
              <div v-if="selectedActorType" class="flex flex-col h-full">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-2xl font-bold">
                    {{ getActorName(selectedActorType) }} Prompt
                  </h2>
                  <div class="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      :disabled="!modifiedPrompts[selectedActorType]"
                      @click="resetActorPrompt(selectedActorType)"
                    >
                      <i class="i-lucide-rotate-ccw mr-1"></i> Reset
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      :disabled="!modifiedPrompts[selectedActorType]"
                      @click="saveActorPrompt(selectedActorType)"
                    >
                      <i class="i-lucide-save mr-1"></i> Save
                    </Button>
                  </div>
                </div>

                <div class="mb-4">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Edit the instructions used by the AI when performing tasks with this actor.
                    You can use <code>{task}</code> or <code>{taskDescription}</code> as placeholders 
                    for the task description.
                  </p>
                </div>

                <Textarea
                  v-model="actorPrompts[selectedActorType]"
                  class="flex-grow font-mono text-sm h-[400px]"
                  placeholder="Enter custom instructions for this actor..."
                  @update:model-value="value => updateActorPrompt(selectedActorType, String(value))"
                />
              </div>
              <div v-else class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="i-lucide-message-square-text text-6xl mb-4"></i>
                <p class="text-lg">Select an actor to edit its prompt</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    
    <!-- Dialog for creating new custom actor -->
    <Dialog v-model:open="newActorDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Custom Actor</DialogTitle>
          <DialogDescription>
            Create a new custom actor with custom instructions.
          </DialogDescription>
        </DialogHeader>
        
        <form @submit.prevent="addCustomActor">
          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <Label for="name">Name</Label>
              <Input id="name" v-model="newActorName" placeholder="Enter actor name" />
            </div>
            
            <div class="grid gap-2">
              <Label for="description">Description</Label>
              <Textarea id="description" v-model="newActorDescription" placeholder="Enter actor description" />
            </div>
            
            <div class="grid gap-2">
              <Label for="instructions">Instructions</Label>
              <Textarea 
                id="instructions" 
                v-model="newActorInstructions" 
                placeholder="Enter custom instructions for the AI" 
                class="min-h-[150px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" @click="newActorDialog = false">
              Cancel
            </Button>
            <Button type="submit">Create Actor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template> 