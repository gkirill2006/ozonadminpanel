<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStoresStore } from '@/stores/stores'
import TopNavbar from './components/TopNavbar.vue'
import router from './router'
import { tryTelegramAutoLogin, initTelegramUI } from '@/utils/telegram'

const authStore = useAuthStore()
const storesStore = useStoresStore()
const isAppReady = ref(false)
const cursorSelector = [
  'a[href]',
  'button',
  '[role="button"]',
  '[data-bs-toggle]',
  '[data-action]',
  '.cursor-pointer',
  '.clickable',
  '.workspace-tabs__item',
  '.fbs-batch-card',
  '.nav-link',
  '.dropdown-item',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'label[for]',
  'summary',
  'select'
].join(',')
const cursorIgnoreSelector = [
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="password"]',
  'textarea',
  '[contenteditable="true"]'
].join(',')
const cursorDisabledSelector = 'button:disabled, .btn:disabled, [aria-disabled="true"], input:disabled, select:disabled'
let cursorRaf = 0

const setBodyCursor = (value: string | null) => {
  const body = document.body
  if (!body) return
  if (!value) {
    body.removeAttribute('data-cursor')
    return
  }
  body.setAttribute('data-cursor', value)
}

const handlePointerMove = (event: PointerEvent) => {
  if (cursorRaf) return
  const target = event.target
  cursorRaf = window.requestAnimationFrame(() => {
    cursorRaf = 0
    const element = target instanceof Element ? target : target?.parentElement
    if (!element) {
      setBodyCursor(null)
      return
    }
    if (element.closest(cursorIgnoreSelector)) {
      setBodyCursor(null)
      return
    }
    const interactive = element.closest(cursorSelector)
    if (!interactive) {
      setBodyCursor(null)
      return
    }
    const isDisabled = interactive.matches(cursorDisabledSelector)
    setBodyCursor(isDisabled ? 'not-allowed' : 'pointer')
  })
}

const clearBodyCursor = () => {
  setBodyCursor(null)
}

onMounted(async () => {
  document.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('blur', clearBodyCursor)

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

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('blur', clearBodyCursor)
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
        <TopNavbar />
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

.content {
  padding: 0 !important;
  min-height: calc(100vh - var(--phoenix-navbar-top-height));
}

#app a,
#app a *,
#app button,
#app button *,
#app [role='button'],
#app [role='button'] *,
#app [type='button'],
#app [type='submit'],
#app [type='reset'],
#app [type='image'],
#app input[type='checkbox'],
#app input[type='radio'],
#app label,
#app select,
#app summary,
#app .btn,
#app .btn *,
#app .nav-link,
#app .nav-link *,
#app .dropdown-item,
#app .dropdown-item *,
#app .workspace-tabs__item,
#app .workspace-tabs__item *,
#app .form-check-input,
#app .form-check-label,
#app .cursor-pointer,
#app .clickable,
#app [onclick] {
  cursor: pointer !important;
}

#app button:disabled,
#app .btn:disabled,
#app [role='button'][aria-disabled='true'],
#app input:disabled,
#app select:disabled {
  cursor: not-allowed !important;
}

body[data-cursor='pointer'],
body[data-cursor='pointer'] * {
  cursor: pointer !important;
}

body[data-cursor='not-allowed'],
body[data-cursor='not-allowed'] * {
  cursor: not-allowed !important;
}
</style>
