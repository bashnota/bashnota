// Components
export { default as ReferencesList } from './ReferencesList.vue'
export { default as ReferenceDialog } from './ReferenceDialog.vue'
export { default as EmptyReferencesState } from './EmptyReferencesState.vue'

// Composables
export { useReferencesSearch } from './composables/useReferencesSearch'
export { useReferenceDialog } from './composables/useReferenceDialog'
export { useReferenceForm } from './composables/useReferenceForm'
export { useBibTexParser } from './composables/useBibTexParser'

// Types
export type { UseReferencesSearchReturn } from './composables/useReferencesSearch'
export type { UseReferenceDialogReturn } from './composables/useReferenceDialog'
export type { UseReferenceFormReturn, FormData, ValidationErrors } from './composables/useReferenceForm'
export type { UseBibTexParserReturn, ParsedBibTexData } from './composables/useBibTexParser' 