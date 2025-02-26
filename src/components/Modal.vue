<template>
  <div v-if="isOpen" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white p-4 rounded shadow-md">
      <h2 class="text-lg font-bold mb-2">{{ title }}</h2>
      <input v-model="inputValue" class="border p-2 w-full" placeholder="Enter a name" />
      <div class="flex justify-end mt-4">
        <button @click="close" class="mr-2">Cancel</button>
        <button @click="submit">Submit</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'

const props = defineProps<{ isOpen: boolean; title: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'submit', value: string): void }>()

const inputValue = ref('')

const close = () => {
  emit('close')
}

const submit = () => {
  emit('submit', inputValue.value)
  close()
}
</script>
