<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { ref, watch } from 'vue'

const props = defineProps<{
  tableName: string
  isEditingName: boolean
}>()

const emit = defineEmits<{
  (e: 'startEditingName'): void
  (e: 'saveName', value: string): void
  (e: 'addColumn'): void
  (e: 'addRow'): void
}>()

// Local state for the input field
const localTableName = ref(props.tableName)

// Update local name when prop changes
watch(() => props.tableName, (newName) => {
  localTableName.value = newName
})

// Update local name when editing state changes
watch(() => props.isEditingName, (isEditing) => {
  if (isEditing) {
    localTableName.value = props.tableName
  }
})

const handleNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localTableName.value = target.value
}

const saveName = () => {
  emit('saveName', localTableName.value)
}
</script>

<template>
  <div class="p-4 border-b">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Input
          v-if="isEditingName"
          :value="localTableName"
          @input="handleNameInput"
          class="h-8 text-lg font-semibold"
          @keyup.enter="saveName"
          @blur="saveName"
          autofocus
        />
        <h3 v-else class="text-lg font-semibold flex items-center gap-2">
          {{ tableName }}
          <Button variant="ghost" size="sm" class="h-6 w-6" @click="emit('startEditingName')">
            <Pencil class="h-4 w-4" />
          </Button>
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="emit('addColumn')">
          <Plus class="h-4 w-4 mr-2" />
          Add Column
        </Button>
        <Button variant="outline" size="sm" @click="emit('addRow')">
          <Plus class="h-4 w-4 mr-2" />
          Add Row
        </Button>
        <slot name="right" />
      </div>
    </div>
  </div>
</template> 