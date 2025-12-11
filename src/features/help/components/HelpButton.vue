<template>
  <Button
    :variant="variant"
    :size="size"
    @click="openHelp"
    :title="title"
    class="gap-2"
  >
    <HelpCircle :class="iconClass" />
    <span v-if="showLabel">{{ label }}</span>
  </Button>
</template>

<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  label?: string
  title?: string
  iconClass?: string
}

withDefaults(defineProps<Props>(), {
  variant: 'ghost',
  size: 'sm',
  showLabel: false,
  label: 'Help',
  title: 'Help & Documentation (F1)',
  iconClass: 'w-4 h-4'
})

const emit = defineEmits<{
  click: []
}>()

function openHelp() {
  emit('click')
}
</script>
