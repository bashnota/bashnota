import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

export class NotaContentProcessor {
  private window: any
  private purify: any

  constructor() {
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
   * @returns Sanitized content ready for publishing
   */
  process(content: any): any {
    if (!content) return null

    try {
      // Parse the content if it's a string
      const docContent = typeof content === 'string' ? JSON.parse(content) : content

      // Sanitize against XSS by converting to string and back
      const contentString = JSON.stringify(docContent)
      const sanitizedString = this.purify.sanitize(contentString)

      return JSON.parse(sanitizedString)
    } catch (error) {
      console.error('Error sanitizing nota content:', error)
      throw new Error('Failed to sanitize nota content')
    }
  }
}
