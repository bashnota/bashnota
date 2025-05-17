import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/services/logger';

/**
 * Configuration for retry mechanism
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  shouldRetry: (error: any) => {
    // Retry on network errors and 429 (rate limit) errors
    return (
      axios.isAxiosError(error) &&
      (error.code === 'ECONNABORTED' ||
       error.code === 'ETIMEDOUT' ||
       error.response?.status === 429)
    );
  }
};

/**
 * Makes an HTTP request with retry logic
 */
export async function requestWithRetry<T>(
  config: AxiosRequestConfig,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<AxiosResponse<T>> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error;
      
      const shouldRetry = retryConfig.shouldRetry?.(error) ?? false;
      
      if (!shouldRetry || attempt >= retryConfig.maxRetries) {
        throw error;
      }
      
      const delay = retryConfig.initialDelayMs * Math.pow(2, attempt);
      logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Converts a URL or base64 image to base64 format
 */
export async function imageToBase64(image: string): Promise<string> {
  // If it's already a base64 string, return it
  if (image.startsWith('data:') || !image.startsWith('http')) {
    // Extract base64 content from data URI if needed
    return image.startsWith('data:') ? image.split(',')[1] : image;
  }
  
  try {
    // Fetch the image and convert to base64
    const response = await axios.get(image, { responseType: 'arraybuffer' });
    
    // Convert array buffer to base64
    return Buffer.from(response.data, 'binary').toString('base64');
  } catch (error) {
    logger.error('Error converting image to base64:', error);
    throw new Error('Failed to convert image to base64');
  }
}

/**
 * Handles API errors and provides meaningful error messages
 */
export function handleApiError(error: any, providerName: string): Error {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        return new Error(`${providerName} API error: ${data?.error?.message || 'Bad request'}`);
      case 401:
        return new Error(`${providerName} API error: Unauthorized - check your API key`);
      case 403:
        return new Error(`${providerName} API error: Forbidden - lacking permissions`);
      case 404:
        return new Error(`${providerName} resource not found. Check your configuration.`);
      case 429:
        return new Error(`${providerName} API rate limit exceeded. Please try again later.`);
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error(`${providerName} server error. Please try again later.`);
      default:
        return new Error(`${providerName} API error: ${status} ${data?.error?.message || error.message}`);
    }
  }
  
  return error instanceof Error 
    ? error 
    : new Error(`Unknown ${providerName} error: ${JSON.stringify(error)}`);
} 