import { afterEach, describe, vi } from 'vitest'
import { GeminiProvider } from '../providers/geminiProvider'
import { OllamaProvider } from '../providers/ollamaProvider'
import { streamingProviderContract } from './provider.contract'

afterEach(() => vi.restoreAllMocks())

describe('Gemini provider contract', () => {
  streamingProviderContract({
    create: () => new GeminiProvider('fixture-key'),
    successChunks: [
      '{"candidates":[{"content":{"parts":[{"text":"hel',
      'lo"}]}}]}\n{"candidates":[{"content":{"parts":[{"text":" world"}]}}]}',
    ],
    expectedText: 'hello| world',
    errorBody: 'deterministic quota response',
  })
})

describe('Ollama provider contract', () => {
  streamingProviderContract({
    create: () => new OllamaProvider('http://127.0.0.1:11434/api'),
    successChunks: ['{"response":"hel', 'lo"}\n{"response":" world","eval_count":7,"done":true}'],
    expectedText: 'hello| world',
    errorBody: 'deterministic overloaded response',
  })
})
