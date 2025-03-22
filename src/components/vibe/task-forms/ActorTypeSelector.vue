<template>
  <div class="actor-type-selector">
    <div class="actor-type-options">
      <div
        v-for="type in actorTypes"
        :key="type.value"
        class="actor-type-option"
        :class="{ 'selected': modelValue === type.value }"
        @click="handleSelect(type.value)"
      >
        <component :is="type.icon" class="icon" />
        <div class="type-info">
          <div class="type-name">{{ type.label }}</div>
          <div class="type-description">{{ type.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ActorType } from '@/types/vibe'
import { BrainCircuit, Search, BarChart3, Code, FileText, CheckCheck, BarChart } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: ActorType
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ActorType): void
}>()

const actorTypes = computed(() => [
  {
    value: ActorType.PLANNER,
    label: 'Planner',
    icon: BrainCircuit,
    description: 'Creates detailed work plans by breaking down complex tasks into smaller, actionable steps.'
  },
  {
    value: ActorType.RESEARCHER,
    label: 'Researcher',
    icon: Search,
    description: 'Gathers information, conducts literature reviews, and synthesizes knowledge on a topic.'
  },
  {
    value: ActorType.ANALYST,
    label: 'Analyst',
    icon: BarChart3,
    description: 'Analyzes data, generates insights, and creates visualizations of information.'
  },
  {
    value: ActorType.CODER,
    label: 'Coder',
    icon: Code,
    description: 'Generates, executes, and refines code for programming tasks and data processing.'
  },
  {
    value: ActorType.SUMMARIZER,
    label: 'Summarizer',
    icon: FileText,
    description: 'Distills complex information into concise, clear summaries and key points.'
  },
  {
    value: ActorType.REVIEWER,
    label: 'Reviewer',
    icon: CheckCheck,
    description: 'Provides thorough, constructive feedback and evaluations on content.'
  },
  {
    value: ActorType.VISUALIZER,
    label: 'Visualizer',
    icon: BarChart,
    description: 'Creates effective data visualizations, charts, and diagrams for better understanding.'
  }
])

const handleSelect = (type: ActorType) => {
  emit('update:modelValue', type)
}
</script> 