<template>
  <Button
    :class="['sidebar-toggle', toggleButtonClass]"
    :variant="variant"
    :size="size"
    @click="onClick"
    :title="toggleTitle"
    aria-label="Toggle Sidebar"
    tabindex="0"
  >
    <slot>
      <component :is="isOpen ? toggleOpenIcon : toggleClosedIcon" class="h-4 w-4" />
    </slot>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Component } from 'vue'

export interface SidebarToggleButtonProps {
  isOpen: boolean
  position?: 'left' | 'right'
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  toggleButtonClass?: string
  toggleOpenIcon?: Component
  toggleClosedIcon?: Component
}

const props = withDefaults(defineProps<SidebarToggleButtonProps>(), {
  position: 'right',
  variant: 'ghost',
  size: 'icon',
  toggleButtonClass: '',
  toggleOpenIcon: () => (ChevronRight),
  toggleClosedIcon: () => (ChevronLeft)
})

const emit = defineEmits<{
  toggle: []
}>()

// Automatically determine icons based on position if not specified
const computedOpenIcon = computed(() => 
  props.position === 'right' ? ChevronRight : ChevronLeft
)

const computedClosedIcon = computed(() => 
  props.position === 'right' ? ChevronLeft : ChevronRight
)

// Use provided icons or computed ones
const toggleOpenIcon = computed(() => 
  props.toggleOpenIcon || computedOpenIcon.value
)

const toggleClosedIcon = computed(() => 
  props.toggleClosedIcon || computedClosedIcon.value
)

const toggleTitle = computed(() => 
  props.isOpen ? 'Hide Sidebar' : 'Show Sidebar'
)

const onClick = () => {
  emit('toggle')
}
</script>