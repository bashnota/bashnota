<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-background">
    <div class="text-center space-y-6 max-w-md mx-auto px-6">
      <!-- 404 Number -->
      <div class="space-y-2">
        <h1 class="text-8xl md:text-9xl font-bold text-muted-foreground/20 select-none">
          404
        </h1>
        <div class="relative -mt-8">
          <h2 class="text-2xl md:text-3xl font-semibold text-foreground">
            Page Not Found
          </h2>
        </div>
      </div>
      
      <!-- Description -->
      <div class="space-y-2">
        <p class="text-muted-foreground text-lg">
          Oops! The page you're looking for doesn't exist.
        </p>
        <p class="text-sm text-muted-foreground/80">
          It might have been moved, deleted, or you entered the wrong URL.
        </p>
      </div>
      
      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 pt-4">
        <Button asChild class="flex-1">
          <RouterLink to="/" class="flex items-center gap-2">
            <Home class="h-4 w-4" />
            Go Home
          </RouterLink>
        </Button>
        <Button variant="outline" asChild class="flex-1">
          <RouterLink to="/docs" class="flex items-center gap-2">
            <BookOpen class="h-4 w-4" />
            Documentation
          </RouterLink>
        </Button>
      </div>
      
      <!-- Additional Help -->
      <div class="pt-6 border-t border-border">
        <p class="text-xs text-muted-foreground">
          Need help? Check out our 
          <RouterLink to="/help" class="text-primary hover:underline">
            help center
          </RouterLink>
          or
          <RouterLink to="/contact" class="text-primary hover:underline">
            contact support
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Home, BookOpen } from 'lucide-vue-next'
</script> 