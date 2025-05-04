<script setup lang="ts">
import { cn } from '@/lib/utils'
import { DropdownMenuItem, type DropdownMenuItemProps, useForwardProps } from 'radix-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DropdownMenuItemProps & { class?: HTMLAttributes['class'], inset?: boolean }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuItem
    v-bind="forwardedProps"
    :class="cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      'transform-gpu will-change-transform',
      'hover:bg-accent hover:text-accent-foreground',
      'active:scale-[0.98]',
      'transition-all duration-75 ease-out',
      props.class
    )"
  >
    <slot />
  </DropdownMenuItem>
</template>

<style>
/* Add performance optimizations */
[data-radix-dropdown-menu-item] {
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

/* Optimize hover and active states */
[data-radix-dropdown-menu-item]:hover {
  transform: translate3d(0, 0, 0);
  transition: background-color 75ms ease-out, transform 75ms ease-out;
}

[data-radix-dropdown-menu-item]:active {
  transform: scale(0.98) translate3d(0, 0, 0);
  transition: transform 75ms ease-out;
}
</style>
