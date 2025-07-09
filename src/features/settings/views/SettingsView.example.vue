<script setup lang="ts">
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { AICodeActionsSettings } from '@/features/settings/components/ai'
import { Settings, Brain, Palette, User, Shield, Globe } from 'lucide-vue-next'

const activeTab = ref('general')
</script>

<template>
  <div class="container mx-auto py-6 px-4">
    <!-- Settings Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <div class="p-3 rounded-lg bg-primary/10">
          <Settings class="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold">Settings</h1>
          <p class="text-muted-foreground">
            Manage your application preferences and AI features
          </p>
        </div>
      </div>
    </div>

    <!-- Settings Navigation Tabs -->
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-6 mb-8">
        <TabsTrigger value="general" class="gap-2">
          <Settings class="h-4 w-4" />
          <span class="hidden sm:inline">General</span>
        </TabsTrigger>
        <TabsTrigger value="ai" class="gap-2">
          <Brain class="h-4 w-4" />
          <span class="hidden sm:inline">AI & Code</span>
        </TabsTrigger>
        <TabsTrigger value="appearance" class="gap-2">
          <Palette class="h-4 w-4" />
          <span class="hidden sm:inline">Appearance</span>
        </TabsTrigger>
        <TabsTrigger value="account" class="gap-2">
          <User class="h-4 w-4" />
          <span class="hidden sm:inline">Account</span>
        </TabsTrigger>
        <TabsTrigger value="privacy" class="gap-2">
          <Shield class="h-4 w-4" />
          <span class="hidden sm:inline">Privacy</span>
        </TabsTrigger>
        <TabsTrigger value="advanced" class="gap-2">
          <Globe class="h-4 w-4" />
          <span class="hidden sm:inline">Advanced</span>
        </TabsTrigger>
      </TabsList>

      <!-- General Settings -->
      <TabsContent value="general" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Preferences</CardTitle>
            <CardDescription>
              Configure your basic application settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-center py-8 text-muted-foreground">
                <Settings class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>General settings configuration would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- AI & Code Actions Settings -->
      <TabsContent value="ai">
        <AICodeActionsSettings />
      </TabsContent>

      <!-- Appearance Settings -->
      <TabsContent value="appearance" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance & Theme</CardTitle>
            <CardDescription>
              Customize the look and feel of your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-center py-8 text-muted-foreground">
                <Palette class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Theme and appearance settings would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Account Settings -->
      <TabsContent value="account" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account & Profile</CardTitle>
            <CardDescription>
              Manage your account information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-center py-8 text-muted-foreground">
                <User class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Account settings would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Privacy Settings -->
      <TabsContent value="privacy" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
            <CardDescription>
              Control your data privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-center py-8 text-muted-foreground">
                <Shield class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Privacy and security settings would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Advanced Settings -->
      <TabsContent value="advanced" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Configuration</CardTitle>
            <CardDescription>
              Advanced settings for power users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-center py-8 text-muted-foreground">
                <Globe class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Advanced settings would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style> 