import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import type { DataPoint, PlotOptions, PlotDimensions, ZoomState } from '../types'

export function useScatterPlot() {
  const plotContainer = ref<HTMLElement | null>(null)
  const zoomState = ref<ZoomState>({
    isZoomed: false,
    transform: null,
    initialXDomain: null,
    initialYDomain: null
  })
  
  // Store the color mapping for persistence
  const colorMapping = ref<Record<string, string>>({})
  
  // Use a more consistent color generation method with proper typing
  const colorScale: d3.ScaleOrdinal<string, string> = d3.scaleOrdinal<string>(d3.schemeSet2)
  
  // Get color for a label, using saved mapping if available
  const getColorForLabel = (label: string): string => {
    // If we have a saved color for this label, use it
    if (colorMapping.value[label]) {
      return colorMapping.value[label]
    }
    
    // Otherwise generate a new color and save it
    const newColor = colorScale(label)
    colorMapping.value[label] = newColor
    return newColor
  }
  
  // Initialize or restore color mapping
  const initializeColorScale = (labels: string[]) => {
    // If we have no labels, exit early
    if (!labels.length) return
    
    // For any new labels, assign colors
    labels.forEach(label => {
      if (!colorMapping.value[label]) {
        colorMapping.value[label] = colorScale(label)
      }
    })
  }
  
  const createScatterPlot = (
    data: DataPoint[],
    options: PlotOptions,
    dimensions: PlotDimensions = {
      width: 700,
      height: 450,
      margin: { top: 40, right: 40, bottom: 60, left: 60 }
    }
  ) => {
    if (!plotContainer.value) return
    
    // Get unique labels from data in a consistent order
    const labels = Array.from(new Set(data.map((d) => d.label || 'default')))
    
    // Initialize or restore color scale for these labels
    initializeColorScale(labels)
    
    // Clear previous plot
    d3.select(plotContainer.value).selectAll('*').remove()
    
    const { width, height, margin } = dimensions
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    
    // Create the main SVG element
    const svg = d3
      .select(plotContainer.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      
    // Create a group for the entire plot that will be transformed during zoom
    const plotGroup = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      
    // Add clip path to prevent elements from rendering outside the plot area
    svg.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('rx', 8)
      
    // Add background
    plotGroup
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'hsl(var(--muted))')
      .attr('rx', 8)
    
    // Find min/max values with some padding
    const xMin = d3.min(data, d => d.x) || 0
    const xMax = d3.max(data, d => d.x) || 100
    const yMin = d3.min(data, d => d.y) || 0
    const yMax = d3.max(data, d => d.y) || 100
    
    // Add 5% padding to each side
    const xPadding = (xMax - xMin) * 0.05
    const yPadding = (yMax - yMin) * 0.05
    
    // Store initial domains for reset functionality
    zoomState.value.initialXDomain = [xMin - xPadding, xMax + xPadding]
    zoomState.value.initialYDomain = [yMin - yPadding, yMax + yPadding]
    
    const x = d3
      .scaleLinear()
      .domain(zoomState.value.initialXDomain)
      .range([0, innerWidth])
      .nice()
    
    const y = d3
      .scaleLinear()
      .domain(zoomState.value.initialYDomain)
      .range([innerHeight, 0])
      .nice()
      
    // Create a group for the content that will be zoomed
    const zoomableGroup = plotGroup.append('g')
      .attr('clip-path', 'url(#clip)')
      
    // Create a group for the dots
    const dotsGroup = zoomableGroup.append('g')
    
    // Add grid lines
    const xGrid = d3.axisBottom(x)
      .tickSize(-innerHeight)
      .tickFormat(() => '')
    
    const xGridGroup = zoomableGroup.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xGrid)
    
    const yGrid = d3.axisLeft(y)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      
    const yGridGroup = zoomableGroup.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      
    // Add special lines for x=0 and y=0 axes if they are within the domain
    const xDomain = x.domain()
    const yDomain = y.domain()
    
    // Add x=0 line if it's within the y-axis domain
    if (yDomain[0] <= 0 && yDomain[1] >= 0) {
      zoomableGroup.append('line')
        .attr('class', 'zero-axis')
        .attr('x1', 0)
        .attr('y1', y(0))
        .attr('x2', innerWidth)
        .attr('y2', y(0))
        .attr('stroke', 'hsl(var(--primary))')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
    }
    
    // Add y=0 line if it's within the x-axis domain
    if (xDomain[0] <= 0 && xDomain[1] >= 0) {
      zoomableGroup.append('line')
        .attr('class', 'zero-axis')
        .attr('x1', x(0))
        .attr('y1', 0)
        .attr('x2', x(0))
        .attr('y2', innerHeight)
        .attr('stroke', 'hsl(var(--primary))')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
    }
    
    // Add X axis
    const xAxisGroup = plotGroup
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      
    xAxisGroup.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 40)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text(options.xAxisLabel)
    
    // Add Y axis
    const yAxisGroup = plotGroup
      .append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y))
      
    yAxisGroup.append('text')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text(options.yAxisLabel)
    
    // Add dots with transition
    const dots = dotsGroup
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.x))
      .attr('cy', (d) => y(d.y))
      .attr('r', 0)
      .style('fill', (d) => getColorForLabel(d.label || 'default'))
      .style('opacity', options.opacity)
      .style('stroke', function(d) {
        const color = d3.color(getColorForLabel(d.label || 'default'))
        return color ? color.darker().toString() : ''
      })
      .style('stroke-width', 1)
    
    dots
      .transition()
      .duration(800)
      .delay((d, i) => i * 10)
      .attr('r', options.pointSize)
    
    // Add hover effects
    dots
      .on('mouseover', function (event, d) {
        const circle = d3.select(this)
    
        circle
          .transition()
          .duration(200)
          .attr('r', options.pointSize * 1.5)
          .style('opacity', 1)
          .style('stroke-width', 2)
    
        const tooltip = plotGroup
          .append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${x(d.x) + 10},${y(d.y) - 10})`)
    
        tooltip
          .append('rect')
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('fill', 'hsl(var(--popover))')
          .attr('width', 120)
          .attr('height', d.label ? 60 : 40)
    
        tooltip
          .append('text')
          .attr('x', 10)
          .attr('y', 20)
          .attr('fill', 'hsl(var(--popover-foreground))')
          .text(`X: ${d.x.toFixed(2)}`)
    
        tooltip
          .append('text')
          .attr('x', 10)
          .attr('y', 40)
          .attr('fill', 'hsl(var(--popover-foreground))')
          .text(`Y: ${d.y.toFixed(2)}`)
    
        if (d.label) {
          tooltip
            .append('text')
            .attr('x', 10)
            .attr('y', 60)
            .attr('fill', 'hsl(var(--popover-foreground))')
            .text(`${d.label}`)
        }
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', options.pointSize)
          .style('opacity', options.opacity)
          .style('stroke-width', 1)
    
        plotGroup.selectAll('.tooltip').remove()
      })
      
    // Define zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 20])  // Set min zoom to 1 (current view) and max zoom to 20x
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on('zoom', (event) => {
        // Store the current zoom transform
        zoomState.value.transform = event.transform
        zoomState.value.isZoomed = event.transform.k > 1
        
        // Apply the transform to the zoomable group
        zoomableGroup.attr('transform', event.transform)
        
        // Update the axes with the new scales
        xAxisGroup.call(d3.axisBottom(event.transform.rescaleX(x)))
        yAxisGroup.call(d3.axisLeft(event.transform.rescaleY(y)))
        
        // Update the grid lines
        xGridGroup.call(
          d3.axisBottom(event.transform.rescaleX(x))
            .tickSize(-innerHeight)
            .tickFormat(() => '')
        )
        
        yGridGroup.call(
          d3.axisLeft(event.transform.rescaleY(y))
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        
        // Update dot size based on zoom level
        dotsGroup.selectAll('circle')
          .attr('r', options.pointSize / Math.sqrt(event.transform.k))
      })
      
    // Apply zoom behavior to the SVG
    svg.call(zoom as any)
    
    // Restore previous zoom state if available
    if (zoomState.value.transform) {
      svg.call(zoom.transform as any, zoomState.value.transform)
    }
    
    // Add zoom controls
    const zoomControls = svg.append('g')
      .attr('class', 'zoom-controls')
      .attr('transform', `translate(${width - margin.right - 10}, ${margin.top + 10})`)
    
    // Zoom in button
    zoomControls.append('circle')
      .attr('r', 12)
      .attr('fill', 'hsl(var(--background))')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1)
      .attr('cx', 0)
      .attr('cy', 0)
      .style('cursor', 'pointer')
      
    zoomControls.append('text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--foreground))')
      .style('font-size', '16px')
      .style('cursor', 'pointer')
      .text('+')
      .on('click', () => {
        svg.transition().duration(300).call(zoom.scaleBy as any, 1.5)
      })
    
    // Zoom out button
    zoomControls.append('circle')
      .attr('r', 12)
      .attr('fill', 'hsl(var(--background))')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1)
      .attr('cx', 0)
      .attr('cy', 30)
      .style('cursor', 'pointer')
      
    zoomControls.append('text')
      .attr('x', 0)
      .attr('y', 34)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--foreground))')
      .style('font-size', '16px')
      .style('cursor', 'pointer')
      .text('−')
      .on('click', () => {
        svg.transition().duration(300).call(zoom.scaleBy as any, 0.75)
      })
    
    // Reset zoom button
    zoomControls.append('circle')
      .attr('r', 12)
      .attr('fill', 'hsl(var(--background))')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1)
      .attr('cx', 0)
      .attr('cy', 60)
      .style('cursor', 'pointer')
      
    zoomControls.append('text')
      .attr('x', 0)
      .attr('y', 64)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--foreground))')
      .style('font-size', '14px')
      .style('cursor', 'pointer')
      .text('↺')
      .on('click', () => {
        svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity)
        zoomState.value.transform = null
        zoomState.value.isZoomed = false
      })
      
    return {
      svg,
      zoom
    }
  }
  
  const resetZoom = () => {
    if (!plotContainer.value) return
    
    // Find the SVG element
    const svg = d3.select(plotContainer.value).select('svg')
    if (!svg.empty()) {
      // Get the zoom behavior
      const zoom = d3.zoom()
      
      // Reset to identity transform (no zoom, no pan)
      svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity)
      
      // Reset our state
      zoomState.value.transform = null
      zoomState.value.isZoomed = false
    }
  }
  
  // Generate random data for testing
  const generateRandomData = (n: number = 50): DataPoint[] => {
    const labels = ['Group A', 'Group B', 'Group C']
    return Array.from({ length: n }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      label: labels[Math.floor(Math.random() * labels.length)],
    }))
  }
  
  return {
    plotContainer,
    zoomState,
    colorMapping,
    getColorForLabel,
    initializeColorScale,
    createScatterPlot,
    resetZoom,
    generateRandomData
  }
} 