<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useAuthStore } from '@/features/auth/stores/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'vue-sonner'
import { Copy, Share2, Globe, EyeOff, Loader2, RefreshCw, FolderTree } from 'lucide-vue-next'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { logger } from '@/services/logger'

const props = defineProps<{
  notaId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const notaStore = useNotaStore()
const authStore = useAuthStore()
const isPublishing = ref(false)
const isUnpublishing = ref(false)
const linkCopied = ref(false)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const includeSubPages = ref(false)
const hasSubPages = ref(false)
const subPagesCount = ref(0)

const isPublished = computed(() => {
  return notaStore.isPublished(props.notaId)
})

const publicLink = computed(() => {
  return notaStore.getPublicLink(props.notaId)
})

const handleClose = () => {
  emit('update:open', false)
}

// Check if nota has sub-pages
const checkForSubPages = async () => {
  try {
    const subPages = await notaStore.getSubPages(props.notaId)
    hasSubPages.value = subPages.length > 0
    subPagesCount.value = subPages.length
  } catch (error) {
    logger.error('Error checking for sub-pages:', error)
    hasSubPages.value = false
    subPagesCount.value = 0
  }
}

const publishNota = async () => {
  try {
    isPublishing.value = true
    await notaStore.publishNota(props.notaId, includeSubPages.value)
    toast('Nota published successfully')
  } catch (error) {
    logger.error('Error publishing nota:', error)
    toast('Failed to publish nota')
  } finally {
    isPublishing.value = false
  }
}

const unpublishNota = async () => {
  try {
    isUnpublishing.value = true
    await notaStore.unpublishNota(props.notaId)
    toast('Nota unpublished')
  } catch (error) {
    logger.error('Error unpublishing nota:', error)
    toast('Failed to unpublish nota')
  } finally {
    isUnpublishing.value = false
  }
}

const updatePublishedVersion = async () => {
  await publishNota()
}

const copyLink = () => {
  navigator.clipboard
    .writeText(publicLink.value)
    .then(() => {
      linkCopied.value = true
      toast('Link copied to clipboard')

      setTimeout(() => {
        linkCopied.value = false
      }, 2000)
    })
    .catch(() => {
      toast('Failed to copy link')
    })
}

// Load published notas when dialog is mounted
onMounted(async () => {
  if (isAuthenticated.value) {
    await notaStore.loadPublishedNotas()
    await checkForSubPages()
  }
})

// Reset state when dialog is opened
watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      linkCopied.value = false

      // Refresh published status when dialog opens
      if (isAuthenticated.value) {
        notaStore.loadPublishedNotas()
        checkForSubPages()
      }
    }
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Share2 class="h-5 w-5" />
          Share Nota
        </DialogTitle>
        <DialogDescription>
          Publish your nota to make it accessible via a public link
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Login required message -->
        <div v-if="!isAuthenticated" class="flex flex-col items-center gap-4 py-4">
          <div class="bg-amber-50 text-amber-800 p-4 rounded-md text-center">
            <p class="font-medium">You need to be logged in to publish</p>
            <p class="text-sm mt-1">Please log in or create an account to share your nota</p>
          </div>
          <Button @click="$router.push('/login')">Login</Button>
        </div>

        <!-- Publishing toggle (only when authenticated) -->
        <div v-else class="flex items-center justify-between">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <Globe v-if="isPublished" class="h-4 w-4 text-green-500" />
              <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">
                {{ isPublished ? 'Published' : 'Not Published' }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{
                isPublished
                  ? 'Your nota is publicly available'
                  : 'Make your nota public to share it'
              }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Switch
              :checked="isPublished"
              @update:checked="isPublished ? unpublishNota() : publishNota()"
              :disabled="isPublishing || isUnpublishing"
            />
            <Loader2 v-if="isPublishing || isUnpublishing" class="h-4 w-4 animate-spin" />
          </div>
        </div>

        <!-- Sub-pages options - Only show when publishing, not when already published -->
        <div
          v-if="isAuthenticated && hasSubPages && !isPublished"
          class="p-4 border rounded-md bg-muted/40"
        >
          <div class="flex items-start gap-3">
            <FolderTree class="h-5 w-5 text-muted-foreground mt-0.5" />
            <div class="space-y-2 flex-1">
              <div>
                <h3 class="text-sm font-medium">Sub-Pages</h3>
                <p class="text-xs text-muted-foreground">
                  This nota contains {{ subPagesCount }} sub-page{{
                    subPagesCount !== 1 ? 's' : ''
                  }}
                </p>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox
                  id="includeSubPages"
                  v-model:checked="includeSubPages"
                  :disabled="isPublishing || isUnpublishing"
                />
                <label
                  for="includeSubPages"
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include sub-pages
                </label>
              </div>
              <p class="text-xs text-muted-foreground">
                {{
                  includeSubPages
                    ? 'Sub-pages will be published and available in the published version'
                    : 'Sub-pages will not be published and links to them will be removed'
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- Information about sub-pages for already published notes -->
        <div
          v-if="isAuthenticated && hasSubPages && isPublished"
          class="p-4 border rounded-md bg-muted/40"
        >
          <div class="flex items-start gap-3">
            <FolderTree class="h-5 w-5 text-muted-foreground mt-0.5" />
            <div class="space-y-2 flex-1">
              <div>
                <h3 class="text-sm font-medium">Note about Sub-Pages</h3>
                <p class="text-xs text-muted-foreground">
                  When you unpublish this nota, all its published sub-pages will be unpublished as
                  well.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Simple update button when already published -->
        <div v-if="isAuthenticated && isPublished" class="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            @click="updatePublishedVersion"
            :disabled="isPublishing"
          >
            <RefreshCw class="h-4 w-4 mr-1" :class="{ 'animate-spin': isPublishing }" />
            Update Published Version
          </Button>
        </div>

        <!-- Public link section (only visible when published) -->
        <div v-if="isAuthenticated && isPublished" class="space-y-2">
          <label class="text-sm font-medium">Public Link</label>
          <div class="flex space-x-2">
            <Input :value="publicLink" readonly class="flex-1" />
            <Button
              variant="secondary"
              size="icon"
              @click="copyLink"
              :class="{ 'bg-green-500 text-white': linkCopied }"
            >
              <Copy class="h-4 w-4" />
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">Anyone with this link can view this nota</p>

          <!-- Link to user's published notas -->
          <div class="flex justify-between items-center mt-4 pt-4 border-t">
            <span class="text-sm">See all your published notas</span>
            <Button
              variant="ghost"
              size="sm"
              @click="$router.push(`/u/${authStore.currentUser?.uid}`)"
            >
              View All
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleClose">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>








