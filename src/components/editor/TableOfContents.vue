<script setup lang="ts">
import { computed } from 'vue'
import { ListOrdered, Heading1, Heading2, Heading3 } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const props = defineProps<{
  editor: any
}>()

const headings = computed(() => {
  if (!props.editor) return []

  const json = props.editor.getJSON()
  const headings = []

  const processNode = (node: any, level = 0) => {
    if (node.type === 'heading') {
      headings.push({
        level: node.attrs.level,
        text: node.content?.[0]?.text || '',
        indent: level,
      })
    }
    if (node.content) {
      node.content.forEach((child: any) => processNode(child, level + 1))
    }
  }

  json.content?.forEach((node) => processNode(node))
  return headings
})

const scrollToHeading = (text: string) => {
  const element = document.evaluate(
    `//h1[contains(text(),'${text}')] | //h2[contains(text(),'${text}')] | //h3[contains(text(),'${text}')]`,
    document.body,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as HTMLElement

  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const getHeadingIcon = (level: number) => {
  switch (level) {
    case 1:
      return Heading1
    case 2:
      return Heading2
    default:
      return Heading3
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Enhanced Header -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2 px-2">
        <ListOrdered class="w-4 h-4 text-primary" />
        <h3 class="font-semibold">Table of Contents</h3>
      </div>
      <Separator class="w-full" />
    </div>

    <ScrollArea class="flex-1">
      <div v-if="headings.length === 0" class="px-4 py-8 text-center">
        <ListOrdered class="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
        <p class="text-sm font-medium text-muted-foreground">No headings found</p>
        <p class="text-xs text-muted-foreground/80 mt-1">
          Add headings to your document to see them here
        </p>
      </div>

      <div v-else class="flex flex-col gap-0.5">
        <Button
          v-for="(heading, index) in headings"
          :key="index"
          variant="ghost"
          size="sm"
          class="justify-start h-auto py-1.5 px-2 group"
          :style="{ paddingLeft: `${heading.level * 0.75}rem` }"
          @click="scrollToHeading(heading.text)"
        >
          <div class="flex items-center gap-2 w-full">
            <component
              :is="getHeadingIcon(heading.level)"
              class="w-3 h-3 flex-shrink-0 text-muted-foreground/70 group-hover:text-primary transition-colors"
            />
            <span
              class="text-sm truncate text-muted-foreground group-hover:text-foreground transition-colors"
            >
              {{ heading.text }}
            </span>
          </div>
        </Button>
      </div>
    </ScrollArea>
  </div>
</template>
