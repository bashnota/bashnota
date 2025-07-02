<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { RotateCw, Info, Monitor } from 'lucide-vue-next'
import { toast } from '@/ui/toast'

// Browser and system information
const browserInfo = computed(() => {
  if (typeof navigator !== 'undefined') {
    return {
      browser: navigator.userAgent.includes('Chrome') 
        ? 'Chrome' 
        : navigator.userAgent.includes('Firefox') 
          ? 'Firefox' 
          : 'Other',
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    }
  }
  return { 
    browser: 'Unknown', 
    platform: 'Unknown',
    language: 'Unknown',
    cookieEnabled: false,
    onLine: false
  }
})

// Storage information
const storageInfo = computed(() => {
  try {
    // Get localStorage usage estimate
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    // Convert to MB
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2)
    return {
      used: `${sizeInMB} MB`,
      available: 'Unknown',
      itemCount: Object.keys(localStorage).length
    }
  } catch (error) {
    return {
      used: 'Unknown',
      available: 'Unknown',
      itemCount: 0
    }
  }
})

// Application information
const appInfo = {
  version: '1.0.0',
  buildDate: new Date().toLocaleDateString(),
  environment: import.meta.env.MODE || 'production'
}

// Performance information
const performanceInfo = computed(() => {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory
    return {
      memoryUsed: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      memoryTotal: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      memoryLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
    }
  }
  return {
    memoryUsed: 'Unknown',
    memoryTotal: 'Unknown',
    memoryLimit: 'Unknown'
  }
})

const resetToDefaults = () => {
  toast({
    title: 'No Settings to Reset',
    description: 'System information is read-only',
    variant: 'default'
  })
}

// Copy system info to clipboard
const copySystemInfo = () => {
  const info = {
    application: appInfo,
    browser: browserInfo.value,
    storage: storageInfo.value,
    performance: performanceInfo.value,
    timestamp: new Date().toISOString()
  }
  
  navigator.clipboard.writeText(JSON.stringify(info, null, 2)).then(() => {
    toast({
      title: 'Copied to Clipboard',
      description: 'System information has been copied to clipboard',
      variant: 'default'
    })
  }).catch(() => {
    toast({
      title: 'Copy Failed',
      description: 'Failed to copy system information',
      variant: 'destructive'
    })
  })
}

defineExpose({ resetToDefaults })
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Application Information -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Info class="h-5 w-5" />
          Application Information
        </CardTitle>
        <CardDescription>Details about the BashNota application</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Version</p>
            <p class="font-medium">{{ appInfo.version }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Environment</p>
            <p class="font-medium capitalize">{{ appInfo.environment }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Build Date</p>
            <p class="font-medium">{{ appInfo.buildDate }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Browser Information -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Monitor class="h-5 w-5" />
          Browser & System
        </CardTitle>
        <CardDescription>Information about your browser and system</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Browser</p>
            <p class="font-medium">{{ browserInfo.browser }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Platform</p>
            <p class="font-medium">{{ browserInfo.platform }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Language</p>
            <p class="font-medium">{{ browserInfo.language }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Online Status</p>
            <p class="font-medium">{{ browserInfo.onLine ? 'Online' : 'Offline' }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Storage Information -->
    <Card>
      <CardHeader>
        <CardTitle>Storage Information</CardTitle>
        <CardDescription>Local storage usage and capacity</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Storage Used</p>
            <p class="font-medium">{{ storageInfo.used }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Items Stored</p>
            <p class="font-medium">{{ storageInfo.itemCount }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Performance Information -->
    <Card>
      <CardHeader>
        <CardTitle>Performance Information</CardTitle>
        <CardDescription>Memory usage and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Memory Used</p>
            <p class="font-medium">{{ performanceInfo.memoryUsed }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Memory Total</p>
            <p class="font-medium">{{ performanceInfo.memoryTotal }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Memory Limit</p>
            <p class="font-medium">{{ performanceInfo.memoryLimit }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Actions -->
    <Card>
      <CardHeader>
        <CardTitle>System Information</CardTitle>
        <CardDescription>Export or copy system information for troubleshooting</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <Button @click="copySystemInfo" class="w-full flex items-center justify-center gap-2">
          <Info class="h-4 w-4" />
          Copy System Information
        </Button>
        
        <p class="text-xs text-muted-foreground">
          This information can be useful when reporting issues or getting support.
        </p>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>System information is read-only</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="resetToDefaults" class="flex items-center gap-2" disabled>
          <RotateCw class="h-4 w-4" />
          No Settings to Reset
        </Button>
      </CardContent>
    </Card>
  </div>
</template> 