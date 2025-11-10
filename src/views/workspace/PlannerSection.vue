<template>
  <div class="planner">
    <section class="card shadow-sm planner-card">
      <div class="card-header">
        <h5 class="mb-0">Фильтры</h5>
      </div>
      <div class="card-body">
        <div v-if="filtersError" class="alert alert-danger py-1 px-2 mb-2">
          {{ filtersError }}
        </div>
        <div class="row g-2 align-items-end">
          <template v-for="field in numericFields" :key="field.key">
            <div v-if="!field.isToggle" class="col-12 col-md-6 col-lg-4">
              <label class="form-label text-uppercase text-muted small fw-semibold">{{ field.label }}</label>
              <input
                type="number"
                class="form-control form-control-sm"
                :step="field.step || 1"
                v-model.number="filters[field.key]"
              />
            </div>
            <div v-else class="col-12 col-md-6 col-lg-4">
              <label class="form-label text-uppercase text-muted small fw-semibold">{{ field.label }}</label>
              <div class="form-check form-switch mt-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="field.key"
                  v-model="toggleBindings[field.key]"
                >
                <label class="form-check-label" :for="field.key">
                  {{ toggleBindings[field.key] ? 'Да' : 'Нет' }}
                </label>
              </div>
            </div>
          </template>

          <div class="col-12 col-md-6 col-lg-4">
            <label class="form-label text-uppercase text-muted small fw-semibold">Сортировка</label>
            <select class="form-select form-select-sm" v-model="filters.sortBy">
              <option value="orders">Заказ шт.</option>
              <option value="revenue">Выручке, руб.</option>
              <option value="ozon-rec">Рек. Озона</option>
            </select>
          </div>

          <div
            class="col-12 col-md-6 col-lg-4 range-field"
            v-for="range in rangeFields"
            :key="range.label"
          >
            <label class="form-label text-uppercase text-muted small fw-semibold">{{ range.label }}</label>
            <div class="double-input">
              <input
                type="number"
                class="form-control form-control-sm range-input"
                placeholder="min"
                v-model.number="filters[range.minKey]"
              />
              <input
                type="number"
                class="form-control form-control-sm range-input"
                placeholder="max"
                v-model.number="filters[range.maxKey]"
              />
            </div>
          </div>
        </div>

        <div class="mt-2 text-end">
          <button
            class="btn btn-primary ms-md-auto"
            type="button"
            @click="handleSaveClick"
            :disabled="isSaving || !hasStore"
          >
            <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
            {{ isSaving ? 'Сохраняем...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </section>

    <section class="card shadow-sm planner-card planner-card--table">
      <div class="card-header д-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 class="mb-0">Таблица планирования</h5>
        <span class="text-muted small">Показано {{ plannerRows.length }} SKU</span>
      </div>
      <div class="card-body p-0">
        <div class="planner-table-wrapper" ref="tableWrapperRef" :style="{ height: tableHeight }">
          <table class="planner-table">
            <thead>
              <tr>
                <th
                  v-for="(header, idx) in plannerHeaders"
                  :key="header"
                  :class="{
                    'sticky-col photo-col': idx === 0,
                    'sticky-col supplier-col': idx === 1
                  }"
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in plannerRows" :key="row.id">
                <td class="sticky-col photo-col">
                  <img :src="row.photo" alt="photo" class="product-photo" />
                </td>
                <td class="sticky-col supplier-col">{{ row.supplierSku }}</td>
                <td>{{ formatCurrency(row.price) }}</td>
                <td>{{ row.barcode }}</td>
                <td>{{ row.category }}</td>
                <td>{{ row.productType }}</td>
                <td><a :href="row.link" target="_blank" rel="noopener">Открыть</a></td>
                <td class="text-end">{{ row.ownStock }}</td>
                <td class="text-end">{{ row.quantity }}</td>
                <td class="text-end">{{ formatCurrency(row.revenue) }}</td>
                <td class="text-end">{{ row.dailyUnits }}</td>
                <td class="text-end">{{ row.turnoverDays }}</td>
                <td>{{ row.cluster }}</td>
                <td class="text-end">{{ row.avgDeliveryHours }}</td>
                <td class="text-end">{{ row.influenceShare }}%</td>
                <td class="text-end">{{ row.avgDeliveryItemHours }}</td>
                <td class="text-end">{{ row.influenceItemShare }}%</td>
                <td class="text-end">{{ row.recommendations }}</td>
                <td class="text-end">{{ formatCurrency(row.recommendationRevenue) }}</td>
                <td class="text-end">{{ row.totalQty }}</td>
                <td class="text-end">{{ formatCurrency(row.dailyRevenue) }}</td>
                <td class="text-end">{{ row.dailyUnitsTotal }}</td>
                <td class="text-end">{{ row.dailySharePercent }}%</td>
                <td class="text-end">{{ row.stockWithTransit }}</td>
                <td class="text-end">{{ row.demand }}</td>
                <td class="text-end">{{ row.toSupply }}</td>
                <td>{{ row.article }}</td>
                <td>{{ row.barcode2 }}</td>
                <td class="text-end">{{ row.shipmentQty }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { apiService } from '@/services/api'

const props = defineProps<{
  storeId: string
}>()

interface FilterState {
  planningDays: number
  analysisPeriod: number
  warehouseWeight: number
  priceMin: number
  priceMax: number
  turnoverMin: number
  turnoverMax: number
  showNoNeed: boolean
  sortBy: string
  specificWeightThreshold: number
  turnoverFromStock: number
}

const defaultFilters: FilterState = {
  planningDays: 28,
  analysisPeriod: 28,
  warehouseWeight: 1,
  priceMin: 1000,
  priceMax: 5000,
  turnoverMin: 10,
  turnoverMax: 90,
  showNoNeed: false,
  sortBy: 'orders',
  specificWeightThreshold: 0.01,
  turnoverFromStock: 5
}

const filters = reactive<FilterState>({ ...defaultFilters }) as FilterState
const writableFilters = filters as Record<keyof FilterState, FilterState[keyof FilterState]>

const numericFields: Array<{ key: keyof FilterState; label: string; step?: number; isToggle?: boolean }> = [
  { key: 'planningDays', label: 'На сколько дн. планируем' },
  { key: 'analysisPeriod', label: 'Анализируемый период' },
  { key: 'warehouseWeight', label: 'Учитывать вес склада', isToggle: true },
  { key: 'specificWeightThreshold', label: 'Если уд. вес <N, то он =', step: 0.01 },
  { key: 'turnoverFromStock', label: 'Оборач. от N остатков' },
  { key: 'showNoNeed', label: 'Показывать товары без потребности', isToggle: true }
]

const rangeFields: Array<{ label: string; minKey: keyof FilterState; maxKey: keyof FilterState }> = [
  { label: 'Цена (min, max)', minKey: 'priceMin', maxKey: 'priceMax' },
  { label: 'Оборачиваемость (min, max)', minKey: 'turnoverMin', maxKey: 'turnoverMax' }
]

const toggleBindings = reactive<Record<string, boolean>>({
  warehouseWeight: Boolean(filters.warehouseWeight),
  showNoNeed: filters.showNoNeed
})

watch(
  () => toggleBindings.warehouseWeight,
  (value) => {
    filters.warehouseWeight = value ? 1 : 0
  }
)

watch(
  () => toggleBindings.showNoNeed,
  (value) => {
    filters.showNoNeed = value
  }
)

const plannerHeaders = [
  'Фото',
  'Артикул поставщика',
  'Цена товара',
  'Баркод',
  'Категория',
  'Тип товара',
  'Ссылка',
  'Свой склад (FBS), шт.',
  'Количество, шт.',
  'Выручка, руб.',
  'Среднесуточ., шт',
  'Оборачиваемость, дн',
  'Кластер',
  'Ср. время доставки до покупателя, ч',
  'Доля влияния, %',
  'Ср. время доставки до покупателя товара, ч',
  'Доля влияния на товар, %',
  'Рекомендации к поставке, шт.',
  'Выручка, руб.',
  'Общее кол-во, шт.',
  'Среднесуточные продажи, руб.',
  'Среднесуточные продажи, шт.',
  'Доля от общ. среднесуточных, %',
  'Остаток товара (+ что в пути)',
  'Потребность',
  'К поставке',
  'Артикул',
  'ШК',
  'Количество, шт.'
]

interface PlannerRow {
  id: number
  photo: string
  supplierSku: string
  price: number
  barcode: string
  category: string
  productType: string
  link: string
  ownStock: number
  quantity: number
  revenue: number
  dailyUnits: number
  turnoverDays: number
  cluster: string
  avgDeliveryHours: number
  influenceShare: number
  avgDeliveryItemHours: number
  influenceItemShare: number
  recommendations: number
  recommendationRevenue: number
  totalQty: number
  dailyRevenue: number
  dailyUnitsTotal: number
  dailySharePercent: number
  stockWithTransit: number
  demand: number
  toSupply: number
  article: string
  barcode2: string
  shipmentQty: number
}

const plannerRows: PlannerRow[] = Array.from({ length: 15 }).map((_, index) => ({
  id: index + 1,
  photo: `https://picsum.photos/seed/planner-${index}/64/64`,
  supplierSku: `SKU-${1000 + index}`,
  price: 1200 + index * 42,
  barcode: `4600${123450 + index}`,
  category: index % 2 === 0 ? 'Декор' : 'Стройматериалы',
  productType: index % 2 === 0 ? 'FBO' : 'FBS',
  link: 'https://example.com',
  ownStock: 40 + index * 3,
  quantity: 120 + index * 5,
  revenue: 400000 + index * 12000,
  dailyUnits: 12 + index,
  turnoverDays: 25 - index,
  cluster: index % 3 === 0 ? 'Москва' : 'СПБ',
  avgDeliveryHours: 36 - index,
  influenceShare: 12 + index,
  avgDeliveryItemHours: 30 + index,
  influenceItemShare: 8 + (index % 5),
  recommendations: 20 + index,
  recommendationRevenue: 150000 + index * 8000,
  totalQty: 500 + index * 15,
  dailyRevenue: 12000 + index * 400,
  dailyUnitsTotal: 60 + index * 2,
  dailySharePercent: 5 + index * 0.3,
  stockWithTransit: 350 + index * 10,
  demand: 420 + index * 12,
  toSupply: 70 + index * 4,
  article: `ARTICLE-${index + 10}`,
  barcode2: `200${456789 + index}`,
  shipmentQty: 80 + index * 3
}))

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)

const filtersRef = ref<HTMLElement | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)
const tableHeight = ref('60vh')
const filtersError = ref<string | null>(null)
const isSaving = ref(false)
const hasStore = ref(false)
const lastSyncedFilters = ref<FilterState | null>(null)

const parseCssVar = (value: string | null) => {
  if (!value) return 0
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const updateTableHeight = () => {
  const viewport = window.innerHeight
  const navbarOffset = parseCssVar(
    getComputedStyle(document.documentElement).getPropertyValue('--workspace-sticky-offset')
  )
  const filtersHeight = filtersRef.value?.offsetHeight ?? 0
  const padding = 12
  const height = Math.max(240, viewport - navbarOffset - filtersHeight - padding)
  tableHeight.value = `${height}px`
}

const handleResize = () => {
  updateTableHeight()
}

onMounted(() => {
  nextTick(() => updateTableHeight())
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const apiFieldMap: Record<keyof FilterState, string> = {
  planningDays: 'planning_days',
  analysisPeriod: 'analysis_period',
  warehouseWeight: 'warehouse_weight',
  priceMin: 'price_min',
  priceMax: 'price_max',
  turnoverMin: 'turnover_min',
  turnoverMax: 'turnover_max',
  showNoNeed: 'show_no_need',
  sortBy: 'sort_by',
  specificWeightThreshold: 'specific_weight_threshold',
  turnoverFromStock: 'turnover_from_stock'
}

const normalizeValue = (key: keyof FilterState, value: unknown) => {
  if (typeof defaultFilters[key] === 'number') {
    const normalized = Number(value)
    return Number.isNaN(normalized) ? filters[key] : normalized
  }
  if (typeof defaultFilters[key] === 'boolean') {
    return Boolean(value)
  }
  return value as FilterState[typeof key]
}

const setFiltersFromApi = (data: Record<string, unknown>) => {
  (Object.keys(apiFieldMap) as Array<keyof FilterState>).forEach((key) => {
    const apiKey = apiFieldMap[key]
    if (apiKey in data) {
      writableFilters[key] = normalizeValue(key, data[apiKey]) as FilterState[typeof key]
    }
  })
  lastSyncedFilters.value = JSON.parse(JSON.stringify(filters))
  toggleBindings.warehouseWeight = Boolean(filters.warehouseWeight)
  toggleBindings.showNoNeed = filters.showNoNeed
}

const toApiPayload = (partial: Partial<FilterState>) => {
  const payload: Record<string, unknown> = {}
  Object.entries(partial).forEach(([key, value]) => {
    const apiKey = apiFieldMap[key as keyof FilterState]
    if (apiKey && typeof value !== 'undefined') {
      payload[apiKey] = value as FilterState[keyof FilterState]
    }
  })
  return payload
}

const fetchFilters = async () => {
  if (!props.storeId) {
    hasStore.value = false
    return
  }
  try {
    hasStore.value = true
    filtersError.value = null
    const response = await apiService.getStoreFilters(props.storeId)
    setFiltersFromApi(response)
  } catch (error) {
    filtersError.value = error instanceof Error ? error.message : 'Не удалось загрузить фильтры'
  }
}

const filterKeys = Object.keys(filters) as Array<keyof FilterState>

const getChangedFields = () => {
  if (!lastSyncedFilters.value) {
    return { ...filters }
  }
  const diff: Partial<Record<keyof FilterState, FilterState[keyof FilterState]>> = {}
  filterKeys.forEach((key) => {
    if (filters[key] !== lastSyncedFilters.value![key]) {
      diff[key] = filters[key]
    }
  })
  return diff as Partial<FilterState>
}

const saveFilters = async () => {
  if (!props.storeId) return
  const diff = getChangedFields()
  if (Object.keys(diff).length === 0) return
  try {
    isSaving.value = true
    filtersError.value = null
    const payload = toApiPayload(diff)
    const response = await apiService.updateStoreFilters(props.storeId, payload)
    setFiltersFromApi(response)
  } catch (error) {
    filtersError.value = error instanceof Error ? error.message : 'Не удалось сохранить фильтры'
  } finally {
    isSaving.value = false
  }
}

const handleSaveClick = () => {
  saveFilters()
}

watch(
  () => props.storeId,
  () => {
    fetchFilters()
  },
  { immediate: true }
)
</script>

<style scoped>
.planner {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0;
  /* min-height: calc(100vh - var(--workspace-sticky-offset, 64px)); */
}

.planner-card {
  border: none;
  border-radius: 4px;
  box-shadow: none;
  /* margin: 0; */
}

.planner-card .card-header,
.planner-card .card-body {
  padding: 0.35rem 0.5rem;
}

/* .planner-card .card-header {
  border-bottom: none;
} */

/* .planner-card--table {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
} */

.limits-input {
  min-width: 120px;
}

.range-field .double-input {
  display: flex;
  gap: 0.5rem;
}

.range-input {
  background: #f5f5f7;
  border: none;
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  padding: 0.4rem 0.75rem;
}

.range-input:focus {
  border: none;
  box-shadow: inset 0 0 0 2px #1e1b4b;
  background: #fff;
}

.planner-table-wrapper {
  max-height: calc(100vh - 175px);
  /* height: calc(100vh - var(--workspace-sticky-offset, 5rem) - 0.5rem); */
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 10px;
  margin: 0;
}

.planner-table {
  width: 100%;
  min-width: 1500px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.85rem;
}

.planner-table th,
.planner-table td {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 0.6rem 0.75rem;
  vertical-align: middle;
  white-space: nowrap;
}

.planner-table th {
  position: sticky;
  /* top: var(--workspace-sticky-offset, 5px); */
  top: 0;
  background: #f8fafc;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  z-index: 10;
  box-shadow: 0 2px 2px rgba(15, 23, 42, 0.06);
}

.planner-table .sticky-col {
  position: sticky;
  background: #fff;
}

.planner-table th.sticky-col {
  background: #f8fafc;
  z-index: 12;
}

.planner-table .photo-col {
  left: 0;
  min-width: 90px;
  width: 90px;
  text-align: center;
}

.planner-table .supplier-col {
  left: 90px;
  min-width: 220px;
}

.planner-table tbody .photo-col,
.planner-table tbody .supplier-col {
  background: #fff;
  z-index: 8;
}

.planner-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.03);
}

.product-photo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 10px;
}

.planner-table td a {
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
}

.planner-table td a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .planner-table {
    font-size: 0.78rem;
  }
}
</style>
