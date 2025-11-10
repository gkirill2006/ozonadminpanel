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
          
          <template v-if="!isWorkspaceRoute">
            <li v-for="item in generalNavItems" :key="item.key" class="nav-item">
              <div class="nav-item-wrapper">
                <router-link
                  class="nav-link label-1"
                  :class="{ active: isGeneralNavActive(item) }"
                  :to="item.to"
                  @click="onMenuItemClick"
                >
                  <div class="d-flex align-items-center">
                    <span v-if="item.icon" class="nav-link-icon">
                      <span :data-feather="item.icon"></span>
                    </span>
                    <span class="nav-link-text">{{ item.label }}</span>
                  </div>
                </router-link>
              </div>
            </li>
          </template>

          <template v-else>
            <li class="nav-item">
              <div class="nav-item-wrapper">
                <router-link
                  class="nav-link label-1"
                  :to="{ path: '/' }"
                  @click="onMenuItemClick"
                >
                  <div class="d-flex align-items-center">
                    <span class="nav-link-icon">
                      <span data-feather="arrow-left-circle"></span>
                    </span>
                    <span class="nav-link-text">Все магазины</span>
                  </div>
                </router-link>
              </div>
            </li>
            <li class="nav-item">
              <p class="navbar-vertical-label">Разделы</p>
              <hr class="navbar-vertical-line" />
            </li>
            <li v-for="section in workspaceSections" :key="section.key" class="nav-item">
              <div class="nav-item-wrapper">
                <router-link
                  class="nav-link label-1"
                  :class="{ active: isWorkspaceSectionActive(section.key) }"
                  :to="workspaceRouteFor(section.key)"
                  @click="onMenuItemClick"
                >
                  <div class="d-flex align-items-center">
                    <span class="nav-link-icon">
                      <span :data-feather="section.icon"></span>
                    </span>
                    <span class="nav-link-text">{{ section.label }}</span>
                  </div>
                </router-link>
              </div>
            </li>
          </template>

          <li class="nav-item sidebar-settings-item">
            <div class="nav-item-wrapper">
              <!-- <button type="button" class="nav-link label-1 sidebar-settings-link" disabled>
                <div class="d-flex align-items-center">
                  <span class="nav-link-icon">
                    <span data-feather="settings"></span>
                  </span>
                  <span class="nav-link-text">Настройки</span>
                </div>
              </button> -->
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
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  WORKSPACE_SECTIONS,
  normalizeWorkspaceSection,
  type WorkspaceSectionKey
} from '@/constants/workspace'

type GeneralNavItem = {
  key: string
  label: string
  icon?: string
  to: string
  matchPrefix?: string
}

const generalNavItems: GeneralNavItem[] = [
  { key: 'dashboard', label: 'Главная', icon: 'pie-chart', to: '/', matchPrefix: '/' }
  // { key: 'stores', label: 'Магазины', icon: 'shopping-bag', to: '/stores', matchPrefix: '/stores' },
  // { key: 'products', label: 'Товары', icon: 'package', to: '/products', matchPrefix: '/products' },
  // { key: 'subscription', label: 'Подписки', icon: 'credit-card', to: '/subscription', matchPrefix: '/subscription' },
  // { key: 'users', label: 'Пользователи', icon: 'users', to: '/users', matchPrefix: '/users' },
  // { key: 'settings', label: 'Настройки', icon: 'sliders', to: '/settings', matchPrefix: '/settings' }
] as const

const workspaceSections = WORKSPACE_SECTIONS

const route = useRoute()
const router = useRouter()
const isMobileOpen = ref(false)
const isCollapsed = ref(false)
const collapseToggle = ref<HTMLButtonElement | null>(null)
const isTelegramApp = ref(false)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)

const isWorkspaceRoute = computed(() => route.name === 'store-workspace')
const currentWorkspaceId = computed(() =>
  isWorkspaceRoute.value && route.params.id ? String(route.params.id) : null
)
const currentWorkspaceSection = computed<WorkspaceSectionKey | null>(() => {
  if (!isWorkspaceRoute.value) return null
  const value = typeof route.params.section === 'string' ? route.params.section : undefined
  return normalizeWorkspaceSection(value)
})

const navContentStyle = computed(() => {
  if (!isTelegramApp.value) return {}
  const offset = viewportWidth.value >= 992 ? 22 : 172
  return { paddingTop: `calc(env(safe-area-inset-top, 0px) + ${offset}px)` }
})

const isGeneralNavActive = (item: GeneralNavItem) => {
  if (item.matchPrefix === '/') {
    return route.path === '/'
  }
  return item.matchPrefix ? route.path.startsWith(item.matchPrefix) : route.path === item.to
}

const workspaceRouteFor = (sectionKey: WorkspaceSectionKey): RouteLocationRaw => {
  if (!currentWorkspaceId.value) {
    return { name: 'store-workspace', params: { id: '', section: sectionKey } }
  }
  return {
    name: 'store-workspace',
    params: { id: currentWorkspaceId.value, section: sectionKey }
  }
}

const isWorkspaceSectionActive = (sectionKey: WorkspaceSectionKey) => {
  return currentWorkspaceSection.value === sectionKey
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

// Close mobile sidebar on route change
watch(
  () => route.fullPath,
  () => {
    closeMobile()
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

.sidebar-settings-wrapper {
  margin-top: auto;
  padding: 0.75rem 1rem 1rem;
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
