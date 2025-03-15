import type { ZoomTransform } from 'd3'
import type { NodeViewProps } from '@tiptap/vue-3'

export interface DataPoint {
  x: number
  y: number
  label?: string
}

export interface PlotState {
  data: DataPoint[]
  xAxisLabel: string
  yAxisLabel: string
  pointSize: number
  opacity: number
  title: string
  csvContent?: string
  selectedXColumn?: string
  selectedYColumn?: string
  selectedLabelColumn?: string
  colorMapping?: Record<string, string>
  isZoomed?: boolean
  zoomTransform?: {
    x: number
    y: number
    k: number
  }
}

export interface ScatterPlotProps extends NodeViewProps {
  updateAttributes: (attrs: Record<string, any>) => void
}

export interface PlotOptions {
  pointSize: number
  opacity: number
  xAxisLabel: string
  yAxisLabel: string
  title: string
  colorMapping: Record<string, string>
}

export interface PlotDimensions {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface ZoomState {
  isZoomed: boolean
  transform: ZoomTransform | null
  initialXDomain: [number, number] | null
  initialYDomain: [number, number] | null
}

export interface ColumnSelections {
  availableColumns: string[]
  numericColumns: string[]
  selectedXColumn: string
  selectedYColumn: string
  selectedLabelColumn: string
} 