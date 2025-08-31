<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Sidebar from './components/Sidebar.vue'
import TopNavbar from './components/TopNavbar.vue'
import router from './router'
import { tryTelegramAutoLogin, initTelegramUI } from '@/utils/telegram'

const authStore = useAuthStore()
const sidebarRef = ref()

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleMobile()
  }
}

onMounted(async () => {
  initTelegramUI()
  const loggedIn = await tryTelegramAutoLogin()
  if (loggedIn && router.currentRoute.value.path !== '/') {
    router.replace('/')
  }
})
</script>

<template>
  <div id="app" class="app-root">
    <!-- Show admin layout only if authenticated -->
    <template v-if="authStore.isAuthenticated">
      <!-- Phoenix expects sidebar BEFORE topbar and content -->
      <Sidebar ref="sidebarRef" />
      <TopNavbar @toggle-sidebar="toggleSidebar" />
      <div class="content">
        <router-view />
      </div>
    </template>
    
    <!-- Show login page if not authenticated -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<style>
/* Убираем все кастомные стили, используем только Phoenix CSS */
</style>
