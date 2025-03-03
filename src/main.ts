import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import App from './App.vue'
import router from './router'
import { analytics } from './services/firebase'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Make analytics available globally
app.config.globalProperties.$analytics = analytics
