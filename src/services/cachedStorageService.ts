/**
 * Cached Storage Service - Adds caching layer to any storage backend
 * 
 * Provides LRU caching to improve read performance and batch operations
 * for multiple nota operations.
 */

import type { Nota } from '@/features/nota/types/nota'
import type { IStorageBackend } from './storageService'
import { logger } from './logger'

export interface CacheOptions {
  maxSize?: number  // Maximum number of items to cache (default: 100)
  ttl?: number      // Time-to-live in milliseconds (default: 5 minutes)
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

/**
 * LRU Cache entry
 */
interface CacheEntry {
  nota: Nota | null
  timestamp: number
  accessCount: number
}

/**
 * Cached Storage Service
 * 
 * Wraps any storage backend with an LRU cache for improved performance
 */
export class CachedStorageService implements IStorageBackend {
  readonly type: any
  
  private cache: Map<string, CacheEntry> = new Map()
  private readonly maxSize: number
  private readonly ttl: number
  private hits = 0
  private misses = 0

  constructor(
    private backend: IStorageBackend,
    options: CacheOptions = {}
  ) {
    this.type = backend.type
    this.maxSize = options.maxSize ?? 100
    this.ttl = options.ttl ?? 5 * 60 * 1000 // 5 minutes default
  }

  async initialize(): Promise<void> {
    return this.backend.initialize()
  }

  async isAvailable(): Promise<boolean> {
    return this.backend.isAvailable()
  }

  /**
   * Read a nota (with caching)
   */
  async readNota(notaId: string): Promise<Nota | null> {
    // Check cache first
    const cached = this.cache.get(notaId)
    
    if (cached && this.isCacheValid(cached)) {
      this.hits++
      cached.accessCount++
      logger.debug(`[CachedStorage] Cache hit for nota: ${notaId}`)
      return cached.nota ? { ...cached.nota } : null
    }

    // Cache miss - fetch from backend
    this.misses++
    logger.debug(`[CachedStorage] Cache miss for nota: ${notaId}`)
    
    const nota = await this.backend.readNota(notaId)
    
    // Store in cache
    this.setCacheEntry(notaId, nota)
    
    return nota
  }

  /**
   * Write a nota (invalidates cache)
   */
  async writeNota(nota: Nota): Promise<void> {
    await this.backend.writeNota(nota)
    
    // Update cache with new version
    this.setCacheEntry(nota.id, nota)
    
    logger.debug(`[CachedStorage] Wrote and cached nota: ${nota.id}`)
  }

  /**
   * Delete a nota (invalidates cache)
   */
  async deleteNota(notaId: string): Promise<void> {
    await this.backend.deleteNota(notaId)
    
    // Remove from cache
    this.cache.delete(notaId)
    
    logger.debug(`[CachedStorage] Deleted nota and cleared cache: ${notaId}`)
  }

  /**
   * List all notas (not cached due to dynamic nature)
   */
  async listNotas(): Promise<Nota[]> {
    return this.backend.listNotas()
  }

  /**
   * Batch write multiple notas
   */
  async writeMany(notas: Nota[]): Promise<void> {
    // Write all notas concurrently
    await Promise.all(notas.map(nota => this.writeNota(nota)))
    
    logger.debug(`[CachedStorage] Batch wrote ${notas.length} notas`)
  }

  /**
   * Batch read multiple notas
   */
  async readMany(notaIds: string[]): Promise<(Nota | null)[]> {
    // Read all notas concurrently
    const results = await Promise.all(notaIds.map(id => this.readNota(id)))
    
    logger.debug(`[CachedStorage] Batch read ${notaIds.length} notas`)
    return results
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? this.hits / total : 0
    
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.debug('[CachedStorage] Cache cleared')
  }

  /**
   * Set a cache entry (with LRU eviction)
   */
  private setCacheEntry(notaId: string, nota: Nota | null): void {
    // Evict LRU entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(notaId)) {
      this.evictLRU()
    }

    this.cache.set(notaId, {
      nota: nota ? { ...nota } : null,
      timestamp: Date.now(),
      accessCount: 1
    })
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp
    return age < this.ttl
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      logger.debug(`[CachedStorage] Evicted LRU entry: ${oldestKey}`)
    }
  }
}
