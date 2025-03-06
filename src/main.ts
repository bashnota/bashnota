import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import App from './App.vue'
import router from './router'
import { analytics } from './services/firebase'
import { logAnalyticsEvent } from './services/firebase'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

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
