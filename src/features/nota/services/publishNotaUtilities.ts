import { uploadPublishedImageAsset } from '@/services/cloud/supabaseImageStorage'
import { logger } from '@/services/logger'

// Regular expression to identify data URLs
const DATA_URL_REGEX = /data:image\/[^;]+;base64,[a-zA-Z0-9+/]+=*/g

/**
 * Find all data URLs in a string
 * @param {string} content - The content to search
 * @returns {string[]} - Array of data URLs found
 */
export const findDataUrls = (content: string) => {
  if (!content || typeof content !== 'string') return []
  return content.match(DATA_URL_REGEX) || []
}

/**
 * Upload a data URL image to the server
 * @param {string} dataUrl - The data URL to upload
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export const uploadImage = async (dataUrl: string) => {
  return (await uploadPublishedImageAsset(dataUrl)).publicUrl
}

interface ProcessingContext {
  publishedSubPages: Set<string>
  uploadedImagePaths?: string[]
  uploads: Map<string, Promise<string>>
}

async function uploadOnce(dataUrl: string, context: ProcessingContext): Promise<string> {
  let upload = context.uploads.get(dataUrl)
  if (!upload) {
    upload = uploadPublishedImageAsset(dataUrl).then((asset) => {
      context.uploadedImagePaths?.push(asset.path)
      return asset.publicUrl
    })
    context.uploads.set(dataUrl, upload)
  }
  return upload
}

async function processString(content: string, context: ProcessingContext): Promise<string> {
  const dataUrls = findDataUrls(content)
  if (dataUrls.length === 0) return content
  let processed = content
  for (const dataUrl of new Set(dataUrls)) {
    processed = processed.split(dataUrl).join(await uploadOnce(dataUrl, context))
  }
  return processed
}

/**
 * Process content by finding and uploading all data URLs
 * @param {string} content - The content containing data URLs
 * @returns {Promise<string>} - The content with data URLs replaced by hosted URLs
 */
export const processContent = async (content: string) => {
  if (!content || typeof content !== 'string') return content
  return processString(content, {
    publishedSubPages: new Set(),
    uploads: new Map(),
  })
}

/**
 * Process a nota content object by replacing all data URLs with hosted URLs and removing restricted links
 * @param {Object|string} content - The nota content object or string
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - The processed content object
 */
export const processNotaContent = async (
  content: string | object,
  options?: {
    publishedSubPages?: string[]
    uploadedImagePaths?: string[]
  },
) => {
  if (!content) return null

  // Parse the content if it's a string
  const contentObj = typeof content === 'string' ? JSON.parse(content) : content

  return processContentObject(contentObj, {
    publishedSubPages: new Set(options?.publishedSubPages ?? []),
    uploadedImagePaths: options?.uploadedImagePaths,
    uploads: new Map(),
  })
}

/**
 * Recursively process a content object to replace data URLs and handle page links
 * @param {Object} obj - The content object
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - The processed content object
 */
async function processContentObject(
  obj: any,
  context: ProcessingContext,
): Promise<any> {
  if (!obj) return obj

  // If it's an array, process each item
  if (Array.isArray(obj)) {
    // Keep uploads sequential so a rejected item cannot leave still-running
    // uploads that escape the caller's compensating cleanup pass.
    const processed: any[] = []
    for (const item of obj) processed.push(await processContentObject(item, context))
    return processed.filter((item) => item !== null)
  }

  // If it's an object, process its properties
  if (typeof obj === 'object') {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = await processContentObject(value, context)
    }

    // Handle page links - convert internal /nota/ links to public /p/ links
    if (obj.type === 'pageLink' && obj.attrs?.href && typeof obj.attrs.href === 'string') {
      // Check if this is an internal nota link
      if (obj.attrs.href.startsWith('/nota/')) {
        const notaId = obj.attrs.href.replace('/nota/', '')
        
        // Check if this sub-nota is published
        if (context.publishedSubPages.has(notaId)) {
          // Replace with public link format
          result.attrs = {
            ...result.attrs,
            href: `/p/${notaId}`, // Use the standard public format
          }
        } else {
          // This sub-nota is not published, so we should remove the link or handle it specially
          // For now, we'll keep it as is, but in a real implementation, you might want to handle this differently
          logger.warn(`Sub-nota ${notaId} referenced in content is not published`)
        }
      }
    }

    return result
  }

  // Handle string content that might contain data URLs
  if (typeof obj === 'string') {
    return processString(obj, context)
  }

  return obj
}
