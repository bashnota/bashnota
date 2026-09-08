<script setup lang="ts">
import { computed, ref, shallowRef, watch, type Component } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { loadEditorAppShell } from '@/components/editorAppShellLoader'
import { Toaster } from '@/services/toast'
import { useStorageAuthority } from '@/services/storageAuthority'

const EDITOR_SHELL_TIMEOUT_MS = 15_000
const route = useRoute()
const { requestedBackend, activeBackend, startupError } = useStorageAuthority()
const usesEditorShell = computed(() => route.matched.some((record) => record.meta.editorShell === true))
const editorAppShell = shallowRef<Component | null>(null)
const editorShellStatus = ref<'idle' | 'loading' | 'error'>('idle')
const editorShellError = ref('')
let editorLoadAttempt = 0

async function loadEditorShell() {
  const attempt = ++editorLoadAttempt
  editorAppShell.value = null
  editorShellStatus.value = 'loading'
  editorShellError.value = ''
  try {
    const component = await Promise.race([
      loadEditorAppShell(),
      new Promise<never>((_, reject) => window.setTimeout(
        () => reject(new Error('The editor took too long to load.')), EDITOR_SHELL_TIMEOUT_MS,
      )),
    ])
    if (attempt === editorLoadAttempt && usesEditorShell.value) editorAppShell.value = component
  } catch (error) {
    if (attempt === editorLoadAttempt && usesEditorShell.value) {
      editorShellStatus.value = 'error'
      editorShellError.value = error instanceof Error ? error.message : 'The editor could not be loaded.'
    }
  }
}

function retryEditorShell() {
  void loadEditorShell()
}

function retryStorage() {
  window.location.reload()
}

function recoverWithIndexedDB() {
  localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'indexeddb', autoWatch: true }))
  window.location.reload()
}

watch(usesEditorShell, (shouldLoadEditorShell) => {
  if (shouldLoadEditorShell) {
    void loadEditorShell()
  } else {
    editorLoadAttempt += 1
    editorAppShell.value = null
    editorShellStatus.value = 'idle'
  }
}, { immediate: true })
</script>

<template>
  <Toaster rich-colors position="bottom-right" />
  <section v-if="startupError" class="min-h-screen grid place-items-center p-6" role="alert" aria-live="assertive">
    <div class="max-w-lg space-y-4 rounded-lg border bg-background p-6 text-center shadow-sm">
      <h1 class="text-lg font-semibold">Your selected storage could not be opened</h1>
      <p class="text-sm text-muted-foreground">{{ startupError }}</p>
      <p class="text-sm">BashNota has not opened another library or enabled temporary storage, so your data authority remains unambiguous.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <button type="button" class="rounded-md border px-4 py-2" @click="retryStorage">Retry</button>
        <button v-if="requestedBackend === 'filesystem'" type="button" class="rounded-md bg-primary px-4 py-2 text-primary-foreground" @click="recoverWithIndexedDB">
          Use IndexedDB instead
        </button>
      </div>
    </div>
  </section>
  <div v-else>
    <div v-if="activeBackend === 'memory'" class="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950" role="status" aria-live="polite">
      Temporary memory storage is active. Changes will be lost when this tab closes. Choose a durable backend in Storage Mode.
    </div>
    <component :is="editorAppShell" v-if="usesEditorShell && editorAppShell" />
    <section v-else-if="usesEditorShell && editorShellStatus === 'loading'" class="min-h-screen grid place-items-center p-6" role="status" aria-live="polite" aria-busy="true">
    <div class="text-center">
      <p class="font-medium">Loading editor…</p>
      <p class="text-sm text-muted-foreground">Your note stays available while its editor tools load.</p>
    </div>
    </section>
    <section v-else-if="usesEditorShell && editorShellStatus === 'error'" class="min-h-screen grid place-items-center p-6" role="alert" aria-live="assertive">
      <div class="max-w-md text-center space-y-3">
        <h1 class="font-semibold">The editor could not be loaded</h1>
        <p class="text-sm text-muted-foreground">{{ editorShellError }} Check your connection, then retry.</p>
        <div class="flex justify-center gap-3">
          <button type="button" class="underline" @click="retryEditorShell">Retry editor</button>
          <RouterLink class="underline" to="/">Return home</RouterLink>
        </div>
      </div>
    </section>
    <RouterView v-else />
  </div>
</template>
