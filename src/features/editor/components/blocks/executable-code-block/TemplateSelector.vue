<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Code, Tag, Sparkles, Clock, TrendingUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useCodeTemplates, type CodeTemplate, type TemplateVariable } from './composables/features/useCodeTemplates'

const props = defineProps<{
  language: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'template-selected': [code: string]
}>()

const { 
  filteredTemplates, 
  availableCategories, 
  searchQuery, 
  selectedCategory,
  applyTemplate,
  getPopularTemplates,
  getRecentTemplates
} = useCodeTemplates(props.language)

const selectedTemplate = ref<CodeTemplate | null>(null)
const templateVariables = ref<Record<string, string>>({})
const isPreviewMode = ref(false)

// Computed properties
const popularTemplates = computed(() => getPopularTemplates(6))
const recentTemplates = computed(() => getRecentTemplates(3))

const previewCode = computed(() => {
  if (!selectedTemplate.value) return ''
  return applyTemplate(selectedTemplate.value, templateVariables.value)
})

// Methods
const selectTemplate = (template: CodeTemplate) => {
  selectedTemplate.value = template
  
  // Initialize template variables with default values
  if (template.variables) {
    templateVariables.value = {}
    template.variables.forEach(variable => {
      templateVariables.value[variable.name] = variable.defaultValue
    })
  }
  
  isPreviewMode.value = true
}

const applySelectedTemplate = () => {
  if (selectedTemplate.value) {
    const code = applyTemplate(selectedTemplate.value, templateVariables.value)
    emit('template-selected', code)
    emit('update:isOpen', false)
    resetSelection()
  }
}

const resetSelection = () => {
  selectedTemplate.value = null
  templateVariables.value = {}
  isPreviewMode.value = false
}

const closeDialog = () => {
  emit('update:isOpen', false)
  resetSelection()
}

const getCategoryIcon = (categoryId: string) => {
  const icons = {
    basics: Code,
    'data-science': TrendingUp,
    web: Search,
    'file-io': Tag,
    oop: Sparkles,
    async: Clock
  }
  return icons[categoryId as keyof typeof icons] || Code
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="closeDialog">
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Code class="w-5 h-5" />
          Code Templates
          <Badge variant="secondary">{{ language }}</Badge>
        </DialogTitle>
        <DialogDescription>
          Choose from pre-built code templates to get started quickly
        </DialogDescription>
      </DialogHeader>

      <div v-if="!isPreviewMode" class="flex-1 overflow-hidden">
        <!-- Search and Filter -->
        <div class="flex gap-4 mb-4">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              v-model="searchQuery"
              placeholder="Search templates..."
              class="pl-10"
            />
          </div>
          <select
            v-model="selectedCategory"
            class="px-3 py-2 border rounded-md bg-background"
          >
            <option
              v-for="category in availableCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Template Tabs -->
        <Tabs default-value="all" class="flex-1 flex flex-col">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <!-- All Templates -->
          <TabsContent value="all" class="flex-1 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                v-for="template in filteredTemplates"
                :key="template.id"
                class="cursor-pointer hover:shadow-md transition-shadow"
                @click="selectTemplate(template)"
              >
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      <component :is="getCategoryIcon(template.category)" class="w-4 h-4 text-primary" />
                      <CardTitle class="text-sm">{{ template.name }}</CardTitle>
                    </div>
                    <Badge variant="outline" class="text-xs">
                      {{ template.category }}
                    </Badge>
                  </div>
                  <CardDescription class="text-xs">
                    {{ template.description }}
                  </CardDescription>
                </CardHeader>
                <CardContent class="pt-0">
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="tag in template.tags.slice(0, 3)"
                      :key="tag"
                      variant="secondary"
                      class="text-xs"
                    >
                      {{ tag }}
                    </Badge>
                    <Badge
                      v-if="template.tags.length > 3"
                      variant="secondary"
                      class="text-xs"
                    >
                      +{{ template.tags.length - 3 }}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <!-- Popular Templates -->
          <TabsContent value="popular" class="flex-1 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                v-for="template in popularTemplates"
                :key="template.id"
                class="cursor-pointer hover:shadow-md transition-shadow"
                @click="selectTemplate(template)"
              >
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      <TrendingUp class="w-4 h-4 text-orange-500" />
                      <CardTitle class="text-sm">{{ template.name }}</CardTitle>
                    </div>
                    <Badge variant="outline" class="text-xs">
                      Popular
                    </Badge>
                  </div>
                  <CardDescription class="text-xs">
                    {{ template.description }}
                  </CardDescription>
                </CardHeader>
                <CardContent class="pt-0">
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="tag in template.tags.slice(0, 3)"
                      :key="tag"
                      variant="secondary"
                      class="text-xs"
                    >
                      {{ tag }}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <!-- Recent Templates -->
          <TabsContent value="recent" class="flex-1 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                v-for="template in recentTemplates"
                :key="template.id"
                class="cursor-pointer hover:shadow-md transition-shadow"
                @click="selectTemplate(template)"
              >
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      <Clock class="w-4 h-4 text-blue-500" />
                      <CardTitle class="text-sm">{{ template.name }}</CardTitle>
                    </div>
                    <Badge variant="outline" class="text-xs">
                      Recent
                    </Badge>
                  </div>
                  <CardDescription class="text-xs">
                    {{ template.description }}
                  </CardDescription>
                </CardHeader>
                <CardContent class="pt-0">
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="tag in template.tags.slice(0, 3)"
                      :key="tag"
                      variant="secondary"
                      class="text-xs"
                    >
                      {{ tag }}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <!-- Template Preview and Configuration -->
      <div v-else class="flex-1 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold">{{ selectedTemplate?.name }}</h3>
            <p class="text-sm text-muted-foreground">{{ selectedTemplate?.description }}</p>
          </div>
          <Button variant="outline" @click="resetSelection">
            Back to Templates
          </Button>
        </div>

        <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          <!-- Template Variables -->
          <div v-if="selectedTemplate?.variables?.length" class="space-y-4">
            <h4 class="font-medium">Template Variables</h4>
            <div class="space-y-3 max-h-64 overflow-y-auto">
              <div
                v-for="variable in selectedTemplate.variables"
                :key="variable.name"
                class="space-y-2"
              >
                <Label :for="variable.name" class="text-sm font-medium">
                  {{ variable.name }}
                </Label>
                <Input
                  :id="variable.name"
                  v-model="templateVariables[variable.name]"
                  :placeholder="variable.defaultValue"
                  class="text-sm"
                />
                <p class="text-xs text-muted-foreground">
                  {{ variable.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Code Preview -->
          <div class="flex flex-col">
            <h4 class="font-medium mb-2">Preview</h4>
            <div class="flex-1 border rounded-md overflow-hidden">
              <pre class="p-4 text-sm bg-muted/50 overflow-auto h-full"><code>{{ previewCode }}</code></pre>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" @click="resetSelection">
            Cancel
          </Button>
          <Button @click="applySelectedTemplate">
            Apply Template
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style> 








