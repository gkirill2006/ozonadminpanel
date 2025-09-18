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
          :class="{ active: activeTab === 'addresses' }"
          role="tab"
          @click="activeTab = 'addresses'"
        >
          Адреса и точки
        </button>
      </li>
    </ul>

    <div v-if="activeTab === 'general'" class="tab-pane active" role="tabpanel">
      <div class="card border-0 shadow-sm mb-4">
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

      <div class="card border-0 shadow-sm mb-4">
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
    const data = await apiService.getStore(storeId)
    storeDetail.value = data
    storeForm.name = data?.name || ''
    storesStore.setActiveStoreId(storeId)
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
</style>
