import type { Component } from 'vue'

/** A mockable boundary that keeps the editor chrome out of non-editor boot. */
export const loadEditorAppShell = async (): Promise<Component> => (
  await import('@/components/EditorAppShell.vue')
).default
