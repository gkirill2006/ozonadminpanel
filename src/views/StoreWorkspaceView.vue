<template>
  <div class="workspace">
    <div class="workspace-card card shadow-sm">
      <div class="card-body">
        <div v-if="isLoading" class="state state--loading">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Загружаем данные магазина...
        </div>

        <div v-else-if="loadError" class="alert alert-danger d-flex align-items-center justify-content-between gap-3" role="alert">
          <span>{{ loadError }}</span>
          <button type="button" class="btn btn-link btn-sm p-0" @click="fetchStore">Повторить</button>
        </div>

        <template v-else>
          <PlannerSection v-if="activeSection === 'planner'" :store-id="storeId" />
          <SupplySection v-else-if="activeSection === 'supply'" :store-id="storeId" />
          <SupplyDraftsSection v-else-if="activeSection === 'drafts'" :store-id="storeId" />
          <FbsSection v-else-if="activeSection === 'fbs'" :store-id="storeId" />
          <WorkspaceSettingsSection v-else-if="activeSection === 'settings'" :store-id="storeId" :store="store" />
          <div v-else class="section-body">
            <div class="section-placeholder">
              <h3 class="mb-2">{{ currentSectionLabel }}</h3>
              <p class="text-body-secondary mb-4">Контент раздела пока в разработке.</p>
              <div class="store-meta">
                <div>
                  <span class="meta-label">ID магазина</span>
                  <p class="meta-value mb-0">{{ storeId }}</p>
                </div>
                <div v-if="store?.client_id">
                  <span class="meta-label">Client ID</span>
                  <p class="meta-value mb-0"><code>{{ store.client_id }}</code></p>
                </div>
                <div v-if="store?.api_key">
                  <span class="meta-label">API ключ (маскирован)</span>
                  <p class="meta-value mb-0"><code>{{ maskSensitiveValue(store.api_key) }}</code></p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService } from '@/services/api'
import {
  WORKSPACE_SECTIONS,
  type WorkspaceSectionKey,
  normalizeWorkspaceSection,
  DEFAULT_WORKSPACE_SECTION
} from '@/constants/workspace'
import PlannerSection from './workspace/PlannerSection.vue'
import SupplySection from './workspace/SupplySection.vue'
import SupplyDraftsSection from './workspace/SupplyDraftsSection.vue'
import FbsSection from './workspace/FbsSection.vue'
import WorkspaceSettingsSection from './workspace/SettingsSection.vue'
import { useStoresStore } from '@/stores/stores'

interface AuthStore {
  id: number | string
  name?: string | null
  client_id?: string | number | null
  api_key?: string
  [key: string]: unknown
}

const sections = WORKSPACE_SECTIONS

const route = useRoute()
const router = useRouter()
const storesStore = useStoresStore()
const store = ref<AuthStore | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const storeId = computed(() => (route.params.id ? String(route.params.id) : ''))

const activeSection = ref<WorkspaceSectionKey>(DEFAULT_WORKSPACE_SECTION)
const currentSectionLabel = computed(() => sections.find((section) => section.key === activeSection.value)?.label || '')

const maskSensitiveValue = (value?: string | null, visible = 4): string => {
  if (!value) return '—'
  if (value.length <= visible * 2) return value
  return `${value.slice(0, visible)}•••${value.slice(-visible)}`
}

const fetchStore = async () => {
  if (!storeId.value) {
    store.value = null
    loadError.value = 'Магазин не найден'
    return
  }
  isLoading.value = true
  loadError.value = null
  try {
    const data = await apiService.getStore(storeId.value)
    store.value = data || null
    if (!store.value) {
      loadError.value = 'Магазин не найден'
      storesStore.setActiveStoreId(null)
    } else {
      const normalizedId = String(store.value.id)
      storesStore.upsertStore({
        ...store.value,
        id: normalizedId,
        name: store.value.name ?? null
      })
      storesStore.setActiveStoreId(normalizedId)
    }
  } catch (error: unknown) {
    loadError.value = error instanceof Error ? error.message : 'Не удалось загрузить магазин'
  } finally {
    isLoading.value = false
  }
}

watch(
  storeId,
  (id) => {
    const normalizedId = id || null
    storesStore.setActiveStoreId(normalizedId)
    activeSection.value = normalizeWorkspaceSection(route.params.section as string | undefined)
    fetchStore()
  },
  { immediate: true }
)

watch(
  () => route.params.section,
  (section) => {
    const normalized = normalizeWorkspaceSection(typeof section === 'string' ? section : undefined)
    if (normalized !== activeSection.value) {
      activeSection.value = normalized
    }
    const raw = typeof section === 'string' ? section : undefined
    if (raw !== normalized && storeId.value) {
      router.replace({
        name: 'store-workspace',
        params: { id: storeId.value, section: normalized }
      })
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.workspace {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.workspace-card {
  border: none;
  border-radius: 24px;
}

.state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  border: 1px dashed rgba(15, 23, 42, 0.1);
  border-radius: 16px;
}

.section-body {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  padding: 2rem;
  background: rgba(15, 23, 42, 0.015);
}

.section-placeholder {
  max-width: 720px;
}

.store-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.meta-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.meta-value {
  font-weight: 600;
  color: #111827;
  word-break: break-all;
}

@media (max-width: 576px) {
  .workspace {
    padding: 1rem;
  }

  .section-body {
    padding: 1.25rem;
  }
}
</style>
