<template>
  <nav class="navbar navbar-top fixed-top navbar-expand" id="navbarDefault" ref="navbarEl">
    <div class="navbar-inner d-flex align-items-center w-100 gap-3">
      <div class="brand-block d-flex align-items-center gap-2">
        <a class="navbar-brand mb-0" href="#" @click.prevent="goHome">
          <h5 class="logo-text mb-0">OPanel</h5>
        </a>
        <span v-if="currentStoreLabel" class="current-store text-body-secondary">| {{ currentStoreLabel }}</span>
      </div>

      <div v-if="showWorkspaceTabs" class="workspace-tabs flex-grow-1">
        <router-link
          v-for="section in workspaceSections"
          :key="section.key"
          class="workspace-tabs__item"
          :class="{ active: activeWorkspaceSection === section.key }"
          :to="workspaceRoute(section.key)"
        >
          <span class="workspace-tabs__icon" :data-feather="section.icon"></span>
          <span>{{ section.label }}</span>
        </router-link>
      </div>

      <div class="navbar-nav navbar-nav-icons flex-row ms-auto">
        <div class="nav-item dropdown">
          <a class="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <div class="avatar avatar-l">
              <div class="avatar-name rounded-circle bg-primary-subtle text-primary">
                <span class="fs-0 text-primary">{{ userInitial }}</span>
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
import { computed, onMounted, watch, ref, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useStoresStore } from '@/stores/stores'
import {
  WORKSPACE_SECTIONS,
  type WorkspaceSectionKey,
  normalizeWorkspaceSection
} from '@/constants/workspace'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const storesStore = useStoresStore()
const { stores } = storeToRefs(storesStore)
const navbarEl = ref<HTMLElement | null>(null)

const workspaceSections = WORKSPACE_SECTIONS

const user = computed(() => authStore.user)
const userInitial = computed(() => user.value?.username?.charAt(0)?.toUpperCase() || 'А')

const isWorkspaceRoute = computed(() => route.name === 'store-workspace')
const currentStoreId = computed(() =>
  isWorkspaceRoute.value && route.params.id ? String(route.params.id) : null
)
const showWorkspaceTabs = computed(() => Boolean(currentStoreId.value))
const activeWorkspaceSection = computed<WorkspaceSectionKey | null>(() => {
  if (!isWorkspaceRoute.value) return null
  const raw = typeof route.params.section === 'string' ? route.params.section : undefined
  return normalizeWorkspaceSection(raw)
})

const currentStoreEntry = computed(() => {
  if (!currentStoreId.value) return null
  return stores.value.find((store) => String(store.id) === currentStoreId.value) || null
})

const currentStoreLabel = computed(() => {
  if (!currentStoreId.value) return ''
  const entry = currentStoreEntry.value
  const name = entry?.name && typeof entry.name === 'string' ? entry.name.trim() : ''
  const clientId = entry?.client_id
  const clientLabel =
    typeof clientId === 'string'
      ? clientId
      : typeof clientId === 'number'
        ? String(clientId)
        : ''
  return name || clientLabel || `Магазин #${currentStoreId.value}`
})

const workspaceRoute = (sectionKey: WorkspaceSectionKey) => {
  const id = currentStoreId.value || ''
  return {
    name: 'store-workspace',
    params: { id, section: sectionKey }
  }
}

const goHome = () => {
  storesStore.setActiveStoreId(null)
  router.push({ name: 'dashboard' })
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const refreshFeather = () => {
  if (window.feather) {
    window.feather.replace()
  }
}

const updateStickyOffset = () => {
  const height = navbarEl.value?.offsetHeight ?? 0
  document.documentElement.style.setProperty('--workspace-sticky-offset', `${height}px`)
}

const handleResize = () => {
  updateStickyOffset()
}

onMounted(() => {
  refreshFeather()
  updateStickyOffset()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

watch(
  () => route.fullPath,
  async () => {
    refreshFeather()
    await nextTick()
    updateStickyOffset()
  }
)

watch(
  showWorkspaceTabs,
  async () => {
    await nextTick()
    updateStickyOffset()
  }
)
</script>

<style scoped>
.navbar-inner {
  min-height: 64px;
}

.logo-text {
  font-weight: 700;
  color: #1e1b4b;
  font-size: 1.4rem;
}

.current-store {
  font-weight: 600;
  font-size: 1.4rem;
  color: #1e1b4b;
}

.workspace-tabs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.04);
}

.workspace-tabs__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  color: #475569;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.workspace-tabs__item:hover {
  color: #0f172a;
}

.workspace-tabs__item.active {
  color: #0f172a;
  background: #fff;
  border-color: rgba(15, 23, 42, 0.12);
}

.workspace-tabs__item.active::after {
  content: '';
  position: absolute;
  left: 16%;
  right: 16%;
  bottom: -0.3rem;
  height: 2px;
  background: #f97316;
  border-radius: 999px;
}

.workspace-tabs__icon {
  width: 16px;
  height: 16px;
}

@media (max-width: 768px) {
  .navbar-inner {
    flex-wrap: wrap;
  }

  .workspace-tabs {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

:deep(.navbar-nav.navbar-nav-icons .dropdown-menu-end) {
  transform: translateX(-2rem);
}
</style>
