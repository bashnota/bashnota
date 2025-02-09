<script setup lang="ts">
import NotaEditor from '@/components/NotaEditor.vue'

defineProps<{
  id: string
}>()
</script>

<template>
  <div>
    <NotaEditor :page-id="id" />
  </div>
</template>
