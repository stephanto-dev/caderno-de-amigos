import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { install_auth_guard_for_router, routes } from './router'
import './style.css'

const router = createRouter({ history: createWebHistory(), routes })
install_auth_guard_for_router(router)

createApp(App).use(router).mount('#app')
