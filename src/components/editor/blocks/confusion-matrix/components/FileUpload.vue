<template>
  <div class="file-upload">
    <div
      :class="[
        'upload-area',
        {
          'drag-over': isDragOver,
          'has-error': error,
          'has-file': selectedFile
        }
      ]"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="openFileDialog"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        class="hidden"
        @change="handleFileSelect"
      />

      <div class="upload-content">
        <div v-if="!selectedFile" class="upload-placeholder">
          <div class="upload-icon">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
          </div>
          <div class="upload-text">
            <p class="upload-primary">Drop your CSV file here</p>
            <p class="upload-secondary">or click to browse</p>
          </div>
          <div class="upload-hint">
            CSV should contain confusion matrix with class labels as headers
          </div>
        </div>

        <div v-else class="file-info">
          <div class="file-icon">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="file-details">
            <div class="file-name">{{ selectedFile.name }}</div>
            <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
          </div>
          <button
            @click.stop="removeFile"
            class="remove-button"
            type="button"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <div class="error-icon">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <span>{{ error }}</span>
    </div>

    <!-- Processing Indicator -->
    <div v-if="isProcessing" class="processing-indicator">
      <div class="spinner"></div>
      <span>Processing file...</span>
    </div>

    <!-- File Preview -->
    <div v-if="previewData && !error" class="file-preview">
      <h4 class="preview-title">File Preview</h4>
      <div class="preview-content">
        <div class="preview-info">
          <div class="info-item">
            <span class="info-label">Classes:</span>
            <span class="info-value">{{ previewData.labels.length }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Matrix Size:</span>
            <span class="info-value">{{ previewData.matrix.length }}x{{ previewData.matrix[0]?.length || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Samples:</span>
            <span class="info-value">{{ getTotalSamples(previewData.matrix) }}</span>
          </div>
        </div>
        
        <!-- Mini Matrix Preview -->
        <div class="mini-matrix">
          <div class="mini-header">
            <div class="mini-cell corner">Classes</div>
            <div
              v-for="(label, index) in previewData.labels.slice(0, 3)"
              :key="index"
              class="mini-cell header"
            >
              {{ truncateLabel(label) }}
            </div>
            <div v-if="previewData.labels.length > 3" class="mini-cell header">...</div>
          </div>
          <div
            v-for="(row, rowIndex) in previewData.matrix.slice(0, 3)"
            :key="rowIndex"
            class="mini-row"
          >
            <div class="mini-cell header">{{ truncateLabel(previewData.labels[rowIndex]) }}</div>
            <div
              v-for="(value, colIndex) in row.slice(0, 3)"
              :key="colIndex"
              class="mini-cell data"
            >
              {{ value }}
            </div>
            <div v-if="row.length > 3" class="mini-cell data">...</div>
          </div>
          <div v-if="previewData.matrix.length > 3" class="mini-row">
            <div class="mini-cell header">...</div>
            <div class="mini-cell data">...</div>
            <div class="mini-cell data">...</div>
            <div class="mini-cell data">...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="selectedFile && !error" class="action-buttons">
      <button
        @click="uploadFile"
        :disabled="isProcessing || !previewData"
        class="upload-button"
      >
        <span v-if="isProcessing">Processing...</span>
        <span v-else>Use This File</span>
      </button>
      <button
        @click="removeFile"
        :disabled="isProcessing"
        class="cancel-button"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseConfusionMatrixCSV, validateConfusionMatrix, type ConfusionMatrixData } from '../utils/confusionMatrixUtils'

interface Props {
  acceptedFileTypes?: string[]
  maxFileSize?: number // in bytes
}

interface Emits {
  (e: 'file-uploaded', data: ConfusionMatrixData): void
  (e: 'error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
  acceptedFileTypes: () => ['.csv'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
})

const emit = defineEmits<Emits>()

// Reactive state
const selectedFile = ref<File | null>(null)
const error = ref<string>('')
const isProcessing = ref(false)
const isDragOver = ref(false)
const previewData = ref<ConfusionMatrixData | null>(null)
const fileInput = ref<HTMLInputElement>()

// Methods
function openFileDialog() {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function removeFile() {
  selectedFile.value = null
  previewData.value = null
  error.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function processFile(file: File) {
  // Reset state
  error.value = ''
  previewData.value = null
  isProcessing.value = true

  try {
    // Validate file type
    if (!props.acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type.substring(1)))) {
      throw new Error(`Invalid file type. Accepted types: ${props.acceptedFileTypes.join(', ')}`)
    }

    // Validate file size
    if (file.size > props.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${formatFileSize(props.maxFileSize)}`)
    }

    selectedFile.value = file

    // Read file content
    const content = await readFileContent(file)
    
    // Parse CSV
    const data = parseConfusionMatrixCSV(content)
    
    // Validate matrix
    const validationErrors = validateConfusionMatrix(data.matrix, data.labels)
    if (validationErrors.length > 0) {
      throw new Error(`Invalid confusion matrix: ${validationErrors[0]}`)
    }

    previewData.value = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to process file'
    selectedFile.value = null
    emit('error', error.value)
  } finally {
    isProcessing.value = false
  }
}

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function uploadFile() {
  if (previewData.value) {
    emit('file-uploaded', previewData.value)
    // Don't reset here - parent component can decide whether to keep or clear
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getTotalSamples(matrix: number[][]): number {
  return matrix.reduce((total, row) => 
    total + row.reduce((rowTotal, value) => rowTotal + value, 0), 0
  )
}

function truncateLabel(label: string, maxLength: number = 8): string {
  return label.length > maxLength ? label.substring(0, maxLength) + '...' : label
}
</script>

<style scoped>
.file-upload {
  @apply space-y-4;
}

.upload-area {
  @apply relative border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer transition-all duration-200;
  min-height: 200px;
}

.upload-area:hover {
  @apply border-blue-400 bg-blue-50;
}

.upload-area.drag-over {
  @apply border-blue-500 bg-blue-100;
}

.upload-area.has-error {
  @apply border-red-400 bg-red-50;
}

.upload-area.has-file {
  @apply border-green-400 bg-green-50;
}

.upload-content {
  @apply flex items-center justify-center h-full;
}

.upload-placeholder {
  @apply text-center space-y-4;
}

.upload-icon {
  @apply flex justify-center;
}

.upload-text {
  @apply space-y-2;
}

.upload-primary {
  @apply text-lg font-medium text-gray-700;
}

.upload-secondary {
  @apply text-sm text-gray-500;
}

.upload-hint {
  @apply text-xs text-gray-400 max-w-md mx-auto;
}

.file-info {
  @apply flex items-center gap-4 w-full;
}

.file-icon {
  @apply flex-shrink-0;
}

.file-details {
  @apply flex-1;
}

.file-name {
  @apply font-medium text-gray-900 truncate;
}

.file-size {
  @apply text-sm text-gray-500;
}

.remove-button {
  @apply p-2 text-gray-400 hover:text-red-500 transition-colors;
}

.error-message {
  @apply flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700;
}

.error-icon {
  @apply flex-shrink-0 text-red-500;
}

.processing-indicator {
  @apply flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700;
}

.spinner {
  @apply w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin;
}

.file-preview {
  @apply bg-gray-50 border border-gray-200 rounded-lg p-4;
}

.preview-title {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.preview-content {
  @apply space-y-4;
}

.preview-info {
  @apply grid grid-cols-3 gap-4;
}

.info-item {
  @apply text-center;
}

.info-label {
  @apply block text-xs font-medium text-gray-500 uppercase tracking-wide;
}

.info-value {
  @apply block text-lg font-semibold text-gray-900 mt-1;
}

.mini-matrix {
  @apply bg-white border border-gray-200 rounded-md overflow-hidden;
}

.mini-header {
  @apply flex bg-gray-100;
}

.mini-row {
  @apply flex border-t border-gray-200 first:border-t-0;
}

.mini-cell {
  @apply px-3 py-2 text-sm border-r border-gray-200 last:border-r-0;
  min-width: 80px;
  flex: 1;
  text-align: center;
}

.mini-cell.corner {
  @apply bg-gray-100 font-medium text-gray-700;
}

.mini-cell.header {
  @apply bg-gray-50 font-medium text-gray-700;
}

.mini-cell.data {
  @apply text-gray-900;
}

.action-buttons {
  @apply flex gap-3;
}

.upload-button {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium;
}

.cancel-button {
  @apply px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium;
}

.hidden {
  @apply sr-only;
}
</style> 