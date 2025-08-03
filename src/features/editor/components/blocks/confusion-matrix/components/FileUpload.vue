<template>
  <Card class="w-full">
    <CardContent class="p-6">
      <div
        :class="[
          'upload-area relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
          {
            'border-primary bg-primary/5': isDragOver,
            'border-destructive bg-destructive/5': error,
            'border-green-500 bg-green-50 dark:bg-green-950/20': selectedFile && !error,
            'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20': !selectedFile && !error && !isDragOver
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

        <div class="space-y-4">
          <div v-if="!selectedFile" class="space-y-4">
            <div class="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
              <Upload class="w-8 h-8 text-muted-foreground" />
            </div>
            <div class="space-y-2">
              <h3 class="text-lg font-semibold">Drop your CSV file here</h3>
              <p class="text-muted-foreground">or click to browse your files</p>
            </div>
            <div class="text-sm text-muted-foreground bg-muted/30 rounded p-3">
              <FileText class="w-4 h-4 inline mr-2" />
              CSV should contain confusion matrix with class labels as headers
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle class="w-8 h-8 text-green-600" />
            </div>
            <div class="space-y-2">
              <h3 class="text-lg font-semibold">{{ selectedFile.name }}</h3>
              <p class="text-muted-foreground">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <Button
              @click.stop="removeFile"
              variant="outline"
              size="sm"
            >
              <X class="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <Alert v-if="error" variant="destructive" class="mt-4">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <!-- Processing Indicator -->
      <div v-if="isProcessing" class="mt-4 flex items-center justify-center space-x-2 p-4 bg-muted/20 rounded-lg">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span class="text-sm text-muted-foreground">Processing file...</span>
      </div>

      <!-- File Preview -->
      <div v-if="previewData && !error" class="mt-6 space-y-4">
        <div class="flex items-center gap-2">
          <Eye class="w-4 h-4 text-primary" />
          <h4 class="font-semibold">File Preview</h4>
        </div>
        
        <div class="grid gap-4 md:grid-cols-3">
          <Card class="p-4 text-center">
            <div class="text-2xl font-bold text-primary">{{ previewData.labels.length }}</div>
            <div class="text-sm text-muted-foreground">Classes</div>
          </Card>
          <Card class="p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ previewData.matrix.length }}×{{ previewData.matrix[0]?.length || 0 }}</div>
            <div class="text-sm text-muted-foreground">Matrix Size</div>
          </Card>
          <Card class="p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ getTotalSamples(previewData.matrix) }}</div>
            <div class="text-sm text-muted-foreground">Total Samples</div>
          </Card>
        </div>
        
        <!-- Mini Matrix Preview -->
        <Card class="p-4">
          <h5 class="font-medium mb-3 flex items-center gap-2">
            <Grid class="w-4 h-4" />
            Matrix Preview
          </h5>
          <div class="overflow-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b">
                  <th class="p-2 text-left font-medium">Classes</th>
                  <th 
                    v-for="(label, index) in previewData.labels.slice(0, 4)"
                    :key="index"
                    class="p-2 text-center font-medium"
                  >
                    {{ truncateLabel(label) }}
                  </th>
                  <th v-if="previewData.labels.length > 4" class="p-2 text-center font-medium">...</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in previewData.matrix.slice(0, 4)"
                  :key="rowIndex"
                  class="border-b hover:bg-muted/20"
                >
                  <td class="p-2 font-medium">{{ truncateLabel(previewData.labels[rowIndex]) }}</td>
                  <td
                    v-for="(value, colIndex) in row.slice(0, 4)"
                    :key="colIndex"
                    class="p-2 text-center"
                  >
                    <Badge variant="outline" class="text-xs">{{ value }}</Badge>
                  </td>
                  <td v-if="row.length > 4" class="p-2 text-center">...</td>
                </tr>
                <tr v-if="previewData.matrix.length > 4">
                  <td class="p-2 text-center">...</td>
                  <td class="p-2 text-center">...</td>
                  <td class="p-2 text-center">...</td>
                  <td class="p-2 text-center">...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <!-- Action Buttons -->
      <div v-if="selectedFile && !error" class="mt-6 flex gap-3">
        <Button
          @click="uploadFile"
          :disabled="isProcessing || !previewData"
          class="flex-1"
        >
          <CheckCircle class="w-4 h-4 mr-2" />
          <span v-if="isProcessing">Processing...</span>
          <span v-else>Use This File</span>
        </Button>
        <Button
          @click="removeFile"
          :disabled="isProcessing"
          variant="outline"
        >
          <X class="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Button
} from '@/components/ui/button'
import {
  Badge
} from '@/components/ui/badge'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  AlertCircle,
  Eye,
  Grid
} from 'lucide-vue-next'
import { parseConfusionMatrixCSV, validateConfusionMatrix, type ConfusionMatrixData } from '@/features/editor/components/blocks/confusion-matrix/utils/confusionMatrixUtils'

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

async function processFile(file: File) {
  // Reset state
  error.value = ''
  previewData.value = null
  isProcessing.value = true
  
  try {
    // Validate file type
    if (!props.acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()))) {
      throw new Error(`File type not supported. Please upload one of: ${props.acceptedFileTypes.join(', ')}`)
    }
    
    // Validate file size
    if (file.size > props.maxFileSize) {
      throw new Error(`File size too large. Maximum size: ${formatFileSize(props.maxFileSize)}`)
    }
    
    selectedFile.value = file
    
    // Read file content
    const content = await readFileContent(file)
    
    // Parse and validate
    const data = parseConfusionMatrixCSV(content)
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
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function uploadFile() {
  if (previewData.value) {
    emit('file-uploaded', previewData.value)
  }
}

function removeFile() {
  selectedFile.value = null
  previewData.value = null
  error.value = ''
  
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getTotalSamples(matrix: number[][]): number {
  return matrix.reduce((total, row) => 
    total + row.reduce((sum, val) => sum + val, 0), 0
  )
}

function truncateLabel(label: string): string {
  return label.length > 8 ? label.substring(0, 8) + '...' : label
}
</script> 








