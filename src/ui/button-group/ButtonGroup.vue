<template>
  <div class="btn-group" :class="{ 'btn-group-vertical': vertical }">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  vertical?: boolean
}

defineProps<Props>()
</script>

<style scoped>
.btn-group {
  display: inline-flex;
  border-radius: calc(var(--radius) * 1);
}

.btn-group > :deep(button:not(:first-child)) {
  margin-left: -1px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.btn-group > :deep(button:not(:last-child)) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.btn-group > :deep(button) {
  position: relative;
}

.btn-group > :deep(button:focus) {
  z-index: 10;
}

.btn-group-vertical {
  flex-direction: column;
}

.btn-group-vertical > :deep(button:not(:first-child)) {
  margin-top: -1px;
  margin-left: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.btn-group-vertical > :deep(button:not(:last-child)) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
