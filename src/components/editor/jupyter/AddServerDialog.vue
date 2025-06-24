<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add Jupyter Server</DialogTitle>
        <DialogDescription>
          Connect to a Jupyter server to use kernels for code execution.
        </DialogDescription>
      </DialogHeader>
      
      <Tabs :default-value="activeTab" @update:value="activeTab = $event" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Setup</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>
        
        <!-- Manual Setup Tab -->
        <TabsContent value="manual">
          <form @submit.prevent="handleSubmit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-2">
              <Label for="name" class="text-right">Name</Label>
              <div class="col-span-3 space-y-1">
                <Input 
                  id="name" 
                  :value="form.name"
                  @input="updateField('name', $event)"
                  placeholder="My Server"
                  :class="{ 'border-destructive': errors.name }"
                />
                <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <Label for="ip" class="text-right">IP Address</Label>
              <div class="col-span-3 space-y-1">
                <Input 
                  id="ip" 
                  :value="form.ip"
                  @input="updateField('ip', $event)"
                  placeholder="localhost or 127.0.0.1"
                  :class="{ 'border-destructive': errors.ip }"
                  required
                />
                <p v-if="errors.ip" class="text-xs text-destructive">{{ errors.ip }}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <Label for="port" class="text-right">Port</Label>
              <div class="col-span-3 space-y-1">
                <Input 
                  id="port" 
                  :value="form.port"
                  @input="updateField('port', $event)"
                  placeholder="8888"
                  :class="{ 'border-destructive': errors.port }"
                  required
                />
                <p v-if="errors.port" class="text-xs text-destructive">{{ errors.port }}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <Label for="token" class="text-right">Token</Label>
              <div class="col-span-3 space-y-1">
                <div class="relative">
                  <Input 
                    id="token" 
                    :value="form.token"
                    @input="updateField('token', $event)"
                    :type="showToken ? 'text' : 'password'"
                    placeholder="Leave blank if no token required"
                  />
                  <button 
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    @click="showToken = !showToken"
                  >
                    <EyeIcon v-if="!showToken" class="h-4 w-4" />
                    <EyeOffIcon v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>
        
        <!-- URL Tab -->
        <TabsContent value="url">
          <form @submit.prevent="handleUrlSubmit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-2">
              <Label for="name-url" class="text-right">Name</Label>
              <div class="col-span-3 space-y-1">
                <Input 
                  id="name-url" 
                  :value="form.name"
                  @input="updateField('name', $event)"
                  placeholder="My Server"
                  :class="{ 'border-destructive': errors.name }"
                />
                <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <Label for="jupyter-url" class="text-right">URL</Label>
              <div class="col-span-3 space-y-2">
                <div class="space-y-1">
                  <Input 
                    id="jupyter-url" 
                    :value="form.url"
                    @input="updateField('url', $event)"
                    placeholder="http://localhost:8888/?token=abc123"
                    :class="{ 'border-destructive': errors.url }"
                    class="w-full"
                  />
                  <p v-if="errors.url" class="text-xs text-destructive">{{ errors.url }}</p>
                </div>
                
                <p class="text-xs text-muted-foreground">
                  Paste the full URL from your Jupyter notebook, including the token.
                </p>
                
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  @click="parseUrl" 
                  :disabled="!form.url || isParsing"
                  class="w-full"
                >
                  <Loader2 v-if="isParsing" class="mr-2 h-4 w-4 animate-spin" />
                  Parse URL
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          @click="cancel"
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          @click="submit" 
          :disabled="testingConnection"
          class="gap-2"
        >
          <Loader2 v-if="testingConnection" class="h-4 w-4 animate-spin" />
          <span>Add Server</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-vue-next'

interface ServerForm {
  ip: string
  port: string
  token: string
  url: string
  name: string
}

interface FormErrors {
  name?: string
  ip?: string
  port?: string
  url?: string
  token?: string
}

// Props
const props = defineProps<{
  open: boolean
  form: ServerForm
  testingConnection: boolean
  isParsing: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:form': [value: ServerForm]
  'add-server': []
  'parse-url': []
}>()

// Local state
const activeTab = ref('manual')
const showToken = ref(false)
const errors = ref<FormErrors>({})

// Update field values directly to parent
const updateField = (field: keyof ServerForm, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Create a new form object with the updated field
  const updatedForm = {
    ...props.form,
    [field]: value
  }
  
  // Emit the updated form to the parent
  emit('update:form', updatedForm)
  
  // Clear any error for this field
  if (errors.value[field]) {
    errors.value = {
      ...errors.value,
      [field]: ''
    }
  }
  
  console.log(`Updated ${field} to:`, value)
}

// Validation
const validateForm = (): boolean => {
  // Reset errors
  errors.value = {}
  
  let isValid = true
  
  if (activeTab.value === 'manual') {
    if (!props.form.ip) {
      errors.value.ip = 'IP address is required'
      isValid = false
    }
    
    if (!props.form.port) {
      errors.value.port = 'Port is required'
      isValid = false
    } else if (!/^\d+$/.test(props.form.port)) {
      errors.value.port = 'Port must be a number'
      isValid = false
    }
  } else {
    if (!props.form.url) {
      errors.value.url = 'URL is required'
      isValid = false
    } else if (!props.form.url.startsWith('http')) {
      errors.value.url = 'URL must start with http:// or https://'
      isValid = false
    }
  }
  
  return isValid
}

// Methods
const handleSubmit = () => {
  if (validateForm()) {
    submit()
  }
}

const handleUrlSubmit = () => {
  if (validateForm()) {
    parseUrl()
  }
}

const parseUrl = () => {
  if (!props.form.url) return
  emit('parse-url')
}

const submit = () => {
  // Force validation before submission
  const isValid = validateForm()
  
  // Log validation status and form data for debugging
  console.log('Form validation:', isValid, props.form)
  
  // Always emit add-server, let parent component handle validation if needed
  emit('add-server')
}

const cancel = () => {
  emit('update:open', false)
  // Reset form errors
  errors.value = {}
}
</script>