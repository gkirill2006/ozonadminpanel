<template>
  <div class="dashboard">
    <div class="dashboard-grid">
<section class="card shadow-sm dashboard-section">
        <div class="card-header d-flex align-items-start justify-content-between flex-wrap gap-2">
          <div>
            <h2 class="mb-1">Магазины</h2>
            <p class="text-body-secondary mb-0">Выберите магазин, чтобы перейти в рабочее пространство.</p>
          </div>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            @click="fetchStores"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            Обновить
          </button>
        </div>
        <div class="card-body">
          <div v-if="isLoading" class="state state--loading">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Загружаем список магазинов...
          </div>

          <div
            v-else-if="errorMessage"
            class="alert alert-danger d-flex align-items-center justify-content-between gap-3"
            role="alert"
          >
            <span>{{ errorMessage }}</span>
            <button type="button" class="btn btn-link btn-sm p-0" @click="fetchStores">Повторить</button>
          </div>

          <div v-else-if="!hasStores" class="state state--empty">
            <div v-if="invites?.length" class="mb-4 text-start w-100">
              <h5 class="mb-2">Приглашения</h5>
              <div class="d-flex flex-column gap-2">
                <div
                  v-for="inv in invites"
                  :key="inv?.store_id || inv?.store || inv?.id"
                  class="d-flex align-items-center justify-content-between invite-row"
                >
                  <div class="d-flex flex-column">
                    <strong>{{ inv?.store_name || inv?.name || `Магазин ${inv?.store_id || ''}` }}</strong>
                    <small class="text-body-secondary">Владелец: {{ inv?.invited_by || inv?.owner_username || inv?.owner || '—' }}</small>
                  </div>
                  <div class="d-flex gap-2">
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm"
                      :disabled="respondingInviteId === (inv?.store_id || inv?.store || inv?.id)"
                      @click="respondInvite(inv, 'reject')"
                    >
                      Отклонить
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      :disabled="respondingInviteId === (inv?.store_id || inv?.store || inv?.id)"
                      @click="respondInvite(inv, 'accept')"
                    >
                      <span v-if="respondingInviteId === (inv?.store_id || inv?.store || inv?.id)" class="spinner-border spinner-border-sm me-1"></span>
                      Принять
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="inviteError" class="alert alert-danger mt-3 mb-0 py-2 px-3">{{ inviteError }}</div>
            </div>
            <h4>Пока нет ни одного магазина</h4>
            <p class="text-body-secondary mb-3">
              Добавьте первый магазин, чтобы получить client_id и API ключ в одном месте.
            </p>
            <button class="btn btn-primary" type="button" @click="focusForm">Создать магазин</button>
          </div>

          <div v-else class="store-buttons">
            <button
              v-for="store in stores"
              :key="store.id"
              type="button"
              class="store-button btn btn-outline-dark d-flex align-items-center justify-content-between"
              @click="openWorkspace(store)"
            >
              <span class="store-button__title">{{ store.name || `Магазин #${store.id}` }}</span>
              <span class="store-button__meta text-body-secondary">
                ID {{ store.id }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section class="card shadow-sm form-section" ref="formSectionRef">
        <div class="card-header">
          <h3 class="mb-1">Добавить магазин</h3>
          <p class="text-body-secondary mb-0">Client ID и API ключ обязательны, остальные поля можно заполнить позже.</p>
        </div>
        <div class="card-body">
          <form class="store-form" @submit.prevent="handleCreate">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Название (опционально)</label>
                <input
                  v-model.trim="form.name"
                  type="text"
                  class="form-control"
                  placeholder="Например, OPanel Маркет"
                >
              </div>
              <div class="col-md-6">
                <label class="form-label">Client ID *</label>
                <input
                  v-model.trim="form.client_id"
                  type="text"
                  class="form-control"
                  required
                  placeholder="client_id из Ozon"
                >
              </div>
              <div class="col-md-6">
                <label class="form-label">API ключ *</label>
                <input
                  v-model.trim="form.api_key"
                  type="text"
                  class="form-control"
                  required
                  placeholder="API ключ"
                >
              </div>
              <div class="col-12">
                <label class="form-label">Google Sheet URL</label>
                <input
                  v-model.trim="form.google_sheet_url"
                  type="url"
                  class="form-control"
                  placeholder="https://docs.google.com/..."
                >
              </div>
              <div class="col-md-6">
                <label class="form-label">Performance service account</label>
                <input
                  v-model.trim="form.performance_service_account_number"
                  type="text"
                  class="form-control"
                  placeholder="service-account@project.iam.gserviceaccount.com"
                >
              </div>
              <div class="col-md-6">
                <label class="form-label">Performance client ID</label>
                <input
                  v-model.trim="form.performance_client_id"
                  type="text"
                  class="form-control"
                  placeholder="Performance client id"
                >
              </div>
              <div class="col-12">
                <label class="form-label">Performance client secret</label>
                <input
                  v-model.trim="form.performance_client_secret"
                  type="text"
                  class="form-control"
                  placeholder="Client secret"
                >
              </div>
            </div>

            <div v-if="formError" class="alert alert-danger mt-3 mb-0">
              {{ formError }}
            </div>
            <div v-else-if="formSuccess" class="alert alert-success mt-3 mb-0">
              {{ formSuccess }}
            </div>

            <div class="d-grid mt-4">
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                Создать магазин
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '@/services/api'
import { DEFAULT_WORKSPACE_SECTION } from '@/constants/workspace'
import { useStoresStore } from '@/stores/stores'
import { storeToRefs } from 'pinia'

interface AuthStore {
  id: string
  name?: string | null
  client_id?: string | number | null
  api_key?: string | null
  google_sheet_url?: string | null
  urls?: Record<string, string | null> | null
  performance_service_account_number?: string | null
  performance_client_id?: string | null
  performance_client_secret?: string | null
  [key: string]: unknown
}

const storesStore = useStoresStore()
const { stores, invites, isLoading, error: errorMessage } = storeToRefs(storesStore)
const formSectionRef = ref<HTMLElement | null>(null)

const router = useRouter()

const form = reactive({
  name: '',
  client_id: '',
  api_key: '',
  google_sheet_url: '',
  performance_service_account_number: '',
  performance_client_id: '',
  performance_client_secret: ''
})

const formError = ref<string | null>(null)
const formSuccess = ref<string | null>(null)
const isSubmitting = ref(false)

const hasStores = computed(() => stores.value.length > 0)
const respondingInviteId = ref<string | number | null>(null)
const inviteError = ref<string | null>(null)

const resetForm = () => {
  form.name = ''
  form.client_id = ''
  form.api_key = ''
  form.google_sheet_url = ''
  form.performance_service_account_number = ''
  form.performance_client_id = ''
  form.performance_client_secret = ''
}

const fetchStores = async () => {
  await storesStore.fetchStores()
}

const handleCreate = async () => {
  formError.value = null
  formSuccess.value = null

  if (!form.client_id.trim() || !form.api_key.trim()) {
    formError.value = 'Укажите client_id и API ключ'
    return
  }

  const payload = Object.entries(form).reduce<Record<string, string>>((acc, [key, value]) => {
    const trimmed = value.trim()
    if (trimmed) {
      acc[key] = trimmed
    }
    return acc
  }, {})

  isSubmitting.value = true
  try {
    const created = await apiService.createAuthStore(payload)
    if (created) {
      stores.value = [created as AuthStore, ...stores.value.filter((store) => store.id !== created.id)]
      formSuccess.value = 'Магазин создан'
      resetForm()
      await fetchStores()
    }
  } catch (error: unknown) {
    formError.value = error instanceof Error ? error.message : 'Не удалось создать магазин'
  } finally {
    isSubmitting.value = false
  }
}

const focusForm = () => {
  if (formSectionRef.value) {
    formSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const respondInvite = async (inv: any, decision: 'accept' | 'reject') => {
  const storeId = inv?.store_id || inv?.store || inv?.id
  if (!storeId) return
  respondingInviteId.value = storeId
  inviteError.value = null
  try {
    await apiService.respondStoreInvite(storeId, decision)
    await fetchStores()
    if (decision === 'accept' && stores.value.length) {
      router.push({
        name: 'store-workspace',
        params: { id: stores.value[0].id, section: DEFAULT_WORKSPACE_SECTION }
      })
    }
  } catch (error) {
    inviteError.value = error instanceof Error ? error.message : 'Не удалось обработать приглашение'
  } finally {
    respondingInviteId.value = null
  }
}

const openWorkspace = (store: AuthStore) => {
  if (!store?.id) return
  storesStore.setActiveStoreId(String(store.id))
  router.push({
    name: 'store-workspace',
    params: { id: String(store.id), section: DEFAULT_WORKSPACE_SECTION }
  })
}

onMounted(async () => {
  await fetchStores()
})
</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
}

.dashboard-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

@media (max-width: 992px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.dashboard-section,
.form-section {
  border: none;
  border-radius: 24px;
}

.card-header {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}

.card-body {
  background: #fff;
}

.state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  border: 1px dashed rgba(15, 23, 42, 0.1);
  border-radius: 16px;
}

.state--empty {
  flex-direction: column;
  text-align: center;
  gap: 0.75rem;
}

.store-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.store-button {
  border-radius: 16px;
  padding: 1rem 1.25rem;
  border-width: 1.5px;
  font-weight: 600;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.store-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.store-button__title {
  font-size: 1.1rem;
}

.store-button__meta {
  font-size: 0.85rem;
}

.store-form .form-label {
  font-weight: 600;
}

.store-form .form-control {
  border-radius: 12px;
  padding: 0.75rem 1rem;
}

.store-form .btn {
  border-radius: 12px;
  font-weight: 600;
  padding: 0.85rem 1.25rem;
}

@media (max-width: 576px) {
  .dashboard {
    padding: 1rem;
  }

  .dashboard-section,
  .form-section {
    border-radius: 16px;
  }

  .store-card {
    padding: 1.25rem;
  }
}
</style>
