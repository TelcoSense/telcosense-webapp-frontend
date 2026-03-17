import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { installAuthInterceptors } from './authInterceptors'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

installAuthInterceptors(pinia, router)

app.use(pinia)
app.use(router)

app.mount('#app')
