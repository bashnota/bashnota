<script setup lang="ts">
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { Badge } from '@/components/ui/badge'
import {
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
  Menu,
  Layers,
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
  toggleSidebarPin,
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
</script>

<template>
  <div v-if="isNotaView">
    <Menubar>
      <!-- Sidebars Menu -->
      <MenubarMenu>
        <MenubarTrigger class="flex items-center gap-2">
          <Layers class="h-4 w-4" />
          Sidebars
          <Badge v-if="hasActiveSidebar" variant="secondary" class="text-xs ml-1">
            {{ activeSidebar?.title }}
          </Badge>
        </MenubarTrigger>
        <MenubarContent class="w-72">
          <!-- Pinned Sidebars Section -->
          <div v-if="pinnedSidebars.length > 0">
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Pin class="h-3 w-3" />
              Pinned Sidebars
            </div>
            <MenubarItem
              v-for="sidebar in pinnedSidebars"
              :key="`pinned-${sidebar.id}`"
              @click="toggleSidebar(sidebar.id)"
              class="flex items-center gap-2 py-2"
            >
              <component :is="getIcon(sidebar.icon)" class="h-4 w-4" />
              <div class="flex-1">
                <div class="font-medium text-sm">{{ sidebar.title }}</div>
                <div class="text-xs text-muted-foreground">{{ sidebar.description }}</div>
              </div>
              <div class="flex items-center gap-1">
                <Badge v-if="sidebar.isOpen" variant="default" class="text-xs">
                  Active
                </Badge>
                <button
                  @click.stop="toggleSidebarPin(sidebar.id)"
                  class="p-1 hover:bg-muted rounded"
                  :title="'Unpin ' + sidebar.title"
                >
                  <PinOff class="h-3 w-3" />
                </button>
              </div>
            </MenubarItem>
            <MenubarSeparator />
          </div>

          <!-- All Sidebars by Category -->
          <div v-for="category in sidebarsByCategory" :key="category.id">
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <component :is="categoryIcons[category.id]" class="h-3 w-3" />
              {{ category.title }}
              <Badge variant="outline" class="text-xs ml-auto">
                {{ category.sidebars.length }}
              </Badge>
            </div>
            
            <MenubarCheckboxItem
              v-for="sidebar in category.sidebars"
              :key="sidebar.id"
              :checked="sidebar.isOpen"
              @click="toggleSidebar(sidebar.id)"
              class="flex items-center gap-2 py-2"
            >
              <component :is="getIcon(sidebar.icon)" class="h-4 w-4" />
              <div class="flex-1">
                <div class="font-medium text-sm">{{ sidebar.title }}</div>
                <div class="text-xs text-muted-foreground">{{ sidebar.description }}</div>
              </div>
              <button
                @click.stop="toggleSidebarPin(sidebar.id)"
                class="p-1 hover:bg-muted rounded"
                :title="sidebar.isPinned ? 'Unpin ' + sidebar.title : 'Pin ' + sidebar.title"
              >
                <Pin v-if="!sidebar.isPinned" class="h-3 w-3" />
                <PinOff v-else class="h-3 w-3 text-primary" />
              </button>
            </MenubarCheckboxItem>
          </div>

          <MenubarSeparator />
          
          <!-- Quick Actions -->
          <MenubarItem 
            @click="closeAllSidebars"
            :disabled="!hasActiveSidebar"
            class="text-muted-foreground"
          >
            Close All Sidebars
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  </div>
</template>
