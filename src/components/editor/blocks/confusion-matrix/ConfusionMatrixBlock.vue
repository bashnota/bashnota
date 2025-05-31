<template>
  <node-view-wrapper class="confusion-matrix-block">
    <div class="block-container">
      <!-- Block Header -->
      <div class="block-header">
        <div class="header-content">
          <div class="block-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z"></path>
            </svg>
          </div>
          <div class="block-title">
            <input
              v-if="editingTitle"
              v-model="localTitle"
              @blur="saveTitle"
              @keyup.enter="saveTitle"
              @keyup.escape="cancelTitleEdit"
              class="title-input"
              placeholder="Enter title..."
              ref="titleInput"
            />
            <h3 v-else @click="startTitleEdit" class="title-display">
              {{ displayTitle }}
            </h3>
          </div>
        </div>
        <div class="header-actions">
          <button
            @click="showSettings = !showSettings"
            class="settings-button"
            :class="{ active: showSettings }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
          <button @click="deleteNode" class="delete-button">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="settings-panel">
        <div class="settings-content">
          <div class="setting-group">
            <label class="setting-label">Data Source</label>
            <div class="source-tabs">
              <button
                @click="dataSource = 'upload'"
                :class="['source-tab', { active: dataSource === 'upload' }]"
              >
                Upload CSV
              </button>
              <button
                @click="dataSource = 'jupyter'"
                :class="['source-tab', { active: dataSource === 'jupyter' }]"
              >
                Jupyter Server
              </button>
              <button
                @click="dataSource = 'sample'"
                :class="['source-tab', { active: dataSource === 'sample' }]"
              >
                Sample Data
              </button>
            </div>
          </div>

          <div class="setting-group">
            <label class="setting-label">Visualization Options</label>
            <div class="setting-checkboxes">
              <label class="checkbox-label">
                <input
                  v-model="showMatrix"
                  type="checkbox"
                  class="setting-checkbox"
                />
                Show Interactive Matrix
              </label>
              <label class="checkbox-label">
                <input
                  v-model="showStats"
                  type="checkbox"
                  class="setting-checkbox"
                />
                Show Statistics
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="block-content">
        <!-- Data Loading Section -->
        <div v-if="!hasData" class="data-loading-section">
          <!-- Upload CSV -->
          <div v-if="dataSource === 'upload'">
            <FileUpload
              @file-uploaded="handleFileUpload"
              @error="handleError"
            />
          </div>

          <!-- Jupyter Browser -->
          <div v-else-if="dataSource === 'jupyter'">
            <JupyterFileBrowser
              @file-selected="handleJupyterFileSelect"
              @error="handleError"
              @open-jupyter-sidebar="handleOpenJupyterSidebar"
            />
          </div>

          <!-- Sample Data -->
          <div v-else-if="dataSource === 'sample'">
            <div class="sample-data-section">
              <div class="sample-info">
                <h4 class="sample-title">Sample Confusion Matrix</h4>
                <p class="sample-description">
                  Load a sample 3-class confusion matrix for animal classification (Cat, Dog, Bird)
                </p>
              </div>
              <button @click="loadSampleData" class="sample-button">
                Load Sample Data
              </button>
            </div>
          </div>
        </div>

        <!-- Visualization Section -->
        <div v-else class="visualization-section">
          <!-- Data Info -->
          <div class="data-info">
            <div class="info-badges">
              <span class="info-badge">
                {{ matrixData.labels.length }} Classes
              </span>
              <span class="info-badge">
                {{ getTotalSamples() }} Samples
              </span>
              <span v-if="stats" class="info-badge">
                {{ formatNumber(stats.accuracy * 100, 1) }}% Accuracy
              </span>
            </div>
            <div class="data-actions">
              <button @click="changeData" class="change-data-button">
                Change Data
              </button>
              <button v-if="filePath" @click="reloadFromSource" class="reload-button">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Reload
              </button>
            </div>
          </div>

          <!-- Interactive Matrix -->
          <div v-if="showMatrix" class="matrix-section">
            <InteractiveMatrix
              :matrix="matrixData.matrix"
              :labels="matrixData.labels"
              :title="matrixData.title"
            />
          </div>

          <!-- Statistics -->
          <div v-if="showStats && stats" class="stats-section">
            <StatsVisualization
              :stats="stats"
              :labels="matrixData.labels"
              :matrix="matrixData.matrix"
            />
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-display">
        <div class="error-content">
          <div class="error-icon">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <span class="error-text">{{ error }}</span>
          <button @click="clearError" class="error-dismiss">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import FileUpload from './components/FileUpload.vue'
import JupyterFileBrowser from './components/JupyterFileBrowser.vue'
import InteractiveMatrix from './components/InteractiveMatrix.vue'
import StatsVisualization from './components/StatsVisualization.vue'
import {
  calculateConfusionMatrixStats,
  generateSampleConfusionMatrix,
  formatNumber,
  type ConfusionMatrixData,
  type ConfusionMatrixStats
} from './utils/confusionMatrixUtils'

interface Props {
  node: {
    attrs: {
      data: number[][] | null
      labels: string[]
      title: string
      source: 'upload' | 'jupyter' | 'sample'
      filePath: string
      stats: ConfusionMatrixStats | null
    }
  }
  updateAttributes: (attrs: any) => void
  deleteNode: () => void
}

const props = defineProps<Props>()

// Reactive state
const showSettings = ref(false)
const editingTitle = ref(false)
const localTitle = ref('')
const error = ref('')
const dataSource = ref<'upload' | 'jupyter' | 'sample'>('upload')
const showMatrix = ref(true)
const showStats = ref(true)
const titleInput = ref<HTMLInputElement>()

// Computed properties
const hasData = computed(() => {
  return props.node.attrs.data && props.node.attrs.labels.length > 0
})

const matrixData = computed((): ConfusionMatrixData => {
  return {
    matrix: props.node.attrs.data || [],
    labels: props.node.attrs.labels || [],
    title: props.node.attrs.title || 'Confusion Matrix'
  }
})

const stats = computed(() => {
  if (!hasData.value) return null
  if (props.node.attrs.stats) return props.node.attrs.stats
  
  // Calculate stats if not cached
  return calculateConfusionMatrixStats(matrixData.value.matrix, matrixData.value.labels)
})

const displayTitle = computed(() => {
  return props.node.attrs.title || 'Confusion Matrix'
})

const filePath = computed(() => {
  return props.node.attrs.filePath
})

// Methods
function handleFileUpload(data: ConfusionMatrixData) {
  updateMatrixData({
    ...data,
    source: 'upload',
    filePath: ''
  })
  clearError()
}

function handleJupyterFileSelect(data: ConfusionMatrixData & { filePath: string }) {
  updateMatrixData({
    matrix: data.matrix,
    labels: data.labels,
    title: data.title || props.node.attrs.title,
    source: 'jupyter',
    filePath: data.filePath
  })
  clearError()
}

function loadSampleData() {
  const sampleData = generateSampleConfusionMatrix()
  updateMatrixData({
    ...sampleData,
    source: 'sample',
    filePath: ''
  })
  clearError()
}

function updateMatrixData(data: Partial<ConfusionMatrixData> & { source: string; filePath: string }) {
  const newStats = data.matrix && data.labels 
    ? calculateConfusionMatrixStats(data.matrix, data.labels)
    : null

  props.updateAttributes({
    data: data.matrix || props.node.attrs.data,
    labels: data.labels || props.node.attrs.labels,
    title: data.title || props.node.attrs.title,
    source: data.source || props.node.attrs.source,
    filePath: data.filePath || props.node.attrs.filePath,
    stats: newStats
  })
}

function changeData() {
  showSettings.value = true
  // Clear current data
  props.updateAttributes({
    data: null,
    labels: [],
    stats: null,
    filePath: ''
  })
}

async function reloadFromSource() {
  if (!filePath.value) return
  
  // For now, just show a message that this would reload from Jupyter
  // In a full implementation, this would reconnect to Jupyter and reload the file
  error.value = 'Reload functionality would reconnect to Jupyter server and reload the file'
  setTimeout(() => clearError(), 3000)
}

function startTitleEdit() {
  editingTitle.value = true
  localTitle.value = props.node.attrs.title
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function saveTitle() {
  props.updateAttributes({
    title: localTitle.value || 'Confusion Matrix'
  })
  editingTitle.value = false
}

function cancelTitleEdit() {
  editingTitle.value = false
  localTitle.value = props.node.attrs.title
}

function handleError(errorMessage: string) {
  error.value = errorMessage
}

function clearError() {
  error.value = ''
}

function getTotalSamples(): number {
  if (!hasData.value) return 0
  return matrixData.value.matrix.reduce((total, row) => 
    total + row.reduce((rowTotal, value) => rowTotal + value, 0), 0
  )
}

function handleOpenJupyterSidebar() {
  // Dispatch a custom event that can be caught by the main editor
  window.dispatchEvent(new CustomEvent('open-jupyter-sidebar'))
}

// Initialize state from node attributes
onMounted(() => {
  dataSource.value = props.node.attrs.source || 'upload'
})

// Watch for data source changes
watch(dataSource, (newSource) => {
  if (hasData.value) {
    props.updateAttributes({
      source: newSource
    })
  }
})
</script>

<style scoped>
.confusion-matrix-block {
  @apply w-full;
}

.block-container {
  @apply bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden;
}

.block-header {
  @apply flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200;
}

.header-content {
  @apply flex items-center gap-3;
}

.block-icon {
  @apply text-purple-600;
}

.block-title {
  @apply flex-1;
}

.title-input {
  @apply px-2 py-1 text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500;
}

.title-display {
  @apply text-lg font-semibold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors;
}

.header-actions {
  @apply flex items-center gap-2;
}

.settings-button {
  @apply p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors;
}

.settings-button.active {
  @apply text-purple-600 bg-purple-50;
}

.delete-button {
  @apply p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors;
}

.settings-panel {
  @apply border-b border-gray-200 bg-gray-50;
}

.settings-content {
  @apply p-4 space-y-4;
}

.setting-group {
  @apply space-y-2;
}

.setting-label {
  @apply block text-sm font-medium text-gray-700;
}

.source-tabs {
  @apply flex gap-1 p-1 bg-gray-200 rounded-lg;
}

.source-tab {
  @apply px-3 py-2 text-sm font-medium text-gray-600 rounded-md transition-colors;
}

.source-tab.active {
  @apply bg-white text-purple-600 shadow-sm;
}

.setting-checkboxes {
  @apply space-y-2;
}

.checkbox-label {
  @apply flex items-center gap-2 text-sm text-gray-700 cursor-pointer;
}

.setting-checkbox {
  @apply rounded border-gray-300 text-purple-600 focus:ring-purple-500;
}

.block-content {
  @apply p-6;
}

.data-loading-section {
  @apply space-y-6;
}

.sample-data-section {
  @apply text-center space-y-4 py-8;
}

.sample-info {
  @apply space-y-2;
}

.sample-title {
  @apply text-lg font-semibold text-gray-900;
}

.sample-description {
  @apply text-gray-600 max-w-md mx-auto;
}

.sample-button {
  @apply px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium;
}

.visualization-section {
  @apply space-y-6;
}

.data-info {
  @apply flex items-center justify-between flex-wrap gap-4;
}

.info-badges {
  @apply flex gap-2 flex-wrap;
}

.info-badge {
  @apply px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium;
}

.data-actions {
  @apply flex gap-2;
}

.change-data-button {
  @apply px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium;
}

.reload-button {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium;
}

.matrix-section {
  @apply space-y-4;
}

.stats-section {
  @apply space-y-4;
}

.error-display {
  @apply border-t border-gray-200 bg-red-50;
}

.error-content {
  @apply flex items-center gap-3 p-4;
}

.error-icon {
  @apply text-red-500 flex-shrink-0;
}

.error-text {
  @apply text-red-700 flex-1;
}

.error-dismiss {
  @apply p-1 text-red-500 hover:text-red-700 transition-colors;
}
</style> 