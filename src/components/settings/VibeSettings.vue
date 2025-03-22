<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { ActorType, type ActorConfig } from '@/types/vibe'
import { getActorName } from '@/components/editor/blocks/vibe-block/utils'
import { Brain, FileText, BarChart, Code, ListTodo, CheckCheck, BarChart2, RefreshCcw } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { aiService } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

const vibeStore = useVibeStore()
const aiSettings = useAISettingsStore()
// Create a deep copy of actorConfigs
const actorConfigs = ref(JSON.parse(JSON.stringify(vibeStore.actorConfigs)))
const selectedActorType = ref<ActorType>(ActorType.COMPOSER)

// Available models with reactive variables
const availableModels = ref(aiService.getAvailableGeminiModels())
const loadingModels = ref(false)

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
    case ActorType.SUMMARIZER: return ListTodo
    case ActorType.REVIEWER: return CheckCheck
    case ActorType.VISUALIZER: return BarChart2
    case ActorType.COMPOSER: return ListTodo
    default: return Brain
  }
}

// Actor descriptions for UI
const actorDescriptions = {
  [ActorType.PLANNER]: 'Plans the execution of tasks by creating detailed workflows.',
  [ActorType.RESEARCHER]: 'Gathers information through research on a given topic.',
  [ActorType.ANALYST]: 'Analyzes data and generates insights and visualizations.',
  [ActorType.CODER]: 'Writes and optimizes code to solve programming problems.',
  [ActorType.SUMMARIZER]: 'Creates concise summaries of complex information.',
  [ActorType.REVIEWER]: 'Provides critical evaluations and improvement suggestions.',
  [ActorType.VISUALIZER]: 'Creates visual representations of data and concepts.',
  [ActorType.COMPOSER]: 'Orchestrates the execution of all other actors.'
}

// Get the description for an actor type
const getActorDescription = (actorType: ActorType): string => {
  return actorDescriptions[actorType] || 'No description available'
}

// List of all actor types for UI
const actorTypesList = computed(() => {
  return Object.values(ActorType).map(type => ({
    type,
    name: getActorName(type),
    icon: getActorIcon(type),
    description: getActorDescription(type)
  }))
})

// Get selected actor config
const selectedActorConfig = computed(() => actorConfigs.value[selectedActorType.value])

// Save all actor configurations
const saveSettings = () => {
  // Update all actor configs
  Object.entries(actorConfigs.value).forEach(([type, config]) => {
    vibeStore.updateActorConfig(type as ActorType, config as ActorConfig)
  })

  // Show success toast
  toast({
    title: "Vibe Settings Saved",
    description: "Your Vibe actor configurations have been updated.",
    variant: "default"
  })
}

// Reset all actor configurations to defaults
const resetSettings = () => {
  // Restore from the store's current state
  actorConfigs.value = JSON.parse(JSON.stringify(vibeStore.actorConfigs))
  
  toast({
    title: "Settings Reset",
    description: "Vibe settings have been reset to their current state.",
    variant: "default"
  })
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

// Try to load models on mount
onMounted(() => {
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
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center text-xl font-semibold">
          <Brain class="mr-2 h-5 w-5" /> Vibe Settings
        </CardTitle>
        <CardDescription>
          Configure AI actors used in the Vibe system
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Actor Selection Sidebar -->
          <div class="space-y-4 border-r md:pr-4">
            <h3 class="text-lg font-medium mb-2">Actors</h3>
            
            <div class="space-y-2">
              <div 
                v-for="actor in actorTypesList" 
                :key="actor.type"
                @click="selectedActorType = actor.type"
                class="flex items-center p-2 rounded-md cursor-pointer transition-colors"
                :class="{ 
                  'bg-primary/10 border-l-4 border-primary': selectedActorType === actor.type,
                  'hover:bg-muted': selectedActorType !== actor.type
                }"
              >
                <component :is="actor.icon" class="h-5 w-5 mr-3" />
                <div>
                  <div class="font-medium">{{ actor.name }}</div>
                  <div class="text-xs text-muted-foreground truncate max-w-[200px]">
                    {{ actor.description }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Actor Configuration Panel -->
          <div class="col-span-1 md:col-span-2 space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium">
                <component :is="getActorIcon(selectedActorType)" class="h-5 w-5 inline mr-2" />
                {{ getActorName(selectedActorType) }} Settings
              </h3>
              
              <Badge variant="outline">
                {{ actorConfigs[selectedActorType].enabled ? 'Enabled' : 'Disabled' }}
              </Badge>
            </div>
            
            <p class="text-sm text-muted-foreground">
              {{ getActorDescription(selectedActorType) }}
            </p>
            
            <Separator />
            
            <!-- Enable/Disable Switch -->
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label :for="`${selectedActorType}-enabled`">Enable Actor</Label>
                <p class="text-sm text-muted-foreground">Allow this actor to be used in Vibe tasks</p>
              </div>
              <Switch 
                :id="`${selectedActorType}-enabled`" 
                v-model="selectedActorConfig.enabled"
              />
            </div>
            
            <!-- Model Selection -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label :for="`${selectedActorType}-model`">AI Model</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  @click="fetchGeminiModels" 
                  :disabled="loadingModels"
                  class="h-8 px-2 text-xs"
                >
                  <RefreshCcw :class="{'animate-spin': loadingModels}" class="mr-2 h-3 w-3" />
                  Refresh Models
                </Button>
              </div>
              <Select v-model="selectedActorConfig.modelId">
                <SelectTrigger :id="`${selectedActorType}-model`">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent class="max-h-[200px] overflow-auto">
                  <SelectItem 
                    v-for="model in availableModels" 
                    :key="model.id" 
                    :value="model.id"
                  >
                    <div>
                      <div>{{ model.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ model.description }}</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">
                The AI model used for this actor's tasks
                <span v-if="availableModels.length > 0">
                  Token limit: {{ availableModels.find(m => m.id === selectedActorConfig.modelId)?.maxTokens.toLocaleString() || 'Unknown' }} tokens.
                </span>
              </p>
            </div>
            
            <!-- Temperature Control -->
            <div class="space-y-2">
              <div class="flex justify-between">
                <Label :for="`${selectedActorType}-temperature`">
                  Temperature: {{ temperatureFormatted }}
                </Label>
                <span class="text-xs text-muted-foreground">
                  {{ getTemperatureDescription(selectedActorConfig.temperature || 0.7) }}
                </span>
              </div>
              <Slider
                :id="`${selectedActorType}-temperature`"
                v-model="selectedActorConfig.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                class="w-full"
              />
              <p class="text-xs text-muted-foreground">
                Controls randomness: lower values are more deterministic, higher values are more creative
              </p>
            </div>
            
            <!-- Max Tokens -->
            <div class="space-y-2">
              <div class="flex justify-between">
                <Label :for="`${selectedActorType}-max-tokens`">Max Tokens</Label>
                <Badge variant="outline">{{ selectedActorConfig.maxTokens }}</Badge>
              </div>
              <Slider
                :id="`${selectedActorType}-max-tokens`"
                v-model="selectedActorConfig.maxTokens"
                :min="1000"
                :max="8000"
                :step="500"
                class="w-full"
              />
              <p class="text-xs text-muted-foreground">
                Maximum number of tokens the actor can generate per task
              </p>
            </div>
            
            <!-- Custom Instructions -->
            <div class="space-y-2">
              <Label :for="`${selectedActorType}-instructions`">Custom Instructions</Label>
              <Textarea
                :id="`${selectedActorType}-instructions`"
                v-model="selectedActorConfig.customInstructions"
                rows="3"
                placeholder="Provide custom instructions for this actor"
              />
              <p class="text-xs text-muted-foreground">
                Custom instructions that will guide this actor's behavior
              </p>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end space-x-2 mt-6">
          <Button 
            variant="outline" 
            @click="resetSettings" 
            class="flex items-center"
          >
            Reset
          </Button>
          <Button 
            @click="saveSettings" 
            class="flex items-center"
          >
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template> 