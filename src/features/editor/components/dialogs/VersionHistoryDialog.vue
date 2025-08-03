<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/dialog'
import { Button } from '@/ui/button'
import { formatDate } from '@/lib/utils'
import { toast } from 'vue-sonner'
import { Trash2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { logger } from '@/services/logger'

const props = defineProps<{
  notaId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  'version-restored': []
}>()

const notaStore = useNotaStore()
const router = useRouter()

const isRestoring = ref(false)
const isDeleting = ref(false)
const selectedVersionId = ref('')

const versions = computed(() => {
  return notaStore.getNotaVersions(props.notaId).sort((a: { createdAt: Date | string }, b: { createdAt: Date | string }) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime() // Sort newest first
  })
})

const handleClose = () => {
  emit('update:open', false)
}

const restoreVersion = async (versionId: string) => {
  try {
    isRestoring.value = true
    selectedVersionId.value = versionId
    await notaStore.restoreVersion(props.notaId, versionId)
    toast('Version restored successfully')
    
    // Emit event for local refresh
    emit('version-restored')
    
    // Close the dialog
    handleClose()
    
    // Force a full reload of the nota view by navigating to the same route
    // This will ensure all components are properly refreshed
    const currentRoute = router.currentRoute.value
    router.push({ path: '/temp-redirect' }).then(() => {
      router.push({ path: currentRoute.path })
    })
  } catch (error) {
    logger.error('Error restoring version:', error)
    toast('Failed to restore version')
  } finally {
    isRestoring.value = false
    selectedVersionId.value = ''
  }
}

const deleteVersion = async (versionId: string) => {
  try {
    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return
    }
    
    isDeleting.value = true
    selectedVersionId.value = versionId
    await notaStore.deleteVersion(props.notaId, versionId)
    toast('Version deleted successfully')
  } catch (error) {
    logger.error('Error deleting version:', error)
    toast('Failed to delete version')
  } finally {
    isDeleting.value = false
    selectedVersionId.value = ''
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Version History</DialogTitle>
      </DialogHeader>
      <div class="space-y-4 max-h-[50vh] overflow-y-auto">
        <div v-if="versions.length === 0" class="text-center py-4 text-muted-foreground">
          No saved versions yet
        </div>
        <div
          v-for="version in versions"
          :key="version.id"
          class="flex items-center justify-between p-3 border rounded-md"
        >
          <div>
            <div class="font-medium">{{ version.versionName }}</div>
            <div class="text-sm text-muted-foreground">{{ formatDate(version.createdAt) }}</div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="restoreVersion(version.id)"
              :disabled="isRestoring || isDeleting"
              :class="{ 'opacity-50 cursor-not-allowed': isRestoring || isDeleting }"
            >
              <span
                v-if="isRestoring && selectedVersionId === version.id"
                class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"
              ></span>
              Restore
            </Button>
            <Button
              variant="destructive"
              size="sm"
              @click="deleteVersion(version.id)"
              :disabled="isRestoring || isDeleting"
              :class="{ 'opacity-50 cursor-not-allowed': isRestoring || isDeleting }"
            >
              <span
                v-if="isDeleting && selectedVersionId === version.id"
                class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"
              ></span>
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template> 







