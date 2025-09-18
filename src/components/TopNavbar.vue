<template>
  <nav class="navbar navbar-top fixed-top navbar-expand" id="navbarDefault">
    <div class="collapse navbar-collapse justify-content-between">
      <div class="navbar-logo">
        <!-- Phoenix-style hamburger button (mobile) -->
        <button
          class="btn navbar-toggler navbar-toggler-humburger-icon hover-bg-transparent d-lg-none"
          type="button"
          aria-label="Toggle Navigation"
          @click.prevent="toggleSidebar"
        >
          <span class="navbar-toggle-icon"><span class="toggle-line"></span></span>
        </button>
        
        <a class="navbar-brand me-1 me-sm-3" href="#" @click.prevent="goHome">
          <div class="d-flex align-items-center">
            <div class="d-flex align-items-center">
              <h5 class="logo-text ms-2 d-none d-sm-block">TGPoint</h5>
            </div>
          </div>
        </a>
      </div>
      
      <div class="search-box navbar-top-search-box d-none d-lg-block" data-list='{"valueNames":["title"]}' style="width:25rem;">
        <form class="position-relative" data-bs-toggle="search" data-bs-display="static">
          <input class="form-control search-input fuzzy-search rounded-pill form-control-sm" type="search" placeholder="Поиск..." aria-label="Search" />
          <span class="fas fa-search search-box-icon"></span>
        </form>
      </div>
      
      <div class="navbar-nav navbar-nav-icons flex-row">
        <!-- Notifications -->
        <div class="nav-item dropdown">
          <a class="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <span class="text-700" data-feather="bell" style="height:20px;width:20px;"></span>
          </a>
          <div class="dropdown-menu dropdown-menu-end notification-dropdown-menu py-0" style="width: 27rem">
            <div class="bg-800 rounded-top-3 py-3 px-4">
              <h6 class="mb-0 text-white">Уведомления</h6>
            </div>
            <div class="scrollbar-overlay" style="height: 27rem;">
              <div class="p-3">
                <div class="d-flex mb-3">
                  <div class="flex-shrink-0">
                    <div class="avatar avatar-xl me-3">
                      <div class="avatar-name rounded-circle bg-primary-subtle text-primary">
                        <span class="fs-0 text-primary">Н</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex-1">
                    <h6 class="mb-1 fs-0">Новый магазин создан</h6>
                    <p class="mb-0 fs--1 text-600">Магазин "Тестовый" был успешно создан</p>
                    <small class="text-500">2 минуты назад</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- User Menu -->
        <div class="nav-item dropdown">
          <a class="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <div class="avatar avatar-l">
              <div class="avatar-name rounded-circle bg-primary-subtle text-primary">
                <span class="fs-0 text-primary">{{ user?.username?.charAt(0) || 'А' }}</span>
              </div>
            </div>
          </a>
          <div class="dropdown-menu dropdown-menu-end py-0">
            <div class="bg-200 rounded-top-3 py-3 px-4">
              <h6 class="mb-0 text-900">{{ user?.username || 'Администратор' }}</h6>
            </div>
            <div class="p-3">
              <a class="dropdown-item py-2 d-flex align-items-center" href="#">
                <span class="text-900" data-feather="user" style="height:16px;width:16px;"></span>
                <span class="ms-2 text-900">Профиль</span>
              </a>
              <a class="dropdown-item py-2 d-flex align-items-center" href="#">
                <span class="text-900" data-feather="settings" style="height:16px;width:16px;"></span>
                <span class="ms-2 text-900">Настройки</span>
              </a>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item py-2 d-flex align-items-center" href="#" @click="logout">
                <span class="text-900" data-feather="log-out" style="height:16px;width:16px;"></span>
                <span class="ms-2 text-900">Выйти</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStoresStore } from '@/stores/stores'

const router = useRouter()
const authStore = useAuthStore()
const storesStore = useStoresStore()

const user = computed(() => authStore.user)

onMounted(() => {
  // Initialize Feather icons
  if (window.feather) {
    window.feather.replace()
  }
  console.log('TopNavbar mounted, screen width:', window.innerWidth)
})

const toggleSidebar = () => {
  console.log('Toggle sidebar clicked, screen width:', window.innerWidth)
  console.log('Is mobile:', window.innerWidth <= 768)
  emit('toggle-sidebar')
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const emit = defineEmits(['toggle-sidebar'])

const goHome = () => {
  storesStore.setActiveStoreId(null)
  router.push({ name: 'dashboard' })
}
</script>

<style scoped>
/* Дополнительные стили для мобильной адаптации */
@media (max-width: 768px) {
  .navbar-top-search-box {
    display: none !important;
  }
  
  .navbar-brand .logo-text {
    display: none !important;
  }
  /* Гарантируем отображение кнопки бургера на мобилке */
  .navbar-toggler { display: flex !important; }
  
  /* Перемещаем панель вниз и держим поверх сайдбара/оверлея */
  .navbar-top {
    position: fixed !important;
    bottom: 0 !important;
    top: auto !important;
    left: 0;
    right: 0;
    z-index: 1100; /* выше сайдбара (1040) и оверлея (1029) */
    border-top: 1px solid var(--phoenix-secondary-bg);
    border-bottom: 0;
    background: var(--phoenix-body-bg);
  }
}

/* Desktop styles: rely on Phoenix theme for spacing; keep only z-index */
@media (min-width: 769px) {
  .navbar-top { z-index: 1020; }
}

:deep(.navbar-nav.navbar-nav-icons) {
  padding-right: 2rem;
}

:deep(.navbar-nav.navbar-nav-icons .dropdown-menu-end) {
  transform: translateX(-3rem);
}
</style> 
