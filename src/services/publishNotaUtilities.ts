import type { SubFigure } from '@/components/editor/blocks/subfigure-block/subfigure-extension'
import { fetchAPI } from '@/services/axios'

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
  try {
    const response = await fetchAPI.post('/image/upload', { dataUrl })
    return response.data.imageUrl
  } catch (error) {
    console.error('Failed to upload image:', error)
    throw error
  }
}

/**
 * Process content by finding and uploading all data URLs
 * @param {string} content - The content containing data URLs
 * @returns {Promise<string>} - The content with data URLs replaced by hosted URLs
 */
export const processContent = async (content: string) => {
  if (!content || typeof content !== 'string') return content

  // Find all data URLs
  const dataUrls = findDataUrls(content)
  if (dataUrls.length === 0) return content

  // Create a map of data URLs to their hosted equivalents
  const urlMap = new Map()

  for (const dataUrl of dataUrls) {
    if (!urlMap.has(dataUrl)) {
      try {
        const imageUrl = await uploadImage(dataUrl)
        urlMap.set(dataUrl, imageUrl)
      } catch (error) {
        console.error('Error uploading image:', error)
        // Keep the original data URL if upload fails
        urlMap.set(dataUrl, dataUrl)
      }
    }
  }

  // Replace all data URLs with their hosted equivalents
  let newContent = content
  for (const [dataUrl, imageUrl] of urlMap.entries()) {
    newContent = newContent.split(dataUrl).join(imageUrl)
  }

  return newContent
}

/**
 * Process a nota content object by replacing all data URLs with hosted URLs
 * This function works with the existing structure without modifying extensions
 * @param {Object} content - The nota content object
 * @returns {Promise<Object>} - The processed content object
 */
export const processNotaContent = async (content: string) => {
  if (!content) return null

  // Parse the content if it's a string
  const contentObj = typeof content === 'string' ? JSON.parse(content) : content

  // Process the content recursively
  return await processContentObject(contentObj)
}

/**
 * Recursively process a content object to replace data URLs
 * This works with the TipTap document structure without modifying extensions
 * @param {Object} obj - The content object
 * @returns {Promise<Object>} - The processed content object
 */
async function processContentObject(obj: any) : Promise<any> {
  if (!obj) return obj

  // If it's an array, process each item
  if (Array.isArray(obj)) {
    return await Promise.all(obj.map((item) => processContentObject(item)))
  }

  // If it's an object, process its properties
  if (typeof obj === 'object') {
    const result = { ...obj }

    // Process inline code block outputs that might contain HTML with images
    if (obj.type === 'executableCodeBlock' && obj.attrs?.output) {
      if (typeof obj.attrs.output === 'string' && obj.attrs.output.includes('<img')) {
        try {
          // Process any HTML content with img tags
          const processedOutput = await processContent(obj.attrs.output)
          result.attrs = {
            ...obj.attrs,
            output: processedOutput,
          }
        } catch (error) {
          console.error('Error processing code block output:', error)
        }
      }
    }

    // Handle image blocks and drawIo blocks
    if (
      (obj.type === 'imageBlock' || obj.type === 'drawIoExtension') &&
      obj.attrs?.src &&
      typeof obj.attrs.src === 'string' &&
      obj.attrs.src.startsWith('data:image/')
    ) {
      try {
        const imageUrl = await uploadImage(obj.attrs.src)
        result.attrs = {
          ...obj.attrs,
          src: imageUrl,
        }
      } catch (error) {
        console.error('Error processing image block:', error)
      }
    }

    // Handle subfigures based on the SubfigureExtension
    if (obj.type === 'subfigure' && obj.attrs?.subfigures && Array.isArray(obj.attrs.subfigures)) {
      const processedSubfigures = await Promise.all(
        obj.attrs.subfigures.map(async (subfigure: SubFigure) => {
          // Check if this subfigure has a data URL as src
          if (
            subfigure.src &&
            typeof subfigure.src === 'string' &&
            subfigure.src.startsWith('data:image/')
          ) {
            try {
              // Upload the image and get back a hosted URL
              const imageUrl = await uploadImage(subfigure.src)

              // Return a new subfigure object with the updated src but preserving all other properties
              return {
                ...subfigure,
                src: imageUrl,
              }
            } catch (error) {
              console.error('Error processing subfigure image:', error)
              // If upload fails, keep original data URL
              return subfigure
            }
          }
          // If no data URL or processing fails, return the original subfigure unchanged
          return subfigure
        }),
      )

      // Update the attrs with the processed subfigures
      result.attrs = {
        ...obj.attrs,
        subfigures: processedSubfigures,
      }
    }

    // Process children content arrays
    if (obj.content && Array.isArray(obj.content)) {
      result.content = await processContentObject(obj.content)
    }

    // Process other properties recursively
    for (const key in obj) {
      if (key !== 'content' && typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = await processContentObject(obj[key])
      } else if (
        key !== 'content' &&
        typeof obj[key] === 'string' &&
        obj[key].includes('data:image/')
      ) {
        // Handle string properties that might contain data URLs
        result[key] = await processContent(obj[key])
      }
    }

    return result
  }

  // Handle string content that might contain data URLs
  if (typeof obj === 'string') {
    return await processContent(obj)
  }

  return obj
}
