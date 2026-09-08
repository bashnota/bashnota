<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ExternalLink,
  FileUp,
  FolderOpen,
  Github,
  Ellipsis,
  LogIn,
  Mail,
  Plus,
  Settings,
  Twitter,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useNotaImport } from '@/features/nota/composables/useNotaImport'
import { FILE_EXTENSIONS } from '@/constants/app'
import NewsletterModal from './NewsletterModal.vue'

defineProps<{
  isFilesystemMode?: boolean
  hasDirectoryAccess?: boolean
  directoryName?: string | null
}>()

const emit = defineEmits<{
  (event: 'create-nota'): void
  (event: 'select-directory'): void
}>()

const authStore = useAuthStore()
const router = useRouter()
const isNewsletterModalOpen = ref(false)
const { importNota, importJupyterNotebook, isImporting } = useNotaImport()

const greeting = computed(() => {
  const name = authStore.currentUser?.displayName
  return name ? `Welcome back, ${name}.` : 'Local-first notes for writing, code, and research.'
})

const handleImportNota = () => importNota([FILE_EXTENSIONS.nota])
const handleImportIpynb = () => importJupyterNotebook()
const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
</script>

<template>
  <aside class="flex h-full min-h-0 flex-col border-b pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-5 lg:pr-6">
    <div>
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <img src="@/assets/logo.svg" alt="" class="h-7 w-7" />
        </div>
        <div class="min-w-0">
          <h1 class="text-xl font-semibold tracking-tight">BashNota</h1>
          <p class="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">Private workspace</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="ml-auto h-10 w-10 shrink-0"
              aria-label="Workspace menu"
            >
              <Ellipsis aria-hidden="true" class="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-72">
            <DropdownMenuLabel>Add content</DropdownMenuLabel>
            <DropdownMenuItem :disabled="isImporting" @select="handleImportNota">
              <FileUp aria-hidden="true" class="h-4 w-4" />
              {{ isImporting ? 'Importing…' : 'Import Nota file' }}
            </DropdownMenuItem>
            <DropdownMenuItem :disabled="isImporting" @select="handleImportIpynb">
              <FileUp aria-hidden="true" class="h-4 w-4" />
              Import Jupyter notebook
            </DropdownMenuItem>
            <DropdownMenuItem v-if="isFilesystemMode" @select="emit('select-directory')">
              <FolderOpen aria-hidden="true" class="h-4 w-4" />
              <span class="truncate">
                {{ hasDirectoryAccess && directoryName ? directoryName : 'Choose nota directory' }}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuItem v-if="!authStore.isAuthenticated" @select="router.push('/login')">
              <LogIn aria-hidden="true" class="h-4 w-4" />
              Sign in to publish
            </DropdownMenuItem>
            <DropdownMenuItem v-else @select="isNewsletterModalOpen = true">
              <Mail aria-hidden="true" class="h-4 w-4" />
              Newsletter
            </DropdownMenuItem>
            <DropdownMenuItem @select="router.push('/settings')">
              <Settings aria-hidden="true" class="h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>BashNota</DropdownMenuLabel>
            <DropdownMenuItem @select="openExternal('https://github.com/mlnomadpy/bashnota')">
              <Github aria-hidden="true" class="h-4 w-4" />
              View project on GitHub
              <ExternalLink aria-hidden="true" class="ml-auto h-3.5 w-3.5 opacity-60" />
            </DropdownMenuItem>
            <DropdownMenuItem @select="openExternal('https://twitter.com/bashnota')">
              <Twitter aria-hidden="true" class="h-4 w-4" />
              Follow BashNota on X
              <ExternalLink aria-hidden="true" class="ml-auto h-3.5 w-3.5 opacity-60" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p class="mt-5 max-w-52 text-sm leading-6 text-muted-foreground">{{ greeting }}</p>

      <Button
        aria-label="Create a nota"
        class="mt-5 min-h-11 w-full justify-start shadow-sm"
        size="lg"
        @click="emit('create-nota')"
      >
        <Plus aria-hidden="true" class="mr-2 h-4 w-4" />
        New nota
      </Button>
    </div>

    <p class="mt-auto hidden max-w-52 pb-1 text-xs leading-5 text-muted-foreground md:block">
      Open source. Your workspace stays private and local by default.
    </p>
  </aside>

  <NewsletterModal :open="isNewsletterModalOpen" @update:open="isNewsletterModalOpen = $event" />
</template>
