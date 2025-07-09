import { ref, onMounted, onUnmounted, readonly, type Ref } from 'vue'

export function useFullscreen(target: Ref<HTMLElement | null>) {
  const isFullscreen = ref(false)

  const enter = async () => {
    const el = target.value
    if (!el) return
    
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ((el as any).mozRequestFullScreen) { // Firefox
        await (el as any).mozRequestFullScreen()
      } else if ((el as any).webkitRequestFullscreen) { // Chrome, Safari and Opera
        await (el as any).webkitRequestFullscreen()
      } else if ((el as any).msRequestFullscreen) { // IE/Edge
        await (el as any).msRequestFullscreen()
      }
    } catch (e) {
      console.error('Fullscreen request failed:', e)
      isFullscreen.value = false // Ensure state is correct on failure
    }
  }

  const exit = async () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement && !(document as any).msFullscreenElement) {
        return;
    }
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).mozCancelFullScreen) { // Firefox
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).webkitExitFullscreen) { // Chrome, Safari and Opera
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) { // IE/Edge
        await (document as any).msExitFullscreen()
      }
    } catch(e) {
      console.error('Exit fullscreen request failed:', e)
    }
  }

  const toggle = () => {
    if (isFullscreen.value) {
      exit()
    } else {
      enter()
    }
  }

  const onFullscreenChange = () => {
    isFullscreen.value = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
    );
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    document.addEventListener('mozfullscreenchange', onFullscreenChange)
    document.addEventListener('MSFullscreenChange', onFullscreenChange)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    document.removeEventListener('mozfullscreenchange', onFullscreenChange)
    document.removeEventListener('MSFullscreenChange', onFullscreenChange)
  })

  return {
    isFullscreen: readonly(isFullscreen),
    enter,
    exit,
    toggle,
  }
} 