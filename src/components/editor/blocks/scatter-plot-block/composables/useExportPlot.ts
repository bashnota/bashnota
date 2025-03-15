import { ref } from 'vue'

export type ExportFormat = 'svg' | 'png' | 'jpeg'

export function useExportPlot() {
  const isExporting = ref(false)
  const showExportMenu = ref(false)
  
  const toggleExportMenu = () => {
    showExportMenu.value = !showExportMenu.value
  }
  
  const closeExportMenu = () => {
    showExportMenu.value = false
  }
  
  const exportPlot = async (
    format: ExportFormat, 
    plotContainer: HTMLElement | null, 
    plotTitle: string
  ) => {
    // Close the export menu
    showExportMenu.value = false
    
    if (!plotContainer) return
    
    // Set loading state
    isExporting.value = true
    
    try {
      // Get the SVG element from the plot container
      const svgElement = plotContainer.querySelector('svg')
      if (!svgElement) {
        console.error('No SVG element found in plot container')
        isExporting.value = false
        return
      }
      
      // Create a clone of the SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGElement
      
      // Set the background color for the exported SVG
      svgClone.style.backgroundColor = 'white'
      
      // Find and modify all background rectangles to be white
      const allRects = svgClone.querySelectorAll('rect')
      allRects.forEach(rect => {
        const fill = rect.getAttribute('fill')
        // If this is a background rectangle (using CSS variables or muted color)
        if (fill && (fill.includes('var(--muted)') || fill.includes('hsl('))) {
          rect.setAttribute('fill', 'white')
        }
      })
      
      // Add a white background rectangle as the first element to ensure white background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('width', svgClone.getAttribute('width') || '700')
      rect.setAttribute('height', svgClone.getAttribute('height') || '450')
      rect.setAttribute('fill', 'white')
      
      // Insert the background rectangle as the first child
      if (svgClone.firstChild) {
        svgClone.insertBefore(rect, svgClone.firstChild)
      } else {
        svgClone.appendChild(rect)
      }
      
      // Make sure all grid lines are visible against white background
      const gridLines = svgClone.querySelectorAll('.grid line')
      gridLines.forEach(line => {
        line.setAttribute('stroke', '#e0e0e0')
        line.setAttribute('stroke-opacity', '1')
      })
      
      // Make sure zero axes are visible in exports
      const zeroAxes = svgClone.querySelectorAll('.zero-axis')
      zeroAxes.forEach(line => {
        line.setAttribute('stroke', '#3b82f6') // Blue color for zero axes
        line.setAttribute('stroke-opacity', '1')
      })
      
      // Add the title as a text element if it exists
      if (plotTitle) {
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        titleElement.setAttribute('x', (parseInt(svgClone.getAttribute('width') || '0') / 2).toString())
        titleElement.setAttribute('y', '20')
        titleElement.setAttribute('text-anchor', 'middle')
        titleElement.setAttribute('font-size', '16px')
        titleElement.setAttribute('font-weight', 'bold')
        titleElement.setAttribute('fill', 'black')
        titleElement.textContent = plotTitle
        svgClone.appendChild(titleElement)
      }
      
      // Get the SVG as a string
      const svgData = new XMLSerializer().serializeToString(svgClone)
      
      if (format === 'svg') {
        // For SVG export, create a blob and download it
        const blob = new Blob([svgData], { type: 'image/svg+xml' })
        downloadFile(blob, `${plotTitle || 'scatter-plot'}.svg`)
        isExporting.value = false
      } else {
        // For PNG and JPEG, we need to convert the SVG to an image
        const canvas = document.createElement('canvas')
        const width = parseInt(svgClone.getAttribute('width') || '700')
        const height = parseInt(svgClone.getAttribute('height') || '450')
        
        // Set canvas dimensions
        canvas.width = width
        canvas.height = height
        
        // Get canvas context
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.error('Could not get canvas context')
          isExporting.value = false
          return
        }
        
        // Set white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)
        
        // Create an image from the SVG
        const img = new Image()
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svgBlob)
        
        img.onload = () => {
          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0)
          
          // Convert canvas to the desired format
          const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
          const quality = format === 'jpeg' ? 0.9 : undefined
          
          // Get the data URL
          const dataUrl = canvas.toDataURL(mimeType, quality)
          
          // Convert data URL to blob
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              // Download the file
              downloadFile(blob, `${plotTitle || 'scatter-plot'}.${format}`)
              
              // Clean up
              URL.revokeObjectURL(url)
              isExporting.value = false
            })
            .catch(err => {
              console.error('Error creating blob from data URL:', err)
              isExporting.value = false
            })
        }
        
        img.onerror = () => {
          console.error('Error loading SVG as image')
          URL.revokeObjectURL(url)
          isExporting.value = false
        }
        
        img.src = url
      }
    } catch (error) {
      console.error('Error exporting plot:', error)
      isExporting.value = false
    }
  }
  
  // Helper function to download a file
  const downloadFile = (blob: Blob, filename: string) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }
  
  // Close export menu when clicking outside
  const setupExportMenuClickOutside = () => {
    const closeExportMenuOnClickOutside = (event: MouseEvent) => {
      if (showExportMenu.value) {
        const target = event.target as HTMLElement
        const dropdown = document.querySelector('.export-dropdown')
        if (dropdown && !dropdown.contains(target)) {
          showExportMenu.value = false
        }
      }
    }
    
    // Add event listener
    document.addEventListener('click', closeExportMenuOnClickOutside)
    
    // Return cleanup function
    return () => {
      document.removeEventListener('click', closeExportMenuOnClickOutside)
    }
  }
  
  return {
    isExporting,
    showExportMenu,
    toggleExportMenu,
    closeExportMenu,
    exportPlot,
    setupExportMenuClickOutside
  }
} 