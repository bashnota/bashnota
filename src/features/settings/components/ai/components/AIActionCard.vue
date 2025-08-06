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
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-vue-next'
import { getIconComponent, getColorClasses } from '@/features/ai/utils/iconResolver'
import type { AIAction } from '@/features/ai/types/aiActions'

interface Props {
  action: AIAction
  index: number
  totalActions: number
  showMove?: boolean
  showDelete?: boolean
}

interface Emits {
  (e: 'edit', action: AIAction): void
  (e: 'duplicate', actionId: string): void
  (e: 'delete', actionId: string): void
  (e: 'move', fromIndex: number, toIndex: number): void
  (e: 'toggle', actionId: string, enabled: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  showMove: true,
  showDelete: true
})

const emit = defineEmits<Emits>()

// Computed
const canMoveUp = computed(() => props.index > 0)
const canMoveDown = computed(() => props.index < props.totalActions - 1)
const canDelete = computed(() => props.action.isCustom && props.showDelete)

const iconComponent = computed(() => getIconComponent(props.action.icon))
const colorClasses = computed(() => getColorClasses(props.action.color))

// Methods
const handleEdit = () => emit('edit', props.action)
const handleDuplicate = () => emit('duplicate', props.action.id)
const handleDelete = () => emit('delete', props.action.id)
const handleMoveUp = () => emit('move', props.index, props.index - 1)
const handleMoveDown = () => emit('move', props.index, props.index + 1)
const handleToggle = (enabled: boolean) => emit('toggle', props.action.id, enabled)
</script>

<template>
  <Card :class="[
    'transition-all duration-200',
    action.enabled ? 'border-border' : 'border-border/50 bg-muted/30'
  ]">
    <CardContent class="p-4">
      <div class="flex items-start justify-between gap-4">
        <!-- Action Info -->
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <!-- Icon -->
          <div class="flex-shrink-0 mt-1">
            <component 
              :is="iconComponent" 
              class="h-5 w-5"
              :class="action.enabled ? colorClasses.text : 'text-muted-foreground'"
            />
          </div>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-medium text-sm truncate">{{ action.name }}</h4>
              <Badge v-if="action.isCustom" variant="secondary" class="text-xs">
                Custom
              </Badge>
              <Badge v-if="!action.enabled" variant="outline" class="text-xs">
                <EyeOff class="mr-1 h-3 w-3" />
                Disabled
              </Badge>
            </div>
            
            <p v-if="action.description" class="text-xs text-muted-foreground mb-2 line-clamp-1">
              {{ action.description }}
            </p>
            
            <!-- Prompt Preview (when enabled) -->
            <div v-if="action.enabled" class="text-xs bg-muted/50 p-2 rounded border text-muted-foreground">
              <span class="font-medium">Prompt:</span> 
              <span class="line-clamp-2">{{ action.prompt }}</span>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Enable/Disable Toggle -->
          <Switch
            :checked="action.enabled"
            @update:checked="handleToggle"
            class="data-[state=checked]:bg-primary"
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
              <DropdownMenuItem @click="handleEdit" class="gap-2">
                <Edit class="h-4 w-4" />
                Edit Action
              </DropdownMenuItem>
              
              <DropdownMenuItem @click="handleDuplicate" class="gap-2">
                <Copy class="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              
              <DropdownMenuSeparator v-if="showMove" />
              
              <DropdownMenuItem 
                v-if="showMove"
                @click="handleMoveUp"
                :disabled="!canMoveUp"
                class="gap-2"
              >
                <ChevronUp class="h-4 w-4" />
                Move Up
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                v-if="showMove"
                @click="handleMoveDown"
                :disabled="!canMoveDown"
                class="gap-2"
              >
                <ChevronDown class="h-4 w-4" />
                Move Down
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
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>