<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Button } from '@/ui/button'
import { RotateCw, ExternalLink } from 'lucide-vue-next'
import { toast } from '@/ui/toast'

// Reset to defaults (placeholder)
const resetToDefaults = () => {
  toast({
    title: 'No Settings to Reset',
    description: 'External tools settings will be available in a future update',
    variant: 'default'
  })
}

// Expose methods for parent components
defineExpose({
  resetToDefaults
})
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Placeholder -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <ExternalLink class="h-5 w-5" />
          External Tools Integration
        </CardTitle>
        <CardDescription>Connect with external development tools and services</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="text-center py-12">
          <ExternalLink class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="text-lg font-medium mb-2">Coming Soon</h3>
          <p class="text-muted-foreground mb-4 max-w-md mx-auto">
            External tools integration will allow you to connect with various development tools and services.
          </p>
          <div class="space-y-2 text-sm text-muted-foreground">
            <p>• Git integration</p>
            <p>• Docker integration</p>
            <p>• API testing tools</p>
            <p>• Cloud service connections</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Reset external tools settings</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="resetToDefaults" class="flex items-center gap-2">
          <RotateCw class="h-4 w-4" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  </div>
</template> 