<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, ExternalLink } from 'lucide-vue-next'

const router = useRouter()

const openAICodeSettings = () => {
  // Navigate to settings with the AI Code Actions section
  router.push('/settings?section=ai-code-actions')
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-2">
        <Settings class="h-5 w-5 text-blue-500" />
        <div>
          <CardTitle>AI Code Settings</CardTitle>
          <CardDescription>
            Configure AI-powered code analysis and assistance features
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col items-center justify-center py-8 space-y-4">
        <div class="text-center text-muted-foreground">
          <p class="text-sm">Configure AI providers, features, and custom actions</p>
          <p class="text-xs">in the main settings panel</p>
        </div>
        
        <Button 
          @click="openAICodeSettings" 
          class="gap-2"
          size="lg"
        >
          <Settings class="h-4 w-4" />
          Open AI Code Settings
          <ExternalLink class="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style> 