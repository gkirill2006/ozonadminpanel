<template>
  <div class="store-settings" v-if="isStoreLoading">
    <div class="card border-0 shadow-sm">
      <div class="card-body py-5 d-flex justify-content-center align-items-center gap-2">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span>Загрузка магазина...</span>
      </div>
    </div>
  </div>
  <div v-else-if="storeError" class="store-settings">
    <div class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
      <span>{{ storeError }}</span>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="retryFetch">Повторить</button>
    </div>
  </div>
  <div v-else-if="!currentStoreId" class="store-settings">
    <div class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <h3 class="mb-3">Магазин не найден</h3>
        <p class="text-body-secondary mb-4">Создайте магазин на дэшборде, чтобы перейти к настройкам.</p>
        <button type="button" class="btn btn-primary" @click="goToDashboard">Вернуться на главную</button>
      </div>
    </div>
  </div>
  <div v-else class="store-settings">
    <div class="page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h1 class="mb-1">{{ storeForm.name || 'Без названия' }}</h1>
        <p class="text-body-secondary mb-0">Настройте свой магазин и заполните информацию для клиентов.</p>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="goToDashboard">← К списку</button>
      </div>
    </div>

    <ul class="nav nav-pills gap-2 flex-wrap mb-4" role="tablist">
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'general' }"
          role="tab"
          @click="activeTab = 'general'"
        >
          Общие настройки
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'addresses', disabled: !storeDetail?.business_type }"
          role="tab"
          :disabled="!storeDetail?.business_type"
          @click="activeTab = 'addresses'"
        >
          Адреса и точки
        </button>
      </li>
    </ul>

    <div v-if="activeTab === 'general'" class="tab-pane active" role="tabpanel">
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3 d-flex align-items-center justify-content-between">
          <h5 class="mb-0">Тип бизнеса</h5>
        </div>
        <div class="card-body">
          <template v-if="storeDetail?.business_type">
            <p class="mb-1">
              Тип: <strong>{{ businessTypeLabel }}</strong>
            </p>
            <p class="text-body-secondary mb-0 small">Тип выбран и изменить его нельзя.</p>
          </template>
          <template v-else>
            <p class="text-body-secondary">Выберите, что вы предлагаете клиентам. После выбора изменить тип нельзя.</p>
            <div class="business-type-options mb-3">
              <button
                v-for="type in businessTypes"
                :key="type.value"
                type="button"
                class="type-chip"
                :class="{ active: selectedBusinessType === type.value }"
                :disabled="typeSaveLoading"
                @click="selectedBusinessType = type.value"
              >
                {{ type.label }}
              </button>
            </div>
            <div v-if="businessTypesLoading" class="text-body-secondary small">Загружаем типы бизнеса…</div>
            <div v-else-if="businessTypesError" class="alert alert-danger" role="alert">{{ businessTypesError }}</div>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="typeSaveLoading || !selectedBusinessType"
              @click="saveBusinessType"
            >
              <span v-if="typeSaveLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Сохранить тип
            </button>
            <div v-if="typeSaveError" class="alert alert-danger mt-3 mb-0" role="alert">
              {{ typeSaveError }}
            </div>
          </template>
        </div>
      </div>

      <div v-if="storeDetail?.business_type" class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3 d-flex align-items-center justify-content-between">
          <h5 class="mb-0">Категория витрины</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Категория</label>
              <select
                class="form-select"
                v-model="selectedCategoryId"
                :disabled="categoriesLoading || categorySaveLoading"
                @change="handleCategorySelect"
              >
                <option value="">Указать свою</option>
                <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                  {{ category.name }}
                </option>
              </select>
              <div v-if="categoriesLoading" class="text-body-secondary small mt-2">Загружаем возможные категории…</div>
              <div v-else-if="categoriesError" class="text-danger small mt-2">{{ categoriesError }}</div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Своя категория</label>
              <input
                v-model="customCategoryValue"
                type="text"
                class="form-control"
                placeholder="Например, Авторские изделия"
                :disabled="categorySaveLoading"
                @input="handleCustomCategoryInput"
              />
              <small class="text-body-secondary">Оставьте пустым, если выбрали категорию из списка.</small>
            </div>
          </div>
          <div class="mt-3 d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="categorySaveLoading"
              @click="saveCategory"
            >
              <span v-if="categorySaveLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Сохранить категорию
            </button>
            <span v-if="categorySaveMessage" class="text-success small">{{ categorySaveMessage }}</span>
          </div>
          <div v-if="categorySaveError" class="alert alert-danger mt-3 mb-0" role="alert">
            {{ categorySaveError }}
          </div>
        </div>
      </div>

      <div v-if="storeDetail?.business_type" class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3">
          <h5 class="mb-0">Основная информация</h5>
        </div>
        <div class="card-body">
          <form @submit.prevent="saveStore">
            <div class="mb-3">
              <label for="store-name" class="form-label">Название магазина</label>
              <input
                id="store-name"
                v-model="storeForm.name"
                type="text"
                class="form-control"
                placeholder="Например, TGPoint Маркет"
                required
                :disabled="isSavingStore"
              />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="isSavingStore">
              <span v-if="isSavingStore" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Сохранить изменения
            </button>
            <div v-if="storeSaveMessage" class="alert alert-success mt-3 mb-0" role="alert">
              {{ storeSaveMessage }}
            </div>
            <div v-if="storeSaveError" class="alert alert-danger mt-3 mb-0" role="alert">
              {{ storeSaveError }}
            </div>
          </form>
        </div>
      </div>

      <div v-if="storeDetail?.business_type" class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Телефоны магазина</h5>
          <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchPhones" :disabled="phonesLoading">
            <span v-if="phonesLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Обновить
          </button>
        </div>
        <div class="card-body">
          <div v-if="phonesLoading" class="d-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span>Загрузка телефонов...</span>
          </div>
          <div v-else-if="phonesError" class="alert alert-danger" role="alert">
            {{ phonesError }}
          </div>
          <div v-else>
            <p v-if="!phones.length" class="text-body-secondary mb-0">Телефоны еще не добавлены.</p>
            <ul v-else class="list-group list-group-flush">
              <li v-for="phone in phones" :key="phone.id" class="list-group-item d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h6 class="mb-1">{{ phone.label || 'Без названия' }}</h6>
                  <p class="mb-0 text-body-secondary">{{ phone.number }}</p>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm" @click="deletePhone(phone.id)" :disabled="deletingPhoneId === phone.id">
                  <span v-if="deletingPhoneId === phone.id" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span v-else>Удалить</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3">
          <h5 class="mb-0">Добавить телефон</h5>
        </div>
        <div class="card-body">
          <form @submit.prevent="createPhone">
            <div class="mb-3">
              <label for="phone-label" class="form-label">Название (опционально)</label>
              <input id="phone-label" v-model="phoneForm.label" type="text" class="form-control" placeholder="Например, Для заказов" />
            </div>
            <div class="mb-3">
              <label for="phone-number" class="form-label">Номер телефона</label>
              <input id="phone-number" v-model="phoneForm.number" type="tel" class="form-control" placeholder="+7 900 000-00-00" required />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="isCreatingPhone">
              <span v-if="isCreatingPhone" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Добавить телефон
            </button>
            <div v-if="phoneCreateError" class="alert alert-danger mt-3 mb-0" role="alert">
              {{ phoneCreateError }}
            </div>
          </form>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'addresses'" class="tab-pane active" role="tabpanel">
      <template v-if="storeDetail?.business_type">
        <div class="row g-4">
          <div class="col-12 col-xl-7">
            <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Адреса магазина</h5>
              <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchAddresses" :disabled="addressesLoading">
                <span v-if="addressesLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Обновить
              </button>
            </div>
            <div class="card-body">
              <div v-if="addressesLoading" class="d-flex align-items-center gap-2">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Загрузка адресов...</span>
              </div>
              <div v-else-if="addressesError" class="alert alert-danger" role="alert">
                {{ addressesError }}
              </div>
              <div v-else>
                <p v-if="!addresses.length" class="text-body-secondary mb-0">Адреса еще не добавлены.</p>
                <ul v-else class="list-group list-group-flush">
                  <li v-for="address in addresses" :key="address.id" class="list-group-item d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <h6 class="mb-1">{{ address.label || 'Без названия' }}</h6>
                      <p class="mb-0 text-body-secondary">{{ address.address_text }}</p>
                    </div>
                    <button type="button" class="btn btn-outline-danger btn-sm" @click="deleteAddress(address.id)" :disabled="deletingAddressId === address.id">
                      <span v-if="deletingAddressId === address.id" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span v-else>Удалить</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-xl-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent py-3">
              <h5 class="mb-0">Добавить новый адрес</h5>
            </div>
            <div class="card-body">
              <form @submit.prevent="createAddress">
                <div class="mb-3">
                  <label for="address-label" class="form-label">Название (опционально)</label>
                  <input id="address-label" v-model="addressForm.label" type="text" class="form-control" placeholder="Например, Главный офис" />
                </div>
                <div class="mb-3">
                  <label for="address-text" class="form-label">Адрес</label>
                  <textarea id="address-text" v-model="addressForm.address_text" class="form-control" rows="3" placeholder="Город, улица, дом" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary w-100" :disabled="isCreatingAddress">
                  <span v-if="isCreatingAddress" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Добавить адрес
                </button>
                <div v-if="addressCreateError" class="alert alert-danger mt-3 mb-0" role="alert">
                  {{ addressCreateError }}
                </div>
              </form>
            </div>
          </div>
        </div>
        </div>
      </template>

      <template v-else>
        <div class="alert alert-info" role="alert">
          Выберите тип бизнеса, чтобы продолжить настройку магазина.
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/stores'
import { apiService } from '@/services/api'

interface StoreAddress {
  id: string
  label: string | null
  address_text: string
}

interface StorePhone {
  id: string
  label: string | null
  number: string
  store?: string
}

const route = useRoute()
const router = useRouter()
const storesStore = useStoresStore()
const { primaryStore, stores, isLoading: storesLoading } = storeToRefs(storesStore)

const isStoreLoading = ref(true)
const storeError = ref<string | null>(null)
const storeDetail = ref<any>(null)
const isSavingStore = ref(false)
const storeSaveMessage = ref<string | null>(null)
const storeSaveError = ref<string | null>(null)
const activeTab = ref<'general' | 'addresses'>('general')

const storeForm = reactive({
  name: ''
})

const addresses = ref<StoreAddress[]>([])
const addressesLoading = ref(false)
const addressesError = ref<string | null>(null)
const isCreatingAddress = ref(false)
const addressCreateError = ref<string | null>(null)
const deletingAddressId = ref<string | null>(null)

const addressForm = reactive({
  label: '',
  address_text: ''
})

const businessTypes = ref<{ value: string; label: string }[]>([])
const businessTypesLoading = ref(false)
const businessTypesError = ref<string | null>(null)
const selectedBusinessType = ref('')
const typeSaveLoading = ref(false)
const typeSaveError = ref<string | null>(null)
const businessTypeLabel = computed(() => {
  const value = storeDetail.value?.business_type
  if (!value) return ''
  return businessTypes.value.find((item) => item.value === value)?.label || value
})

const categories = ref<{ id: number; name: string }[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref<string | null>(null)
const selectedCategoryId = ref<string | null>(null)
const customCategoryValue = ref('')
const categorySaveLoading = ref(false)
const categorySaveMessage = ref<string | null>(null)
const categorySaveError = ref<string | null>(null)

const phones = ref<StorePhone[]>([])
const phonesLoading = ref(false)
const phonesError = ref<string | null>(null)
const isCreatingPhone = ref(false)
const phoneCreateError = ref<string | null>(null)
const deletingPhoneId = ref<string | null>(null)

const phoneForm = reactive({
  label: '',
  number: ''
})

const currentStoreId = computed(() => {
  const fromQuery = route.query.store
  if (typeof fromQuery === 'string' && fromQuery.length) {
    return fromQuery
  }
  return primaryStore.value?.id ?? null
})

const fetchStore = async () => {
  const storeId = currentStoreId.value
  if (!storeId) {
    isStoreLoading.value = false
    storeDetail.value = null
    addresses.value = []
    phones.value = []
    storesStore.setActiveStoreId(null)
    return
  }

  isStoreLoading.value = true
  storeError.value = null

  try {
    if (!businessTypes.value.length) {
      await fetchBusinessTypes()
    }
    const data = await apiService.getStore(storeId)
    storeDetail.value = data
    storeForm.name = data?.name || ''
    storesStore.setActiveStoreId(storeId)
    selectedBusinessType.value = data?.business_type || ''
    const currentCategory = data?.category
    if (currentCategory && typeof currentCategory === 'object') {
      selectedCategoryId.value = currentCategory.id ? String(currentCategory.id) : null
    } else if (currentCategory) {
      selectedCategoryId.value = String(currentCategory)
    } else {
      selectedCategoryId.value = null
    }
    customCategoryValue.value = data?.custom_category || ''
    if (selectedBusinessType.value) {
      await fetchCategories(selectedBusinessType.value)
    }
    await Promise.all([fetchAddresses(), fetchPhones()])
  } catch (error: unknown) {
    storeError.value = error instanceof Error ? error.message : 'Не удалось загрузить магазин'
    storeDetail.value = null
  } finally {
    isStoreLoading.value = false
  }
}

const fetchAddresses = async () => {
  const storeId = currentStoreId.value
  if (!storeId) {
    addresses.value = []
    return
  }

  addressesLoading.value = true
  addressesError.value = null

  try {
    const data = await apiService.getStoreAddresses(storeId)
    const list = Array.isArray(data) ? data : data?.results ?? []
    addresses.value = list as StoreAddress[]
  } catch (error: unknown) {
    addressesError.value = error instanceof Error ? error.message : 'Не удалось загрузить адреса'
    addresses.value = []
  } finally {
    addressesLoading.value = false
  }
}

const fetchPhones = async () => {
  const storeId = currentStoreId.value
  if (!storeId) {
    phones.value = []
    return
  }

  phonesLoading.value = true
  phonesError.value = null

  try {
    const data = await apiService.getStorePhones(storeId)
    const list = Array.isArray(data) ? data : data?.results ?? []
    phones.value = (list as StorePhone[]).filter((item) => !item.store || item.store === storeId)
  } catch (error: unknown) {
    phonesError.value = error instanceof Error ? error.message : 'Не удалось загрузить телефоны'
    phones.value = []
  } finally {
    phonesLoading.value = false
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

const fetchCategories = async (type: string) => {
  if (!type) {
    categories.value = []
    return
  }

  categoriesLoading.value = true
  categoriesError.value = null

  try {
    const data = await apiService.getCategoriesByType(type)
    categories.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    categoriesError.value = error instanceof Error ? error.message : 'Не удалось загрузить категории'
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

const saveStore = async () => {
  if (!currentStoreId.value || !storeForm.name.trim()) return

  isSavingStore.value = true
  storeSaveError.value = null
  storeSaveMessage.value = null

  try {
    const payload = { name: storeForm.name.trim() }
    const updated = await apiService.updateStore(currentStoreId.value, payload)
    storeDetail.value = updated
    storeSaveMessage.value = 'Изменения сохранены'
    await storesStore.fetchStores()
  } catch (error: unknown) {
    storeSaveError.value = error instanceof Error ? error.message : 'Не удалось сохранить изменения'
  } finally {
    isSavingStore.value = false
    setTimeout(() => {
      storeSaveMessage.value = null
    }, 3000)
  }
}

const createAddress = async () => {
  if (!currentStoreId.value || !addressForm.address_text.trim()) return

  isCreatingAddress.value = true
  addressCreateError.value = null

  try {
    await apiService.createStoreAddress({
      store: currentStoreId.value,
      label: addressForm.label.trim() || null,
      address_text: addressForm.address_text.trim(),
      phones: []
    })
    addressForm.label = ''
    addressForm.address_text = ''
    await fetchAddresses()
  } catch (error: unknown) {
    addressCreateError.value = error instanceof Error ? error.message : 'Не удалось добавить адрес'
  } finally {
    isCreatingAddress.value = false
  }
}

const createPhone = async () => {
  if (!currentStoreId.value || !phoneForm.number.trim()) return

  isCreatingPhone.value = true
  phoneCreateError.value = null

  try {
    const payload = {
      store: currentStoreId.value,
      number: phoneForm.number.trim(),
      label: phoneForm.label.trim() || null
    }
    const created = await apiService.createStorePhone(payload)
    phoneForm.number = ''
    phoneForm.label = ''
    if (created?.id) {
      phones.value = [created as StorePhone, ...phones.value]
    } else {
      await fetchPhones()
    }
  } catch (error: unknown) {
    phoneCreateError.value = error instanceof Error ? error.message : 'Не удалось добавить телефон'
  } finally {
    isCreatingPhone.value = false
  }
}

const deleteAddress = async (addressId: string) => {
  if (!addressId) return
  deletingAddressId.value = addressId
  addressesError.value = null

  try {
    await apiService.deleteStoreAddress(addressId)
    addresses.value = addresses.value.filter((item) => item.id !== addressId)
  } catch (error: unknown) {
    addressesError.value = error instanceof Error ? error.message : 'Не удалось удалить адрес'
  } finally {
    deletingAddressId.value = null
  }
}

const deletePhone = async (phoneId: string) => {
  if (!phoneId) return
  deletingPhoneId.value = phoneId
  phonesError.value = null

  try {
    await apiService.deleteStorePhone(phoneId)
    phones.value = phones.value.filter((item) => item.id !== phoneId)
  } catch (error: unknown) {
    phonesError.value = error instanceof Error ? error.message : 'Не удалось удалить телефон'
  } finally {
    deletingPhoneId.value = null
  }
}

const retryFetch = () => {
  fetchStore()
}

const goToDashboard = () => {
  storesStore.setActiveStoreId(null)
  router.push({ name: 'dashboard' })
}

const saveBusinessType = async () => {
  if (!currentStoreId.value || !selectedBusinessType.value) return
  typeSaveLoading.value = true
  typeSaveError.value = null

  try {
    await apiService.setStoreBusinessType(currentStoreId.value, selectedBusinessType.value)
    if (storeDetail.value) {
      storeDetail.value.business_type = selectedBusinessType.value
    }
    await fetchCategories(selectedBusinessType.value)
    selectedCategoryId.value = null
    customCategoryValue.value = ''
    await storesStore.fetchStores()
  } catch (error: unknown) {
    typeSaveError.value = error instanceof Error ? error.message : 'Не удалось сохранить тип бизнеса'
  } finally {
    typeSaveLoading.value = false
  }
}

const saveCategory = async () => {
  if (!currentStoreId.value) return
  categorySaveLoading.value = true
  categorySaveError.value = null
  categorySaveMessage.value = null

  try {
    const payload: Record<string, unknown> = {}
    if (selectedCategoryId.value) {
      payload.category = Number(selectedCategoryId.value)
      payload.custom_category = null
    } else if (customCategoryValue.value.trim()) {
      payload.category = null
      payload.custom_category = customCategoryValue.value.trim()
    } else {
      categorySaveError.value = 'Выберите категорию или укажите свою'
      categorySaveLoading.value = false
      return
    }

    const updated = await apiService.updateStore(currentStoreId.value, payload)
    storeDetail.value = updated
    const newCategory = updated?.category
    if (newCategory && typeof newCategory === 'object') {
      selectedCategoryId.value = newCategory.id ? String(newCategory.id) : null
    } else if (newCategory) {
      selectedCategoryId.value = String(newCategory)
    } else {
      selectedCategoryId.value = null
    }
    customCategoryValue.value = updated?.custom_category || ''
    categorySaveMessage.value = 'Категория сохранена'
    setTimeout(() => (categorySaveMessage.value = null), 3000)
  } catch (error: unknown) {
    categorySaveError.value = error instanceof Error ? error.message : 'Не удалось сохранить категорию'
  } finally {
    categorySaveLoading.value = false
  }
}

const handleCategorySelect = () => {
  customCategoryValue.value = ''
  categorySaveError.value = null
  categorySaveMessage.value = null
}

const handleCustomCategoryInput = () => {
  selectedCategoryId.value = null
  categorySaveError.value = null
  categorySaveMessage.value = null
}

watch(
  () => currentStoreId.value,
  () => {
    fetchStore()
  },
  { immediate: true }
)

watch(
  () => stores.value,
  () => {
    if (!currentStoreId.value && primaryStore.value?.id) {
      fetchStore()
    }
  }
)

watch(
  () => selectedBusinessType.value,
  (value) => {
    if (!storeDetail.value?.business_type && value) {
      fetchCategories(value)
    }
    if (typeSaveError.value) {
      typeSaveError.value = null
    }
  }
)

onMounted(async () => {
  if (!stores.value.length && !storesLoading.value) {
    await storesStore.fetchStores()
  }
})
</script>

<style scoped>
.store-settings {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 0;
}

.page-header h1 {
  font-size: 1.75rem;
}

.nav-pills .nav-link {
  border-radius: 999px;
}

.list-group-item {
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.list-group-item:last-child {
  border-bottom: none;
}

.business-type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.type-chip {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #f8fafc;
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1f2a37;
  transition: all 0.15s ease;
}

.type-chip.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.type-chip:disabled {
  opacity: 0.6;
}
</style>
