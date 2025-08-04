import { ref, computed } from 'vue'

export function useNotaPagination(itemsPerPage: number = 10) {
  const currentPage = ref(1)

  // Calculate pagination info
  const createPagination = <T>(items: T[]) => {
    const totalPages = computed(() => Math.ceil(items.length / itemsPerPage))
    
    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage
      const end = start + itemsPerPage
      return items.slice(start, end)
    })

    const getVisiblePages = (): number[] => {
      const pages: number[] = []
      const start = Math.max(1, currentPage.value - 1)
      const end = Math.min(totalPages.value, currentPage.value + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      return pages
    }

    const goToPage = (page: number) => {
      currentPage.value = Math.max(1, Math.min(totalPages.value, page))
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const resetPage = () => {
      currentPage.value = 1
    }

    const paginationInfo = computed(() => ({
      currentPage: currentPage.value,
      totalPages: totalPages.value,
      totalItems: items.length,
      itemsPerPage,
      startItem: (currentPage.value - 1) * itemsPerPage + 1,
      endItem: Math.min(currentPage.value * itemsPerPage, items.length),
      hasNextPage: currentPage.value < totalPages.value,
      hasPreviousPage: currentPage.value > 1,
    }))

    return {
      currentPage,
      totalPages,
      paginatedItems,
      paginationInfo,
      getVisiblePages,
      goToPage,
      nextPage,
      previousPage,
      resetPage,
    }
  }

  return {
    currentPage,
    createPagination,
  }
}
