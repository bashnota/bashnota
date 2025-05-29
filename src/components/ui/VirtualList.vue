<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Props<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}

const props = withDefaults(defineProps<Props<T>>(), {
  overscan: 5
})

const emit = defineEmits<{
  (e: 'scroll', scrollTop: number): void
}>()

// Template refs
const container = ref<HTMLElement>()
const viewport = ref<HTMLElement>()

// State
const scrollTop = ref(0)
const isScrolling = ref(false)
const scrollingTimeout = ref<number>()

// Computed values
const totalHeight = computed(() => props.items.length * props.itemHeight)

const visibleRange = computed(() => {
  const containerTop = scrollTop.value
  const containerBottom = containerTop + props.containerHeight
  
  const startIndex = Math.max(0, Math.floor(containerTop / props.itemHeight) - props.overscan)
  const endIndex = Math.min(
    props.items.length - 1,
    Math.ceil(containerBottom / props.itemHeight) + props.overscan
  )
  
  return { startIndex, endIndex }
})

const visibleItems = computed(() => {
  const { startIndex, endIndex } = visibleRange.value
  return props.items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index,
    top: (startIndex + index) * props.itemHeight
  }))
})

const offsetY = computed(() => visibleRange.value.startIndex * props.itemHeight)

// Event handlers
const handleScroll = () => {
  if (!viewport.value) return
  
  scrollTop.value = viewport.value.scrollTop
  isScrolling.value = true
  
  emit('scroll', scrollTop.value)
  
  // Clear existing timeout
  if (scrollingTimeout.value) {
    clearTimeout(scrollingTimeout.value)
  }
  
  // Set scrolling to false after scroll ends
  scrollingTimeout.value = window.setTimeout(() => {
    isScrolling.value = false
  }, 150)
}

// Methods
const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' = 'start') => {
  if (!viewport.value) return
  
  let targetScrollTop = index * props.itemHeight
  
  if (align === 'center') {
    targetScrollTop -= props.containerHeight / 2 - props.itemHeight / 2
  } else if (align === 'end') {
    targetScrollTop -= props.containerHeight - props.itemHeight
  }
  
  targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight.value - props.containerHeight))
  
  viewport.value.scrollTop = targetScrollTop
}

const scrollToTop = () => {
  if (viewport.value) {
    viewport.value.scrollTop = 0
  }
}

// Lifecycle
onMounted(() => {
  if (viewport.value) {
    viewport.value.addEventListener('scroll', handleScroll, { passive: true })
  }
})

onUnmounted(() => {
  if (viewport.value) {
    viewport.value.removeEventListener('scroll', handleScroll)
  }
  if (scrollingTimeout.value) {
    clearTimeout(scrollingTimeout.value)
  }
})

// Watch for items changes and reset scroll if needed
watch(() => props.items.length, (newLength, oldLength) => {
  if (newLength < oldLength && viewport.value) {
    // Reset scroll position if items were removed
    const maxScroll = Math.max(0, newLength * props.itemHeight - props.containerHeight)
    if (scrollTop.value > maxScroll) {
      viewport.value.scrollTop = maxScroll
    }
  }
})

// Expose methods
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollTop: computed(() => scrollTop.value),
  isScrolling: computed(() => isScrolling.value)
})
</script>

<template>
  <div ref="container" class="virtual-list-container">
    <div 
      ref="viewport"
      class="virtual-list-viewport"
      :style="{ height: `${containerHeight}px`, overflow: 'auto' }"
    >
      <div 
        class="virtual-list-spacer"
        :style="{ height: `${totalHeight}px`, position: 'relative' }"
      >
        <div 
          class="virtual-list-content"
          :style="{ transform: `translateY(${offsetY}px)` }"
        >
          <div
            v-for="{ item, index, top } in visibleItems"
            :key="index"
            class="virtual-list-item"
            :style="{ 
              height: `${itemHeight}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${top - offsetY}px)`
            }"
          >
            <slot :item="item" :index="index" :is-scrolling="isScrolling" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list-container {
  position: relative;
  width: 100%;
}

.virtual-list-viewport {
  position: relative;
  overflow: auto;
  will-change: scroll-position;
}

.virtual-list-viewport::-webkit-scrollbar {
  width: 6px;
}

.virtual-list-viewport::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.1);
  border-radius: 3px;
}

.virtual-list-viewport::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.virtual-list-viewport::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

.virtual-list-spacer {
  position: relative;
}

.virtual-list-content {
  position: relative;
  will-change: transform;
}

.virtual-list-item {
  contain: layout style paint;
}
</style> 