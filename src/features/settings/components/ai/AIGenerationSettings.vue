<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Alert, AlertDescription } from '@/ui/alert'
import { Settings, Info } from 'lucide-vue-next'
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-2">
        <Settings class="h-5 w-5 text-purple-500" />
        <div>
          <CardTitle>AI Generation Settings</CardTitle>
          <CardDescription>
            Configure AI text and content generation parameters
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Alert>
        <Info class="h-4 w-4" />
        <AlertDescription>
          <div class="space-y-2">
            <p><strong>This section is under development.</strong></p>
            <p>
              AI generation settings are currently managed through the 
              <strong>AI Features & Analysis</strong> section, which includes 
              generation parameters like max tokens and creativity levels.
            </p>
            <p class="text-sm text-muted-foreground mt-3">
              Future versions will include dedicated settings for text generation, 
              content templates, and specialized generation modes.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
</template> 