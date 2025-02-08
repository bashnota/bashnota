<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import {
  DocumentTextIcon,
  CodeBracketIcon,
  LinkIcon,
  DocumentIcon,
  FolderIcon,
} from '@heroicons/vue/24/outline'
import { ref, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'

const router = useRouter()
const store = useNotaStore()

const createNewNota = async () => {
  const nota = await store.createNota('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}

const buttonText = computed(() => {
  return store.notas.length === 0 ? 'Create your first nota' : 'Create new nota'
})

const recentItems = ref<
  Array<{ id: string; title: string; type: 'nota' | 'page'; updatedAt: Date }>
>([])

onMounted(async () => {
  await Promise.all([store.loadNotas(), store.loadPages()])

  const items = [
    ...store.notas.map((n) => ({
      id: n.id,
      title: n.title,
      type: 'nota' as const,
      updatedAt: n.updatedAt,
    })),
    ...store.pages.map((p) => ({
      id: p.id,
      title: p.title,
      type: 'page' as const,
      updatedAt: p.updatedAt,
    })),
  ]

  recentItems.value = items
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10)
})

const openItem = (item: { id: string; type: 'nota' | 'page' }) => {
  router.push(`/${item.type}/${item.id}`)
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] py-10">
    <div class="container mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Right column: Welcome section -->
        <div class="space-y-12">
          <div class="mb-8">
            <h1
              class="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
            >
              Welcome to BashNota
            </h1>
            <p class="text-xl text-muted-foreground">
              Your personal knowledge base for code and notes
            </p>
          </div>

          <div class="space-y-6">
            <div class="flex items-start space-x-4 group p-4 rounded-lg border">
              <DocumentTextIcon class="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h3 class="text-lg font-semibold mb-2">Organize</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Create notas and nested pages to organize your knowledge
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-4 group p-4 rounded-lg border">
              <CodeBracketIcon class="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h3 class="text-lg font-semibold mb-2">Code</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Write and format code with syntax highlighting
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-4 group p-4 rounded-lg border">
              <LinkIcon class="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h3 class="text-lg font-semibold mb-2">Connect</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Link pages together to build your knowledge network
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Left column: Recent Items -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">Recent Items</h2>
            <Button size="sm" @click="createNewNota">{{ buttonText }}</Button>
          </div>

          <div v-if="recentItems.length" class="space-y-1">
            <div
              v-for="item in recentItems"
              :key="item.id"
              @click="openItem(item)"
              class="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <FolderIcon v-if="item.type === 'nota'" class="w-5 h-5 text-muted-foreground" />
              <DocumentIcon v-else class="w-5 h-5 text-muted-foreground" />

              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ item.title }}</div>
                <div class="text-sm text-muted-foreground">
                  {{ formatDate(item.updatedAt) }}
                </div>
              </div>

              <ChevronRightIcon class="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div
            v-else
            class="border rounded-lg p-8 flex flex-col items-center justify-center text-center bg-background"
          >
            <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <DocumentTextIcon class="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 class="font-medium text-lg mb-2">No items yet</h3>
            <p class="text-sm text-muted-foreground mb-4">
              Get started by creating your first nota
            </p>
            <Button variant="outline" size="sm" @click="createNewNota">{{ buttonText }}</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
