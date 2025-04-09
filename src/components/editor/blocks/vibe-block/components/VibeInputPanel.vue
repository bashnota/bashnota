<template>
  <div class="vibe-input-panel">
    <div class="vibe-description mb-4">
      <div class="flex items-center space-x-2 text-primary">
        <Zap class="h-4 w-4" />
        <span>Ask Vibe to help you with research, analysis, or code generation.</span>
      </div>
    </div>
    
    <!-- Jupyter config panel -->
    <div v-if="showJupyterConfig" class="mb-5 p-3 border rounded-md">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium text-sm">Jupyter Configuration</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          @click="$emit('toggle-jupyter')"
          class="h-6 w-6"
          aria-label="Close Jupyter configuration"
        >
          <X class="h-3.5 w-3.5" />
        </Button>
      </div>
      <JupyterConfigPanel 
        :initialServer="jupyterConfig.server"
        :initialKernel="jupyterConfig.kernel"
        @configUpdated="updateJupyterConfig"
      />
    </div>

    <!-- Actor selection panel -->
    <div v-if="showActorSelector" class="mb-5 border p-4 rounded-md bg-muted/20">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-medium">Active Agents</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          @click="$emit('toggle-actors')"
          class="h-6 w-6"
          aria-label="Close actor selector"
        >
          <X class="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <div 
          v-for="actor in availableActors" 
          :key="actor.type" 
          class="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
          @click="toggleActor(actor.type)"
        >
          <input
            type="checkbox"
            :id="actor.type"
            :value="actor.type"
            v-model="selectedActors"
            class="rounded border-gray-300"
            :aria-label="`Toggle ${actor.name} agent`"
          />
          <div>
            <label :for="actor.type" class="text-sm font-medium cursor-pointer">{{ actor.name }}</label>
            <p class="text-xs text-muted-foreground">{{ getActorDescription(actor.type) }}</p>
          </div>
        </div>
      </div>
      
      <div class="flex items-center mt-3 bg-muted/30 p-2 rounded-md">
        <input
          type="checkbox"
          id="use-custom-prompt"
          v-model="useCustomPrompt"
          class="rounded border-gray-300"
          aria-label="Use custom prompts for agents"
        />
        <label for="use-custom-prompt" class="text-sm ml-2 cursor-pointer">
          Use custom agent prompts
          <span class="text-xs block text-muted-foreground">Advanced: Edit the instructions sent to each agent</span>
        </label>
      </div>
    </div>
    
    <div class="relative">
      <input
        :value="modelValue"
        placeholder="What would you like help with? (e.g., 'Research quantum computing advances')"
        class="flex-1 h-12 rounded-md border border-input bg-background pl-4 pr-24 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full"
        @keyup.enter="$emit('submit')"
        @input="$emit('update:modelValue', $event.target.value)"
        aria-label="Vibe query input"
      />
      <Button 
        @click.stop.prevent="$emit('submit')" 
        class="absolute right-1 top-1 h-10 whitespace-nowrap"
        type="button"
        aria-label="Start Vibe process"
        :disabled="!modelValue.trim()"
      >
        <Zap class="h-4 w-4 mr-2" />
        Start
      </Button>
    </div>
    
    <!-- Config toggles and status -->
    <div class="flex mt-3 justify-between flex-wrap gap-2">
      <div class="flex gap-2">
        <Tooltip content="Toggle Jupyter configuration">
          <Button 
            variant="ghost" 
            size="sm" 
            @click="$emit('toggle-jupyter')"
            class="flex items-center gap-1 text-xs h-8"
            aria-label="Toggle Jupyter configuration"
          >
            <ServerCog v-if="!showJupyterConfig" class="h-3.5 w-3.5" />
            <X v-else class="h-3.5 w-3.5" />
            {{ showJupyterConfig ? 'Hide Jupyter Config' : 'Configure Jupyter' }}
          </Button>
        </Tooltip>

        <Tooltip content="Choose which AI agents to use">
          <Button 
            variant="ghost" 
            size="sm" 
            @click="$emit('toggle-actors')"
            class="flex items-center gap-1 text-xs h-8"
            aria-label="Toggle agent selection"
          >
            <Users v-if="!showActorSelector" class="h-3.5 w-3.5" />
            <X v-else class="h-3.5 w-3.5" />
            {{ showActorSelector ? 'Hide Agents' : 'Select Agents' }}
          </Button>
        </Tooltip>
      </div>
      
      <div v-if="jupyterConfig.server && jupyterConfig.kernel" class="flex gap-2 text-xs text-muted-foreground items-center">
        <Badge variant="secondary" class="py-0 h-5">
          <ServerCog class="h-3 w-3 mr-1" />
          {{ jupyterConfig.kernel.spec.display_name }} on 
          {{ jupyterConfig.server.ip }}:{{ jupyterConfig.server.port }}
        </Badge>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { Zap, ServerCog, X, Users } from 'lucide-vue-next'
import JupyterConfigPanel from '../JupyterConfigPanel.vue'
import { logger } from '@/services/logger'
import { ref, watch } from 'vue'
import { ActorType } from '@/types/vibe'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  showJupyterConfig: {
    type: Boolean,
    default: false
  },
  showActorSelector: {
    type: Boolean,
    default: false
  },
  jupyterConfig: {
    type: Object,
    default: () => ({
      server: null,
      kernel: null
    })
  }
})

const emit = defineEmits([
  'update:modelValue', 
  'submit', 
  'toggle-jupyter', 
  'toggle-actors',
  'update-jupyter', 
  'update-actors'
])

// Available actors with descriptions
const availableActors = [
  { type: ActorType.PLANNER, name: 'Planner', description: 'Creates structured task plans' },
  { type: ActorType.RESEARCHER, name: 'Researcher', description: 'Gathers and analyzes information' },
  { type: ActorType.ANALYST, name: 'Analyst', description: 'Examines data and creates visualizations' },
  { type: ActorType.CODER, name: 'Coder', description: 'Generates and optimizes code' },
  { type: ActorType.COMPOSER, name: 'Composer', description: 'Organizes content cohesively' },
  { type: ActorType.WRITER, name: 'Writer', description: 'Creates comprehensive reports' }
]

// Selected actors (default to all)
const selectedActors = ref(availableActors.map(actor => actor.type))

// Custom prompt toggle
const useCustomPrompt = ref(false)

// Toggle an actor's selection
function toggleActor(actorType) {
  const index = selectedActors.value.indexOf(actorType)
  if (index === -1) {
    selectedActors.value.push(actorType)
  } else {
    selectedActors.value.splice(index, 1)
  }
}

// Get actor description
function getActorDescription(actorType) {
  const actor = availableActors.find(a => a.type === actorType)
  return actor ? actor.description : ''
}

// Watch for changes to actor selection or custom prompt
watch([selectedActors, useCustomPrompt], () => {
  emit('update-actors', {
    enabledActors: selectedActors.value,
    useCustomPrompt: useCustomPrompt.value
  })
})

function updateJupyterConfig(config) {
  logger.log('Updating Jupyter config:', config)
  
  // Emit the updated config to parent
  emit('update-jupyter', config)
}
</script>

<style scoped>
.vibe-input-panel {
  @apply rounded-md mb-4 p-4 bg-background border;
  background-color: var(--background, #ffffff) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}

.vibe-description {
  @apply text-muted-foreground;
  background-color: transparent !important;
}

/* Ensure all components have solid backgrounds */
.vibe-input-panel input,
.vibe-input-panel textarea,
.vibe-input-panel select,
.vibe-input-panel button {
  background-color: var(--background, #ffffff) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}
</style> 