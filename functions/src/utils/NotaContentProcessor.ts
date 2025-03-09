import admin from 'firebase-admin'
import * as crypto from 'crypto'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize Firebase Storage
const storage = admin.storage()
const bucket = storage.bucket()

/**
 * Content processor to sanitize and prepare nota content for publishing
 */
export class NotaContentProcessor {
  private userId: string
  private window: any
  private purify: any

  constructor(userId: string) {
    this.userId = userId
    // Set up DOMPurify
    const jsdom = new JSDOM('')
    this.window = jsdom.window
    this.purify = DOMPurify(this.window)

    // Configure DOMPurify to block potentially malicious attributes
    this.purify.setConfig({
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus'],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ALLOW_DATA_ATTR: false, // Disable data attributes which can be used for XSS
    })
  }

  /**
   * Main pipeline for processing nota content
   *
   * @param content The nota content
   * @returns Processed content ready for publishing
   */
  async process(content: any): Promise<any> {
    if (!content) return null

    try {
      // Parse the content if it's a string
      const docContent = typeof content === 'string' ? JSON.parse(content) : content

      // Process the content
      const processedContent = await this.processContent(docContent)

      // Sanitize against XSS
      const sanitizedContent = this.sanitizeContent(processedContent)

      return sanitizedContent
    } catch (error) {
      console.error('Error processing nota content:', error)
      throw new Error('Failed to process nota content')
    }
  }

  /**
   * Process the document content
   */
  private async processContent(docContent: any): Promise<any> {
    if (!docContent || !docContent.content) return docContent

    // Process nodes recursively
    if (Array.isArray(docContent.content)) {
      docContent.content = await Promise.all(
        docContent.content.map(async (node: any) => await this.processNode(node)),
      )

      // Filter out null nodes (removed blocks)
      docContent.content = docContent.content.filter((node: any) => node !== null)
    }

    return docContent
  }

  /**
   * Process a single node in the document
   */
  private async processNode(node: any): Promise<any> {
    if (!node) return null

    // Process the node based on its type
    switch (node.type) {
      // Handle executable code blocks
      case 'executableCodeBlock':
        return this.processCodeBlock(node)

      // Handle images, subfigures, drawIo, etc.
      case 'imageBlock':
      case 'drawIoExtension':
        return await this.processImageNode(node)

      case 'subfigures':
        return await this.processSubfigures(node)

      // Handle AI generation blocks - remove them
      case 'inlineAIGeneration':
        return null

      // Process content recursively for container nodes
      default:
        if (node.content && Array.isArray(node.content)) {
          node.content = await Promise.all(
            node.content.map(async (childNode: any) => await this.processNode(childNode)),
          )
          // Filter out null nodes
          node.content = node.content.filter((childNode: any) => childNode !== null)
        }

        return node
    }
  }

  /**
   * Process code blocks - remove sensitive info
   */
  private processCodeBlock(node: any): any {
    if (!node.attrs) return node

    // Create a clean version with only necessary attributes
    const cleanAttrs = {
      language: node.attrs.language,
      executable: node.attrs.executable,
      output: node.attrs.output,
    }

    // Return cleaned node
    return {
      ...node,
      attrs: cleanAttrs,
    }
  }

  /**
   * Process image nodes - upload blobs to storage
   */
  private async processImageNode(node: any): Promise<any> {
    if (!node.attrs || !node.attrs.src) return node

    const src = node.attrs.src

    // If it's a data URL, upload to Firebase Storage
    if (src.startsWith('data:image/')) {
      try {
        const imageUrl = await this.uploadImageToStorage(src)

        // Replace the blob with the storage URL
        return {
          ...node,
          attrs: {
            ...node.attrs,
            src: imageUrl,
          },
        }
      } catch (error) {
        console.error('Error uploading image to storage:', error)
        return null
      }
    }

    return node
  }

  /**
   * Process subfigures - upload all images
   */
  private async processSubfigures(node: any): Promise<any> {
    if (!node.attrs || !node.attrs.subfigures || !Array.isArray(node.attrs.subfigures)) {
      return node
    }

    // Process each subfigure
    const processedSubfigures = await Promise.all(
      node.attrs.subfigures.map(async (subfigure: any) => {
        if (!subfigure.src || !subfigure.src.startsWith('data:image/')) {
          return subfigure
        }

        try {
          const imageUrl = await this.uploadImageToStorage(subfigure.src)
          return {
            ...subfigure,
            src: imageUrl,
          }
        } catch (error) {
          console.error('Error uploading subfigure to storage:', error)
          return {
            ...subfigure,
            src: '', // Clear the src if upload fails
          }
        }
      }),
    )

    // Return updated node
    return {
      ...node,
      attrs: {
        ...node.attrs,
        subfigures: processedSubfigures,
      },
    }
  }

  /**
   * Upload an image to Firebase Storage
   *
   * @param dataUrl The data URL of the image
   * @returns The URL of the uploaded image
   */
  private async uploadImageToStorage(dataUrl: string): Promise<string> {
    // Extract image data and mime type
    const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL')
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate a unique filename
    const timestamp = Date.now()
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const extension = mimeType.split('/')[1]
    const filename = `published/${this.userId}/${timestamp}-${hash}.${extension}`

    // Upload to Firebase Storage
    const file = bucket.file(filename)
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    })

    // Make the file publicly accessible
    await file.makePublic()

    // Get the public URL by checking if we're in the emulator
    let publicUrl: string

    // Check if we're in the emulator environment
    const isEmulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST ? true : false

    if (isEmulator) {
      // Format for emulator
      // Usually something like: http://localhost:9199/v0/b/[bucket-name]/o/[filename]
      const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199'
      publicUrl = `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`
    } else {
      // Format for production
      publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`
    }

    return publicUrl
  }

  /**
   * Sanitize content to prevent XSS
   */
  private sanitizeContent(content: any): any {
    // Convert to string
    const contentString = JSON.stringify(content)

    // Sanitize the entire JSON string
    const sanitizedString = this.purify.sanitize(contentString)

    // Parse back to object
    return JSON.parse(sanitizedString)
  }
}
