import type { Nota } from '@/features/nota/types/nota'

export const FIXED_TEST_TIME = new Date('2026-01-15T12:00:00.000Z')

/** Build customer-free nota data with stable IDs and timestamps. */
export function createNotaFixture(overrides: Partial<Nota> = {}): Nota {
  return {
    id: 'nota-fixture-001',
    title: 'Deterministic nota fixture',
    parentId: null,
    favorite: false,
    tags: ['fixture'],
    createdAt: new Date(FIXED_TEST_TIME),
    updatedAt: new Date(FIXED_TEST_TIME),
    ...overrides,
  }
}
