import { ref } from 'vue'
import * as d3 from 'd3'
import type { DataPoint, ColumnSelections } from '../types'
import { logger } from '@/services/logger'

export function useCsvData() {
  const rawCsvData = ref<Array<Record<string, any>>>([])
  const columnSelections = ref<ColumnSelections>({
    availableColumns: [],
    numericColumns: [],
    selectedXColumn: '',
    selectedYColumn: '',
    selectedLabelColumn: ''
  })
  
  // Analyze CSV columns to determine types and set initial selections
  const analyzeCsvColumns = (rows: Array<Record<string, any>>, savedSelections?: Partial<ColumnSelections>) => {
    if (!rows.length) return
    
    // Extract column names
    const columns = Object.keys(rows[0] || {})
    columnSelections.value.availableColumns = columns
    
    // Determine which columns have numeric values
    columnSelections.value.numericColumns = columns.filter(col => 
      !isNaN(Number(rows[0][col])) && 
      rows[0][col] !== null && 
      rows[0][col] !== ''
    )

    // Restore previous selections if available, or set defaults
    if (columnSelections.value.numericColumns.length >= 2) {
      columnSelections.value.selectedXColumn = savedSelections?.selectedXColumn || columnSelections.value.numericColumns[0]
      columnSelections.value.selectedYColumn = savedSelections?.selectedYColumn || columnSelections.value.numericColumns[1]
    }
    
    // For label column, handle special cases
    if (savedSelections?.selectedLabelColumn !== undefined) {
      // If we have a saved selection, use it
      columnSelections.value.selectedLabelColumn = savedSelections.selectedLabelColumn
    } else if (columns.includes('label')) {
      // Check specifically for a column named 'label'
      columnSelections.value.selectedLabelColumn = 'label'
    } else {
      // Otherwise, find the first non-numeric column or use empty string
      const nonNumericColumns = columns.filter(col => !columnSelections.value.numericColumns.includes(col))
      columnSelections.value.selectedLabelColumn = nonNumericColumns.length > 0 ? nonNumericColumns[0] : ''
    }
  }
  
  // Process CSV data with selected columns
  const processCsvWithColumns = (
    data: Array<Record<string, any>>,
    xColumn: string,
    yColumn: string,
    labelColumn?: string
  ): DataPoint[] => {
    // First check if we should use a label column
    const useLabels = labelColumn && labelColumn !== ''
    
    const processedData = data
      .map(row => {
        // Determine the label value
        let labelValue: string | undefined = undefined
        if (useLabels) {
          labelValue = String(row[labelColumn])
          // If the label is empty, use undefined
          if (labelValue === '') {
            labelValue = undefined
          }
        }
        
        return {
          x: Number(row[xColumn]),
          y: Number(row[yColumn]),
          label: labelValue
        }
      })
      .filter(point => !isNaN(point.x) && !isNaN(point.y) && point.x !== null && point.y !== null)
    
    return processedData
  }
  
  // Parse CSV string into data points
  const parseCsvData = async (
    csvContent: string, 
    savedSelections?: Partial<ColumnSelections>
  ): Promise<DataPoint[]> => {
    return new Promise((resolve, reject) => {
      try {
        const rows = d3.csvParse(csvContent)
        if (!rows.length) {
          throw new Error('CSV file appears to be empty')
        }

        // Store raw data for later use
        rawCsvData.value = rows
        
        // Analyze columns (which will restore column selections)
        analyzeCsvColumns(rows, savedSelections)
        
        // If we have stored column selections, use them
        if (columnSelections.value.selectedXColumn && columnSelections.value.selectedYColumn) {
          // Process with stored column selections
          const data = processCsvWithColumns(
            rows, 
            columnSelections.value.selectedXColumn, 
            columnSelections.value.selectedYColumn, 
            columnSelections.value.selectedLabelColumn
          )
          
          resolve(data)
        } else {
          // Otherwise determine automatically
          // Get column names
          const columns = Object.keys(rows[0] || {})

          // Try to automatically identify x, y, and label columns
          const numericColumns = columns.filter(
            (col) => !isNaN(Number(rows[0][col])) && rows[0][col] !== '',
          )

          // Check specifically for a column named 'label' first
          let labelColumn = columns.includes('label') ? 'label' : undefined
          
          // If no 'label' column, find the first non-numeric column
          if (!labelColumn) {
            labelColumn = columns.find(
              (col) => !numericColumns.includes(col) && rows.some((row) => row[col] !== ''),
            )
          }

          if (numericColumns.length < 2) {
            throw new Error('Need at least two numeric columns for x and y values')
          }
          
          // Set the column selections explicitly
          if (numericColumns.length >= 2) {
            columnSelections.value.selectedXColumn = numericColumns[0]
            columnSelections.value.selectedYColumn = numericColumns[1]
          }
          
          if (labelColumn) {
            columnSelections.value.selectedLabelColumn = labelColumn
          }

          const data: DataPoint[] = rows
            .map((row) => ({
              x: Number(row[numericColumns[0]]),
              y: Number(row[numericColumns[1]]),
              label: labelColumn ? row[labelColumn] : undefined,
            }))
            .filter(
              (point) => !isNaN(point.x) && !isNaN(point.y) && point.x !== null && point.y !== null,
            )

          resolve(data)
        }
      } catch (error) {
        reject(error)
      }
    })
  }
  
  // Extract column names from CSV content
  const extractColumnsFromCsv = (csvContent: string) => {
    try {
      // Parse the first row to get column names
      const firstRow = csvContent.split('\n')[0]
      if (!firstRow) return null
      
      const columns = firstRow.split(',')
      
      // Try to determine which columns are numeric and which might be labels
      const rows = d3.csvParse(csvContent)
      if (rows.length === 0) return null
      
      const numericColumns = columns.filter(col => 
        !isNaN(Number(rows[0][col])) && 
        rows[0][col] !== null && 
        rows[0][col] !== ''
      )
      
      const nonNumericColumns = columns.filter(col => !numericColumns.includes(col))
      
      return {
        all: columns,
        numeric: numericColumns,
        nonNumeric: nonNumericColumns
      }
    } catch (error) {
      logger.error('Error extracting columns from CSV:', error)
      return null
    }
  }
  
  // Handle CSV file upload
  const handleCsvUpload = async (file: File): Promise<DataPoint[]> => {
    try {
      const text = await file.text()
      
      // Parse the CSV into raw data
      const parsedCsv = d3.csvParse(text)
      if (!parsedCsv.length) {
        throw new Error('CSV file appears to be empty')
      }
      
      // Store the raw data
      rawCsvData.value = parsedCsv
      
      // Analyze columns and set initial selections
      analyzeCsvColumns(parsedCsv)
      
      // Process the CSV with selected columns
      const csvData = processCsvWithColumns(
        parsedCsv,
        columnSelections.value.selectedXColumn,
        columnSelections.value.selectedYColumn,
        columnSelections.value.selectedLabelColumn
      )
      
      if (csvData.length === 0) {
        throw new Error('No valid data points found in CSV')
      }
      
      return csvData
    } catch (error) {
      logger.error('Error parsing CSV:', error)
      throw error
    }
  }
  
  return {
    rawCsvData,
    columnSelections,
    analyzeCsvColumns,
    processCsvWithColumns,
    parseCsvData,
    extractColumnsFromCsv,
    handleCsvUpload
  }
} 