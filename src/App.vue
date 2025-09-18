<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStoresStore } from '@/stores/stores'
import Sidebar from './components/Sidebar.vue'
import TopNavbar from './components/TopNavbar.vue'
import router from './router'
import { tryTelegramAutoLogin, initTelegramUI } from '@/utils/telegram'

const authStore = useAuthStore()
const storesStore = useStoresStore()
const sidebarRef = ref()
const isAppReady = ref(false)

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleMobile()
  }
}

onMounted(async () => {
  initTelegramUI()
  const loggedIn = await tryTelegramAutoLogin()

  if (authStore.isAuthenticated) {
    await storesStore.fetchStores()
  }

  if (loggedIn && router.currentRoute.value.path !== '/') {
    router.replace('/')
  }

  isAppReady.value = true
})

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (!isAppReady.value) return

    if (isAuthenticated) {
      await storesStore.fetchStores()
      if (router.currentRoute.value.path === '/login') {
        router.replace('/')
      }
    } else {
      storesStore.clear()
    }
  }
)
</script>

<template>
  <div id="app" class="app-root">
    <div v-if="!isAppReady" class="app-loading d-flex align-items-center justify-content-center">
      <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
    </div>

    <template v-else>
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
    </template>
  </div>
</template>

<style>
/* Простая заглушка-плейсхолдер пока инициализируем приложение */
.app-loading {
  min-height: 100vh;
}
</style>
