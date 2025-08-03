<script setup lang="ts">
import { DialogRoot, type DialogRootEmits, type DialogRootProps, useForwardPropsEmits } from 'reka-ui'

interface DialogProps extends DialogRootProps {
  modal?: boolean
}

const props = withDefaults(defineProps<DialogProps>(), {
  modal: true
})
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DialogRoot v-bind="forwarded" :modal="modal">
    <slot />
  </DialogRoot>
</template>
