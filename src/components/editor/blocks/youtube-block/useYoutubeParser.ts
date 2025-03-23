import { ref } from 'vue'

export interface YoutubeVideoInfo {
  videoId: string
  startTime: number
}

interface YoutubeParserResult {
  parseYoutubeUrl: (url: string) => YoutubeVideoInfo | null
  error: ReturnType<typeof ref<string>>
}

/**
 * Parses YouTube URLs to extract video ID and start time
 * 
 * @returns A composable with parsing functionality and error state
 */
export function useYoutubeParser(): YoutubeParserResult {
  const error = ref<string>('')
  
  /**
   * Extract video ID and start time from various YouTube URL formats
   * 
   * @param url - The YouTube URL to parse
   * @returns Video information object or null if parsing failed
   * 
   * Supports:
   * - youtube.com/watch?v=VIDEO_ID
   * - youtu.be/VIDEO_ID
   * - youtube.com/embed/VIDEO_ID
   * - youtube.com/v/VIDEO_ID
   * - youtube.com/shorts/VIDEO_ID
   * - With or without timestamps (t or start parameter)
   * - Direct video IDs (11 characters)
   */
  const parseYoutubeUrl = (url: string): YoutubeVideoInfo | null => {
    if (!url?.trim()) {
      error.value = 'No URL provided'
      return null
    }
    
    // If input is already a video ID (11 characters, alphanumeric with some special chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      console.log('Direct video ID detected:', url.trim())
      return { 
        videoId: url.trim(),
        startTime: 0
      }
    }
    
    try {
      // Reset error
      error.value = ''
      
      // Ensure URL has a protocol
      let urlString = url.trim()
      if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
        urlString = 'https://' + urlString
      }
      
      // Try to parse as URL
      let parsedUrl: URL
      try {
        parsedUrl = new URL(urlString)
      } catch (e) {
        error.value = 'Invalid URL format'
        return null
      }
      
      const videoId = extractVideoId(parsedUrl)
      if (!videoId) {
        error.value = 'Could not extract YouTube video ID from URL'
        return null
      }
      
      const startTime = extractStartTime(parsedUrl)
      
      return { videoId, startTime }
    } catch (e) {
      error.value = `Error parsing YouTube URL: ${e instanceof Error ? e.message : String(e)}`
      return null
    }
  }
  
  /**
   * Extracts video ID from a YouTube URL
   */
  const extractVideoId = (parsedUrl: URL): string => {
    let videoId = ''
    
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
    if (videoId && videoId.includes('/')) {
      videoId = videoId.split('/')[0]
    }
    
    if (videoId && videoId.includes('?')) {
      videoId = videoId.split('?')[0]
    }
    
    if (videoId && videoId.includes('&')) {
      videoId = videoId.split('&')[0]
    }
    
    // Validate the video ID format (should be 11 characters, alphanumeric with some special chars)
    const isValidYoutubeId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    
    if (!isValidYoutubeId) {
      console.warn('Invalid YouTube video ID format:', videoId);
      return '';
    }
    
    // Add debugging
    console.log('Extracted YouTube video ID:', videoId);
    
    return videoId;
  }
  
  /**
   * Extracts start time from a YouTube URL
   */
  const extractStartTime = (parsedUrl: URL): number => {
    const tParam = parsedUrl.searchParams.get('t') || parsedUrl.searchParams.get('start')
    if (!tParam) return 0
    
    // Handle time formats: 1h2m3s, 1m2s, 30s, or just seconds as number
    if (/^\d+$/.test(tParam)) {
      return parseInt(tParam, 10)
    } 
    
    const hours = tParam.match(/(\d+)h/)
    const minutes = tParam.match(/(\d+)m/)
    const seconds = tParam.match(/(\d+)s/)
    
    return (hours ? parseInt(hours[1], 10) * 3600 : 0) +
           (minutes ? parseInt(minutes[1], 10) * 60 : 0) +
           (seconds ? parseInt(seconds[1], 10) : 0)
  }
  
  return {
    parseYoutubeUrl,
    error
  }
} 