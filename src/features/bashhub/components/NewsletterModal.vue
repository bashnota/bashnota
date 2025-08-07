<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNewsletter } from '../composables/useNewsletter'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, Zap, Shield, Coffee } from 'lucide-vue-next'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { subscribeToNewsletter, isSubscribing } = useNewsletter()

const handleSignupClick = async () => {
  const success = await subscribeToNewsletter()
  if (success) {
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader class="text-center space-y-4">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
          <Mail class="h-8 w-8" />
        </div>
        
        <div class="space-y-2">
          <DialogTitle class="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Escape Technofeudalism
          </DialogTitle>
          <Badge variant="outline" class="mx-auto text-xs">
            Weekly Rebellion Digest
          </Badge>
        </div>
        
        <DialogDescription class="text-left space-y-4 text-muted-foreground leading-relaxed">
          <p class="text-foreground font-medium">
            Tired of being a free-tier serf, selling your soul and data to the platform overlords?
          </p>
          
          <p>
            Join the resistance. Our newsletter delivers your weekly dose of digital independence, packed with:
          </p>
          
          <div class="grid grid-cols-1 gap-3 my-4">
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Zap class="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <span class="text-sm">Open-source tools and BashNota updates</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield class="h-5 w-5 text-green-500 flex-shrink-0" />
              <span class="text-sm">Privacy-first development tips</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Coffee class="h-5 w-5 text-orange-500 flex-shrink-0" />
              <span class="text-sm">Developer humor & occasional GIFs</span>
            </div>
          </div>
          
          <p class="text-xs text-muted-foreground text-center">
            No spam, no data harvesting, just pure knowledge for independent minds.
          </p>
        </DialogDescription>
      </DialogHeader>
      
      <DialogFooter class="mt-6 space-y-3">
        <Button 
          @click="handleSignupClick" 
          class="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
          :disabled="isSubscribing"
        >
          <Skeleton v-if="isSubscribing" class="mr-2 h-4 w-4 rounded-full" />
          <Mail v-else class="mr-2 h-4 w-4" />
          <span class="font-semibold">{{ isSubscribing ? 'Joining the Resistance...' : 'Join the Resistance' }}</span>
        </Button>
        
        <p class="text-xs text-center text-muted-foreground">
          Unsubscribe anytime. Your data stays yours.
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 