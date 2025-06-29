// Components
export { default as ReferencesList } from './ReferencesList.vue'
export { default as ReferenceDialog } from './components/ReferenceDialog.vue'
export { default as EmptyReferencesState } from './EmptyReferencesState.vue'

// Composables
export { useReferencesSearch } from '@/features/nota/composables/useReferencesSearch'
export { useReferenceDialog } from '@/features/nota/composables/useReferenceDialog'
export { useReferenceForm } from '@/features/nota/composables/useReferenceForm'
export { useBibTexParser } from '@/features/nota/composables/useBibTexParser'

// Types
export type { UseReferencesSearchReturn } from '@/features/nota/composables/useReferencesSearch'
export type { UseReferenceDialogReturn } from '@/features/nota/composables/useReferenceDialog'
export type { UseReferenceFormReturn, FormData, ValidationErrors } from '@/features/nota/composables/useReferenceForm'
export type { UseBibTexParserReturn, ParsedBibTexData } from '@/features/nota/composables/useBibTexParser' 