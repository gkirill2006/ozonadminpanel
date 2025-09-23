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
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4 p-md-5">
            <div class="mb-4">
              <h2 class="mb-2">Ваши бизнесы</h2>
              <p class="text-body-secondary mb-0">Выберите магазин, чтобы перейти к управлению.</p>
            </div>
            <div class="d-flex flex-column gap-3">
              <button
                v-for="store in stores"
                :key="store.id"
                type="button"
                class="business-card p-4 bg-body-secondary-subtle text-start"
                @click="openStore(String(store.id))"
              >
                <h4 class="mb-1">{{ store.name || 'Без названия' }}</h4>
              </button>
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
import { computed, onMounted, ref, watch } from 'vue'
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

const previewCategories = [
  { title: 'Магазин', description: 'Цветы, одежда, электроника', icon: 'fas fa-shopping-bag' },
  { title: 'Доставка еды', description: 'Рестораны и dark kitchen', icon: 'fas fa-pizza-slice' },
  { title: 'Салон красоты', description: 'Услуги для клиентов', icon: 'fas fa-user-tie' },
  { title: 'Фитнес / спорт', description: 'Тренировки и клубы', icon: 'fas fa-dumbbell' },
  { title: 'Бронирование', description: 'Мероприятия и туры', icon: 'fas fa-ticket-alt' },
  { title: 'Универсальная витрина', description: 'Любой формат продаж', icon: 'fas fa-box-open' }
]

const fetchStores = () => storesStore.fetchStores()

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

.business-card {
  background-color: var(--phoenix-secondary-bg, rgba(0, 0, 0, 0.03));
  display: block;
  text-align: left;
  cursor: pointer;
  color: inherit;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background-clip: padding-box;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.business-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
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
