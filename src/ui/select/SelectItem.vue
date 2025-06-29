<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import {
  SelectItem,
  SelectItemIndicator,
  type SelectItemProps,
  SelectItemText,
} from 'radix-vue'
import { type HTMLAttributes } from 'vue'

const props = defineProps<
  SelectItemProps & {
    class?: HTMLAttributes['class']
    value: string
  }
>()
</script>

<template>
  <SelectItem
    :class="[
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      props.class
    ]"
    :value="value"
    v-bind="$attrs"
  >
    <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectItemIndicator>
        <Check class="h-4 w-4" />
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>









