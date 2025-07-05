<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible'
import { Tooltip } from '@/ui/tooltip'
import { Badge } from '@/ui/badge'
import {
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
  Menu,
  Pin,
  PinOff,
} from 'lucide-vue-next'
import { useSidebarManager } from '@/composables/useSidebarManager'

const {
  sidebarsByCategory,
  pinnedSidebars,
  activeSidebar,
  hasActiveSidebar,
  isNotaView,
  toggleSidebar,
  closeAllSidebars,
  toggleCategory,
  toggleSidebarPanel,
  toggleSidebarPin,
  isSidebarPanelOpen,
} = useSidebarManager()

// Icon mapping
const iconMap = {
  Menu,
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
}

// Get icon component
const getIcon = (iconName: string) => {
  return iconMap[iconName as keyof typeof iconMap] || Menu
}

// Category icons
const categoryIcons = {
  navigation: Menu,
  content: BookIcon,
  development: ServerIcon,
  analysis: BrainIcon,
}

// Category colors
const categoryColors = {
  navigation: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  content: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  development: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  analysis: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}
</script>

<template>
  <div
    v-if="isNotaView"
    class="relative"
  >
    <!-- Sidebar Panel Toggle Button -->
    <Tooltip :content="isSidebarPanelOpen ? 'Hide sidebar panel' : 'Show sidebar panel'">
      <Button
        variant="ghost"
        size="icon"
        @click="toggleSidebarPanel"
        :class="{ 'bg-muted': isSidebarPanelOpen || hasActiveSidebar }"
      >
        <Layers class="h-5 w-5" />
      </Button>
    </Tooltip>

    <!-- Sidebar Panel Dropdown -->
    <div
      v-if="isSidebarPanelOpen"
      class="absolute top-full left-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-3 border-b">
        <div class="flex items-center gap-2">
          <Layers class="h-4 w-4 text-muted-foreground" />
          <h3 class="font-medium text-sm">Editor Sidebars</h3>
          <Badge v-if="hasActiveSidebar" variant="secondary" class="text-xs">
            {{ activeSidebar?.title }}
          </Badge>
          <Badge v-if="pinnedSidebars.length > 0" variant="outline" class="text-xs">
            {{ pinnedSidebars.length }} pinned
          </Badge>
        </div>
        <div class="flex items-center gap-1">
          <Tooltip content="Close all sidebars">
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              @click="closeAllSidebars"
              :disabled="!hasActiveSidebar"
            >
              <X class="h-3 w-3" />
            </Button>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="toggleSidebarPanel"
          >
            <X class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <!-- Pinned Sidebars Section -->
      <div v-if="pinnedSidebars.length > 0" class="border-b">
        <div class="p-3 bg-muted/30">
          <div class="flex items-center gap-2 mb-2">
            <Pin class="h-4 w-4 text-primary" />
            <h4 class="font-medium text-sm">Pinned Sidebars</h4>
          </div>
          <div class="space-y-1">
            <Button
              v-for="sidebar in pinnedSidebars"
              :key="sidebar.id"
              variant="ghost"
              class="w-full justify-start h-auto p-2 hover:bg-muted/50"
              :class="{ 'bg-muted': sidebar.isOpen }"
              @click="toggleSidebar(sidebar.id)"
            >
              <component
                :is="getIcon(sidebar.icon)"
                class="h-4 w-4 mr-3 text-muted-foreground"
              />
              <div class="flex-1 text-left">
                <div class="font-medium text-sm">{{ sidebar.title }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ sidebar.description }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Tooltip content="Unpin sidebar">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6"
                    @click.stop="toggleSidebarPin(sidebar.id)"
                  >
                    <PinOff class="h-3 w-3" />
                  </Button>
                </Tooltip>
                <Badge
                  v-if="sidebar.isOpen"
                  variant="default"
                  class="text-xs"
                >
                  Active
                </Badge>
              </div>
            </Button>
          </div>
        </div>
      </div>

      <!-- Sidebar Categories -->
      <div class="max-h-80 overflow-y-auto">
        <div
          v-for="category in sidebarsByCategory"
          :key="category.id"
          class="border-b last:border-b-0"
        >
          <Collapsible :open="!category.isCollapsed">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                class="w-full justify-start p-3 h-auto hover:bg-muted/50"
                @click="toggleCategory(category.id)"
              >
                <component
                  :is="categoryIcons[category.id]"
                  class="h-4 w-4 mr-2 text-muted-foreground"
                />
                <div class="flex-1 text-left">
                  <div class="font-medium text-sm">{{ category.title }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ category.description }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge
                    :class="categoryColors[category.id]"
                    variant="secondary"
                    class="text-xs"
                  >
                    {{ category.sidebars.length }}
                  </Badge>
                  <ChevronDown
                    class="h-4 w-4 transition-transform"
                    :class="{ 'rotate-180': category.isCollapsed }"
                  />
                </div>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent class="pb-2">
              <div class="space-y-1 px-3">
                <Button
                  v-for="sidebar in category.sidebars"
                  :key="sidebar.id"
                  variant="ghost"
                  class="w-full justify-start h-auto p-2 hover:bg-muted/50"
                  :class="{ 'bg-muted': sidebar.isOpen }"
                  @click="toggleSidebar(sidebar.id)"
                >
                  <component
                    :is="getIcon(sidebar.icon)"
                    class="h-4 w-4 mr-3 text-muted-foreground"
                  />
                  <div class="flex-1 text-left">
                    <div class="font-medium text-sm">{{ sidebar.title }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ sidebar.description }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Tooltip :content="sidebar.isPinned ? 'Unpin sidebar' : 'Pin to top bar'">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6"
                        @click.stop="toggleSidebarPin(sidebar.id)"
                      >
                        <Pin v-if="!sidebar.isPinned" class="h-3 w-3" />
                        <PinOff v-else class="h-3 w-3 text-primary" />
                      </Button>
                    </Tooltip>
                    <Badge
                      v-if="sidebar.isOpen"
                      variant="default"
                      class="text-xs"
                    >
                      Active
                    </Badge>
                    <ChevronRight
                      class="h-3 w-3 text-muted-foreground"
                      :class="{ 'rotate-90': sidebar.isOpen }"
                    />
                  </div>
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-3 border-t bg-muted/30">
        <div class="text-xs text-muted-foreground text-center">
          {{ sidebarsByCategory.reduce((acc, cat) => acc + cat.sidebars.length, 0) }} sidebars available
        </div>
      </div>
    </div>
  </div>
</template> 