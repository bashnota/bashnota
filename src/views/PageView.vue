<script setup lang="ts">
import NotaEditor from '@/components/editor/NotaEditor.vue'

defineProps<{
  id: string
}>()
</script>

<template>
  <div>
    <NotaEditor :page-id="id" />
  </div>
</template>
