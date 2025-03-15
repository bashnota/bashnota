import { ref } from 'vue'

export interface YoutubeVideoInfo {
  videoId: string
  startTime: number
}

export function useYoutubeParser() {
  const error = ref<string>('')
  
  /**
   * Extract video ID and start time from various YouTube URL formats
   * Supports:
   * - youtube.com/watch?v=VIDEO_ID
   * - youtu.be/VIDEO_ID
   * - youtube.com/embed/VIDEO_ID
   * - youtube.com/v/VIDEO_ID
   * - youtube.com/shorts/VIDEO_ID
   * - With or without timestamps (t or start parameter)
   */
  const parseYoutubeUrl = (url: string): YoutubeVideoInfo | null => {
    if (!url) {
      error.value = 'No URL provided'
      return null
    }
    
    try {
      // Reset error
      error.value = ''
      
      // Try to parse as URL
      let parsedUrl: URL
      try {
        parsedUrl = new URL(url)
      } catch (e) {
        error.value = 'Invalid URL format'
        return null
      }
      
      // Extract video ID based on URL pattern
      let videoId = ''
      let startTime = 0
      
      // youtu.be/VIDEO_ID format
      if (parsedUrl.hostname === 'youtu.be') {
        videoId = parsedUrl.pathname.slice(1)
      } 
      // youtube.com formats
      else if (parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com') {
        // youtube.com/watch?v=VIDEO_ID
        if (parsedUrl.pathname === '/watch') {
          videoId = parsedUrl.searchParams.get('v') || ''
        } 
        // youtube.com/embed/VIDEO_ID
        else if (parsedUrl.pathname.startsWith('/embed/')) {
          videoId = parsedUrl.pathname.split('/embed/')[1]
        } 
        // youtube.com/v/VIDEO_ID
        else if (parsedUrl.pathname.startsWith('/v/')) {
          videoId = parsedUrl.pathname.split('/v/')[1]
        }
        // youtube.com/shorts/VIDEO_ID
        else if (parsedUrl.pathname.startsWith('/shorts/')) {
          videoId = parsedUrl.pathname.split('/shorts/')[1]
        }
      }
      
      // Clean up video ID (remove any extra path segments or query parameters)
      if (videoId.includes('/')) {
        videoId = videoId.split('/')[0]
      }
      
      if (videoId.includes('?')) {
        videoId = videoId.split('?')[0]
      }
      
      // Extract start time if available
      const tParam = parsedUrl.searchParams.get('t') || parsedUrl.searchParams.get('start')
      if (tParam) {
        // Handle time formats: 1h2m3s, 1m2s, 30s, or just seconds as number
        if (/^\d+$/.test(tParam)) {
          startTime = parseInt(tParam, 10)
        } else {
          const hours = tParam.match(/(\d+)h/)
          const minutes = tParam.match(/(\d+)m/)
          const seconds = tParam.match(/(\d+)s/)
          
          startTime = (hours ? parseInt(hours[1], 10) * 3600 : 0) +
                      (minutes ? parseInt(minutes[1], 10) * 60 : 0) +
                      (seconds ? parseInt(seconds[1], 10) : 0)
        }
      }
      
      if (!videoId) {
        error.value = 'Could not extract YouTube video ID from URL'
        return null
      }
      
      return { videoId, startTime }
    } catch (e) {
      error.value = `Error parsing YouTube URL: ${e instanceof Error ? e.message : String(e)}`
      return null
    }
  }
  
  return {
    parseYoutubeUrl,
    error
  }
} 