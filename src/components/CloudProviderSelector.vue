<script setup lang="ts">
import { ref, computed } from 'vue'
import { CloudProviderService } from '@/services/cloudProviderService'
import type { CloudProvider } from '@/types/jupyter'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  'select': [provider: CloudProvider]
}>()

const cloudProviderService = new CloudProviderService()
const providers = ref<CloudProvider[]>(cloudProviderService.getProviders())

const handleSelect = (provider: CloudProvider) => {
  emit('select', provider)
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card
      v-for="provider in providers"
      :key="provider.id"
      class="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
      @click="handleSelect(provider)"
    >
      <CardContent class="p-6 flex flex-col items-center justify-center space-y-4">
        <div class="w-16 h-16 flex items-center justify-center">
          <img :src="provider.logo" :alt="provider.name" class="max-w-full max-h-full" />
        </div>
        <div class="text-center">
          <h3 class="font-medium text-lg">{{ provider.name }}</h3>
          <p class="text-sm text-muted-foreground">{{ provider.description }}</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template> 