<template>
  <div class="planner">
      <section class="card shadow-sm planner-card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h5 class="mb-0">Поставка</h5>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">Кластеров: {{ clusterHeaders.length }} · Товаров: {{ products.length }}</span>
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="openSettings">
              Настройки
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-if="loadError" class="alert alert-danger py-1 px-2 mb-2">
            {{ loadError }}
          </div>

          <div class="d-flex flex-wrap gap-2 align-items-end mb-2 selection-bar">
            <div class="range-inputs d-flex gap-2 align-items-end">
              <div>
                <label class="form-label text-uppercase text-muted small fw-semibold mb-1">С строки</label>
                <input
                  type="number"
                  min="1"
                  :max="products.length || 1"
                  class="form-control form-control-sm"
                  v-model="rangeFrom"
                />
              </div>
              <div>
                <label class="form-label text-uppercase text-muted small fw-semibold mb-1">По строку</label>
                <input
                  type="number"
                  min="1"
                  :max="products.length || 1"
                  class="form-control form-control-sm"
                  v-model="rangeTo"
                />
              </div>
            </div>
            <div class="selection-actions d-flex gap-2 align-items-end">
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectRange">Выделить</button>
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="resetSelection" :disabled="!selectedRowsSize">Сброс</button>
            </div>
            <div class="ms-md-auto d-flex gap-2 align-items-end">
              <span class="text-muted small">Выбрано строк: {{ selectedRowsSize }}</span>
              <button class="btn btn-success btn-sm" type="button" :disabled="!selectedRowsSize" @click="openShipmentDialog">
                Сформировать отгрузку
              </button>
            </div>
          </div>

          <div v-if="draftBatchId" class="card shadow-sm mb-2 draft-status-card">
              <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span class="fw-semibold">Создание поставки</span>
                  <span class="badge bg-secondary">{{ draftBatchId }}</span>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    type="button"
                    @click="goToCurrentSupply"
                    :disabled="!isBatchCompleted"
                  >
                    Перейти в текущую поставку
                  </button>
                </div>
              <span class="text-muted small">{{ batchStatusMessage }}</span>
              </div>
            <div class="card-body py-2 px-3 draft-status-body">
              <div v-if="draftBatchError" class="alert alert-danger py-1 px-2 mb-2">{{ draftBatchError }}</div>
              <div v-if="draftItems.length">
                <table class="table table-sm mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Склад</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="draft in draftItems"
                      :key="draft.id || draft.draft_id || draft.logistic_cluster_id || draft.logistic_cluster_name"
                      :class="{ 'draft-row--done': isFinalDraftStatus(draft.status) }"
                    >
                      <td>{{ draft.logistic_cluster_name || draft.warehouse || '—' }}</td>
                      <td>
                        <span>{{ draft.status || '—' }}</span>
                        <span v-if="!isFinalDraftStatus(draft.status)" class="spinner-border spinner-border-sm ms-2" role="status"></span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-muted small">Нет данных по черновикам</div>
            </div>
          </div>

          <div class="table-wrapper mt-2">
            <div v-if="isLoading && !products.length" class="planner-table-splash">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Готовим таблицу...
            </div>
          <table v-if="products.length || !isLoading" class="planner-table pivot-table">
            <thead>
              <tr>
                <th class="sticky-col index-col">#</th>
                <th class="sticky-col name-col">Артикул</th>
                <th class="sku-col">SKU</th>
                <th v-if="displaySettings.showBarcode" class="barcode-col">ШК</th>
                <th class="total-col">Количество, шт</th>
                <template v-if="displaySettings.showClusters">
                  <th
                    v-for="cluster in visibleClusters"
                    :key="cluster"
                    class="text-center"
                  >
                    <div class="cluster-header">
                      <span class="cluster-name">{{ cluster }}</span>
                      <span v-if="getClusterImpactShare(cluster) !== null" class="cluster-share">
                        {{ formatImpactShare(getClusterImpactShare(cluster)) }}
                      </span>
                    </div>
                  </th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in products"
                :key="row.id"
                :class="{ 'row-selected': isRowSelected(idx + 1) }"
                @click="toggleRow(idx + 1)"
              >
                <td class="sticky-col index-col">{{ idx + 1 }}</td>
                <td class="sticky-col name-col">
                  <div class="d-flex align-items-center gap-2">
                    <img v-if="displaySettings.showImage && row.photo" :src="row.photo" alt="photo" class="pivot-photo" />
                    <div class="d-flex flex-column pivot-text">
                      <span class="pivot-name fw-semibold">{{ row.offerId || '—' }}</span>
                      <a
                        v-if="displaySettings.showLink && row.link"
                        :href="row.link"
                        target="_blank"
                        rel="noopener"
                        class="small pivot-link"
                      >Ссылка</a>
                    </div>
                  </div>
                </td>
                <td class="sku-col">{{ row.sku || '—' }}</td>
                <td v-if="displaySettings.showBarcode" class="barcode-col">{{ row.barcode || '—' }}</td>
                <td class="total-col text-center fw-semibold">{{ formatNumber(row.totalForDelivery) }}</td>
                <template v-if="displaySettings.showClusters">
                  <td
                    v-for="cluster in visibleClusters"
                    :key="cluster"
                    class="text-center"
                  >
                    {{ formatNumber(row.clusters[cluster]) }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <div v-else class="planner-table-empty">Нет данных для отображения</div>
        </div>
      </div>
    </section>
  </div>

  <div v-if="settingsOpen" class="planner-modal">
    <div class="planner-modal__backdrop" @click="closeSettings"></div>
    <div class="planner-modal__body card shadow-lg settings-modal">
      <div class="card-header d-flex align-items-center justify-content-between">
        <h5 class="mb-0">Настройки отображения</h5>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeSettings">Закрыть</button>
      </div>
      <div class="card-body">
        <label class="form-check form-check-inline me-4">
          <input class="form-check-input" type="checkbox" v-model="displaySettings.showImage" />
          <span class="form-check-label">Изображение</span>
        </label>
        <label class="form-check form-check-inline me-4">
          <input class="form-check-input" type="checkbox" v-model="displaySettings.showBarcode" />
          <span class="form-check-label">ШК</span>
        </label>
        <label class="form-check form-check-inline me-4">
          <input class="form-check-input" type="checkbox" v-model="displaySettings.showLink" />
          <span class="form-check-label">Ссылка</span>
        </label>
        <label class="form-check form-check-inline me-4">
          <input class="form-check-input" type="checkbox" v-model="displaySettings.showClusters" />
          <span class="form-check-label">Склады</span>
        </label>
        <div v-if="displaySettings.showClusters" class="mt-3">
          <p class="text-muted mb-2 small">Скрыть отдельные склады:</p>
          <div class="cluster-list">
            <label
              v-for="cluster in clusterHeaders"
              :key="cluster"
              class="form-check form-check-inline cluster-toggle"
            >
              <input
                class="form-check-input"
                type="checkbox"
                :value="cluster"
                v-model="displaySettings.hiddenClusters"
              />
              <span class="form-check-label">{{ cluster }}</span>
            </label>
          </div>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetSettings">Сбросить</button>
        <button type="button" class="btn btn-primary btn-sm" @click="closeSettings">OK</button>
      </div>
    </div>
  </div>

  <div v-if="shipmentDialogOpen" class="planner-modal">
    <div class="planner-modal__backdrop" @click="closeShipmentDialog"></div>
    <div class="planner-modal__body card shadow-lg settings-modal shipment-modal">
      <div class="card-header d-flex align-items-center justify-content-between">
        <h5 class="mb-0">Выберите склады для отгрузки</h5>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeShipmentDialog">Закрыть</button>
      </div>
      <div class="card-body shipment-modal-body">
        <div class="d-flex gap-2 mb-3 flex-wrap">
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectAllShipmentWarehouses">Выделить все</button>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="deselectAllShipmentWarehouses">Снять все</button>
        </div>
        <div class="shipment-grid">
          <label
            v-for="cluster in availableShipmentClusters"
            :key="cluster"
            class="form-check shipment-toggle"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :value="cluster"
              :checked="selectedShipmentWarehouses.has(cluster)"
              @change="toggleShipmentWarehouse(cluster)"
            />
            <span class="form-check-label">{{ cluster }}</span>
          </label>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-end gap-2 shipment-modal-footer">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="closeShipmentDialog">Отмена</button>
        <button type="button" class="btn btn-primary btn-sm" @click="confirmShipment" :disabled="!selectedShipmentWarehouses.size">
          Далее
        </button>
      </div>
    </div>
  </div>

  <div v-if="supplyDialogOpen" class="planner-modal">
    <div class="planner-modal__backdrop" @click="closeSupplyDialog"></div>
    <div class="planner-modal__body card shadow-lg settings-modal tall-modal">
      <div class="card-header d-flex align-items-center justify-content-between">
        <h5 class="mb-0">Создание поставки</h5>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeSupplyDialog">Закрыть</button>
      </div>
      <div class="card-body supply-modal-body d-flex flex-column gap-3">
        <div>
          <label class="form-label text-uppercase text-muted small fw-semibold mb-1">Тип поставки</label>
          <select v-model="supplyType" class="form-select form-select-sm">
            <option v-for="opt in supplyTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="position-relative">
          <label class="form-label text-uppercase text-muted small fw-semibold mb-1">Склад (поиск от 4 символов)</label>
          <input
            v-model="warehouseSearch"
            type="text"
            class="form-control form-control-sm"
            placeholder="Начните вводить адрес или название склада"
          />
          <div v-if="warehouseSearchLoading" class="form-text text-muted">Ищем...</div>
          <div v-if="warehouseSearchError" class="text-danger small mt-1">{{ warehouseSearchError }}</div>
          <div v-if="warehouseSearchResults.length" class="search-dropdown">
            <button
              v-for="item in warehouseSearchResults"
              :key="item.warehouse_id"
              type="button"
              class="dropdown-item"
              @click="selectWarehouse(item)"
            >
              <div class="fw-semibold">{{ item.name || '—' }}</div>
              <div class="text-muted small">{{ item.address || '—' }}</div>
            </button>
          </div>
        </div>
        <div v-if="selectedWarehouse" class="alert alert-info py-2 px-3 mb-0">
          Выбран склад: <strong>{{ selectedWarehouse.name }}</strong> — {{ selectedWarehouse.address }}
        </div>
        <div v-if="supplyCreateError" class="alert alert-danger py-2 px-3 mb-0">
          {{ supplyCreateError }}
        </div>
      </div>
      <div class="card-footer d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="closeSupplyDialog">Отмена</button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="!selectedWarehouse || supplyCreateLoading"
          @click="submitSupplyCreation"
        >
          <span v-if="supplyCreateLoading" class="spinner-border spinner-border-sm me-1"></span>
          Далее
        </button>
      </div>
    </div>
  </div>

  <div v-if="batchesDialogOpen" class="planner-modal">
    <div class="planner-modal__backdrop" @click="closeBatchesDialog"></div>
    <div class="planner-modal__body card shadow-lg settings-modal batches-modal">
      <div class="card-header d-flex align-items-center justify-content-between">
        <h5 class="mb-0">Все черновики поставок</h5>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeBatchesDialog">Закрыть</button>
      </div>
      <div class="card-body batches-body">
        <div class="d-flex align-items-center gap-2 mb-2">
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="loadAllBatches">Обновить</button>
          <span v-if="batchesLoading" class="text-muted small d-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm"></span> Загружаем...
          </span>
          <span v-else class="text-muted small">Показаны все батчи{{ props.storeId ? ' для магазина ' + props.storeId : '' }}</span>
        </div>
        <div v-if="batchesError" class="alert alert-danger py-1 px-2 mb-2">{{ batchesError }}</div>
        <div v-if="allBatches.length" class="batches-table-wrapper">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Поставка</th>
                <th>Статус</th>
                <th>Магазин</th>
                <th>Склад сдачи</th>
                <th>Черновики</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in allBatches" :key="batch.batch_id">
                <td class="fw-semibold">{{ batch.batch_id }}</td>
                <td>{{ batch.status || '—' }}</td>
                <td>{{ batch.store || batch.store_id || '—' }}</td>
                <td>{{ batch.drop_off_point_warehouse_id || '—' }}</td>
                <td>
                  <div v-if="Array.isArray(batch.drafts) && batch.drafts.length" class="drafts-list">
                    <div v-for="draft in batch.drafts" :key="draft.id || draft.draft_id" class="draft-pill">
                      <div class="small fw-semibold">{{ draft.logistic_cluster_name || draft.warehouse || '—' }}</div>
                      <div class="small text-muted">status: {{ draft.status || '—' }}</div>
                    </div>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="!batchesLoading" class="text-muted small">Нет черновиков</div>
      </div>
      <div class="card-footer d-flex justify-content-end">
        <button type="button" class="btn btn-primary btn-sm" @click="closeBatchesDialog">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '@/services/api'

const props = defineProps<{ storeId: string }>()
const router = useRouter()

interface PivotProduct {
  id: string
  offerId: string
  sku?: string
  name?: string
  barcode: string
  photo?: string
  link?: string
  totalForDelivery: number | null
  clusters: Record<string, number | null>
}

const clusterHeaders = ref<string[]>([])
const clusterImpactShare = ref<Record<string, number>>({})
const products = ref<PivotProduct[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const collator = new Intl.Collator('ru', { sensitivity: 'base' })
const availableShipmentClusters = computed(() =>
  displaySettings.showClusters
    ? clusterHeaders.value.filter((name) => !displaySettings.hiddenClusters.includes(name))
    : []
)

const selectedRows = ref<Set<number>>(new Set())
const rangeFrom = ref('')
const rangeTo = ref('')
const selectedRowsSize = computed(() => selectedRows.value.size)
const settingsOpen = ref(false)

const defaultDisplaySettings = {
  showImage: true,
  showBarcode: true,
  showLink: true,
  showClusters: true,
  hiddenClusters: [] as string[]
}

const STORAGE_KEY = 'supply_display_settings'
const storedSettings = localStorage.getItem(STORAGE_KEY)
const parsed = storedSettings ? (JSON.parse(storedSettings) as Partial<typeof defaultDisplaySettings>) : {}
const displaySettings = reactive({
  ...defaultDisplaySettings,
  ...parsed
})

const visibleClusters = computed(() =>
  displaySettings.showClusters
    ? clusterHeaders.value.filter((name) => !displaySettings.hiddenClusters.includes(name))
    : []
)

const formatNumber = (value: number | null | undefined) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('ru-RU').format(num)
}

const getClusterImpactShare = (cluster: string) => {
  const raw = clusterImpactShare.value?.[cluster]
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

const formatImpactShare = (value: number | null) => {
  if (value === null) return ''
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)}%`
}

const persistSettings = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(displaySettings))
}

const shipmentDialogOpen = ref(false)
const selectedShipmentWarehouses = ref<Set<string>>(new Set())
const supplyDialogOpen = ref(false)
const supplyCreateLoading = ref(false)
const supplyCreateError = ref<string | null>(null)

const supplyTypeOptions = [
  { value: 'CREATE_TYPE_CROSSDOCK', label: 'Кросс-докинг' },
  { value: 'CREATE_TYPE_DIRECT', label: 'Прямая' }
]

const supplyType = ref<'CREATE_TYPE_CROSSDOCK' | 'CREATE_TYPE_DIRECT'>('CREATE_TYPE_CROSSDOCK')
const warehouseSearch = ref('')
const warehouseSearchResults = ref<Array<{ warehouse_id: string | number; name: string; address: string }>>([])
const warehouseSearchLoading = ref(false)
const warehouseSearchError = ref<string | null>(null)
const selectedWarehouse = ref<{ warehouse_id: string | number; name: string; address: string } | null>(null)
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const draftBatchId = ref<string | null>(null)
const draftBatchStatusText = ref<string>('—')
const draftBatchError = ref<string | null>(null)
let draftBatchTimer: ReturnType<typeof setInterval> | null = null
const draftItems = ref<any[]>([])
const isBatchCompleted = computed(() => String(draftBatchStatusText.value).toLowerCase() === 'completed')
const batchStatusMessage = computed(() =>
  isBatchCompleted.value ? 'Черновик для новой поставки создан.' : 'Создаём черновик для новой поставки...'
)

const batchesDialogOpen = ref(false)
const batchesLoading = ref(false)
const batchesError = ref<string | null>(null)
const allBatches = ref<any[]>([])

const fetchPivotData = async () => {
  if (!props.storeId) return
  isLoading.value = true
  loadError.value = null
  try {
    const response = await apiService.fetchPlannerPivot(props.storeId)
    const headers = Array.isArray((response as any)?.cluster_headers) ? (response as any).cluster_headers : []
    const impactRaw = (response as any)?.cluster_impact_share
    const impactMap: Record<string, number> = {}
    if (impactRaw && typeof impactRaw === 'object') {
      Object.entries(impactRaw as Record<string, unknown>).forEach(([key, value]) => {
        const num = Number(value)
        if (Number.isFinite(num)) impactMap[key] = num
      })
    }
    clusterImpactShare.value = impactMap
    clusterHeaders.value = headers
      .map((name: string, index: number) => ({
        name,
        index,
        share: Number.isFinite(impactMap[name]) ? impactMap[name] : -Infinity
      }))
      .sort((a, b) => {
        if (a.share !== b.share) return b.share - a.share
        return a.index - b.index
      })
      .map((entry) => entry.name)
  const items = Array.isArray((response as any)?.products) ? (response as any).products : []
  products.value = items.map((item: any, idx: number) => ({
    id: `${item?.offer_id ?? item?.sku ?? idx}`,
    offerId: String(item?.offer_id ?? item?.sku ?? ''),
    sku: item?.sku,
      name: item?.name,
      barcode: String(item?.barcode ?? (Array.isArray(item?.barcodes) ? item.barcodes[0] : '') ?? ''),
      photo: item?.photo,
      link: item?.ozon_link,
      totalForDelivery:
        typeof item?.total_for_delivery === 'number'
          ? item.total_for_delivery
          : typeof item?.totalForDelivery === 'number'
            ? item.totalForDelivery
            : null,
      clusters: typeof item?.clusters === 'object' && item?.clusters !== null ? item.clusters : {}
    }))
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Не удалось загрузить данные поставки'
    products.value = []
    clusterHeaders.value = []
    clusterImpactShare.value = {}
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (props.storeId) fetchPivotData()
})

watch(displaySettings, persistSettings, { deep: true })

watch(
  () => props.storeId,
  (next) => {
    if (!next) return
    products.value = []
    clusterHeaders.value = []
    clusterImpactShare.value = {}
    selectedRows.value = new Set()
    rangeFrom.value = ''
    rangeTo.value = ''
    fetchPivotData()
  }
)

const selectRange = () => {
  const from = Number(rangeFrom.value)
  const to = Number(rangeTo.value)
  if (Number.isNaN(from) || Number.isNaN(to) || from < 1 || to < from || to > products.value.length) return
  const next = new Set(selectedRows.value)
  for (let i = from; i <= to; i++) {
    next.add(i)
  }
  selectedRows.value = next
}

const resetSelection = () => {
  selectedRows.value = new Set()
  rangeFrom.value = ''
  rangeTo.value = ''
}

const toggleRow = (rowNumber: number) => {
  const next = new Set(selectedRows.value)
  if (next.has(rowNumber)) {
    next.delete(rowNumber)
  } else {
    next.add(rowNumber)
  }
  selectedRows.value = next
}

const isRowSelected = (rowNumber: number) => selectedRows.value.has(rowNumber)

const openShipmentDialog = () => {
  if (!selectedRows.value.size) return
  if (!selectedShipmentWarehouses.value.size && availableShipmentClusters.value.length) {
    selectedShipmentWarehouses.value = new Set(availableShipmentClusters.value)
  }
  shipmentDialogOpen.value = true
}

const closeShipmentDialog = () => {
  shipmentDialogOpen.value = false
}

const selectAllShipmentWarehouses = () => {
  selectedShipmentWarehouses.value = new Set(availableShipmentClusters.value)
}

const deselectAllShipmentWarehouses = () => {
  selectedShipmentWarehouses.value = new Set()
}

const openSettings = () => {
  settingsOpen.value = true
}

const closeSettings = () => {
  settingsOpen.value = false
}

const resetSettings = () => {
  Object.assign(displaySettings, defaultDisplaySettings)
  persistSettings()
}

const toggleShipmentWarehouse = (cluster: string) => {
  const next = new Set(selectedShipmentWarehouses.value)
  if (next.has(cluster)) {
    next.delete(cluster)
  } else {
    next.add(cluster)
  }
  selectedShipmentWarehouses.value = next
}

const confirmShipment = () => {
  const warehouses = Array.from(selectedShipmentWarehouses.value)
  const selectedProducts = Array.from(selectedRows.value)
    .sort((a, b) => a - b)
    .map((rowNumber) => {
      const product = products.value[rowNumber - 1]
      const byWarehouse = warehouses.map((cluster) => ({
        warehouse: cluster,
        quantity: Number(product?.clusters?.[cluster] ?? 0)
      }))
      return {
        row: rowNumber,
        offerId: product?.offerId ?? '—',
        name: product?.name ?? '',
        totalForDelivery: product?.totalForDelivery ?? 0,
        warehouses: byWarehouse
      }
    })

  console.log('Отправка на склады', { warehouses, products: selectedProducts })
  closeShipmentDialog()
  openSupplyDialog()
}

const getDraftKeyForMerge = (draft: any) =>
  String(draft?.id ?? draft?.draft_id ?? draft?.logistic_cluster_id ?? draft?.logistic_cluster_name ?? draft?.warehouse ?? '')

const updateDraftItems = (nextDrafts: any[]) => {
  if (!Array.isArray(nextDrafts)) return
  if (!draftItems.value.length) {
    draftItems.value = nextDrafts.slice()
    return
  }
  const incoming = new Map(nextDrafts.map((draft) => [getDraftKeyForMerge(draft), draft]))
  const merged: any[] = []

  draftItems.value.forEach((current) => {
    const key = getDraftKeyForMerge(current)
    const next = incoming.get(key)
    if (next) {
      current.status = next.status
      if (!current.logistic_cluster_name && next.logistic_cluster_name) {
        current.logistic_cluster_name = next.logistic_cluster_name
      }
      if (!current.warehouse && next.warehouse) {
        current.warehouse = next.warehouse
      }
      incoming.delete(key)
    }
    merged.push(current)
  })

  if (incoming.size) {
    merged.push(...incoming.values())
  }

  draftItems.value.splice(0, draftItems.value.length, ...merged)
}

const isFinalDraftStatus = (status?: string | null) => {
  if (!status) return false
  const value = String(status).toLowerCase()
  const normalized = value.replace(/[_-]/g, ' ')
  if (
    value.includes('error') ||
    value.includes('fail') ||
    value.includes('reject') ||
    value.includes('cancel') ||
    value.includes('complete') ||
    value.includes('done') ||
    value.includes('success')
  ) {
    return true
  }
  const pending = new Set(['queued', 'processing', 'draft_created', 'created', 'pending', 'in progress', 'in_progress'])
  if (pending.has(value) || pending.has(normalized) || normalized.includes('progress')) {
    return false
  }
  return true
}

const goToCurrentSupply = () => {
  if (!isBatchCompleted.value || !props.storeId) return
  router.push({
    name: 'store-workspace',
    params: { id: String(props.storeId), section: 'drafts' }
  })
}

const openSupplyDialog = () => {
  supplyDialogOpen.value = true
  warehouseSearch.value = ''
  warehouseSearchResults.value = []
  warehouseSearchError.value = null
  selectedWarehouse.value = null
  supplyCreateError.value = null
}

const closeSupplyDialog = () => {
  supplyDialogOpen.value = false
  if (searchDebounce) {
    clearTimeout(searchDebounce)
    searchDebounce = null
  }
}

const runWarehouseSearch = async () => {
  if (!props.storeId || warehouseSearch.value.trim().length < 4) {
    warehouseSearchResults.value = []
    return
  }
  warehouseSearchLoading.value = true
  warehouseSearchError.value = null
  try {
    const response = await apiService.searchFboWarehouses({
      storeId: props.storeId,
      supplyTypes: [supplyType.value],
      search: warehouseSearch.value.trim()
    })
    const results = Array.isArray((response as any)?.search) ? (response as any).search : []
    warehouseSearchResults.value = results.map((item: any) => ({
      warehouse_id: item?.warehouse_id,
      name: item?.name,
      address: item?.address
    }))
  } catch (error) {
    warehouseSearchError.value = error instanceof Error ? error.message : 'Не удалось загрузить склады'
    warehouseSearchResults.value = []
  } finally {
    warehouseSearchLoading.value = false
  }
}

watch(
  () => warehouseSearch.value,
  () => {
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(() => runWarehouseSearch(), 350)
  }
)

watch(
  () => supplyType.value,
  () => {
    if (warehouseSearch.value.trim().length >= 4) {
      runWarehouseSearch()
    }
  }
)

watch(
  () => displaySettings.hiddenClusters.slice(),
  () => {
    const allowed = new Set(availableShipmentClusters.value)
    selectedShipmentWarehouses.value = new Set(
      Array.from(selectedShipmentWarehouses.value).filter((w) => allowed.has(w))
    )
  }
)

watch(
  () => props.storeId,
  () => {
    stopDraftBatchPolling()
    draftBatchId.value = null
    draftBatchStatusText.value = '—'
    draftBatchError.value = null
    draftItems.value = []
  }
)

const selectWarehouse = (item: { warehouse_id: string | number; name: string; address: string }) => {
  selectedWarehouse.value = item
  warehouseSearchResults.value = []
}

const submitSupplyCreation = () => {
  if (!selectedWarehouse.value) {
    supplyCreateError.value = 'Выберите склад назначения'
    return
  }
  if (!selectedRows.value.size) {
    supplyCreateError.value = 'Не выбраны строки для отгрузки'
    return
  }

  const warehouses = Array.from(selectedShipmentWarehouses.value).filter((w) =>
    availableShipmentClusters.value.includes(w)
  )
  const rows = Array.from(selectedRows.value).sort((a, b) => a - b)

  const groupedByWarehouse: Record<string, Array<{ sku: string | number; quantity: number }>> = {}

  rows.forEach((rowNumber) => {
    const product = products.value[rowNumber - 1]
    const sku = product?.sku || product?.offerId || '—'
    warehouses.forEach((warehouse) => {
      const rawQty = Number(product?.clusters?.[warehouse] ?? 0)
      const qty = Number.isFinite(rawQty) ? rawQty : 0
      if (!groupedByWarehouse[warehouse]) groupedByWarehouse[warehouse] = []
      groupedByWarehouse[warehouse].push({ sku, quantity: qty })
    })
  })

  const shipments = warehouses
    .map((warehouse) => ({
      warehouse,
      items: (groupedByWarehouse[warehouse] || []).filter((item) => Number(item.quantity) > 0)
    }))
    .filter((entry) => entry.items.length)

  if (!shipments.length) {
    supplyCreateError.value = 'Нет товаров с количеством больше 0'
    return
  }

  supplyCreateError.value = null
  supplyCreateLoading.value = true

  const payload = {
    store_id: props.storeId,
    supplyType: supplyType.value,
    destinationWarehouse: {
      warehouse_id: selectedWarehouse.value.warehouse_id,
      name: selectedWarehouse.value.name
    },
    shipments
  }

  apiService
    .createSupplyDrafts(payload)
    .then((response) => {
      draftBatchId.value = (response as any)?.batch_id ?? null
      draftBatchStatusText.value = (response as any)?.status || '—'
      updateDraftItems(Array.isArray((response as any)?.drafts) ? (response as any).drafts : [])
      draftBatchError.value = null
      if (draftBatchId.value) {
        startDraftBatchPolling(draftBatchId.value)
      }
      closeSupplyDialog()
    })
    .catch((error) => {
      supplyCreateError.value = error instanceof Error ? error.message : 'Не удалось создать черновики'
    })
    .finally(() => {
      supplyCreateLoading.value = false
    })
}

const fetchDraftBatch = async (batchId: string) => {
  if (!batchId) return
  draftBatchError.value = null
  try {
    const response = await apiService.getSupplyDraftBatch(batchId)
    draftBatchStatusText.value = (response as any)?.status || '—'
    updateDraftItems(Array.isArray((response as any)?.drafts) ? (response as any).drafts : [])
    const status = (response as any)?.status
    if (status && status !== 'processing') {
      stopDraftBatchPolling()
    }
  } catch (error) {
    draftBatchError.value = error instanceof Error ? error.message : 'Не удалось получить статус черновиков'
  }
}

const startDraftBatchPolling = (batchId: string) => {
  stopDraftBatchPolling()
  fetchDraftBatch(batchId)
  draftBatchTimer = setInterval(() => fetchDraftBatch(batchId), 5000)
}

const stopDraftBatchPolling = () => {
  if (draftBatchTimer) {
    clearInterval(draftBatchTimer)
    draftBatchTimer = null
  }
}

onBeforeUnmount(() => {
  stopDraftBatchPolling()
  if (searchDebounce) clearTimeout(searchDebounce)
})

const openBatchesDialog = () => {
  batchesDialogOpen.value = true
  loadAllBatches()
}

const closeBatchesDialog = () => {
  batchesDialogOpen.value = false
}

const loadAllBatches = async () => {
  batchesLoading.value = true
  batchesError.value = null
  try {
    const response = await apiService.getSupplyDraftBatches(
      props.storeId ? { storeId: props.storeId } : undefined
    )
    allBatches.value = Array.isArray(response) ? response : []
  } catch (error) {
    batchesError.value = error instanceof Error ? error.message : 'Не удалось загрузить черновики'
  } finally {
    batchesLoading.value = false
  }
}
</script>

<style scoped>
.planner {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.planner-card {
  border: none;
  border-radius: 4px;
  box-shadow: none;
}

.planner-card .card-body,
.planner-card .card-header {
  padding: 0.35rem 0.5rem;
}

.selection-bar {
  align-items: flex-end !important;
}

.table-wrapper {
  max-height: calc(100vh - 175px);
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 10px;
  position: relative;
}

.planner-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.85rem;
}

.planner-table th,
.planner-table td {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 0.6rem 0.75rem;
  white-space: nowrap;
}

.planner-table thead th {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 12;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
  box-shadow: 0 2px 2px rgba(15, 23, 42, 0.06);
}

.planner-table .sticky-col {
  position: sticky;
  background: #fff;
}

.planner-table thead .sticky-col {
  z-index: 15;
}

.planner-table tbody .sticky-col {
  z-index: 10;
  background: #fff;
}

.planner-table .index-col {
  left: 0;
  min-width: 60px;
  text-align: center;
}

.planner-table .name-col {
  left: 60px;
  min-width: 120px;
  max-width: 220px;
}

.planner-table .sku-col {
  min-width: 120px;
}

.planner-table .barcode-col {
  min-width: 160px;
}

.planner-table .total-col {
  min-width: 140px;
}

.planner-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.03);
}

.planner-table tbody tr {
  cursor: pointer;
}

.planner-table tbody tr.row-selected {
  background: rgba(34, 197, 94, 0.15);
}

.planner-table tbody tr.row-selected .sticky-col {
  background: #d9fbe7;
  box-shadow: inset -1px 0 rgba(15, 23, 42, 0.08);
}

.cluster-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.cluster-name {
  line-height: 1.2;
}

.cluster-share {
  font-size: 0.62rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: none;
}

.planner-table-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #94a3b8;
  font-weight: 500;
}

.pivot-photo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 10px;
}

.pivot-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pivot-text {
  min-width: 0;
  max-width: 100%;
}

.pivot-link {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-bar .form-control {
  min-width: 110px;
}

.selection-bar .btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
}

.selection-actions {
  align-self: flex-end;
}

.planner-modal__body.settings-modal {
  width: min(500px, 90vw);
}

.planner-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.planner-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.planner-modal__body {
  position: relative;
  max-height: 90vh;
  overflow: hidden;
}

.cluster-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.cluster-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.shipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 1rem;
}

.shipment-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 6px;
  width: 100%;
  max-height: 260px;
  overflow: auto;
  margin-top: 4px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.search-dropdown .dropdown-item {
  text-align: left;
  white-space: normal;
}

.search-dropdown .dropdown-item:hover {
  background: rgba(15, 23, 42, 0.06);
}

.supply-modal-body {
  max-height: 80vh;
  overflow: auto;
}

.tall-modal {
  height: 70vh;
  max-height: 90vh;
}

.shipment-modal {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.shipment-modal-body {
  flex: 1;
  overflow: auto;
}

.shipment-modal-footer {
  position: sticky;
  bottom: 0;
  background: #fff;
  z-index: 10;
}

.draft-status-card .table th,
.draft-status-card .table td {
  padding: 0.4rem 0.5rem;
  font-size: 0.82rem;
}

.draft-status-card .card-header {
  padding: 0.5rem 0.75rem;
}

.draft-status-card .card-body {
  padding: 0.5rem 0.75rem;
  min-height: 140px;
  position: relative;
}

.draft-status-body {
  position: relative;
}

.draft-status-card tbody .draft-row--done {
  background: rgba(34, 197, 94, 0.12);
}

.batches-modal {
  max-width: 900px;
  width: min(900px, 95vw);
}

.batches-body {
  max-height: 70vh;
  overflow: auto;
}

.batches-table-wrapper {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 6px;
  overflow: hidden;
}

.drafts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.draft-pill {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  background: #f8fafc;
}
</style>
