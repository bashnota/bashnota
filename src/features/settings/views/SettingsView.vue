<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Menu, Settings2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import SettingsCommandPalette from '@/features/settings/components/SettingsCommandPalette.vue'
import SettingsNavigation from '@/features/settings/components/SettingsNavigation.vue'
import SettingsPanel from '@/features/settings/components/SettingsPanel.vue'
import { findSettingDestination } from '@/features/settings/settingsNavigation'

const legacySectionRedirects: Record<string, string> = {
  'text-editing': 'unified-editor',
  'code-editing': 'unified-editor',
  formatting: 'unified-editor',
  theme: 'unified-appearance',
  interface: 'unified-appearance',
  'ai-providers': 'unified-ai',
  'ai-generation': 'unified-ai',
  advanced: 'unified-advanced',
}

const route = useRoute()
const router = useRouter()
const showCommandPalette = ref(false)
const showMobileNavigation = ref(false)

const selectedSetting = computed(() => {
  const section = (route.params.section as string) || 'unified-editor'
  return legacySectionRedirects[section] ?? section
})

const currentDestination = computed(() => findSettingDestination(selectedSetting.value))
const currentSettingTitle = computed(() => currentDestination.value?.title ?? 'Settings section unavailable')
const currentSettingDescription = computed(() => currentDestination.value?.description ?? 'Choose an available section from the settings navigation.')
const currentSettingComponent = computed(() => currentDestination.value?.component ?? '')
const currentCategory = computed(() => currentDestination.value?.category ?? 'Settings')

function getKeyboardLabel() {
  if (typeof window === 'undefined') return 'Ctrl K'
  return window.navigator.platform.includes('Mac') ? '⌘ K' : 'Ctrl K'
}

function selectSetting(settingId: string) {
  showMobileNavigation.value = false
  if (settingId !== selectedSetting.value) {
    void router.push({ name: 'settings-detail', params: { section: settingId } })
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    showCommandPalette.value = true
  }
}

function canonicalizeRoute() {
  const section = route.params.section as string
  const canonicalSection = legacySectionRedirects[section]
  if (canonicalSection) {
    void router.replace({ name: 'settings-detail', params: { section: canonicalSection } })
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  canonicalizeRoute()
})

onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))
watch(() => route.params.section, canonicalizeRoute)
</script>

<template>
  <div class="min-h-screen bg-muted/20 md:grid md:h-screen md:min-h-0 md:grid-cols-[18rem_minmax(0,1fr)]">
    <aside class="hidden min-h-0 border-r bg-background md:flex md:flex-col">
      <div class="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <Button as-child variant="ghost" size="icon" class="h-11 w-11 shrink-0" aria-label="Back to notas">
          <RouterLink to="/">
            <ArrowLeft class="h-4 w-4" />
          </RouterLink>
        </Button>
        <div class="min-w-0">
          <p class="truncate font-semibold">Settings</p>
          <p class="truncate text-xs text-muted-foreground">BashNota workspace</p>
        </div>
      </div>

      <SettingsNavigation
        :selected-setting="selectedSetting"
        :shortcut-label="getKeyboardLabel()"
        @select="selectSetting"
        @open-command="showCommandPalette = true"
      />
    </aside>

    <main class="min-w-0 md:min-h-0 md:overflow-y-auto">
      <header class="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:hidden">
        <Button as-child variant="ghost" size="icon" class="h-11 w-11 shrink-0" aria-label="Back to notas">
          <RouterLink to="/">
            <ArrowLeft class="h-5 w-5" />
          </RouterLink>
        </Button>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{{ currentCategory }}</p>
          <p class="truncate font-semibold">{{ currentSettingTitle }}</p>
        </div>
        <Button variant="outline" size="icon" class="h-11 w-11 shrink-0" aria-label="Open settings navigation" @click="showMobileNavigation = true">
          <Menu class="h-5 w-5" />
        </Button>
      </header>

      <div class="mx-auto w-full max-w-6xl">
        <header class="border-b px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div class="flex items-start gap-4">
            <div class="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-sm sm:flex">
              <Settings2 class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="hidden text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground md:block">{{ currentCategory }}</p>
              <h1 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{{ currentSettingTitle }}</h1>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{{ currentSettingDescription }}</p>
            </div>
          </div>
        </header>

        <SettingsPanel :setting-id="selectedSetting" :component="currentSettingComponent" />
      </div>
    </main>

    <Sheet v-model:open="showMobileNavigation">
      <SheetContent side="left" class="flex w-[min(22rem,calc(100vw-1rem))] flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader class="shrink-0 border-b px-4 py-4 pr-14 text-left">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Choose what you want to configure.</SheetDescription>
        </SheetHeader>
        <SettingsNavigation
          :selected-setting="selectedSetting"
          :shortcut-label="getKeyboardLabel()"
          @select="selectSetting"
          @open-command="showCommandPalette = true; showMobileNavigation = false"
        />
      </SheetContent>
    </Sheet>

    <SettingsCommandPalette
      v-model:open="showCommandPalette"
      @navigate="selectSetting"
    />
  </div>
</template>
