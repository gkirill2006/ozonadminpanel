<template>
  <div class="dashboard">
    <div class="card border-0 shadow-sm">
      <div class="card-body p-4 p-md-5">
        <div v-if="storesLoading" class="d-flex align-items-center gap-2">
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span>Загрузка магазинов...</span>
        </div>

        <template v-else>
          <div v-if="storesError" class="alert alert-danger d-flex align-items-center justify-content-between gap-3" role="alert">
            <span>{{ storesError }}</span>
            <button type="button" class="btn btn-link btn-sm p-0" @click="fetchStores">Повторить</button>
          </div>

          <div v-if="hasStores" class="d-flex flex-column gap-3">
            <button
              v-for="store in stores"
              :key="store.id"
              type="button"
              class="business-card p-4 bg-body-secondary-subtle text-start"
              @click="openStore(String(store.id))"
            >
              <h4 class="mb-1">{{ store.name || 'Без названия' }}</h4>
              <p class="text-body-secondary mb-0">Магазин TGPoint</p>
            </button>
            <div>
              <button
                type="button"
                class="btn btn-outline-primary"
                :disabled="isCreating"
                @click="createBusiness"
              >
                <span v-if="isCreating" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ isCreating ? 'Создание...' : 'Создать ещё один бизнес' }}
              </button>
              <div v-if="createError" class="alert alert-danger mt-3 mb-0" role="alert">
                {{ createError }}
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="hero text-center">
              <h1 class="hero-title">Создайте свой бизнес в Telegram</h1>
              <p class="hero-subtitle">Запустите витрину, подключите клиентов и начните продажи за пару минут.</p>
              <form class="hero-form" @submit.prevent="createBusiness">
                <input
                  v-model="customStoreName"
                  type="text"
                  class="form-control form-control-lg hero-input"
                  placeholder="Название бизнеса"
                  :disabled="isCreating"
                  maxlength="60"
                />
                <button type="submit" class="btn btn-primary btn-lg w-100 hero-button" :disabled="isCreating">
                  <span v-if="isCreating" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isCreating ? 'Создание...' : 'Создать бизнес' }}
                </button>
              </form>
              <p class="hero-hint">Позже вы сможете выбрать категорию и оформить витрину</p>
            </div>

            <div class="categories text-center">
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

            <div v-if="createError" class="alert alert-danger mt-4" role="alert">
              {{ createError }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/stores'

const router = useRouter()
const storesStore = useStoresStore()
const { stores, isLoading: storesLoading, error: storesError, hasStores } = storeToRefs(storesStore)

const isCreating = ref(false)
const createError = ref<string | null>(null)
const customStoreName = ref('')

const previewCategories = [
  {
    title: 'Магазин',
    description: 'Цветы, одежда, электроника',
    icon: 'fas fa-shopping-bag'
  },
  {
    title: 'Доставка еды',
    description: 'Рестораны и dark kitchen',
    icon: 'fas fa-pizza-slice'
  },
  {
    title: 'Салон красоты',
    description: 'Услуги для клиентов',
    icon: 'fas fa-user-tie'
  },
  {
    title: 'Фитнес / спорт',
    description: 'Тренировки и клубы',
    icon: 'fas fa-dumbbell'
  },
  {
    title: 'Бронирование',
    description: 'ВКЕ, мероприятия, туры',
    icon: 'fas fa-ticket-alt'
  },
  {
    title: 'Универсальная витрина',
    description: 'Любой формат продаж',
    icon: 'fas fa-box-open'
  }
]

const fetchStores = () => storesStore.fetchStores()

const openStore = (storeId: string) => {
  if (!storeId) return
  storesStore.setActiveStoreId(storeId)
  router.push({ name: 'stores', query: { store: storeId } })
}

const nextBusinessNumber = computed(() => {
  const numbers = stores.value
    .map((store) => {
      const name = String(store?.name ?? '')
      const match = name.match(/Бизнес №(\d+)/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => value !== null)

  const maxNumber = numbers.length ? Math.max(...numbers) : 0
  return maxNumber + 1
})

const defaultStoreName = computed(() => `Бизнес №${nextBusinessNumber.value}`)

const createBusiness = async () => {
  if (isCreating.value) return

  isCreating.value = true
  createError.value = null

  try {
    const payloadName = customStoreName.value.trim() || defaultStoreName.value
    const created = await storesStore.createStore({ name: payloadName })
    customStoreName.value = ''
    const createdId = created?.id ? String(created.id) : null
    if (createdId) {
      storesStore.setActiveStoreId(createdId)
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

onMounted(() => {
  if (!stores.value.length && !storesLoading.value) {
    storesStore.fetchStores()
  }

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
