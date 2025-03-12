<script setup lang="ts">
import { ref, computed } from 'vue'
import { CloudProviderService, type VMTemplate } from '@/services/cloudProviderService'
import type { CloudProvider, VMConfiguration } from '@/types/jupyter'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ServerIcon, 
  BeakerIcon, 
  CpuChipIcon, 
  PlusIcon, 
  CloudIcon, 
  GlobeAltIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  provider: CloudProvider
}>()

const emit = defineEmits<{
  'select-template': [template: VMTemplate]
  'custom-vm': []
}>()

const cloudProviderService = new CloudProviderService()
const templates = computed(() => cloudProviderService.getTemplates(props.provider.id))
const instanceTypes = computed(() => {
  const types = cloudProviderService.getInstanceTypes(props.provider.id)
  return Object.fromEntries(types.map(type => [type.id, type]))
})
const regions = computed(() => {
  const regionList = cloudProviderService.getRegions(props.provider.id)
  return Object.fromEntries(regionList.map(region => [region.id, region]))
})

const getInstanceTypeInfo = (instanceTypeId: string) => {
  return instanceTypes.value[instanceTypeId] || { name: instanceTypeId, price: 'Price unknown' }
}

const getRegionName = (regionId: string) => {
  return regions.value[regionId]?.name || regionId
}

const handleSelectTemplate = (template: VMTemplate) => {
  emit('select-template', template)
}

const handleCustomVM = () => {
  emit('custom-vm')
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h3 class="text-lg font-medium">Choose a Template or Create Custom VM</h3>
      <p class="text-sm text-muted-foreground">
        Select a pre-configured template or create a custom VM for your Jupyter server
      </p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Template Cards -->
      <Card
        v-for="template in templates"
        :key="template.id"
        class="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer border-2 hover:border-primary/50 flex flex-col"
        @click="handleSelectTemplate(template)"
      >
        <CardHeader class="pb-2 space-y-3">
          <div class="flex items-start justify-between">
            <CardTitle class="flex items-center gap-2">
              <BeakerIcon class="w-5 h-5 text-primary" />
              {{ template.name }}
            </CardTitle>
            <Badge variant="outline" class="text-xs">
              {{ getInstanceTypeInfo(template.configuration.instanceType).price }}
            </Badge>
          </div>
          <CardDescription>{{ template.description }}</CardDescription>
        </CardHeader>
        <CardContent class="pb-2 flex-grow">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <CpuChipIcon class="w-4 h-4 text-muted-foreground" />
              <span>{{ getInstanceTypeInfo(template.configuration.instanceType).name }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <GlobeAltIcon class="w-4 h-4 text-muted-foreground" />
              <span>{{ getRegionName(template.configuration.region) }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <DocumentTextIcon class="w-4 h-4 text-muted-foreground" />
              <span>{{ template.configuration.diskSize }} GB</span>
            </div>
          </div>
        </CardContent>
        <CardFooter class="pt-2 flex flex-wrap gap-1 border-t">
          <Badge
            v-for="pkg in template.packages.slice(0, 3)"
            :key="pkg"
            variant="secondary"
            class="text-xs"
          >
            {{ pkg }}
          </Badge>
          <Badge v-if="template.packages.length > 3" variant="outline" class="text-xs">
            +{{ template.packages.length - 3 }} more
          </Badge>
        </CardFooter>
        <div class="absolute top-0 right-0 p-2">
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </Card>
      
      <!-- Custom VM Card -->
      <Card
        class="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-dashed hover:border-primary/50 flex flex-col items-center justify-center"
        @click="handleCustomVM"
      >
        <CardContent class="p-6 flex flex-col items-center justify-center space-y-4 text-center">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <PlusIcon class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="font-medium text-lg">Custom VM</h3>
            <p class="text-sm text-muted-foreground">
              Configure your own VM with custom settings
            </p>
          </div>
          <Button variant="outline" class="mt-4">Configure Custom VM</Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template> 