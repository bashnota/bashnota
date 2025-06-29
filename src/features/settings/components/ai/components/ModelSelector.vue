<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <Label :for="`model-${providerId}`">
        {{ label || `${providerName} Model` }}
      </Label>
      <Button 
        v-if="showRefreshButton"
        variant="outline" 
        size="sm" 
        @click="handleRefresh" 
        :disabled="isLoading || disabled"
        class="h-8 px-2 text-xs"
      >
        <RefreshCwIcon :class="{'animate-spin': isLoading}" class="mr-2 h-3 w-3" />
        Refresh Models
      </Button>
    </div>

    <!-- Model Selection -->
    <div v-if="!showCategories || categorizedModels.small.length === 0">
      <!-- Simple list when no categories or small category empty -->
      <SearchableSelect
        v-model="selectedModelId"
        :options="modelOptions"
        :placeholder="placeholder || `Select ${providerName} model`"
        max-height="300px"
        :search-placeholder="searchPlaceholder || `Search ${providerName} models...`"
        :disabled="isLoading || disabled"
        @update:modelValue="handleModelChange"
      />
    </div>

    <div v-else class="space-y-3">
      <!-- Categorized model selection -->
      <div v-if="categorizedModels.small.length > 0">
        <Label class="text-sm font-medium text-green-600">Small Models (Recommended)</Label>
        <SearchableSelect
          v-model="selectedModelId"
          :options="categorizedModels.small.map(modelToOption)"
          placeholder="Select a small model"
          max-height="200px"
          search-placeholder="Search small models..."
          :disabled="isLoading || disabled"
          @update:modelValue="handleModelChange"
        />
        <p class="text-xs text-gray-500 mt-1">
          Fast and efficient, good for most tasks
        </p>
      </div>

      <div v-if="categorizedModels.medium.length > 0">
        <Label class="text-sm font-medium text-yellow-600">Medium Models</Label>
        <SearchableSelect
          v-model="selectedModelId"
          :options="categorizedModels.medium.map(modelToOption)"
          placeholder="Select a medium model"
          max-height="200px"
          search-placeholder="Search medium models..."
          :disabled="isLoading || disabled"
          @update:modelValue="handleModelChange"
        />
        <p class="text-xs text-gray-500 mt-1">
          Balanced performance and capability
        </p>
      </div>

      <div v-if="categorizedModels.large.length > 0">
        <Label class="text-sm font-medium text-red-600">Large Models</Label>
        <SearchableSelect
          v-model="selectedModelId"
          :options="categorizedModels.large.map(modelToOption)"
          placeholder="Select a large model"
          max-height="200px"
          search-placeholder="Search large models..."
          :disabled="isLoading || disabled"
          @update:modelValue="handleModelChange"
        />
        <p class="text-xs text-gray-500 mt-1">
          Maximum capability, slower performance
        </p>
      </div>

      <div v-if="categorizedModels.other.length > 0">
        <Label class="text-sm font-medium">Other Models</Label>
        <SearchableSelect
          v-model="selectedModelId"
          :options="categorizedModels.other.map(modelToOption)"
          placeholder="Select other model"
          max-height="200px"
          search-placeholder="Search other models..."
          :disabled="isLoading || disabled"
          @update:modelValue="handleModelChange"
        />
      </div>
    </div>

    <!-- Model Information -->
    <div v-if="selectedModel" class="p-3 bg-gray-50 rounded-md">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="font-medium">{{ selectedModel.name }}</h4>
          <p v-if="selectedModel.description" class="text-sm text-gray-600 mt-1">
            {{ selectedModel.description }}
          </p>
        </div>
        <div class="text-right text-xs text-gray-500 space-y-1">
          <div v-if="selectedModel.size">
            <Badge variant="outline">{{ selectedModel.size }}</Badge>
          </div>
          <div v-if="selectedModel.maxTokens">
            {{ selectedModel.maxTokens.toLocaleString() }} tokens
          </div>
          <div v-if="selectedModel.supportsVision">
            <Badge variant="secondary">Vision</Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Help text -->
    <p v-if="helpText" class="text-xs text-gray-500">
      {{ helpText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/ui/label'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { RefreshCwIcon } from 'lucide-vue-next'
import SearchableSelect from '@/ui/searchable-select.vue'
import type { ModelInfo } from '@/features/settings/components/ai/composables/useProviderSettings'

export interface ModelSelectorProps {
  modelValue: string
  models: ModelInfo[]
  categorizedModels: {
    small: ModelInfo[]
    medium: ModelInfo[]
    large: ModelInfo[]
    other: ModelInfo[]
  }
  providerId: string
  providerName: string
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  helpText?: string
  showRefreshButton?: boolean
  showCategories?: boolean
  isLoading?: boolean
  disabled?: boolean
}

export interface ModelSelectorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', model: ModelInfo | null): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<ModelSelectorProps>(), {
  showRefreshButton: true,
  showCategories: true,
  isLoading: false,
  disabled: false
})

const emit = defineEmits<ModelSelectorEmits>()

// Computed
const selectedModelId = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const selectedModel = computed(() => 
  props.models.find(m => m.id === props.modelValue) || null
)

const modelOptions = computed(() => 
  props.models.map(modelToOption)
)

// Methods
const modelToOption = (model: ModelInfo) => ({
  value: model.id,
  label: model.name,
  description: model.description || model.size
})

const handleModelChange = (value: string | number) => {
  const stringValue = String(value)
  const model = props.models.find(m => m.id === stringValue) || null
  emit('change', model)
}

const handleRefresh = () => {
  emit('refresh')
}
</script> 








