// Components
export { default as ReferencesList } from './ReferencesList.vue'
export { default as ReferenceDialog } from './ReferenceDialog.vue'
export { default as ReferenceEditDialog } from './ReferenceEditDialog.vue'
export { default as EmptyReferencesState } from './EmptyReferencesState.vue'
export { default as ReferencesPreviewTable } from './ReferencesPreviewTable.vue'

// Composables
export { useReferencesSearch } from '@/features/nota/composables/useReferencesSearch'
export { useReferenceDialog } from '@/features/nota/composables/useReferenceDialog'
export { useReferenceForm } from '@/features/nota/composables/useReferenceForm'
export { useBibTexParser } from '@/features/nota/composables/useBibTexParser'
export { useBatchBibTexParser } from '@/features/nota/composables/useBatchBibTexParser'
export { useReferenceBatchDialog } from '@/features/nota/composables/useReferenceBatchDialog'

// Services
export { referenceValidationService } from '@/features/nota/services/referenceValidationService'

// Types
export type { UseReferencesSearchReturn } from '@/features/nota/composables/useReferencesSearch'
export type { UseReferenceDialogReturn } from '@/features/nota/composables/useReferenceDialog'
export type { UseReferenceFormReturn, FormData, ValidationErrors } from '@/features/nota/composables/useReferenceForm'
export type { UseBibTexParserReturn, ParsedBibTexData } from '@/features/nota/composables/useBibTexParser'
export type { UseBatchBibTexParserReturn, ParsedBibTexEntry } from '@/features/nota/composables/useBatchBibTexParser'
export type { UseReferenceBatchDialogReturn } from '@/features/nota/composables/useReferenceBatchDialog'
export type { ValidationResult } from '@/features/nota/services/referenceValidationService' 