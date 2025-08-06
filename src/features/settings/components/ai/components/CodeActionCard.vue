<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  TestTube,
  Play,
  Eye,
  EyeOff
} from 'lucide-vue-next'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'

interface Props {
  // For regular action cards
  action?: CustomAIAction
  showEdit?: boolean
  showDelete?: boolean
  
  // For feature toggle cards
  title?: string
  description?: string
  icon?: any
  enabled?: boolean
  isFeature?: boolean
}

interface Emits {
  (e: 'edit', action: CustomAIAction): void
  (e: 'duplicate', action: CustomAIAction): void
  (e: 'delete', actionId: string): void
  (e: 'toggle', actionId: string, enabled: boolean): void
  (e: 'test', actionId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showEdit: true,
  showDelete: true,
  isFeature: false
})

const emit = defineEmits<Emits>()

// Computed
const canEdit = computed(() => props.action && !props.action.isBuiltIn && props.showEdit)
const canDelete = computed(() => props.action && !props.action.isBuiltIn && props.showDelete)

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'analysis': return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
    case 'transformation': return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
    case 'generation': return 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
    case 'debugging': return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
    default: return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300'
  }
}

// Methods
const handleEdit = () => {
  if (props.action) emit('edit', props.action)
}

const handleDuplicate = () => {
  if (props.action) emit('duplicate', props.action)
}

const handleDelete = () => {
  if (props.action) emit('delete', props.action.id)
}

const handleTest = () => {
  if (props.action) emit('test', props.action.id)
}

const handleToggle = (enabled: boolean) => {
  if (props.isFeature) {
    emit('toggle', '', enabled)
  } else if (props.action) {
    emit('toggle', props.action.id, enabled)
  }
}
</script>

<template>
  <!-- Feature Toggle Card -->
  <Card v-if="isFeature" :class="[
    'transition-all duration-200',
    enabled ? 'border-border' : 'border-border/50 bg-muted/30'
  ]">
    <CardContent class="p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <component 
            :is="icon" 
            class="h-5 w-5"
            :class="enabled ? 'text-primary' : 'text-muted-foreground'"
          />
          <div>
            <h4 class="font-medium text-sm">{{ title }}</h4>
            <p class="text-xs text-muted-foreground">{{ description }}</p>
          </div>
        </div>
        
        <Switch
          :checked="enabled"
          @update:checked="handleToggle"
        />
      </div>
    </CardContent>
  </Card>

  <!-- Action Card -->
  <Card v-else-if="action" :class="[
    'transition-all duration-200',
    action.isEnabled ? 'border-border' : 'border-border/50 bg-muted/30'
  ]">
    <CardContent class="p-4">
      <div class="flex items-start justify-between gap-4">
        <!-- Action Info -->
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <!-- Icon -->
          <div class="flex-shrink-0 mt-1">
            <component 
              :is="action.icon || 'Code2'" 
              class="h-5 w-5"
              :class="action.isEnabled ? 'text-primary' : 'text-muted-foreground'"
            />
          </div>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-medium text-sm truncate">{{ action.name }}</h4>
              <Badge 
                :class="getCategoryColor(action.category)"
                class="text-xs"
              >
                {{ action.category }}
              </Badge>
              <Badge v-if="action.isBuiltIn" variant="secondary" class="text-xs">
                Built-in
              </Badge>
              <Badge v-if="!action.isEnabled" variant="outline" class="text-xs">
                <EyeOff class="mr-1 h-3 w-3" />
                Disabled
              </Badge>
            </div>
            
            <p class="text-xs text-muted-foreground mb-2 line-clamp-2">
              {{ action.description }}
            </p>
            
            <!-- Prompt Preview (when enabled) -->
            <div v-if="action.isEnabled" class="text-xs bg-muted/50 p-2 rounded border text-muted-foreground">
              <span class="font-medium">Prompt:</span> 
              <span class="line-clamp-2">{{ action.prompt }}</span>
            </div>

            <!-- Output Type and Shortcut -->
            <div v-if="action.outputType || action.shortcut" class="flex items-center gap-2 mt-2">
              <Badge variant="outline" class="text-xs">
                {{ action.outputType }}
              </Badge>
              <Badge v-if="action.shortcut" variant="outline" class="text-xs">
                {{ action.shortcut }}
              </Badge>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Test Button -->
          <Button
            @click="handleTest"
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0"
          >
            <TestTube class="h-4 w-4" />
            <span class="sr-only">Test action</span>
          </Button>

          <!-- Enable/Disable Toggle -->
          <Switch
            :checked="action.isEnabled"
            @update:checked="handleToggle"
          />

          <!-- Actions Menu -->
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                <MoreHorizontal class="h-4 w-4" />
                <span class="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuItem @click="handleTest" class="gap-2">
                <TestTube class="h-4 w-4" />
                Test Action
              </DropdownMenuItem>
              
              <DropdownMenuItem @click="handleDuplicate" class="gap-2">
                <Copy class="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              
              <DropdownMenuSeparator v-if="canEdit" />
              
              <DropdownMenuItem 
                v-if="canEdit"
                @click="handleEdit"
                class="gap-2"
              >
                <Edit class="h-4 w-4" />
                Edit Action
              </DropdownMenuItem>
              
              <DropdownMenuSeparator v-if="canDelete" />
              
              <DropdownMenuItem 
                v-if="canDelete"
                @click="handleDelete"
                class="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 class="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>