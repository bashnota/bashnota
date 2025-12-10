<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-vue-next'

interface Props {
  open: boolean
  migrationType: 'storage' | 'settings' | 'navigation'
  isMigrating?: boolean
  isComplete?: boolean
  progress?: number
  totalItems?: number
  migratedItems?: number
  error?: string | null
  canRollback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMigrating: false,
  isComplete: false,
  progress: 0,
  totalItems: 0,
  migratedItems: 0,
  error: null,
  canRollback: false
})

const emit = defineEmits<{
  'start-migration': []
  'cancel': []
  'rollback': []
  'close': []
}>()

const migrationTitle = computed(() => {
  const titles = {
    storage: 'Storage Migration',
    settings: 'Settings Migration',
    navigation: 'Navigation Migration'
  }
  return titles[props.migrationType]
})

const migrationDescription = computed(() => {
  const descriptions = {
    storage: 'Migrate your notes from IndexedDB to file-based storage for better performance and data ownership.',
    settings: 'Consolidate your settings from multiple localStorage keys into a single unified configuration file.',
    navigation: 'Upgrade to the simplified 3-panel navigation system with command palette.'
  }
  return descriptions[props.migrationType]
})
</script>

<template>
  <Dialog :open="open" @update:open="(val) => !val && emit('close')">
    <DialogContent class="sm:max-w-md" role="dialog">
      <DialogHeader>
        <DialogTitle>{{ migrationTitle }}</DialogTitle>
        <DialogDescription>
          {{ migrationDescription }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Success State -->
        <Alert v-if="isComplete && !error" class="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 class="h-4 w-4 text-green-600" />
          <AlertDescription class="text-green-800 dark:text-green-200">
            Migration completed successfully! All data has been transferred.
          </AlertDescription>
        </Alert>

        <!-- Error State -->
        <Alert v-if="error" class="border-red-500 bg-red-50 dark:bg-red-950">
          <XCircle class="h-4 w-4 text-red-600" />
          <AlertDescription class="text-red-800 dark:text-red-200">
            {{ error }}
          </AlertDescription>
        </Alert>

        <!-- Progress State -->
        <div v-if="isMigrating" class="space-y-3">
          <div class="flex items-center gap-2">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span class="text-sm font-medium">Migrating data...</span>
          </div>
          
          <Progress :model-value="progress" class="h-2" role="progressbar" :aria-valuenow="progress" />
          
          <div class="flex justify-between text-sm text-muted-foreground">
            <span>{{ migratedItems }} / {{ totalItems }} items</span>
            <span>{{ progress }}%</span>
          </div>
        </div>

        <!-- Initial State -->
        <Alert v-if="!isMigrating && !isComplete && !error">
          <AlertTriangle class="h-4 w-4" />
          <AlertDescription>
            This process will migrate your data. A backup will be created automatically. You can rollback if needed.
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <div class="flex w-full justify-between gap-2">
          <!-- Rollback Button (shown only on error with rollback capability) -->
          <Button
            v-if="error && canRollback"
            variant="outline"
            size="sm"
            @click="emit('rollback')"
            data-testid="rollback-migration"
          >
            Rollback
          </Button>

          <div class="flex gap-2 ml-auto">
            <!-- Cancel/Close Button -->
            <Button
              variant="outline"
              size="sm"
              @click="emit('cancel')"
              :disabled="isMigrating"
              data-testid="cancel-migration"
            >
              {{ isComplete ? 'Close' : 'Cancel' }}
            </Button>

            <!-- Start Migration Button -->
            <Button
              v-if="!isComplete"
              size="sm"
              @click="emit('start-migration')"
              :disabled="isMigrating"
              data-testid="start-migration"
            >
              <Loader2 v-if="isMigrating" class="mr-2 h-4 w-4 animate-spin" />
              {{ isMigrating ? 'Migrating...' : 'Start Migration' }}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
