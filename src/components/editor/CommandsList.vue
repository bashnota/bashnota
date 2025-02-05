<template>
  <div class="commands-list">
    <template v-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="index"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="selectItem(index)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span>{{ item.title }}</span>
      </button>
    </template>
    <div class="item" v-else>
      No result
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  items: Array<{
    title: string
    icon?: string
    command: (props: any) => void
  }>
  command: (props: any) => void
}>()

const selectedIndex = ref(0)

watch(() => props.items, () => {
  selectedIndex.value = 0
})

const selectItem = (index: number) => {
  const item = props.items[index]
  if (item) {
    props.command(item)
  }
}

const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = ((selectedIndex.value + props.items.length) - 1) % props.items.length
    return true
  }

  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }

  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }

  return false
}

defineExpose({ onKeyDown })
</script>

<style scoped>
.commands-list {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.7rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow: auto;
  padding: 0.4rem;
  position: relative;
}

button {
  align-items: center;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  text-align: left;
  width: 100%;
}

button:hover,
button.is-selected {
  background-color: var(--color-background-soft);
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--color-background-mute);
  border-radius: 4px;
}
</style> 