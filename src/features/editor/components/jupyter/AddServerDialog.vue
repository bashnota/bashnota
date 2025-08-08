<script setup lang="ts">
import { ref, watch } from 'vue'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Loader2, Eye as EyeIcon, EyeOff as EyeOffIcon, Link } from 'lucide-vue-next'

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
const showToken = ref(false)

// Unified form schema
const formSchema = toTypedSchema(z.object({
  name: z.string().min(1, "Server name is required").max(100, "Name must be less than 100 characters"),
  url: z.string().optional(),
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

// Form setup
const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: '',
    url: '',
    ip: '',
    port: '',
    token: ''
  }
})

// Watch for props changes to update form values
watch(() => props.form, (newForm) => {
  form.setValues({
    name: newForm.name || '',
    url: newForm.url || '',
    ip: newForm.ip || '',
    port: newForm.port || '',
    token: newForm.token || ''
  })
}, { immediate: true })

// Methods
const onSubmit = form.handleSubmit((values) => {
  const updatedForm: ServerForm = {
    name: values.name,
    url: values.url || '',
    ip: values.ip,
    port: values.port,
    token: values.token || ''
  }
  emit('update:form', updatedForm)
  emit('add-server')
})

const parseUrl = () => {
  if (!form.values.url?.trim()) return
  const updatedForm: ServerForm = {
    ...props.form,
    name: form.values.name || '',
    url: form.values.url || ''
  }
  emit('update:form', updatedForm)
  emit('parse-url')
}

const cancel = () => {
  emit('update:open', false)
  form.resetForm()
}
</script>

<template>
  <Dialog :open="props.open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Add Jupyter Server</DialogTitle>
        <DialogDescription>
          Connect to a Jupyter server to use kernels for code execution. Supports both standard Jupyter and Kaggle servers.
        </DialogDescription>
      </DialogHeader>
      
      <form @submit="onSubmit" class="space-y-6">
        <!-- Server Name -->
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>Server Name</FormLabel>
            <FormControl>
              <Input 
                placeholder="My Jupyter Server"
                v-bind="componentField"
              />
            </FormControl>
            <FormDescription>
              A friendly name to identify this server
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Quick Setup Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <Separator class="flex-1" />
            <span class="text-sm text-muted-foreground font-medium">Quick Setup</span>
            <Separator class="flex-1" />
          </div>
          
          <FormField v-slot="{ componentField }" name="url">
            <FormItem>
              <FormLabel>Jupyter URL (Optional)</FormLabel>
              <FormControl>
                <div class="flex gap-2">
                  <Input 
                    placeholder="http://localhost:8888/?token=abc123 or https://kaggle.com/..."
                    class="flex-1"
                    v-bind="componentField"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    @click="parseUrl" 
                    :disabled="!form.values.url?.trim() || isParsing"
                    class="shrink-0"
                  >
                    <Loader2 v-if="isParsing" class="mr-2 h-4 w-4 animate-spin" />
                    <Link v-else class="mr-2 h-4 w-4" />
                    Parse
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Paste the full URL from your Jupyter notebook or Kaggle kernel to auto-fill the fields below
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <!-- Manual Configuration Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <Separator class="flex-1" />
            <span class="text-sm text-muted-foreground font-medium">Manual Configuration</span>
            <Separator class="flex-1" />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <FormField v-slot="{ componentField }" name="ip">
              <FormItem>
                <FormLabel>IP Address / Host</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="localhost"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            
            <FormField v-slot="{ componentField }" name="port">
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="8888"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
          
          <FormField v-slot="{ componentField }" name="token">
            <FormItem>
              <FormLabel>Token (Optional)</FormLabel>
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
              <FormDescription>
                Authentication token if required by your Jupyter server
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>
      </form>

      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          @click="cancel"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          @click="onSubmit"
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