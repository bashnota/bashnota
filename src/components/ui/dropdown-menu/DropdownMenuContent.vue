<script setup lang="ts">
import { cn } from '@/lib/utils'
import {
  DropdownMenuContent,
  type DropdownMenuContentEmits,
  type DropdownMenuContentProps,
  DropdownMenuPortal,
  useForwardPropsEmits,
} from 'radix-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<DropdownMenuContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    sideOffset: 4,
  },
)
const emits = defineEmits<DropdownMenuContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      v-bind="forwarded"
      :class="cn(
        'z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'transform-gpu will-change-transform',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        'transition-all duration-100 ease-out',
        props.class
      )"
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>

<style>
/* Add performance optimizations */
[data-radix-popper-content-wrapper] {
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

[data-radix-popper-content-wrapper] > * {
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

/* Optimize animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translate3d(0, 0, 0);
  }
  to {
    opacity: 1;
    transform: scale(1) translate3d(0, 0, 0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: scale(1) translate3d(0, 0, 0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translate3d(0, 0, 0);
  }
}

/* Apply optimized animations */
[data-state="open"] {
  animation: fadeIn 100ms ease-out;
}

[data-state="closed"] {
  animation: fadeOut 100ms ease-out;
}
</style>
