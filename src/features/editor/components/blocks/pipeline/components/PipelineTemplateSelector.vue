<template>
  <div class="template-selector-modal">
    <div class="template-selector-content">
      <div class="template-selector-header">
        <h3>Choose a Template</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <div class="template-selector-body">
        <div class="template-grid">
          <div 
            v-for="template in templates" 
            :key="template.id"
            class="template-card"
            @click="$emit('select', template)"
          >
            <div class="template-icon">
              <component :is="template.icon" class="w-6 h-6" />
            </div>
            <div class="template-info">
              <h4 class="template-title">{{ template.title }}</h4>
              <p class="template-description">{{ template.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  templates: Array<any>
}>()

defineEmits(['close', 'select'])
</script>

<style scoped>
.template-selector-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.template-selector-content {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px hsl(var(--foreground) / 0.1);
}

.template-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.template-selector-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.template-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: hsl(var(--primary));
  background: hsl(var(--muted) / 0.5);
}

.template-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
}

.template-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
}

.template-description {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
}
</style> 