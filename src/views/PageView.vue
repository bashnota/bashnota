<script setup lang="ts">
import NotaEditor from '@/components/NotaEditor.vue'

const props = defineProps<{
  id: string
}>()
</script>

<template>
  <div class="page-view">
    <NotaEditor :page-id="id" />
  </div>
</template>

<style scoped>
.page-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style> 