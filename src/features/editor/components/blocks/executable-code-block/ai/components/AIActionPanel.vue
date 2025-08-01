<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { Separator } from '@/ui/separator'
import { 
  Brain, 
  Zap, 
  Target, 
  Lightbulb, 
  Play,
  Loader2,
  Sparkles
} from 'lucide-vue-next'
import { useAIActions, type ActionExecutionContext } from '../composables/useAIActions'

interface Props {
  context: ActionExecutionContext
  aiActions: ReturnType<typeof useAIActions>
  embedded?: boolean
}

interface Emits {
  'action-executed': [actionId: string, result: string]
  'code-updated': [code: string]
  'trigger-execution': []
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
})

const emit = defineEmits<Emits>()

// State
const hoveredAction = ref<string | null>(null)

// Computed
const suggestedActions = computed(() => {
  return props.aiActions.suggestedActions.value.slice(0, 4)
})

const quickActionsByCategory = computed(() => {
  return props.aiActions.quickActions.value
})

// Methods
const executeAction = async (action: any) => {
  try {
    const result = await props.aiActions.executeAction(action)
    if (result) {
      emit('action-executed', action.id, result.content)
      
      // Auto-apply code if it's a transformation action
      if (['refactor-code', 'optimize-performance', 'add-comments'].includes(action.id) && 
          result.content.includes('```')) {
        const codeMatch = result.content.match(/```[\w]*\n([\s\S]*?)\n```/)
        if (codeMatch && codeMatch[1]) {
          emit('code-updated', codeMatch[1].trim())
        }
      }
    }
  } catch (error) {
    console.error('Failed to execute action:', error)
  }
}

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Brain, Zap, Target, Lightbulb, Play, Sparkles
  }
  return iconMap[iconName] || Brain
}
</script>

<template>
  <div class="ai-action-panel" :class="{ 'ai-action-panel--embedded': embedded }">
    <ScrollArea class="h-full">
      <div class="ai-panel-content">
        <!-- Suggested Actions -->
        <div v-if="suggestedActions.length > 0" class="ai-section">
          <div class="ai-section-header">
            <Lightbulb class="w-4 h-4 text-yellow-500" />
            <h4 class="ai-section-title">Suggested for {{ context.language }}</h4>
          </div>
          <div class="ai-action-grid">
            <button
              v-for="action in suggestedActions"
              :key="action.id"
              @click="executeAction(action)"
              @mouseenter="hoveredAction = action.id"
              @mouseleave="hoveredAction = null"
              :disabled="!context.code.trim() || aiActions.executingActions.value.has(action.id) || !aiActions.isProviderConfigured.value"
              class="ai-action-card"
              :class="{ 
                'ai-action-card--loading': aiActions.executingActions.value.has(action.id),
                'ai-action-card--hovered': hoveredAction === action.id
              }"
            >
              <div class="ai-action-icon">
                <Loader2 v-if="aiActions.executingActions.value.has(action.id)" class="w-5 h-5 animate-spin" />
                <component v-else :is="getIconComponent(action.icon)" class="w-5 h-5" />
              </div>
              <div class="ai-action-content">
                <div class="ai-action-name">{{ action.name }}</div>
                <div class="ai-action-description">{{ action.description }}</div>
              </div>
            </button>
          </div>
        </div>

        <Separator v-if="suggestedActions.length > 0" />

        <!-- Quick Actions by Category -->
        <div class="ai-section">
          <div class="ai-section-header">
            <Target class="w-4 h-4 text-blue-500" />
            <h4 class="ai-section-title">Quick Actions</h4>
          </div>

          <!-- Analysis Actions -->
          <div v-if="quickActionsByCategory.analysis.length > 0" class="ai-action-category">
            <h5 class="ai-category-title">Analysis</h5>
            <div class="ai-action-chips">
              <button
                v-for="action in quickActionsByCategory.analysis"
                :key="action.id"
                @click="executeAction(action)"
                :disabled="!context.code.trim() || aiActions.executingActions.value.has(action.id) || !aiActions.isProviderConfigured.value"
                class="ai-action-chip"
                :class="{ 'ai-action-chip--loading': aiActions.executingActions.value.has(action.id) }"
              >
                <Loader2 v-if="aiActions.executingActions.value.has(action.id)" class="w-4 h-4 animate-spin" />
                <component v-else :is="getIconComponent(action.icon)" class="w-4 h-4" />
                {{ action.name }}
              </button>
            </div>
          </div>

          <!-- Improvement Actions -->
          <div v-if="quickActionsByCategory.improvement.length > 0" class="ai-action-category">
            <h5 class="ai-category-title">Improvement</h5>
            <div class="ai-action-chips">
              <button
                v-for="action in quickActionsByCategory.improvement"
                :key="action.id"
                @click="executeAction(action)"
                :disabled="!context.code.trim() || aiActions.executingActions.value.has(action.id) || !aiActions.isProviderConfigured.value"
                class="ai-action-chip"
                :class="{ 'ai-action-chip--loading': aiActions.executingActions.value.has(action.id) }"
              >
                <Loader2 v-if="aiActions.executingActions.value.has(action.id)" class="w-4 h-4 animate-spin" />
                <component v-else :is="getIconComponent(action.icon)" class="w-4 h-4" />
                {{ action.name }}
              </button>
            </div>
          </div>

          <!-- Generation Actions -->
          <div v-if="quickActionsByCategory.generation.length > 0" class="ai-action-category">
            <h5 class="ai-category-title">Generation</h5>
            <div class="ai-action-chips">
              <button
                v-for="action in quickActionsByCategory.generation"
                :key="action.id"
                @click="executeAction(action)"
                :disabled="!context.code.trim() || aiActions.executingActions.value.has(action.id) || !aiActions.isProviderConfigured.value"
                class="ai-action-chip"
                :class="{ 'ai-action-chip--loading': aiActions.executingActions.value.has(action.id) }"
              >
                <Loader2 v-if="aiActions.executingActions.value.has(action.id)" class="w-4 h-4 animate-spin" />
                <component v-else :is="getIconComponent(action.icon)" class="w-4 h-4" />
                {{ action.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="suggestedActions.length === 0 && Object.values(quickActionsByCategory).every((arr: any[]) => arr.length === 0)" class="ai-empty-state">
          <Brain class="w-12 h-12 text-muted-foreground mb-3" />
          <div class="ai-empty-title">No Actions Available</div>
          <div class="ai-empty-description">
            Add some code to get AI-powered suggestions and improvements.
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<style scoped>
.ai-action-panel {
  height: 100%;
  min-height: 200px;
}

.ai-action-panel--embedded {
  padding: 1rem;
}

.ai-panel-content {
  padding: 1rem;
}

.ai-panel-content > * + * {
  margin-top: 1.5rem;
}

.ai-section {
  margin-bottom: 1.5rem;
}

.ai-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.ai-section-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.ai-action-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

.ai-action-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--background));
  transition: all 0.2s ease;
  text-align: left;
}

.ai-action-card:hover:not(:disabled) {
  border-color: hsl(var(--primary) / 0.3);
  background: hsl(var(--primary) / 0.05);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.1);
}

.ai-action-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-action-card--loading {
  border-color: hsl(var(--primary) / 0.3);
  background: hsl(var(--primary) / 0.05);
}

.ai-action-card--hovered {
  border-color: hsl(var(--primary) / 0.3);
  background: hsl(var(--primary) / 0.05);
}

.ai-action-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.ai-action-content {
  flex: 1;
}

.ai-action-name {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.ai-action-description {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
}

.ai-action-category {
  margin-bottom: 1rem;
}

.ai-category-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.5rem;
}

.ai-action-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ai-action-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 1rem;
  background: hsl(var(--background));
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.ai-action-chip:hover:not(:disabled) {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.ai-action-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-action-chip--loading {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.ai-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.ai-empty-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.ai-empty-description {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}

/* Responsive */
@media (min-width: 640px) {
  .ai-action-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}

@media (min-width: 768px) {
  .ai-action-panel--embedded .ai-action-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
