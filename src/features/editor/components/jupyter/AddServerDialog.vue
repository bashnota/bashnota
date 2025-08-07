<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-vue-next'

interface ServerForm {
  ip: string
  port: string
  token: string
  url: string
  name: string
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

// Form schema for manual setup
const manualFormSchema = toTypedSchema(z.object({
  name: z.string().min(1, "Server name is required").max(100, "Name must be less than 100 characters"),
  ip: z.string().min(1, "IP address is required"),
  port: z.string()
    .min(1, "Port is required")
    .regex(/^\d+$/, "Port must be a number")
    .refine((val) => {
      const port = parseInt(val)
      return port > 0 && port <= 65535
    }, "Port must be between 1 and 65535"),
  token: z.string().optional()
}))

// Form schema for URL setup
const urlFormSchema = toTypedSchema(z.object({
  name: z.string().min(1, "Server name is required").max(100, "Name must be less than 100 characters"),
  url: z.string()
    .min(1, "URL is required")
    .url("Please enter a valid URL")
    .refine((val) => val.startsWith('http'), "URL must start with http:// or https://")
}))

// Form setup for manual tab
const manualForm = useForm({
  validationSchema: manualFormSchema,
  initialValues: {
    name: '',
    ip: '',
    port: '',
    token: ''
  }
})

// Form setup for URL tab
const urlForm = useForm({
  validationSchema: urlFormSchema,
  initialValues: {
    name: '',
    url: ''
  }
})

// Watch for props changes to update form values
watch(() => props.form, (newForm) => {
  if (activeTab.value === 'manual') {
    manualForm.setValues({
      name: newForm.name || '',
      ip: newForm.ip || '',
      port: newForm.port || '',
      token: newForm.token || ''
    })
  } else {
    urlForm.setValues({
      name: newForm.name || '',
      url: newForm.url || ''
    })
  }
}, { immediate: true })

// Methods
const onManualSubmit = manualForm.handleSubmit((values) => {
  const updatedForm: ServerForm = {
    ...props.form,
    name: values.name || '',
    ip: values.ip,
    port: values.port,
    token: values.token || ''
  }
  emit('update:form', updatedForm)
  emit('add-server')
})

const onUrlSubmit = urlForm.handleSubmit((values) => {
  const updatedForm: ServerForm = {
    ...props.form,
    name: values.name || '',
    url: values.url
  }
  emit('update:form', updatedForm)
  emit('parse-url')
})

const parseUrl = () => {
  if (!urlForm.values.url) return
  const updatedForm: ServerForm = {
    ...props.form,
    name: urlForm.values.name || '',
    url: urlForm.values.url
  }
  emit('update:form', updatedForm)
  emit('parse-url')
}

const cancel = () => {
  emit('update:open', false)
  // Reset forms
  manualForm.resetForm()
  urlForm.resetForm()
}
</script>

<template>
  <Dialog :open="props.open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add Jupyter Server</DialogTitle>
        <DialogDescription>
          Connect to a Jupyter server to use kernels for code execution.
        </DialogDescription>
      </DialogHeader>
      
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Setup</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>
        
        <!-- Manual Setup Tab -->
        <TabsContent value="manual">
          <form @submit="onManualSubmit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-2">
              <FormField v-slot="{ componentField }" name="name" :form-context="manualForm">
                <FormItem class="col-span-4 grid grid-cols-4 items-center gap-2">
                  <FormLabel class="text-right">Name</FormLabel>
                  <div class="col-span-3 space-y-1">
                    <FormControl>
                      <Input 
                        placeholder="My Server"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              </FormField>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <FormField v-slot="{ componentField }" name="ip" :form-context="manualForm">
                <FormItem class="col-span-4 grid grid-cols-4 items-center gap-2">
                  <FormLabel class="text-right">IP Address</FormLabel>
                  <div class="col-span-3 space-y-1">
                    <FormControl>
                      <Input 
                        placeholder="localhost or 127.0.0.1"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              </FormField>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <FormField v-slot="{ componentField }" name="port" :form-context="manualForm">
                <FormItem class="col-span-4 grid grid-cols-4 items-center gap-2">
                  <FormLabel class="text-right">Port</FormLabel>
                  <div class="col-span-3 space-y-1">
                    <FormControl>
                      <Input 
                        placeholder="8888"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              </FormField>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <FormField v-slot="{ componentField }" name="token" :form-context="manualForm">
                <FormItem class="col-span-4 grid grid-cols-4 items-center gap-2">
                  <FormLabel class="text-right">Token</FormLabel>
                  <div class="col-span-3 space-y-1">
                    <FormControl>
                      <div class="relative">
                        <Input 
                          :type="showToken ? 'text' : 'password'"
                          placeholder="Leave blank if no token required"
                          v-bind="componentField"
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
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              </FormField>
            </div>
          </form>
        </TabsContent>
        
        <!-- URL Tab -->
        <TabsContent value="url">
          <form @submit="onUrlSubmit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-2">
              <FormField v-slot="{ componentField }" name="name" :form-context="urlForm">
                <FormItem class="col-span-4 grid grid-cols-4 items-center gap-2">
                  <FormLabel class="text-right">Name</FormLabel>
                  <div class="col-span-3 space-y-1">
                    <FormControl>
                      <Input 
                        placeholder="My Server"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              </FormField>
            </div>
            
            <div class="grid grid-cols-4 items-center gap-2">
              <FormField v-slot="{ componentField }" name="url" :form-context="urlForm">
                <FormItem class="col-span-4 grid grid-cols-4 items-center gap-2">
                  <FormLabel class="text-right">URL</FormLabel>
                  <div class="col-span-3 space-y-2">
                    <div class="space-y-1">
                      <FormControl>
                        <Input 
                          placeholder="http://localhost:8888/?token=abc123"
                          class="w-full"
                          v-bind="componentField"
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                    
                    <FormDescription>
                      Paste the full URL from your Jupyter notebook, including the token.
                    </FormDescription>
                    
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      @click="parseUrl" 
                      :disabled="!urlForm.values.url || isParsing"
                      class="w-full"
                    >
                      <Loader2 v-if="isParsing" class="mr-2 h-4 w-4 animate-spin" />
                      Parse URL
                    </Button>
                  </div>
                </FormItem>
              </FormField>
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
          @click="activeTab === 'manual' ? onManualSubmit() : onUrlSubmit()" 
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