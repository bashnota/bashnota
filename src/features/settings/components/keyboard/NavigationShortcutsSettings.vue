<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Button } from '@/ui/button'
import { RotateCw, Navigation } from 'lucide-vue-next'
import { toast } from '@/ui/toast'

const resetToDefaults = () => {
  toast({
    title: 'No Settings to Reset',
    description: 'Navigation shortcuts will be available in a future update',
    variant: 'default'
  })
}

defineExpose({ resetToDefaults })
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Navigation class="h-5 w-5" />
          Navigation Shortcuts
        </CardTitle>
        <CardDescription>Keyboard shortcuts for navigating the application</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="text-center py-12">
          <Navigation class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="text-lg font-medium mb-2">Coming Soon</h3>
          <p class="text-muted-foreground">Navigation shortcuts configuration will be available soon.</p>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
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