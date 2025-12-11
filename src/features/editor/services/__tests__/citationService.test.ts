import { describe, it, expect, vi } from 'vitest'
import { updateCitationNumbers, getOrderedCitationKeys } from '../citationService'

describe('citationService', () => {
    describe('updateCitationNumbers', () => {
        it('should renumber citations sequentially based on document position', () => {
            const mockCommands = {
                command: vi.fn(),
            }

            const mockEditor = {
                state: {
                    doc: {
                        descendants: (callback: any) => {
                            // Node 1: Unordered (e.g. was [2]) at pos 0
                            callback({ type: { name: 'citation' }, attrs: { citationKey: 'ref-a', citationNumber: 2 } }, 0)

                            // Node 2: Unordered (e.g. was [1]) at pos 10
                            callback({ type: { name: 'citation' }, attrs: { citationKey: 'ref-b', citationNumber: 1 } }, 10)

                            return true
                        }
                    }
                },
                commands: mockCommands
            }

            updateCitationNumbers(mockEditor as any)

            expect(mockCommands.command).toHaveBeenCalled()
        })

        it('should assign numbers 1 and 2 to the nodes in order with number/string casting', () => {
            const transactions: any[] = []

            const mockEditor = {
                state: {
                    doc: {
                        descendants: (callback: any) => {
                            // Node A at pos 5
                            callback({ type: { name: 'citation' }, attrs: { citationKey: 'ref-a', citationNumber: 99 } }, 5)
                            // Node B at pos 20
                            callback({ type: { name: 'citation' }, attrs: { citationKey: 'ref-b', citationNumber: "1" } }, 20)
                            // Note: "1" (string) vs 2 (index) -> differs -> should update to 2
                        }
                    }
                },
                commands: {
                    command: (fn: any) => {
                        const tr = {
                            setNodeMarkup: vi.fn()
                        }
                        fn({ tr })
                        transactions.push(tr)
                    }
                }
            }

            updateCitationNumbers(mockEditor as any)

            expect(transactions.length).toBeGreaterThan(0)
            const tr = transactions[0]

            expect(tr.setNodeMarkup).toHaveBeenCalledWith(5, undefined, expect.objectContaining({ citationNumber: 1 }))
            expect(tr.setNodeMarkup).toHaveBeenCalledWith(20, undefined, expect.objectContaining({ citationNumber: 2 }))
        })
    })

    describe('getOrderedCitationKeys', () => {
        it('should return keys in order', () => {
            const mockEditor = {
                state: {
                    doc: {
                        descendants: (callback: any) => {
                            callback({ type: { name: 'citation' }, attrs: { citationKey: 'first' } }, 0)
                            callback({ type: { name: 'paragraph' } }, 5)
                            callback({ type: { name: 'citation' }, attrs: { citationKey: 'second' } }, 10)
                            return true
                        }
                    }
                }
            }

            const keys = getOrderedCitationKeys(mockEditor as any)
            expect(keys).toEqual(['first', 'second'])
        })
    })
})
