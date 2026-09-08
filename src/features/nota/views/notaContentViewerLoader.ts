import type { Component } from 'vue'

/** Loaded only after a public nota has successfully fetched its content. */
export const loadNotaContentViewer = async (): Promise<Component> => (
  await import('@/features/editor/components/NotaContentViewer.vue')
).default
