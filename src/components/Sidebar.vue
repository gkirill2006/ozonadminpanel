<template>
  <!-- Mobile overlay -->
  <div
    v-if="isMobileOpen"
    class="sidebar-overlay"
    @click="closeMobile"
  ></div>
  
  <!-- Точная копия Phoenix структуры -->
  <nav class="navbar navbar-vertical navbar-expand-lg" :class="{ 'show': isMobileOpen }">
    <!-- Используем кнопку-гамбургер из нижнего TopNavbar для закрытия -->
    <!-- На мобилке раскрываем внутренний collapse вручную -->
    <div class="navbar-collapse collapse" :class="{ show: isMobileOpen }" id="navbarVerticalCollapse">
      <!-- scrollbar removed-->
      <div class="navbar-vertical-content" :style="navContentStyle">
        <ul class="navbar-nav flex-column sidebar-nav" id="navbarVerticalNav">
          
          <template v-if="!isStoreContext">
            <!-- Главная -->
            <li class="nav-item">
              <div class="nav-item-wrapper">
                <router-link
                  to="/"
                  class="nav-link label-1"
                  :class="{ active: route.path === '/' }"
                  @click="onMenuItemClick"
                >
                  <div class="d-flex align-items-center">
                    <span class="nav-link-icon">
                      <span data-feather="pie-chart"></span>
                    </span>
                    <span class="nav-link-text">Главная</span>
                  </div>
                </router-link>
              </div>
            </li>

            <!-- Лейбл -->
            <li class="nav-item">
              <p class="navbar-vertical-label">Управление</p>
              <hr class="navbar-vertical-line" />
            </li>

            <!-- Группа: Управление (Phoenix-style) -->
            <li class="nav-item">
              <div class="nav-item-wrapper">
                <a class="nav-link dropdown-indicator label-1" href="#nv-manage" role="button" data-bs-toggle="collapse" aria-controls="nv-manage" :aria-expanded="openGroups.manage ? 'true' : 'false'" @click.prevent="toggleGroup('manage')">
                  <div class="d-flex align-items-center">
                    <div class="dropdown-indicator-icon-wrapper">
                      <span class="fas fa-caret-right dropdown-indicator-icon" :class="{ 'fa-rotate-90': openGroups.manage }"></span>
                    </div>
                    <span class="nav-link-icon">
                      <span data-feather="settings"></span>
                    </span>
                    <span class="nav-link-text">Управление</span>
                  </div>
                </a>
                <div class="parent-wrapper label-1">
                  <ul class="nav collapse parent" :class="{ show: openGroups.manage }" id="nv-manage" data-bs-parent="#navbarVerticalCollapse">
                    <li class="collapsed-nav-item-title d-none">Управление</li>
                    <li class="nav-item">
                      <router-link to="/stores" class="nav-link" @click="onMenuItemClick">
                        <div class="d-flex align-items-center">
                          <span class="nav-link-icon">
                            <span data-feather="shopping-bag"></span>
                          </span>
                          <span class="nav-link-text">Магазины</span>
                        </div>
                      </router-link>
                    </li>
                    <li class="nav-item">
                      <router-link :to="productsNavTarget" class="nav-link" @click="onMenuItemClick">
                        <div class="d-flex align-items-center">
                          <span class="nav-link-icon">
                            <span data-feather="package"></span>
                          </span>
                          <span class="nav-link-text">Товары</span>
                        </div>
                      </router-link>
                    </li>
                    <li class="nav-item">
                      <router-link to="/subscription" class="nav-link" @click="onMenuItemClick">
                        <div class="d-flex align-items-center">
                          <span class="nav-link-icon">
                            <span data-feather="credit-card"></span>
                          </span>
                          <span class="nav-link-text">Подписки</span>
                        </div>
                      </router-link>
                    </li>
                    <li class="nav-item">
                      <router-link to="/users" class="nav-link" @click="onMenuItemClick">
                        <div class="d-flex align-items-center">
                          <span class="nav-link-icon">
                            <span data-feather="users"></span>
                          </span>
                          <span class="nav-link-text">Пользователи</span>
                        </div>
                      </router-link>
                    </li>
                    <li class="nav-item">
                      <router-link to="/settings" class="nav-link" @click="onMenuItemClick">
                        <div class="d-flex align-items-center">
                          <span class="nav-link-icon">
                            <span data-feather="sliders"></span>
                          </span>
                          <span class="nav-link-text">Настройки</span>
                        </div>
                      </router-link>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
          </template>

          <template v-else>
            <li class="nav-item">
              <div class="nav-item-wrapper">
                <router-link
                  v-if="storeNavPrimaryItem && storeNavPrimaryItem.to"
                  class="nav-link label-1"
                  :class="{ active: isNavItemActive(storeNavPrimaryItem) }"
                  :to="storeNavPrimaryItem.to"
                  @click="onMenuItemClick"
                >
                  <div class="d-flex align-items-center">
                    <span v-if="storeNavPrimaryItem.icon" class="nav-link-icon">
                      <span :data-feather="storeNavPrimaryItem.icon"></span>
                    </span>
                    <span class="nav-link-text" :class="{ 'ms-2': storeNavPrimaryItem.icon }">{{ storeNavPrimaryItem.label }}</span>
                  </div>
                </router-link>
              </div>
            </li>
            <li class="nav-item">
              <p class="navbar-vertical-label">Магазин</p>
              <hr class="navbar-vertical-line" />
            </li>
            <li v-for="item in storeNavSecondaryItems" :key="item.key" class="nav-item">
              <div class="nav-item-wrapper">
                <div class="nav-item-wrapper-inner">
                  <router-link
                    v-if="item.to && !item.disabled"
                    class="nav-link label-1"
                    :class="{ active: isNavItemActive(item) }"
                    :to="item.to"
                    @click="onMenuItemClick"
                  >
                    <div class="d-flex align-items-center">
                    <span v-if="item.icon" class="nav-link-icon">
                      <span :data-feather="item.icon"></span>
                    </span>
                    <span class="nav-link-text" :class="{ 'ms-2': item.icon }">{{ item.label }}</span>
                    </div>
                  </router-link>
                  <div v-else class="nav-link label-1 store-nav-item disabled">
                    <div class="d-flex align-items-center">
                      <span class="nav-link-text">{{ item.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </template>

          <li class="nav-item sidebar-settings-item">
            <div class="nav-item-wrapper">
              <button type="button" class="nav-link label-1 sidebar-settings-link" disabled>
                <div class="d-flex align-items-center">
                  <span class="nav-link-icon">
                    <span data-feather="settings"></span>
                  </span>
                  <span class="nav-link-text">Настройки</span>
                </div>
              </button>
            </div>
          </li>

        </ul>
      </div>
    </div>

    <!-- Точная копия Phoenix footer -->
    <div class="navbar-vertical-footer">
      <button
        ref="collapseToggle"
        type="button"
        class="btn navbar-vertical-toggle border-0 fw-semibold w-100 white-space-nowrap d-flex align-items-center"
        :title="isCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
        @click.prevent="handleCollapseToggle"
      >
        <span class="uil uil-left-arrow-to-left fs-8"></span>
        <span class="uil uil-arrow-from-right fs-8"></span>
        <span class="navbar-vertical-footer-text ms-2">Collapsed View</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter, RouteLocationRaw } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/stores'

const isMobileOpen = ref(false)
const isCollapsed = ref(false)
const openGroups = ref<{ [key: string]: boolean }>({ manage: true })
const collapseToggle = ref<HTMLButtonElement | null>(null)
const route = useRoute()
const router = useRouter()
const storesStore = useStoresStore()
const { activeStoreId } = storeToRefs(storesStore)
const storeContextPaths = ['/stores', '/products']
const isStoreContext = computed(() => {
  if (!activeStoreId.value) return false
  return storeContextPaths.some(prefix => route.path.startsWith(prefix))
})
const isTelegramApp = ref(false)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)

const withStoreQuery = (path: string): RouteLocationRaw => {
  if (activeStoreId.value) {
    return { path, query: { store: activeStoreId.value } }
  }
  return path
}

const storeNavItems = computed(() => [
  { key: 'store-home', label: 'Главная', icon: 'home', to: '/' },
  { key: 'store-products', label: 'Товары', icon: 'shopping-bag', to: withStoreQuery('/products'), matchPrefix: '/products' },
  { key: 'store-orders', label: '📦 Заказы', disabled: true },
  { key: 'store-users', label: '👥 Пользователи', disabled: true },
  { key: 'store-appearance', label: '🖼 Внешний вид', disabled: true },
  { key: 'store-mailing', label: 'Рассылки', disabled: true },
  { key: 'store-loyalty', label: 'Программа лояльности', disabled: true },
  { key: 'store-settings', label: '⚙️ Настройки бизнеса', icon: 'sliders', to: withStoreQuery('/stores'), matchPrefix: '/stores' }
])

const storeNavPrimaryItem = computed(() => storeNavItems.value[0])
const storeNavSecondaryItems = computed(() => storeNavItems.value.slice(1))

const navContentStyle = computed(() => {
  if (!isTelegramApp.value) return {}
  const offset = viewportWidth.value >= 992 ? 22 : 172
  return {
    paddingTop: `calc(env(safe-area-inset-top, 0px) + ${offset}px)`
  }
})

const productsNavTarget = computed(() => {
  if (activeStoreId.value) {
    return { path: '/products', query: { store: activeStoreId.value } }
  }
  return '/products'
})

const isNavItemActive = (item: any) => {
  if (!item.to) return false
  if (item.matchPrefix) {
    return route.path.startsWith(item.matchPrefix)
  }
  const resolved = router.resolve(item.to)
  return route.path === resolved.path
}

onMounted(() => {
  // Initialize Feather icons
  if (window.feather) {
    window.feather.replace()
  }

  isTelegramApp.value = document.body.classList.contains('tg-webapp') || document.documentElement.classList.contains('tg-webapp')

  if (typeof window !== 'undefined') {
    const updateWidth = () => {
      viewportWidth.value = window.innerWidth
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    onUnmounted(() => window.removeEventListener('resize', updateWidth))
  }

  // Initialize collapsed state from persisted config (Phoenix behavior)
  try {
    const persisted = localStorage.getItem('phoenixIsNavbarVerticalCollapsed')
    const shouldCollapse = persisted === 'true'
    if (shouldCollapse) {
      document.documentElement.classList.add('navbar-vertical-collapsed')
      isCollapsed.value = true
    } else {
      // Убираем класс если не должен быть свернут
      document.documentElement.classList.remove('navbar-vertical-collapsed')
      isCollapsed.value = false
    }
  } catch (e) {
    // ignore storage errors
  }
  
  // Синхронизируем состояние с реальным DOM
  const htmlElement = document.documentElement
  isCollapsed.value = htmlElement.classList.contains('navbar-vertical-collapsed')

  // Open the group that contains current route on load
  syncGroupsWithRoute()

  // Слушаем событие Phoenix на самой кнопке (phoenix.js диспатчит его на элементе)
  collapseToggle.value?.addEventListener('navbar.vertical.toggle', () => {
    const collapsed = document.documentElement.classList.contains('navbar-vertical-collapsed')
    isCollapsed.value = collapsed
  })

  // На всякий случай синхронизируемся при изменении класса на <html>
  const mo = new MutationObserver(() => {
    const collapsed = document.documentElement.classList.contains('navbar-vertical-collapsed')
    if (collapsed !== isCollapsed.value) {
      isCollapsed.value = collapsed
    }
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

const closeMobile = () => {
  isMobileOpen.value = false
}

// Переключение обрабатывает Phoenix, здесь логики больше нет

const onMenuItemClick = () => {
  // Закрыть мобильное меню (если открыто)
  closeMobile()
  // Скрывем popout сразу после клика в свернутом режиме
  document.documentElement.classList.add('phoenix-hide-popouts')
  setTimeout(() => {
    document.documentElement.classList.remove('phoenix-hide-popouts')
  }, 250)
}

const toggleGroup = (key: string) => {
  openGroups.value[key] = !openGroups.value[key]
}

const handleCollapseToggle = () => {
  const className = 'navbar-vertical-collapsed'
  const html = document.documentElement
  const nextState = !html.classList.contains(className)
  html.classList.toggle(className, nextState)
  try {
    localStorage.setItem('phoenixIsNavbarVerticalCollapsed', nextState ? 'true' : 'false')
  } catch (error) {
    // ignore storage errors
  }
  isCollapsed.value = nextState
  const event = new CustomEvent('navbar.vertical.toggle')
  collapseToggle.value?.dispatchEvent(event)
}

const syncGroupsWithRoute = () => {
  const p = route.path
  // Manage group contains these routes
  const managePaths = ['/stores', '/products', '/subscription', '/users', '/settings']
  openGroups.value.manage = managePaths.some(prefix => p.startsWith(prefix))
}

// Close mobile sidebar and sync groups on route change
watch(
  () => route.path,
  () => {
    closeMobile()
    syncGroupsWithRoute()
    if (!isTelegramApp.value) {
      isTelegramApp.value = document.body.classList.contains('tg-webapp') || document.documentElement.classList.contains('tg-webapp')
    }
    // Спрячем popouts сразу после смены маршрута
    document.documentElement.classList.add('phoenix-hide-popouts')
    setTimeout(() => document.documentElement.classList.remove('phoenix-hide-popouts'), 250)
    // Re-render feather icons for dynamically shown elements
    if (window.feather) {
      window.feather.replace()
    }
  }
)

watch(
  () => activeStoreId.value,
  () => {
    if (window.feather) {
      window.feather.replace()
    }
  }
)

// Expose for parent component
defineExpose({
  toggleMobile: () => {
    isMobileOpen.value = !isMobileOpen.value
  }
})
</script>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: var(--phoenix-navbar-top-height);
  left: 0;
  width: 100%;
  height: calc(100vh - var(--phoenix-navbar-top-height));
  background: rgba(0, 0, 0, 0.5);
  z-index: 1029; /* Below sidebar (1040), above content */
  display: none;
}

/* Mobile styles - сайдбар скрыт по умолчанию */
@media (max-width: 768px) {
  .navbar-vertical {
    transform: translateX(-100%);
    z-index: 1040;
    transition: transform 0.3s ease;
    position: fixed;
    /* При нижней навигации на мобилке сайдбар должен занимать весь экран */
    top: 0;
    left: 0;
    height: 100vh;
  }

  .navbar-vertical.show {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    top: 0;
    height: 100vh;
  }

  .navbar-vertical-footer {
    display: none;
  }

  /* Center menu items vertically */
  .navbar-vertical .navbar-vertical-content {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: calc(100vh - 3.25rem);
  }
}

/* Desktop styles: rely on Phoenix defaults (no overrides) */

/* Под попапы Phoenix: мгновенно скрывать после клика */
:deep(html.phoenix-hide-popouts.navbar-vertical-collapsed) .navbar-vertical.navbar-expand-lg .nav-item-wrapper:hover .parent-wrapper.label-1,
:deep(html.phoenix-hide-popouts.navbar-vertical-collapsed) .navbar-vertical.navbar-expand-lg .nav-item-wrapper:hover .nav-link-text-wrapper { display: none !important; }

.store-nav-item {
  justify-content: space-between;
  opacity: 0.75;
  cursor: default;
}

.store-nav-item.disabled {
  opacity: 0.6;
}


:deep(.navbar-vertical .nav-item-wrapper > .nav-link),
:deep(.navbar-vertical .nav-item-wrapper > .nav-link.dropdown-indicator) {
  cursor: pointer !important;
}

.nav-link-emoji {
  font-size: 1rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.sidebar-settings-link {
  cursor: default;
}

.navbar-vertical-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.navbar-vertical-content #navbarVerticalNav {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.sidebar-settings-item {
  margin-top: auto;
}



.sidebar-settings-link .nav-link-text {
  font-weight: 600;
}

.sidebar-settings-link [data-feather] {
  width: 18px;
  height: 18px;
}

.navbar-nav .nav-link .nav-link-text.ms-2 {
  margin-left: 0.5rem !important;
}
</style>
