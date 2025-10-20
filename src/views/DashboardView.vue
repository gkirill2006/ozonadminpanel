<template>
  <div class="dashboard">
    <div v-if="storesLoading" class="loading-placeholder">
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      <span>Загрузка магазинов...</span>
    </div>

    <template v-else>
      <div v-if="storesError" class="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-3" role="alert">
        <span>{{ storesError }}</span>
        <button type="button" class="btn btn-link btn-sm p-0" @click="fetchStores">Повторить</button>
      </div>

      <template v-if="hasStores">
        <div class="card border-0 shadow-sm dashboard-card">
          <div class="card-body p-4 p-md-5">
            <div class="mb-4">
              <h2 class="mb-2">Ваши бизнесы</h2>
              <p class="text-body-secondary mb-0">Выберите магазин, чтобы перейти к управлению.</p>
            </div>
            <div class="d-flex flex-column gap-3">
              <div
                v-for="store in stores"
                :key="store.id"
                class="store-card"
              >
                <div class="store-card__header">
                  <div class="store-card__identity">
                    <div class="store-card__avatar">
                      {{ getStoreInitials(store.name) }}
                    </div>
                    <div>
                      <h4 class="store-card__title mb-1">{{ store.name || 'Без названия' }}</h4>
                      <p class="store-card__subtitle mb-0">{{ getBusinessTypeLabel(store.business_type) }}</p>
                    </div>
                  </div>
                  <span
                    class="store-card__status"
                    :class="`store-card__status--${getStoreStatus(store).tone}`"
                  >
                    <i data-feather="check-circle" class="store-card__status-icon"></i>
                    {{ getStoreStatus(store).label }}
                  </span>
                </div>

                <div class="store-card__progress">
                  <div class="store-card__progress-header">
                    <span>Заполнено профиля</span>
                    <span>{{ calculateProfileCompletion(store) }}%</span>
                  </div>
                  <div class="store-card__progress-bar">
                    <div
                      class="store-card__progress-fill"
                      :style="{ width: `${calculateProfileCompletion(store)}%` }"
                    ></div>
                  </div>
                </div>

                <ul class="store-card__details">
                  <li>
                    <i data-feather="map-pin"></i>
                    <span>{{ getPrimaryAddress(store) || 'Адрес не указан' }}</span>
                  </li>
                  <li>
                    <i data-feather="phone"></i>
                    <span>{{ getPrimaryPhone(store) || 'Телефон не указан' }}</span>
                  </li>
                </ul>

                <div class="store-card__tariff">
                  <div class="store-card__tariff-row">
                    <div class="store-card__tariff-icon">
                      <i data-feather="credit-card"></i>
                    </div>
                    <div>
                      <span class="store-card__tariff-label">Тариф: {{ getPlanTitle(store) }}</span>
                      <p class="store-card__tariff-caption mb-0">
                        <i data-feather="calendar"></i>
                        {{ getPlanExpirationText(store) }}
                      </p>
                    </div>
                  </div>
                  <p v-if="getPlanDaysLeft(store) !== null" class="store-card__tariff-days mb-0">
                    Осталось {{ getPlanDaysLeft(store) }} {{ getDaysLabel(getPlanDaysLeft(store) || 0) }}
                  </p>
                </div>

                <div class="store-card__link">
                  <span class="store-card__link-label">Ссылка на витрину</span>
                  <div class="store-card__link-body">
                    <span class="store-card__link-text">{{ getStorePublicLink(store) || '—' }}</span>
                    <button
                      type="button"
                      class="btn btn-link store-card__link-copy"
                      :disabled="!getStorePublicLink(store)"
                      @click="copyStoreLink(store)"
                    >
                      <i
                        :data-feather="copiedStoreId === store.id ? 'check' : 'copy'"
                        class="store-card__link-icon"
                      ></i>
                      <span class="ms-1">
                        {{ copiedStoreId === store.id ? 'Скопировано' : 'Копировать' }}
                      </span>
                    </button>
                  </div>
                </div>

                <div class="store-card__actions">
                  <button
                    type="button"
                    class="btn btn-primary btn-lg w-100"
                    @click="openStore(String(store.id))"
                  >
                    Перейти в управление
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div v-if="hasStores" class="create-wrapper mt-4">
        <template v-if="!isTypeSelectionVisible">
            <div class="create-card p-4 border rounded-3">
              <h5 class="mb-2">Создать новый бизнес</h5>
              <p class="text-body-secondary mb-3">Введите название магазина. Далее выберите тип бизнеса.</p>
              <form class="row g-3 align-items-center" @submit.prevent="startBusinessCreation">
                <div class="col-12 col-md-7">
                  <input
                    v-model="storeNameInput"
                    type="text"
                    class="form-control form-control-lg"
                    placeholder="Название бизнеса"
                    maxlength="60"
                  />
                </div>
                <div class="col-12 col-md-5 d-flex justify-content-md-end">
                  <button type="submit" class="btn btn-primary btn-lg w-100 w-md-auto" :disabled="!isNameValid || isCreating">
                    Продолжить
                  </button>
                </div>
              </form>
              <div v-if="createError" class="alert alert-danger mt-3 mb-0" role="alert">
                {{ createError }}
              </div>
            </div>
          </template>
          <template v-else>
            <div class="create-card p-4 border rounded-3">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 class="mb-1">Выберите тип бизнеса</h5>
                  <p class="text-body-secondary mb-0">Название: «{{ pendingStoreName }}»</p>
                </div>
                <button type="button" class="btn btn-link text-decoration-none" @click="cancelTypeSelection" :disabled="isCreating">
                  Назад
                </button>
              </div>
              <div v-if="businessTypesLoading" class="text-body-secondary">Загружаем типы бизнеса…</div>
              <div v-else-if="businessTypesError" class="alert alert-danger" role="alert">{{ businessTypesError }}</div>
              <div v-else class="type-select-grid">
                <button
                  v-for="type in businessTypes"
                  :key="type.value"
                  type="button"
                  class="type-option"
                  :class="{ active: selectedBusinessType === type.value }"
                  :disabled="isCreating"
                  @click="createBusinessWithType(type.value)"
                >
                  <span class="type-title">{{ type.label }}</span>
                </button>
              </div>
              <div v-if="createError" class="alert alert-danger mt-3 mb-0" role="alert">
                {{ createError }}
              </div>
            </div>
          </template>
        </div>
      </template>

      <template v-else>
        <div class="card border-0 shadow-sm mt-4">
          <div class="card-body p-4 p-md-5">
            <div class="empty-state text-center">
              <template v-if="!isTypeSelectionVisible">
                <div class="hero">
                  <h1 class="hero-title">Создайте свой бизнес в Telegram</h1>
                  <p class="hero-subtitle">Запустите витрину, подключите клиентов и начните продажи за пару минут.</p>
                  <form class="hero-form" @submit.prevent="startBusinessCreation">
                    <input
                      v-model="storeNameInput"
                      type="text"
                      class="form-control form-control-lg hero-input"
                      placeholder="Название бизнеса"
                      maxlength="60"
                    />
                    <button type="submit" class="btn btn-primary btn-lg w-100 hero-button" :disabled="!isNameValid || isCreating">
                      Продолжить
                    </button>
                  </form>
                  <p class="hero-hинт">Позже вы сможете выбрать категорию и оформить витрину</p>
                </div>

                <div class="categories text-center mt-4">
                  <h3 class="mb-4">Или выберите категорию</h3>
                  <div class="row g-4 justify-content-center">
                    <div v-for="category in previewCategories" :key="category.title" class="col-6 col-md-4">
                      <div class="category-card h-100 p-3">
                        <div class="category-icon mb-2">
                          <i :class="category.icon"></i>
                        </div>
                        <h5 class="mb-1">{{ category.title }}</h5>
                        <p class="text-body-secondary mb-0">{{ category.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="type-selection-panel hero-mode mx-auto">
                  <h5 class="mb-2">Выберите тип бизнеса</h5>
                  <p class="text-body-secondary mb-4">Название: «{{ pendingStoreName }}»</p>
                  <div v-if="businessTypesLoading" class="text-body-secondary">Загружаем типы бизнеса…</div>
                  <div v-else-if="businessTypesError" class="alert alert-danger" role="alert">{{ businessTypesError }}</div>
                  <div v-else class="type-select-grid justify-content-center">
                    <button
                      v-for="type in businessTypes"
                      :key="type.value"
                      type="button"
                      class="type-option"
                      :class="{ active: selectedBusinessType === type.value }"
                      :disabled="isCreating"
                      @click="createBusinessWithType(type.value)"
                    >
                      <span class="type-title">{{ type.label }}</span>
                    </button>
                  </div>
                  <button type="button" class="btn btn-link mt-3" @click="cancelTypeSelection" :disabled="isCreating">
                    Назад
                  </button>
                  <div v-if="createError" class="alert alert-danger mt-3 mb-0" role="alert">
                    {{ createError }}
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/stores'
import { apiService } from '@/services/api'

const router = useRouter()
const storesStore = useStoresStore()
const { stores, isLoading: storesLoading, error: storesError, hasStores } = storeToRefs(storesStore)

const isCreating = ref(false)
const createError = ref<string | null>(null)
const storeNameInput = ref('')
const pendingStoreName = ref('')
const isTypeSelectionVisible = ref(false)
const businessTypes = ref<{ value: string; label: string }[]>([])
const businessTypesLoading = ref(false)
const businessTypesError = ref<string | null>(null)
const selectedBusinessType = ref('')
const isNameValid = computed(() => storeNameInput.value.trim().length > 0)
const copiedStoreId = ref<string | null>(null)
let copyResetTimer: number | undefined

const previewCategories = [
  { title: 'Магазин', description: 'Цветы, одежда, электроника', icon: 'fas fa-shopping-bag' },
  { title: 'Доставка еды', description: 'Рестораны и dark kitchen', icon: 'fas fa-pizza-slice' },
  { title: 'Салон красоты', description: 'Услуги для клиентов', icon: 'fas fa-user-tie' },
  { title: 'Фитнес / спорт', description: 'Тренировки и клубы', icon: 'fas fa-dumbbell' },
  { title: 'Бронирование', description: 'Мероприятия и туры', icon: 'fas fa-ticket-alt' },
  { title: 'Универсальная витрина', description: 'Любой формат продаж', icon: 'fas fa-box-open' }
]

const fetchStores = () => storesStore.fetchStores()

const getBusinessTypeLabel = (type: unknown): string => {
  if (!type || typeof type !== 'string') {
    return 'Категория не выбрана'
  }
  const fromFetched = businessTypes.value.find((item) => item.value === type)
  if (fromFetched) {
    return fromFetched.label
  }
  const fallbackMap: Record<string, string> = {
    goods: 'Товары',
    services: 'Услуги'
  }
  return fallbackMap[type] || 'Категория не выбрана'
}

const getStoreInitials = (name: unknown): string => {
  if (!name || typeof name !== 'string') return '—'
  const parts = name.trim().split(/\s+/)
  if (!parts.length) return '—'
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase())
  return initials.join('') || '—'
}

const calculateProfileCompletion = (store: Record<string, any>): number => {
  if (!store) return 0
  const checks: Array<boolean> = [
    Boolean(store.description),
    Boolean(store.logo),
    Boolean(store.banner),
    Boolean(getPrimaryAddress(store)),
    Boolean(getPrimaryPhone(store)),
    Boolean(store.telegram_bot_username),
    Boolean(store.business_type || store.custom_category)
  ]
  const total = checks.length
  const filled = checks.filter(Boolean).length
  const percent = Math.max(10, Math.round((filled / total) * 100))
  return Math.min(100, percent)
}

const getPrimaryAddress = (store: Record<string, any>): string | null => {
  if (!store) return null
  const fromArray = Array.isArray(store.addresses) ? store.addresses.find(Boolean) : null
  const addressCandidate = fromArray || store.primary_address || store.address || null
  if (addressCandidate?.address_text && typeof addressCandidate.address_text === 'string') {
    return addressCandidate.address_text.trim() || null
  }
  if (addressCandidate?.address && typeof addressCandidate.address === 'string') {
    return addressCandidate.address.trim() || null
  }
  if (addressCandidate?.full_address && typeof addressCandidate.full_address === 'string') {
    return addressCandidate.full_address.trim() || null
  }
  const fallback = [store.address_text, store.location, store.city, store.street_address].find(
    (value) => typeof value === 'string' && value.trim().length
  )
  return fallback ? String(fallback).trim() : null
}

const getPrimaryPhone = (store: Record<string, any>): string | null => {
  if (!store) return null
  const fromArray = Array.isArray(store.phones) ? store.phones.find(Boolean) : null
  const phoneCandidate = fromArray || store.primary_phone || store.phone || null
  const candidateValues = [
    phoneCandidate?.number,
    phoneCandidate?.formatted,
    store.phone,
    store.contact_phone,
    store.telephone,
    Array.isArray(store.addresses) ? store.addresses.find((addr: any) => addr?.phones?.length)?.phones?.[0]?.number : null
  ]
  const result = candidateValues.find((value) => typeof value === 'string' && value.trim().length)
  return result ? String(result).trim() : null
}

const getStoreStatus = (store: Record<string, any>) => {
  if (store?.is_active === false) {
    return { label: 'Неактивен', tone: 'warning' }
  }
  return { label: 'Готов', tone: 'success' }
}

const formatDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

const getPlanTitle = (store: Record<string, any>): string => {
  return store?.subscription?.plan?.title || store?.plan_title || 'Не выбран'
}

const getPlanExpirationText = (store: Record<string, any>): string => {
  const expiresAt = store?.subscription?.expires_at || store?.plan_expires_at
  const formatted = formatDate(expiresAt)
  if (!formatted) {
    return 'Дата окончания не указана'
  }
  return `До ${formatted}`
}

const getPlanDaysLeft = (store: Record<string, any>): number | null => {
  const expiresAt = store?.subscription?.expires_at || store?.plan_expires_at
  if (!expiresAt) return null
  const target = new Date(expiresAt)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : 0
}

const getDaysLabel = (value: number): string => {
  const absValue = Math.abs(value)
  const lastTwo = absValue % 100
  const lastOne = absValue % 10
  if (lastTwo >= 11 && lastTwo <= 19) {
    return 'дней'
  }
  if (lastOne === 1) return 'день'
  if (lastOne >= 2 && lastOne <= 4) return 'дня'
  return 'дней'
}

const getStorePublicLink = (store: Record<string, any>): string => {
  const explicit = store?.public_url || store?.url || store?.landing_url
  if (explicit) return explicit
  const slug = store?.slug || store?.theme || store?.alias
  if (slug) {
    return `https://tgpoint.app/store/${slug}`
  }
  if (store?.telegram_bot_username) {
    return `https://t.me/${store.telegram_bot_username}`
  }
  return ''
}

const copyStoreLink = async (store: Record<string, any>) => {
  const link = getStorePublicLink(store)
  if (!link) return
  try {
    await navigator.clipboard.writeText(link)
    copiedStoreId.value = store.id
    if (copyResetTimer !== undefined) {
      window.clearTimeout(copyResetTimer)
    }
    copyResetTimer = window.setTimeout(() => {
      copiedStoreId.value = null
      if (window.feather) {
        window.feather.replace()
      }
    }, 1500)
    if (window.feather) {
      window.feather.replace()
    }
  } catch (error) {
    console.error('Clipboard copy failed', error)
  }
}

const fetchBusinessTypes = async () => {
  businessTypesLoading.value = true
  businessTypesError.value = null
  try {
    const data = await apiService.getBusinessTypes()
    businessTypes.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    businessTypesError.value = error instanceof Error ? error.message : 'Не удалось загрузить типы бизнеса'
  } finally {
    businessTypesLoading.value = false
  }
}

const openStore = (storeId: string) => {
  if (!storeId) return
  storesStore.setActiveStoreId(storeId)
  router.push({ name: 'stores', query: { store: storeId } })
}

const startBusinessCreation = async () => {
  if (!isNameValid.value || isCreating.value) return
  pendingStoreName.value = storeNameInput.value.trim()
  isTypeSelectionVisible.value = true
  selectedBusinessType.value = ''
  createError.value = null
  if (!businessTypes.value.length) {
    await fetchBusinessTypes()
  }
}

const cancelTypeSelection = () => {
  isTypeSelectionVisible.value = false
  storeNameInput.value = pendingStoreName.value
  pendingStoreName.value = ''
  selectedBusinessType.value = ''
  createError.value = null
}

const resetCreationState = () => {
  storeNameInput.value = ''
  pendingStoreName.value = ''
  isTypeSelectionVisible.value = false
  selectedBusinessType.value = ''
}

const createBusinessWithType = async (businessType: string) => {
  if (isCreating.value || !pendingStoreName.value) return

  isCreating.value = true
  createError.value = null
  selectedBusinessType.value = businessType

  try {
    const created = await storesStore.createStore({
      name: pendingStoreName.value,
      business_type: businessType
    })
    const createdId = created?.id ? String(created.id) : null
    resetCreationState()
    if (createdId) {
      openStore(createdId)
    }
  } catch (error: unknown) {
    createError.value = error instanceof Error ? error.message : 'Не удалось создать бизнес'
  } finally {
    isCreating.value = false
  }
}

watch(
  stores,
  () => {
    if (window.feather) {
      window.feather.replace()
    }
  },
  { deep: true }
)

watch(
  () => storeNameInput.value,
  () => {
    if (createError.value) createError.value = null
  }
)

watch(
  () => isTypeSelectionVisible.value,
  (visible) => {
    if (!visible) {
      selectedBusinessType.value = ''
    }
  }
)

onMounted(() => {
  if (!stores.value.length && !storesLoading.value) {
    fetchStores()
  }
  fetchBusinessTypes()
  if (window.feather) {
    window.feather.replace()
  }
})

onUnmounted(() => {
  if (copyResetTimer !== undefined) {
    window.clearTimeout(copyResetTimer)
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 0;
}

.loading-placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  justify-content: center;
}

.dashboard-card {
  border-radius: 24px;
}

.store-card {
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.store-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.store-card__identity {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.store-card__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  font-weight: 700;
  font-size: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.store-card__title {
  font-weight: 700;
  font-size: 1.35rem;
  color: #0f172a;
}

.store-card__subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.store-card__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.store-card__status-icon {
  width: 16px;
  height: 16px;
}

.store-card__status--success {
  background: #dcfce7;
  color: #15803d;
  border-color: rgba(21, 128, 61, 0.2);
}

.store-card__status--warning {
  background: #fef3c7;
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.2);
}

.store-card__progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.store-card__progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #475569;
  font-weight: 600;
}

.store-card__progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.store-card__progress-fill {
  height: 100%;
  background: #0f172a;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.store-card__details {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: #0f172a;
}

.store-card__details li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.store-card__details i {
  width: 18px;
  height: 18px;
  color: #64748b;
}

.store-card__tariff {
  background: rgba(37, 99, 235, 0.08);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.store-card__tariff-row {
  display: flex;
  gap: 0.75rem;
}

.store-card__tariff-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.store-card__tariff-icon i {
  width: 18px;
  height: 18px;
}

.store-card__tariff-label {
  font-weight: 600;
  color: #1d4ed8;
  display: block;
}

.store-card__tariff-caption {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #475569;
  font-size: 0.9rem;
}

.store-card__tariff-caption i {
  width: 16px;
  height: 16px;
  color: #475569;
}

.store-card__tariff-days {
  color: #16a34a;
  font-weight: 600;
  font-size: 0.95rem;
}

.store-card__link {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.store-card__link-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
}

.store-card__link-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #f8fafc;
  border-radius: 14px;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.store-card__link-text {
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-card__link-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
  padding: 0;
}

.store-card__link-copy:disabled {
  color: #94a3b8;
}

.store-card__link-icon {
  width: 16px;
  height: 16px;
}

.store-card__actions .btn {
  border-radius: 14px;
  font-weight: 600;
  padding: 0.85rem 1.25rem;
}

.store-card__actions .btn:focus {
  box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.2);
}

@media (max-width: 576px) {
  .dashboard {
    padding-top: 0px;
  }

  .dashboard-card {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    border-radius: 0;
    box-shadow: none;
  }

  .dashboard-card .card-body {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .store-card {
    padding: 1.25rem;
    border-radius: 20px;
  }

  .store-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .store-card__status {
    margin-top: 0.5rem;
  }

  .store-card__link-body {
    flex-direction: column;
    align-items: flex-start;
  }

  .store-card__link-copy {
    padding-top: 0.25rem;
  }
}

.create-wrapper {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.02);
}

.create-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.type-select-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.type-option {
  min-width: 160px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  color: #1f2a37;
  text-align: left;
  font-weight: 600;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.type-option:hover,
.type-option.active {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.25);
}

.type-option:disabled {
  opacity: 0.6;
  cursor: default;
}

.type-title {
  font-size: 1rem;
  display: block;
}

.type-selection-panel {
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  padding: 2rem;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  width: 100%;
}

.type-selection-panel.hero-mode {
  max-width: 420px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  align-items: center;
}

.hero {
  max-width: 540px;
}

.hero-title {
  font-weight: 700;
  font-size: 2.375rem;
  line-height: 1.2;
  color: #1f2a37;
}

.hero-subtitle {
  color: #6b7280;
  margin-bottom: 2rem;
}

.hero-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-input {
  padding: 0.9rem 1.25rem;
  font-size: 1rem;
  border-radius: 12px;
  border: 1px solid #d1d5db;
}

.hero-button {
  padding: 0.85rem 1.25rem;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 600;
}

.hero-hint {
  margin-top: 1rem;
  color: #6b7280;
}

.categories {
  max-width: 720px;
}

.category-card {
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}

.category-icon {
  font-size: 1.8rem;
  color: #1f2a37;
}
</style>
