import { describe, it, expect } from 'vitest'
import { computed, ref } from 'vue'
import { useReferencesSearch } from '../useReferencesSearch'
import type { CitationEntry } from '@/features/nota/types/nota'

describe('useReferencesSearch', () => {
    it('should return all citations when search query is empty', () => {
        const citations = ref<CitationEntry[]>([
            { key: 'ref1', title: 'Title 1', authors: ['Author A'], year: '2020', id: '1', createdAt: '' },
            { key: 'ref2', title: 'Title 2', authors: ['Author B'], year: '2021', id: '2', createdAt: '' }
        ])

        const { filteredCitations, searchQuery } = useReferencesSearch(computed(() => citations.value))

        expect(filteredCitations.value).toHaveLength(2)
        searchQuery.value = '   '
        expect(filteredCitations.value).toHaveLength(2)
    })

    it('should filter by title', () => {
        const citations = ref<CitationEntry[]>([
            { key: 'ref1', title: 'Machine Learning', authors: ['A'], year: '2020', id: '1', createdAt: '' },
            { key: 'ref2', title: 'Deep Learning', authors: ['B'], year: '2021', id: '2', createdAt: '' }
        ])

        const { filteredCitations, searchQuery } = useReferencesSearch(computed(() => citations.value))

        searchQuery.value = 'Machine'
        expect(filteredCitations.value).toHaveLength(1)
        expect(filteredCitations.value[0].key).toBe('ref1')
    })

    it('should filter by author', () => {
        const citations = ref<CitationEntry[]>([
            { key: 'ref1', title: 'A', authors: ['John Smith'], year: '2020', id: '1', createdAt: '' },
            { key: 'ref2', title: 'B', authors: ['Jane Doe'], year: '2021', id: '2', createdAt: '' }
        ])

        const { filteredCitations, searchQuery } = useReferencesSearch(computed(() => citations.value))

        searchQuery.value = 'Doe'
        expect(filteredCitations.value).toHaveLength(1)
        expect(filteredCitations.value[0].key).toBe('ref2')
    })

    it('should be reactive to citations source changes', () => {
        const citations = ref<CitationEntry[]>([])

        const { filteredCitations } = useReferencesSearch(computed(() => citations.value))

        expect(filteredCitations.value).toHaveLength(0)

        citations.value = [
            { key: 'ref1', title: 'New', authors: [], year: '2023', id: '1', createdAt: '' }
        ]

        expect(filteredCitations.value).toHaveLength(1)
    })
})
