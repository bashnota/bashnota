<template>
  <div class="vibe-input-panel">
    <div class="vibe-description">
      Ask Vibe to help you with research, analysis, or code generation.
    </div>
    
    <!-- Jupyter config panel -->
    <div v-if="showJupyterConfig" class="mb-4">
      <JupyterConfigPanel 
        :initialServer="jupyterConfig.server"
        :initialKernel="jupyterConfig.kernel"
        @configUpdated="updateJupyterConfig"
      />
    </div>

    <!-- Actor selection panel -->
    <div v-if="showActorSelector" class="mb-4 border p-3 rounded-md">
      <div class="font-medium mb-2">Select actors to use:</div>
      <div class="grid grid-cols-2 gap-2">
        <div v-for="actor in availableActors" :key="actor.type" class="flex items-center space-x-2">
          <input
            type="checkbox"
            :id="actor.type"
            :value="actor.type"
            v-model="selectedActors"
            class="rounded border-gray-300"
          />
          <label :for="actor.type" class="text-sm">{{ actor.name }}</label>
        </div>
      </div>
      <div class="flex items-center mt-3">
        <input
          type="checkbox"
          id="use-custom-prompt"
          v-model="useCustomPrompt"
          class="rounded border-gray-300"
        />
        <label for="use-custom-prompt" class="text-sm ml-2">Use custom actor prompts</label>
      </div>
    </div>
    
    <div class="flex gap-2">
      <input
        :value="modelValue"
        placeholder="What would you like help with?"
        class="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        @keyup.enter="$emit('submit')"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <Button 
        @click.stop.prevent="$emit('submit')" 
        class="whitespace-nowrap"
        type="button"
      >
        <Zap class="h-4 w-4 mr-2" />
        Get Started
      </Button>
    </div>
    
    <!-- Config toggles and status -->
    <div class="flex mt-3 justify-between flex-wrap gap-2">
      <div class="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          @click="$emit('toggle-jupyter')"
          class="flex items-center gap-1 text-xs h-8"
        >
          <ServerCog v-if="!showJupyterConfig" class="h-3.5 w-3.5" />
          <X v-else class="h-3.5 w-3.5" />
          {{ showJupyterConfig ? 'Hide Jupyter Config' : 'Configure Jupyter' }}
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          @click="$emit('toggle-actors')"
          class="flex items-center gap-1 text-xs h-8"
        >
          <Users v-if="!showActorSelector" class="h-3.5 w-3.5" />
          <X v-else class="h-3.5 w-3.5" />
          {{ showActorSelector ? 'Hide Actors' : 'Select Actors' }}
        </Button>
      </div>
      
      <div v-if="!showJupyterConfig" class="flex gap-2 text-xs text-muted-foreground items-center">
        <span v-if="jupyterConfig.server && jupyterConfig.kernel">
          Using {{ jupyterConfig.kernel.spec.display_name }} on 
          {{ jupyterConfig.server.ip }}:{{ jupyterConfig.server.port }}
        </span>
        <span v-else>No Jupyter kernel configured</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
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

// Available actors
const availableActors = [
  { type: ActorType.PLANNER, name: 'Planner' },
  { type: ActorType.RESEARCHER, name: 'Researcher' },
  { type: ActorType.ANALYST, name: 'Analyst' },
  { type: ActorType.CODER, name: 'Coder' },
  { type: ActorType.COMPOSER, name: 'Composer' },
  { type: ActorType.WRITER, name: 'Writer' }
]

// Selected actors (default to all)
const selectedActors = ref(availableActors.map(actor => actor.type))

// Custom prompt toggle
const useCustomPrompt = ref(false)

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
  @apply mb-4;
}

.vibe-description {
  @apply text-muted-foreground mb-3;
}
</style> 