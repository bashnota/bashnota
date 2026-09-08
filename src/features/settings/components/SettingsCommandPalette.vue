<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, Search } from 'lucide-vue-next'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { allSettingDestinations } from '@/features/settings/settingsNavigation'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  navigate: [settingId: string]
}>()

const searchQuery = ref('')
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const groupedSettings = computed(() => {
  const groups: Record<string, typeof allSettingDestinations> = {}
  for (const setting of allSettingDestinations) {
    if (!groups[setting.category]) groups[setting.category] = []
    groups[setting.category].push(setting)
  }
  return groups
})

function handleSelect(settingId: string) {
  emit('navigate', settingId)
  emit('update:open', false)
}

watch(() => props.open, open => {
  if (!open) searchQuery.value = ''
})
</script>

<template>
  <CommandDialog v-model:open="isOpen">
    <CommandInput v-model="searchQuery" placeholder="Search settings by name or purpose" class="h-14" />
    <CommandList class="max-h-[min(28rem,70vh)]">
      <CommandEmpty>
        <div class="px-6 py-10 text-center">
          <Search class="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p class="text-sm font-medium">No matching setting</p>
          <p class="mt-1 text-xs text-muted-foreground">Try “theme”, “Jupyter”, “backup”, or “shortcuts”.</p>
        </div>
      </CommandEmpty>

      <CommandGroup v-for="(settings, category) in groupedSettings" :key="category" :heading="category">
        <CommandItem
          v-for="setting in settings"
          :key="setting.id"
          :value="`${setting.title} ${setting.description} ${setting.keywords.join(' ')}`"
          class="flex cursor-pointer items-center gap-3 px-3 py-3"
          @select="handleSelect(setting.id)"
        >
          <component :is="setting.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-medium">{{ setting.title }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ setting.description }}</p>
          </div>
          <ArrowRight class="h-4 w-4 shrink-0 text-muted-foreground" />
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
