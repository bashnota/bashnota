<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CloudProviderService } from '@/services/cloudProviderService'
import type { CloudProvider, VMConfiguration } from '@/types/jupyter'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CloudIcon, ServerIcon, CpuChipIcon, HardDriveIcon, KeyIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  show: boolean
  provider: CloudProvider
}>()

const emit = defineEmits<{
  'close': []
  'create': [config: VMConfiguration]
}>()

const cloudProviderService = new CloudProviderService()

// Form state
const vmName = ref(`jupyter-${props.provider.id}-${Math.floor(Math.random() * 1000)}`)
const selectedRegion = ref('')
const selectedInstanceType = ref('')
const diskSize = ref(30)
const authType = ref('password') // 'password' or 'ssh'
const username = ref('jupyter')
const password = ref('')
const sshKey = ref('')

// Load provider-specific options
const regions = computed(() => cloudProviderService.getRegions(props.provider.id))
const instanceTypes = computed(() => cloudProviderService.getInstanceTypes(props.provider.id))

// Set defaults when provider changes
watch(() => props.provider, () => {
  if (regions.value.length > 0) {
    selectedRegion.value = regions.value[0].id
  }
  if (instanceTypes.value.length > 0) {
    selectedInstanceType.value = instanceTypes.value[0].id
  }
  vmName.value = `jupyter-${props.provider.id}-${Math.floor(Math.random() * 1000)}`
}, { immediate: true })

// Validation
const isFormValid = computed(() => {
  if (!vmName.value || !selectedRegion.value || !selectedInstanceType.value) {
    return false
  }
  
  if (authType.value === 'password' && !password.value) {
    return false
  }
  
  if (authType.value === 'ssh' && !sshKey.value) {
    return false
  }
  
  return true
})

// Handle form submission
const handleSubmit = () => {
  if (!isFormValid.value) return
  
  const config: VMConfiguration = {
    name: vmName.value,
    provider: props.provider.id,
    region: selectedRegion.value,
    instanceType: selectedInstanceType.value,
    diskSize: diskSize.value,
    username: username.value,
  }
  
  if (authType.value === 'password') {
    config.password = password.value
  } else {
    config.sshKey = sshKey.value
  }
  
  emit('create', config)
}

// Close modal
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Dialog :open="show" @update:open="handleClose">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <CloudIcon class="w-6 h-6 text-primary" />
          Create Jupyter Server on {{ provider.name }}
        </DialogTitle>
        <DialogDescription>
          Configure your cloud VM settings. A Jupyter server will be automatically installed and configured.
        </DialogDescription>
      </DialogHeader>
      
      <form @submit.prevent="handleSubmit" class="space-y-6 py-4">
        <!-- VM Name -->
        <div class="space-y-2">
          <Label for="vm-name">VM Name</Label>
          <Input
            id="vm-name"
            v-model="vmName"
            placeholder="Enter a name for your VM"
            required
          />
        </div>
        
        <!-- Region Selection -->
        <div class="space-y-2">
          <Label for="region">Region</Label>
          <Select v-model="selectedRegion">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="region in regions" :key="region.id" :value="region.id">
                {{ region.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            Choose a region close to your location for better performance
          </p>
        </div>
        
        <!-- Instance Type Selection -->
        <div class="space-y-2">
          <Label for="instance-type">Instance Type</Label>
          <Select v-model="selectedInstanceType">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select an instance type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="instance in instanceTypes" :key="instance.id" :value="instance.id">
                <div class="flex justify-between w-full">
                  <span>{{ instance.name }}</span>
                  <span class="text-muted-foreground">{{ instance.price }}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <!-- Disk Size -->
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <Label for="disk-size">Disk Size (GB)</Label>
            <span class="text-sm font-medium">{{ diskSize }} GB</span>
          </div>
          <Slider
            v-model="diskSize"
            :min="10"
            :max="100"
            :step="10"
            class="w-full"
          />
        </div>
        
        <!-- Authentication -->
        <div class="space-y-4">
          <Label>Authentication</Label>
          <Tabs v-model="authType" class="w-full">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="ssh">SSH Key</TabsTrigger>
            </TabsList>
            
            <TabsContent value="password" class="space-y-4 pt-4">
              <div class="space-y-2">
                <Label for="username">Username</Label>
                <Input
                  id="username"
                  v-model="username"
                  placeholder="Username"
                  required
                />
              </div>
              <div class="space-y-2">
                <Label for="password">Password</Label>
                <Input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="Enter a secure password"
                  required
                />
              </div>
            </TabsContent>
            
            <TabsContent value="ssh" class="space-y-4 pt-4">
              <div class="space-y-2">
                <Label for="username">Username</Label>
                <Input
                  id="username"
                  v-model="username"
                  placeholder="Username"
                  required
                />
              </div>
              <div class="space-y-2">
                <Label for="ssh-key">SSH Public Key</Label>
                <textarea
                  id="ssh-key"
                  v-model="sshKey"
                  class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Paste your SSH public key here"
                  required
                ></textarea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" @click="handleClose">Cancel</Button>
          <Button type="submit" :disabled="!isFormValid">Create VM</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template> 