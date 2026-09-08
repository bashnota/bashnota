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
    <DialogContent
      class="grid h-[calc(100dvh-1rem)] max-h-[42rem] w-[calc(100vw-1rem)] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
      close-class="right-1 top-1 flex h-12 w-12 items-center justify-center sm:right-2 sm:top-2"
      data-testid="newsletter-dialog"
    >
      <DialogHeader
        class="min-w-0 space-y-3 border-b px-4 pb-3 pt-4 pr-14 text-center sm:px-6 sm:pb-4 sm:pt-6 sm:pr-14"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg sm:h-16 sm:w-16"
        >
          <Mail aria-hidden="true" class="h-6 w-6 sm:h-8 sm:w-8" />
        </div>

        <div class="space-y-2">
          <DialogTitle
            class="break-words bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-xl font-bold text-transparent sm:text-2xl"
          >
            Escape Technofeudalism
          </DialogTitle>
          <Badge variant="outline" class="mx-auto max-w-full whitespace-normal text-center text-xs">
            Weekly Rebellion Digest
          </Badge>
        </div>
      </DialogHeader>

      <DialogDescription
        as="div"
        class="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 text-left leading-relaxed text-muted-foreground [overflow-wrap:anywhere] sm:px-6 sm:py-4"
        data-testid="newsletter-content"
      >
        <div class="space-y-4">
          <p class="text-foreground font-medium">
            Tired of being a free-tier serf, selling your soul and data to the platform overlords?
          </p>

          <p>
            Join the resistance. Our newsletter delivers your weekly dose of digital independence,
            packed with:
          </p>

          <div class="my-4 grid grid-cols-1 gap-3">
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Zap class="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <span class="min-w-0 text-sm">Open-source tools and BashNota updates</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield class="h-5 w-5 text-green-500 flex-shrink-0" />
              <span class="min-w-0 text-sm">Privacy-first development tips</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Coffee class="h-5 w-5 text-orange-500 flex-shrink-0" />
              <span class="min-w-0 text-sm">Developer humor & occasional GIFs</span>
            </div>
          </div>

          <p class="text-center text-xs text-muted-foreground">
            No spam, no data harvesting, just pure knowledge for independent minds.
          </p>
        </div>
      </DialogDescription>

      <DialogFooter
        class="min-w-0 shrink-0 space-y-2 border-t bg-background px-4 py-3 sm:px-6 sm:py-4"
      >
        <Button
          @click="handleSignupClick"
          class="min-h-12 min-w-0 w-full whitespace-normal bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-orange-600 hover:to-red-600 hover:shadow-xl"
          :disabled="isSubscribing"
        >
          <Skeleton v-if="isSubscribing" class="mr-2 h-4 w-4 rounded-full" />
          <Mail v-else class="mr-2 h-4 w-4" />
          <span class="font-semibold">{{
            isSubscribing ? 'Joining the Resistance...' : 'Join the Resistance'
          }}</span>
        </Button>

        <p class="text-xs text-center text-muted-foreground">
          Unsubscribe anytime. Your data stays yours.
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
