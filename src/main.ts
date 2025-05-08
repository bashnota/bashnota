import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'
import './assets/index.css'
import App from './App.vue'
import router from './router'
import { analytics } from './services/firebase'
import { logAnalyticsEvent } from './services/firebase'

// Import core stores to ensure they're registered
import '@/stores/aiSettingsStore'
import '@/stores/vibeStore'
import '@/stores/jupyterStore'

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

app.use(pinia)
app.use(router)
app.use(head)

// Log page views when routes change
router.afterEach((to) => {
  // Only log analytics if the user has successfully navigated
  if (to.name) {
    logAnalyticsEvent('page_view', {
      page_title: typeof to.name === 'string' ? to.name : 'unknown',
      page_path: to.path
    })
  }
})

// Initialize the app
app.mount('#app')

// Make analytics available globally
app.config.globalProperties.$analytics = analytics
