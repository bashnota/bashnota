import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { CitationEntry } from '@/types/nota'

export interface FormData {
  key: string
  title: string
  authors: string
  year: string
  journal: string
  volume: string
  number: string
  pages: string
  publisher: string
  url: string
  doi: string
}

export interface ValidationErrors {
  key: string
  title: string
  authors: string
  year: string
}

export interface UseReferenceFormReturn {
  formData: Ref<FormData>
  validationErrors: Ref<ValidationErrors>
  validateForm: () => boolean
  resetForm: () => void
  populateForm: (data: Partial<CitationEntry> | any) => void
}

export function useReferenceForm(
  existingCitations: CitationEntry[],
  getCurrentCitation: () => CitationEntry | null
): UseReferenceFormReturn {
  const formData = ref<FormData>({
    key: '',
    title: '',
    authors: '',
    year: '',
    journal: '',
    volume: '',
    number: '',
    pages: '',
    publisher: '',
    url: '',
    doi: ''
  })

  const validationErrors = ref<ValidationErrors>({
    key: '',
    title: '',
    authors: '',
    year: ''
  })

  const validateForm = (): boolean => {
    let isValid = true
    const currentCitation = getCurrentCitation()
    
    // Reset errors
    validationErrors.value = {
      key: '',
      title: '',
      authors: '',
      year: ''
    }

    // Key validation
    if (!formData.value.key.trim()) {
      validationErrors.value.key = 'Citation key is required'
      isValid = false
    } else {
      // Check for duplicate keys
      const isDuplicate = existingCitations.some(c => 
        c.key === formData.value.key.trim() && 
        (!currentCitation || c.id !== currentCitation.id)
      )
      if (isDuplicate) {
        validationErrors.value.key = 'Citation key must be unique'
        isValid = false
      }
    }

    // Title validation
    if (!formData.value.title.trim()) {
      validationErrors.value.title = 'Title is required'
      isValid = false
    }

    // Authors validation
    if (!formData.value.authors.trim()) {
      validationErrors.value.authors = 'Authors is required'
      isValid = false
    }

    // Year validation
    if (!formData.value.year.trim()) {
      validationErrors.value.year = 'Year is required'
      isValid = false
    } else if (!/^\d{4}$/.test(formData.value.year.trim())) {
      validationErrors.value.year = 'Year must be a 4-digit number'
      isValid = false
    }

    return isValid
  }

  const resetForm = () => {
    formData.value = {
      key: '',
      title: '',
      authors: '',
      year: '',
      journal: '',
      volume: '',
      number: '',
      pages: '',
      publisher: '',
      url: '',
      doi: ''
    }
    validationErrors.value = {
      key: '',
      title: '',
      authors: '',
      year: ''
    }
  }

  const populateForm = (data: Partial<CitationEntry> | any) => {
    if (!data) return

    formData.value = {
      key: data.key || '',
      title: data.title || '',
      authors: Array.isArray(data.authors) 
        ? data.authors.join(', ') 
        : data.authors || '',
      year: data.year || '',
      journal: data.journal || '',
      volume: data.volume || '',
      number: data.number || '',
      pages: data.pages || '',
      publisher: data.publisher || '',
      url: data.url || '',
      doi: data.doi || ''
    }

    // Clear validation errors when populating
    validationErrors.value = {
      key: '',
      title: '',
      authors: '',
      year: ''
    }
  }

  return {
    formData,
    validationErrors,
    validateForm,
    resetForm,
    populateForm
  }
} 