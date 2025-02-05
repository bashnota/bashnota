<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { exportNota } from '@/services/export'

const route = useRoute()
const notaStore = useNotaStore()

const exportAs = async (format: 'pdf' | 'markdown' | 'html') => {
  const nota = notaStore.getCurrentNota(route.params.id as string)
  if (!nota) return

  try {
    const result = await exportNota(nota.content, format)
    // Handle the exported content (download, preview, etc.)
    const blob = new Blob([result], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nota.title}.${format}`
    a.click()
  } catch (error) {
    console.error('Export failed:', error)
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-actions">
      <button class="action-button" @click="notaStore.saveNota">Save</button>
      <div class="dropdown">
        <button class="action-button">Export</button>
        <div class="dropdown-content">
          <button @click="exportAs('markdown')">Markdown</button>
          <button @click="exportAs('pdf')">PDF</button>
          <button @click="exportAs('html')">HTML</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.action-button:hover {
  background: var(--color-background-soft);
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-content {
  display: none;
  position: absolute;
  background: var(--color-background);
  min-width: 160px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  z-index: 1;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content button {
  width: 100%;
  padding: 0.5rem 1rem;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
}

.dropdown-content button:hover {
  background: var(--color-background-soft);
}
</style>
