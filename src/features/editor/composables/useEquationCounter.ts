import { ref, provide, inject, reactive } from 'vue'
import type { InjectionKey } from 'vue'

// Define a symbol for the equation counter
export const EQUATION_COUNTER_KEY = Symbol('equation-counter') as InjectionKey<{
  counters: Map<string, number>
  getNumber: (id: string) => number
  reset: () => void
}>

/**
 * Composable for managing equation numbering across the document
 */
export function useEquationCounter() {
  // Create a reactive map to store equation numbers by ID
  const counters = reactive(new Map<string, number>())
  
  // Current counter value for new equations
  const currentCount = ref(0)
  
  // Function to get or create a number for an equation
  const getNumber = (id: string): number => {
    if (!counters.has(id)) {
      currentCount.value++
      counters.set(id, currentCount.value)
    }
    return counters.get(id) || 0
  }
  
  // Function to reset all counters
  const reset = () => {
    counters.clear()
    currentCount.value = 0
  }
  
  // Provide the counter to child components
  provide(EQUATION_COUNTER_KEY, {
    counters,
    getNumber,
    reset
  })
  
  return {
    counters,
    getNumber,
    reset
  }
}

/**
 * Composable for using the equation counter in components
 */
export function useEquationNumber() {
  // Try to inject the counter from a parent component
  const counter = inject(EQUATION_COUNTER_KEY, {
    counters: reactive(new Map<string, number>()),
    getNumber: (id: string) => 0,
    reset: () => {}
  })
  
  return counter
} 








