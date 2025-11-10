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
        <div class="row g-2">
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

          <div class="col-12 col-lg-6">
            <div
              class="list-card list-card--excluded list-card--clickable"
              role="button"
              tabindex="0"
              @click="openExcludedModal"
              @keydown.enter.prevent="openExcludedModal"
              @keydown.space.prevent="openExcludedModal"
            >
              <div class="list-card__header">
                <span>Список исключений</span>
              </div>
              <div class="list-card__body list-card__body--summary">
                <span v-if="excludedProducts.length">
                  {{ excludedProducts.length }} позиций
                </span>
                <span v-else class="text-muted small">Не задано</span>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-6">
            <div
              class="list-card list-card--required list-card--clickable"
              role="button"
              tabindex="0"
              @click="openRequiredModal"
              @keydown.enter.prevent="openRequiredModal"
              @keydown.space.prevent="openRequiredModal"
            >
              <div class="list-card__header">
                <span>Список обязательных товаров</span>
              </div>
              <div class="list-card__body list-card__body--summary">
                <span v-if="requiredProducts.length">
                  {{ requiredProducts.length }} позиций
                </span>
                <span v-else class="text-muted small">Не задано</span>
              </div>
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
            {{ isSaving ? 'Сохраняем...' : 'Применить' }}
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
        <div v-if="plannerError" class="alert alert-danger py-1 px-2 m-2 mb-0">
          {{ plannerError }}
        </div>
        <div class="planner-table-wrapper" ref="tableWrapperRef" :style="{ height: tableHeight }">
          <div v-if="isPlannerLoading && plannerRows.length" class="planner-table-loading">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Загружаем данные...
          </div>
          <div v-if="isPlannerLoading && !plannerRows.length" class="planner-table-splash">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Готовим таблицу...
          </div>
          <table v-if="plannerRows.length || !isPlannerLoading" class="planner-table">
            <thead>
              <tr>
                <th
                  v-for="(header, idx) in plannerHeaders"
                  :key="header"
                  :class="{
                    'sticky-col photo-col': idx === 0,
                    'sticky-col supplier-col': idx === 1,
                    'sticky-col category-col': idx === 4
                  }"
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody v-if="plannerRows.length">
              <tr v-for="row in plannerRows" :key="row.id">
                <td class="sticky-col photo-col">
                  <img :src="row.photo || fallbackPhoto" alt="photo" class="product-photo" />
                </td>
                <td class="sticky-col supplier-col">{{ row.supplierSku || '—' }}</td>
                <td>{{ formatCurrency(row.price) }}</td>
                <td>{{ row.barcode || '—' }}</td>
                
                <td class="category-col">
                  <span
                    class="category-text"
                    @mouseenter="showCategoryTooltip($event, row.category)"
                    @mouseleave="hideCategoryTooltip"
                  >
                    {{ row.category || '—' }}
                  </span>
                </td>
                
                
                <td>{{ row.productType || '—' }}</td>
                <td>
                  <a v-if="row.link" :href="row.link" target="_blank" rel="noopener">Открыть</a>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="text-end">{{ formatNumber(row.ownStock) }}</td>
                <td class="text-end">{{ formatNumber(row.quantity) }}</td>
                <td class="text-end">{{ formatCurrency(row.revenue) }}</td>
                <td class="text-end">{{ formatNumber(row.dailyUnits) }}</td>
                <td class="text-end">{{ formatNumber(row.turnoverDays) }}</td>
                <td>{{ row.cluster || '—' }}</td>
                <td class="text-end">{{ formatNumber(row.avgDeliveryHours) }}</td>
                <td class="text-end">
                  <span v-if="isNumber(row.influenceShare)">
                    {{ formatNumber(row.influenceShare, { maximumFractionDigits: 2 }) }}%
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="text-end">{{ formatNumber(row.avgDeliveryItemHours) }}</td>
                <td class="text-end">
                  <span v-if="isNumber(row.influenceItemShare)">
                    {{ formatNumber(row.influenceItemShare, { maximumFractionDigits: 2 }) }}%
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="text-end">{{ formatNumber(row.recommendations) }}</td>
                <td class="text-end">{{ formatCurrency(row.recommendationRevenue) }}</td>
                <td class="text-end">{{ formatNumber(row.totalQty) }}</td>
                <td class="text-end">{{ formatCurrency(row.dailyRevenue) }}</td>
                <td class="text-end">{{ formatNumber(row.dailyUnitsTotal) }}</td>
                <td class="text-end">
                  <span v-if="isNumber(row.dailySharePercent)">
                    {{ formatNumber(row.dailySharePercent, { maximumFractionDigits: 3 }) }}%
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="text-end">{{ formatNumber(row.stockWithTransit) }}</td>
                <td class="text-end">{{ formatNumber(row.demand) }}</td>
                <td class="text-end">{{ formatNumber(row.toSupply) }}</td>
                <td>{{ row.article || '—' }}</td>
                <td>{{ row.barcode2 || row.barcode || '—' }}</td>
                <td class="text-end">{{ formatNumber(row.shipmentQty) }}</td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td :colspan="plannerHeaders.length" class="text-center text-muted py-4">
                  Нет данных для отображения
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <Teleport to="body">
      <div
        v-if="categoryTooltip.visible"
        class="category-global-tooltip"
        :style="{
          top: `${categoryTooltip.y}px`,
          left: `${categoryTooltip.x}px`
        }"
      >
        {{ categoryTooltip.text }}
      </div>
    </Teleport>
    <Modal v-if="showExcludedModal" @close="closeExcludedModal">
      <div class="list-modal">
        <h5 class="mb-3">Список исключений</h5>
        <div class="table-responsive">
          <table class="list-table">
            <thead>
              <tr>
                <th>Артикул</th>
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in excludedDraft" :key="`excluded-row-${index}`">
                <td>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    v-model.trim="item.article"
                    placeholder="Артикул"
                  />
                </td>
                <td class="text-end">
                  <button
                    class="btn btn-link btn-sm text-danger"
                    type="button"
                    @click="removeExcludedRow(index)"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="addExcludedRow">
            Добавить строку
          </button>
          <div class="d-flex gap-2">
            <button class="btn btn-link btn-sm" type="button" @click="closeExcludedModal">
              Отмена
            </button>
            <button class="btn btn-primary btn-sm" type="button" @click="applyExcludedDraft">
              Готово
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <Modal v-if="showRequiredModal" @close="closeRequiredModal">
      <div class="list-modal">
        <h5 class="mb-3">Список обязательных товаров</h5>
        <div class="table-responsive">
          <table class="list-table">
            <thead>
              <tr>
                <th>Артикул</th>
                <th style="width: 120px;">Кол-во</th>
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in requiredDraft" :key="`required-row-${index}`">
                <td>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    v-model.trim="item.article"
                    placeholder="Артикул"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    class="form-control form-control-sm"
                    v-model.number="item.quantity"
                  />
                </td>
                <td class="text-end">
                  <button
                    class="btn btn-link btn-sm text-danger"
                    type="button"
                    @click="removeRequiredRow(index)"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="addRequiredRow">
            Добавить строку
          </button>
          <div class="d-flex gap-2">
            <button class="btn btn-link btn-sm" type="button" @click="closeRequiredModal">
              Отмена
            </button>
            <button class="btn btn-primary btn-sm" type="button" @click="applyRequiredDraft">
              Готово
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import Modal from '@/components/Modal.vue'
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

interface RequiredProduct {
  id?: number
  article: string
  quantity: number
}

interface ExcludedProduct {
  id?: number
  article: string
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
const requiredProducts = ref<RequiredProduct[]>([])
const excludedProducts = ref<ExcludedProduct[]>([])
const requiredDraft = ref<RequiredProduct[]>([])
const excludedDraft = ref<ExcludedProduct[]>([])
const showRequiredModal = ref(false)
const showExcludedModal = ref(false)
const lastSyncedRequired = ref<RequiredProduct[]>([])
const lastSyncedExcluded = ref<ExcludedProduct[]>([])
const plannerRows = ref<PlannerRow[]>([])
const isPlannerLoading = ref(false)
const plannerError = ref<string | null>(null)
const categoryTooltip = reactive({
  visible: false,
  text: '',
  x: 0,
  y: 0
})

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
  id: string
  photo: string | null
  supplierSku: string
  price: number | null
  barcode: string
  category: string
  productType: string
  link: string
  ownStock: number | null
  quantity: number | null
  revenue: number | null
  dailyUnits: number | null
  turnoverDays: number | null
  cluster: string
  avgDeliveryHours: number | null
  influenceShare: number | null
  avgDeliveryItemHours: number | null
  influenceItemShare: number | null
  recommendations: number | null
  recommendationRevenue: number | null
  totalQty: number | null
  dailyRevenue: number | null
  dailyUnitsTotal: number | null
  dailySharePercent: number | null
  stockWithTransit: number | null
  demand: number | null
  toSupply: number | null
  article: string
  barcode2: string
  shipmentQty: number | null
}

const fallbackPhoto = 'https://via.placeholder.com/64?text=SKU'

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)

const formatNumber = (value: number | null | undefined, options?: Intl.NumberFormatOptions) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('ru-RU', options).format(num)
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

const showCategoryTooltip = (event: MouseEvent, text?: string | null) => {
  const content = (text || '').trim()
  if (!content) {
    categoryTooltip.visible = false
    return
  }
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  const rect = target.getBoundingClientRect()
  categoryTooltip.text = content
  categoryTooltip.x = rect.left + rect.width / 2
  categoryTooltip.y = rect.bottom + 10
  categoryTooltip.visible = true
}

const hideCategoryTooltip = () => {
  categoryTooltip.visible = false
}

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
  hideCategoryTooltip()
}

const handleGlobalScroll = () => {
  if (categoryTooltip.visible) {
    categoryTooltip.visible = false
  }
}

onMounted(() => {
  nextTick(() => updateTableHeight())
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleGlobalScroll, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleGlobalScroll, true)
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

const sanitizeRequiredList = (list: RequiredProduct[]) =>
  list
    .map((item) => ({
      article: (item.article || '').trim(),
      quantity: Math.max(1, Number(item.quantity) || 1)
    }))
    .filter((item) => item.article)

const sanitizeExcludedList = (list: ExcludedProduct[]) =>
  list
    .map((item) => ({
      article: (item.article || '').trim()
    }))
    .filter((item) => item.article)

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
  requiredProducts.value = sanitizeRequiredList(
    Array.isArray((data as any).required_products) ? (data as any).required_products : []
  )
  excludedProducts.value = sanitizeExcludedList(
    Array.isArray((data as any).excluded_products) ? (data as any).excluded_products : []
  )
  lastSyncedRequired.value = JSON.parse(JSON.stringify(requiredProducts.value))
  lastSyncedExcluded.value = JSON.parse(JSON.stringify(excludedProducts.value))
  requiredDraft.value = JSON.parse(JSON.stringify(requiredProducts.value))
  excludedDraft.value = JSON.parse(JSON.stringify(excludedProducts.value))
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

const toStringSafe = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === null || typeof value === 'undefined') return ''
  return String(value)
}

const extractPlannerRows = (payload: unknown): PlannerRow[] => {
  if (payload && typeof payload === 'object') {
    const clusters = Array.isArray((payload as any).clusters) ? (payload as any).clusters : []
    if (clusters.length) {
      const rows: PlannerRow[] = []
      clusters.forEach((cluster: any, clusterIndex: number) => {
        const products = Array.isArray(cluster?.products) ? cluster.products : []
        products.forEach((product: any, productIndex: number) => {
          const barcodes: string[] = Array.isArray(product?.barcodes)
            ? product.barcodes.map((code: unknown) => toStringSafe(code)).filter(Boolean)
            : []
          const primaryBarcode = barcodes[0] || ''
          const secondaryBarcode = barcodes[1] || primaryBarcode
          rows.push({
            id: `${clusterIndex}-${productIndex}-${product?.sku ?? product?.offer_id ?? productIndex}`,
            photo: typeof product?.photo === 'string' ? product.photo : null,
            supplierSku:
              toStringSafe(product?.offer_id) || toStringSafe(product?.name) || toStringSafe(product?.sku),
            price: toNullableNumber(product?.price),
            barcode: primaryBarcode,
            category: toStringSafe(product?.category),
            productType: toStringSafe(product?.type_name),
            link: typeof product?.ozon_link === 'string' ? product.ozon_link : '',
            ownStock: toNullableNumber(product?.fbs_stock_total_qty),
            quantity: toNullableNumber(product?.sales_qty_cluster),
            revenue: toNullableNumber(product?.product_total_revenue_fbo_fbs),
            dailyUnits: toNullableNumber(product?.avg_daily_sales_fbo_fbs),
            turnoverDays: toNullableNumber(product?.oborachivaemost),
            cluster: toStringSafe(cluster?.cluster_name),
            avgDeliveryHours: toNullableNumber(product?.average_delivery_time),
            influenceShare: toNullableNumber(cluster?.cluster_share_percent),
            avgDeliveryItemHours: toNullableNumber(product?.average_delivery_time_item),
            influenceItemShare: toNullableNumber(product?.impact_share_item),
            recommendations: toNullableNumber(product?.recommended_supply_item),
            recommendationRevenue: toNullableNumber(product?.payout_total),
            totalQty: toNullableNumber(product?.stock_total_cluster),
            dailyRevenue: toNullableNumber(product?.avg_daily_sales_cluster_rub),
            dailyUnitsTotal: toNullableNumber(product?.avg_daily_sales_cluster_qty),
            dailySharePercent: toNullableNumber(product?.share_of_total_daily_average),
            stockWithTransit: toNullableNumber(product?.stock_total_cluster),
            demand: toNullableNumber(product?.need_goods),
            toSupply: toNullableNumber(product?.for_delivery),
            article: toStringSafe(product?.sku) || toStringSafe(product?.offer_id),
            barcode2: secondaryBarcode,
            shipmentQty: toNullableNumber(product?.sales_total_fbo_fbs)
          })
        })
      })
      return rows
    }
  }

  if (Array.isArray(payload)) {
    return payload as PlannerRow[]
  }

  if (payload && typeof payload === 'object') {
    const candidateKeys = ['results', 'data', 'items', 'rows']
    for (const key of candidateKeys) {
      const collection = (payload as Record<string, unknown>)[key]
      if (Array.isArray(collection)) {
        return collection as PlannerRow[]
      }
    }
  }

  return []
}

const fetchPlannerData = async () => {
  if (!props.storeId) {
    plannerRows.value = []
    return
  }
  try {
    isPlannerLoading.value = true
    plannerError.value = null
    const response = await apiService.fetchPlannerData(props.storeId)
    console.log('[Planner] API response:', response)
    plannerRows.value = extractPlannerRows(response)
  } catch (error) {
    plannerError.value = error instanceof Error ? error.message : 'Не удалось загрузить данные планера'
    plannerRows.value = []
  } finally {
    isPlannerLoading.value = false
  }
}

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

const saveFilters = async (): Promise<boolean> => {
  if (!props.storeId) return false
  const diff = getChangedFields()
  const payload = toApiPayload(diff)
  const requiredSanitized = sanitizeRequiredList(requiredProducts.value)
  const excludedSanitized = sanitizeExcludedList(excludedProducts.value)
  const listsChanged =
    JSON.stringify(requiredSanitized) !== JSON.stringify(lastSyncedRequired.value) ||
    JSON.stringify(excludedSanitized) !== JSON.stringify(lastSyncedExcluded.value)
  if (listsChanged) {
    payload.required_products = requiredSanitized
    payload.excluded_products = excludedSanitized
  }
  if (Object.keys(payload).length === 0) return true
  try {
    isSaving.value = true
    filtersError.value = null
    const response = await apiService.updateStoreFilters(props.storeId, payload)
    setFiltersFromApi(response)
    return true
  } catch (error) {
    filtersError.value = error instanceof Error ? error.message : 'Не удалось сохранить фильтры'
    return false
  } finally {
    isSaving.value = false
  }
}

const handleSaveClick = async () => {
  if (!props.storeId || isSaving.value) return
  const saved = await saveFilters()
  if (saved) {
    await fetchPlannerData()
  }
}

const openRequiredModal = () => {
  requiredDraft.value = JSON.parse(JSON.stringify(requiredProducts.value))
  showRequiredModal.value = true
}

const openExcludedModal = () => {
  excludedDraft.value = JSON.parse(JSON.stringify(excludedProducts.value))
  showExcludedModal.value = true
}

const closeRequiredModal = () => {
  showRequiredModal.value = false
}

const closeExcludedModal = () => {
  showExcludedModal.value = false
}

const applyRequiredDraft = () => {
  requiredProducts.value = sanitizeRequiredList(requiredDraft.value)
  showRequiredModal.value = false
}

const applyExcludedDraft = () => {
  excludedProducts.value = sanitizeExcludedList(excludedDraft.value)
  showExcludedModal.value = false
}

const addRequiredRow = () => {
  requiredDraft.value = [
    ...requiredDraft.value,
    { article: '', quantity: 1 }
  ]
}

const addExcludedRow = () => {
  excludedDraft.value = [
    ...excludedDraft.value,
    { article: '' }
  ]
}

const removeRequiredRow = (index: number) => {
  requiredDraft.value.splice(index, 1)
}

const removeExcludedRow = (index: number) => {
  excludedDraft.value.splice(index, 1)
}

watch(
  () => props.storeId,
  async () => {
    await fetchFilters()
    await fetchPlannerData()
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

.list-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 0.75rem;
  height: 100%;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.list-card--clickable {
  cursor: pointer;
}

.list-card--clickable:hover {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
  transform: translateY(-1px);
}

.list-card--clickable:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.list-card--excluded {
  background: #fdecef;
}

.list-card--required {
  background: #ecf2ff;
}

.list-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.list-card__body {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 6rem;
  overflow: auto;
}

.list-card__body--summary {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  max-height: none;
  overflow: visible;
  min-height: 1.5rem;
}

.list-modal {
  width: fit-content;
  max-width: 90vw;
  min-width: 360px;
}

.list-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.list-table th,
.list-table td {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 0.4rem;
}

.list-table input {
  background: #f8f9fb;
}

.planner-table-wrapper {
  max-height: calc(100vh - 175px);
  /* height: calc(100vh - var(--workspace-sticky-offset, 5rem) - 0.5rem); */
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 10px;
  margin: 0;
  position: relative;
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
  width: 170px;
  min-width: 170px;
  max-width: 170px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planner-table .category-col {
  min-width: 200px;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: inherit;
}

.category-global-tooltip {
  position: fixed;
  transform: translate(-50%, 0);
  background: #0f172a;
  color: #fff;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
  pointer-events: none;
  z-index: 9999;
  max-width: min(320px, 90vw);
  text-align: center;
}
.planner-table .category-col {
  left: 90px;
  width: 100px;
  min-width: 100px;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: sticky;
  background: #fff;
  cursor: default;
}

/* внутренний контейнер для тултипа */
.planner-table .category-wrapper {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

/* подсказка */
.planner-table .category-wrapper .tooltip {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: 100%;
  left: 0;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  font-size: 12px;
  z-index: 999;
  transform: translateY(-4px);
  transition: opacity 0.2s ease;
}

/* при наведении — показываем тултип */
.planner-table .category-wrapper:hover .tooltip {
  visibility: visible;
  opacity: 1;
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

.planner-table-splash {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #0f172a;
  font-weight: 600;
  gap: 0.5rem;
}

.planner-table-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 25;
  font-weight: 600;
  color: #0f172a;
}

.planner-table-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-weight: 500;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .planner-table {
    font-size: 0.78rem;
  }
}
</style>
