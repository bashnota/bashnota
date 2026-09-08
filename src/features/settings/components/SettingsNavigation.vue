<script setup lang="ts">
import { computed, ref } from 'vue'
import { Command, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { settingsCategories } from '@/features/settings/settingsNavigation'

const props = defineProps<{
  selectedSetting: string
  shortcutLabel: string
}>()

const emit = defineEmits<{
  select: [settingId: string]
  openCommand: []
}>()

const query = ref('')

const filteredCategories = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  if (!normalizedQuery) return settingsCategories

  return settingsCategories
    .map(category => ({
      ...category,
      destinations: category.destinations.filter(destination => {
        const haystack = [
          category.title,
          destination.title,
          destination.description,
          ...destination.keywords,
        ].join(' ').toLowerCase()
        return haystack.includes(normalizedQuery)
      }),
    }))
    .filter(category => category.destinations.length > 0)
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-2 border-b p-3">
      <div class="relative">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="query"
          aria-label="Filter settings navigation"
          placeholder="Filter settings"
          class="h-11 pl-9 pr-10"
        />
        <Button
          v-if="query"
          type="button"
          variant="ghost"
          size="icon"
          class="absolute right-0 top-0 h-11 w-11 text-muted-foreground"
          aria-label="Clear settings filter"
          @click="query = ''"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        class="h-10 w-full justify-start px-3 text-muted-foreground"
        @click="emit('openCommand')"
      >
        <Command class="mr-2 h-4 w-4" />
        Search every setting
        <kbd class="ml-auto rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground">
          {{ shortcutLabel }}
        </kbd>
      </Button>
    </div>

    <nav aria-label="Settings sections" class="min-h-0 flex-1 overflow-y-auto p-3">
      <div v-if="filteredCategories.length" class="space-y-5">
        <section v-for="category in filteredCategories" :key="category.id">
          <h2 class="mb-1.5 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <component :is="category.icon" class="h-3.5 w-3.5" />
            {{ category.title }}
          </h2>

          <div class="space-y-1">
            <button
              v-for="destination in category.destinations"
              :key="destination.id"
              type="button"
              :aria-current="props.selectedSetting === destination.id ? 'page' : undefined"
              :class="[
                'group flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                props.selectedSetting === destination.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-accent',
              ]"
              @click="emit('select', destination.id)"
            >
              <span class="min-w-0 flex-1 truncate">{{ destination.title }}</span>
            </button>
          </div>
        </section>
      </div>

      <div v-else class="px-3 py-10 text-center">
        <p class="text-sm font-medium">No settings match “{{ query }}”</p>
        <button type="button" class="mt-2 text-sm text-muted-foreground underline underline-offset-4" @click="query = ''">
          Clear the filter
        </button>
      </div>
    </nav>
  </div>
</template>
