import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiService } from '@/services/api'

export interface Store {
  id: string
  name: string
  [key: string]: unknown
}

export const useStoresStore = defineStore('stores', () => {
  const stores = ref<Store[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const activeStoreId = ref<string | null>(null)

  const hasStores = computed(() => stores.value.length > 0)
  const primaryStore = computed(() => stores.value[0] ?? null)

  const fetchStores = async () => {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const data = await apiService.getStores()
      const list = Array.isArray(data) ? data : data?.results || []
      stores.value = Array.isArray(list) ? list : []
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить магазины'
      error.value = message
      stores.value = []
    } finally {
      isLoading.value = false
    }
  }

  const upsertStore = (store: Store) => {
    if (!store?.id) return
    const index = stores.value.findIndex((item) => item.id === store.id)
    if (index >= 0) {
      stores.value.splice(index, 1, { ...stores.value[index], ...store })
    } else {
      stores.value = [store, ...stores.value]
    }
  }

  const createStore = async (storeData: Partial<Store>) => {
    const created = await apiService.createStore(storeData)
    if (created) {
      upsertStore(created as Store)
    }
    return created
  }

  const clear = () => {
    stores.value = []
    error.value = null
    activeStoreId.value = null
  }

  const setActiveStoreId = (id: string | null) => {
    activeStoreId.value = id
  }

  return {
    stores,
    isLoading,
    error,
    hasStores,
    primaryStore,
    fetchStores,
    createStore,
    clear,
    activeStoreId,
    setActiveStoreId
  }
})
