import { ref } from 'vue'
import type { Ref } from 'vue'
import { firestore } from '@/services/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter,
  DocumentSnapshot,
  Query,
  QueryConstraint
} from 'firebase/firestore'
import { logger } from '@/services/logger'
import type { PublishedNota } from '@/types/nota'

interface ContributorData {
  uid: string
  name: string
  tag?: string
  count: number
  totalVotes?: number
}

interface UseBashhubDataOptions {
  pageSize?: number
}

interface BashhubQueryResult<T> {
  items: Ref<T[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  currentPage: Ref<number>
  lastVisible: Ref<DocumentSnapshot | null>
  hasMoreItems: Ref<boolean>
  loadData: (type: 'latest' | 'popular' | 'most-voted' | 'top-contributors' | 'top-voted-contributors') => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  resetPagination: () => void
}

/**
 * Composable for handling BashHub data fetching from Firestore
 */
export function useBashhubData({ pageSize = 10 }: UseBashhubDataOptions = {}): BashhubQueryResult<PublishedNota | ContributorData> {
  // Data refs
  const items = ref<(PublishedNota | ContributorData)[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const lastVisible = ref<DocumentSnapshot | null>(null)
  const hasMoreItems = ref(true)
  const currentTab = ref<'latest' | 'popular' | 'most-voted' | 'top-contributors' | 'top-voted-contributors'>('latest')

  // Reset pagination state
  const resetPagination = () => {
    lastVisible.value = null
    currentPage.value = 1
    hasMoreItems.value = true
    items.value = []
  }

  /**
   * Load notas based on the query type
   */
  const loadNotas = async () => {
    try {
      isLoading.value = true
      const notasRef = collection(firestore, 'publishedNotas')

      // Skip if we're at the end
      if (currentPage.value > 1 && !hasMoreItems.value) return

      // Base query constraints
      const constraints: QueryConstraint[] = [
        where('isPublic', '==', true),
        where('isSubPage', '==', false) // Only main notas, not sub-pages
      ]

      // Add ordering based on the current tab
      let orderByField: string;
      let orderDirection: 'asc' | 'desc' = 'desc';

      switch (currentTab.value) {
        case 'latest':
          orderByField = 'publishedAt'
          break
        case 'popular':
          orderByField = 'viewCount'
          break
        case 'most-voted':
          orderByField = 'likeCount'
          break
        default:
          orderByField = 'publishedAt'
      }

      constraints.push(orderBy(orderByField, orderDirection))
      constraints.push(limit(pageSize))

      // Create the query
      let notasQuery: Query;
      
      // Add pagination if not the first page
      if (lastVisible.value && currentPage.value > 1) {
        notasQuery = query(
          notasRef,
          ...constraints.slice(0, -1), // Remove limit
          startAfter(lastVisible.value),
          limit(pageSize)
        )
      } else {
        notasQuery = query(
          notasRef,
          ...constraints
        )
      }

      // Execute the query
      const querySnapshot = await getDocs(notasQuery)
      
      // Check if we have results
      if (querySnapshot.empty) {
        hasMoreItems.value = false
        return
      }

      // Process results
      const newItems: PublishedNota[] = []
      querySnapshot.forEach(doc => {
        newItems.push({ ...doc.data(), id: doc.id } as PublishedNota)
      })

      // Update pagination state
      lastVisible.value = querySnapshot.docs[querySnapshot.docs.length - 1]
      hasMoreItems.value = querySnapshot.docs.length === pageSize

      // Update items list
      if (currentPage.value === 1) {
        items.value = newItems
      } else {
        items.value = [...items.value, ...newItems]
      }
    } catch (err) {
      logger.error('Error loading notas:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load top contributors
   */
  const loadTopContributors = async () => {
    try {
      isLoading.value = true
      // Get all published notas (limit to a reasonable number to avoid excessive reads)
      const notasRef = collection(firestore, 'publishedNotas')
      const notasQuery = query(
        notasRef,
        where('isPublic', '==', true),
        where('isSubPage', '==', false),
        limit(100) // Limit to avoid excessive reads
      )
      
      const querySnapshot = await getDocs(notasQuery)
      
      // Count notas by author
      const authorCounts: Record<string, { count: number, name: string, tag?: string }> = {}
      
      querySnapshot.forEach(doc => {
        const data = doc.data()
        const authorId = data.authorId
        
        if (!authorCounts[authorId]) {
          authorCounts[authorId] = { 
            count: 0, 
            name: data.authorName || 'Anonymous',
            tag: data.authorTag
          }
        }
        
        authorCounts[authorId].count++
      })
      
      // Convert to array and sort by count
      const contributors = Object.entries(authorCounts)
        .map(([uid, data]) => ({ 
          uid, 
          name: data.name, 
          tag: data.tag, 
          count: data.count 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, pageSize)

      items.value = contributors
    } catch (err) {
      logger.error('Error loading top contributors:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load top contributors by total votes
   */
  const loadTopVotedContributors = async () => {
    try {
      isLoading.value = true
      // Get all published notas (limit to a reasonable number to avoid excessive reads)
      const notasRef = collection(firestore, 'publishedNotas')
      const notasQuery = query(
        notasRef,
        where('isPublic', '==', true),
        where('isSubPage', '==', false),
        limit(100) // Limit to avoid excessive reads
      )
      
      const querySnapshot = await getDocs(notasQuery)
      
      // Count votes by author
      const authorData: Record<string, { 
        count: number, 
        totalVotes: number, 
        name: string, 
        tag?: string 
      }> = {}
      
      querySnapshot.forEach(doc => {
        const data = doc.data()
        const authorId = data.authorId
        
        if (!authorData[authorId]) {
          authorData[authorId] = { 
            count: 0,
            totalVotes: 0, 
            name: data.authorName || 'Anonymous',
            tag: data.authorTag
          }
        }
        
        // Count the nota
        authorData[authorId].count++
        
        // Add votes to the total
        const votes = data.likeCount || 0
        authorData[authorId].totalVotes += votes
      })
      
      // Convert to array and sort by total votes
      const votedContributors = Object.entries(authorData)
        .map(([uid, data]) => ({ 
          uid, 
          name: data.name, 
          tag: data.tag, 
          count: data.count,
          totalVotes: data.totalVotes
        }))
        .sort((a, b) => b.totalVotes - a.totalVotes)
        .slice(0, pageSize)

      items.value = votedContributors
    } catch (err) {
      logger.error('Error loading top voted contributors:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load data based on the specified tab
   */
  const loadData = async (type: 'latest' | 'popular' | 'most-voted' | 'top-contributors' | 'top-voted-contributors') => {
    try {
      currentTab.value = type
      isLoading.value = true
      error.value = null

      if (type === 'top-contributors') {
        await loadTopContributors()
      } else if (type === 'top-voted-contributors') {
        await loadTopVotedContributors() 
      } else {
        await loadNotas()
      }
    } catch (err) {
      logger.error('Error loading BashHub data:', err)
      error.value = 'Failed to load data. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load the next page of results
   */
  const nextPage = async () => {
    if (!hasMoreItems.value || ['top-contributors', 'top-voted-contributors'].includes(currentTab.value)) return
    currentPage.value++
    await loadNotas()
  }

  /**
   * Load the previous page of results
   */
  const prevPage = async () => {
    if (currentPage.value <= 1 || ['top-contributors', 'top-voted-contributors'].includes(currentTab.value)) return
    currentPage.value--
    resetPagination()
    
    // Reload all pages up to the current page
    for (let i = 1; i <= currentPage.value; i++) {
      currentPage.value = i
      await loadNotas()
    }
  }

  return {
    items,
    isLoading,
    error,
    currentPage,
    lastVisible,
    hasMoreItems,
    loadData,
    nextPage,
    prevPage,
    resetPagination
  }
}