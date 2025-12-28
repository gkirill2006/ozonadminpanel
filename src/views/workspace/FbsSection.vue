<template>
  <div class="fbs">
    <section class="card shadow-sm fbs-card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h5 class="mb-1">FBS заказы</h5>
            <p class="text-muted small mb-0" v-if="lastSyncedAt">
              Обновлено: {{ formatDateTime(lastSyncedAt) }}
            </p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="handleRefresh" :disabled="isSyncing">
              <span v-if="isSyncing" class="spinner-border spinner-border-sm me-2"></span>
              Обновить
            </button>
            <button
              v-if="isStatusTab"
              class="btn btn-primary btn-sm"
              type="button"
              @click="handlePrint"
            :disabled="!selectedPostingNumbers.length || isPrinting"
          >
            <span v-if="isPrinting" class="spinner-border spinner-border-sm me-2"></span>
            Печать
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="fbs-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            type="button"
            class="fbs-tab"
            :class="{ active: activeStatus === tab.key }"
            @click="activeStatus = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="hasCounts || activeStatus === tab.key"
              class="fbs-tab__count"
            >
              {{ tabCount(tab.key) }}
            </span>
          </button>
          <div v-if="isSyncing" class="fbs-tab-sync">
            <span class="spinner-border spinner-border-sm"></span>
            <span>Синхронизация...</span>
          </div>
        </div>
        <p v-if="isBatchTab" class="fbs-tab-hint">
          Батчи отгрузок, сформированные из вкладки "Новые". Нажмите на батч, чтобы увидеть отправления.
        </p>

        <div v-if="!isBatchTab" class="fbs-toolbar">
          <div class="fbs-toolbar__row">
            <div class="fbs-filter-group fbs-filter-group--toggle">
              <label class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" v-model="needsLabel">
                <span class="form-check-label">Требуют печать</span>
              </label>
            </div>

            <button
              v-if="isAwaitingDeliver"
              class="btn btn-outline-secondary btn-sm"
              type="button"
              @click="selectMissingLabels"
              :disabled="!missingLabelPostings.length"
            >
              Без этикеток
            </button>

            <div class="fbs-filter-group fbs-filter-group--search">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Поиск по отправлению или товару"
                v-model="searchQuery"
              />
            </div>
          </div>
        </div>

        <div v-if="!isBatchTab" class="d-flex flex-wrap gap-2 align-items-end mb-2 selection-bar">
          <div class="range-inputs d-flex gap-2 align-items-end">
            <div>
              <label class="form-label text-uppercase text-muted small fw-semibold mb-1">С строки</label>
              <input
                type="number"
                min="1"
                :max="filteredPostings.length || 1"
                class="form-control form-control-sm"
                v-model="rangeFrom"
              />
            </div>
            <div>
              <label class="form-label text-uppercase text-muted small fw-semibold mb-1">По строку</label>
              <input
                type="number"
                min="1"
                :max="filteredPostings.length || 1"
                class="form-control form-control-sm"
                v-model="rangeTo"
              />
            </div>
          </div>
          <div class="selection-actions d-flex gap-2 align-items-end">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectRange">Выделить</button>
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              @click="resetSelection"
              :disabled="!selectedRowsSize"
            >
              Сброс
            </button>
          </div>
          <div class="ms-md-auto d-flex gap-2 align-items-end">
            <span class="text-muted small">Выбрано строк: {{ selectedRowsSize }}</span>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-1 px-2 mb-3">
          {{ errorMessage }}
        </div>
        <div v-if="labelNotice" class="alert alert-info py-1 px-2 mb-3">
          {{ labelNotice }}
        </div>

        <div v-if="!isBatchTab">
          <div v-if="isLoading" class="fbs-loading">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Загружаем заказы...
          </div>

          <div v-else class="table-responsive fbs-table-wrapper">
            <table class="table fbs-table align-middle">
              <thead>
                <tr>
                  <th class="text-center fbs-col-check">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="allVisibleSelected"
                      @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                    />
                  </th>
                  <th class="fbs-col-number">Номер отправления</th>
                  <th class="fbs-col-status">Статус</th>
                  <th class="fbs-col-date">Дата отгрузки</th>
                  <th class="fbs-col-products">Товары</th>
                  <th class="fbs-col-warehouse">Склад</th>
                  <th class="fbs-col-delivery">Доставка</th>
                  <th v-if="isAwaitingDeliver" class="fbs-col-label">Этикетка</th>
                </tr>
              </thead>
              <tbody v-if="filteredPostings.length">
                <tr
                  v-for="posting in filteredPostings"
                  :key="posting.id"
                  :class="{ 'row-selected': isRowSelected(posting.posting_number) }"
                  @click="toggleRow(posting.posting_number)"
                >
                  <td class="text-center">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="selectedMap[posting.posting_number]"
                      @click.stop
                      @change="toggleSelection(posting.posting_number)"
                    />
                  </td>
                  <td>
                    <div class="fw-semibold">{{ posting.posting_number }}</div>
                    <div v-if="posting.order_number" class="text-muted small">{{ posting.order_number }}</div>
                  </td>
                  <td>
                    <span class="status-pill" :class="statusClass(posting.status)">
                      {{ statusLabel(posting.status) }}
                    </span>
                    <div v-if="posting.substatus" class="text-muted small">{{ posting.substatus }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ formatDateTime(primaryDate(posting)) }}</div>
                    <div v-if="posting.status_changed_at" class="text-muted small">
                      Обновлено: {{ formatDateTime(posting.status_changed_at) }}
                    </div>
                  </td>
                  <td>
                    <div class="fbs-product">
                      <div class="fw-semibold">{{ primaryProductTitle(posting) }}</div>
                      <div class="text-muted small">{{ primaryProductMeta(posting) }}</div>
                      <div v-if="extraProductsCount(posting)" class="text-muted small">
                        + ещё {{ extraProductsCount(posting) }} товар(ов)
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ posting.delivery_method_warehouse || '—' }}</div>
                    <div class="text-muted small">{{ posting.delivery_method_name || '—' }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ posting.tpl_provider || '—' }}</div>
                    <div class="text-muted small">{{ posting.tpl_integration_type || '—' }}</div>
                  </td>
                  <td v-if="isAwaitingDeliver">
                    <button
                      v-if="posting.label_ready && posting.label_file_url"
                      class="btn btn-outline-primary btn-sm"
                      type="button"
                      @click.stop="downloadLabel(posting)"
                    >
                      Этикетка
                    </button>
                    <span v-else class="text-muted small">
                      {{ posting.label_status || '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr>
                  <td :colspan="isAwaitingDeliver ? 8 : 7" class="text-center text-muted py-4">
                    Нет заказов для отображения
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="fbs-batches">
          <div v-if="isBatchLoading" class="fbs-loading">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Загружаем батчи...
          </div>
          <div v-else-if="!shipBatches.length" class="text-center text-muted py-4">
            Батчи пока не созданы
          </div>
          <div v-else class="fbs-batch-list">
            <div
              v-for="batch in shipBatches"
              :key="batch.batch_id"
              class="fbs-batch-card"
              @click="toggleBatch(batch)"
            >
              <div class="fbs-batch-header">
                <div class="fbs-batch-meta">
                  <span class="fbs-batch-meta__strong">{{ batchTitle(batch) }}</span>
                  <span class="fbs-batch-meta__sep">|</span>
                  <span>
                    Отправлений:
                    <span class="fbs-batch-meta__strong">{{ batch.postings_count ?? '—' }}</span>
                  </span>
                  <span class="fbs-batch-meta__dot">·</span>
                  <span>
                    Товаров:
                    <span class="fbs-batch-meta__strong">{{ batch.items_count ?? '—' }}</span>
                  </span>
                  <template v-if="batch.status">
                    <span class="fbs-batch-meta__dot">·</span>
                    <span>Статус: {{ batch.status }}</span>
                  </template>
                </div>
                <div class="d-flex flex-wrap gap-2" @click.stop>
                  <button
                    class="btn btn-outline-primary btn-sm"
                    type="button"
                    :disabled="!batchHasPostings(batch) || isLabeling"
                    @click.stop="handleBatchLabels(batch.batch_id)"
                  >
                    <span v-if="isLabeling" class="spinner-border spinner-border-sm me-2"></span>
                    Этикетки
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" @click.stop>
                    Создать отгрузку
                  </button>
                </div>
              </div>
              <div v-if="isBatchExpanded(batch.batch_id)" class="fbs-batch-body" @click.stop>
                <div v-if="batchDetailLoading[batch.batch_id]" class="fbs-loading">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Загружаем отправления...
                </div>
                <div v-else-if="batchDetailError[batch.batch_id]" class="alert alert-danger py-1 px-2 mb-2">
                  {{ batchDetailError[batch.batch_id] }}
                </div>
                <div v-else>
                  <div v-if="batchPostings(batch.batch_id).length">
                    <div class="batch-selection-bar">
                      <span class="text-muted small">Выбрано: {{ batchSelectedCount(batch.batch_id) }}</span>
                      <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-outline-secondary btn-sm" type="button" @click.stop="selectBatchAll(batch.batch_id)">
                          Выделить все
                        </button>
                        <button
                          class="btn btn-outline-secondary btn-sm"
                          type="button"
                          @click.stop="resetBatchSelection(batch.batch_id)"
                          :disabled="!batchSelectedCount(batch.batch_id)"
                        >
                          Сброс
                        </button>
                        <button
                          class="btn btn-outline-primary btn-sm"
                          type="button"
                          @click.stop="handleBatchSelectionLabels(batch.batch_id)"
                          :disabled="!batchSelectedCount(batch.batch_id) || isLabeling"
                        >
                          <span v-if="isLabeling" class="spinner-border spinner-border-sm me-2"></span>
                          Этикетки
                        </button>
                        <button
                          class="btn btn-outline-primary btn-sm"
                          type="button"
                          @click.stop="handlePrint(batchSelectedNumbers(batch.batch_id))"
                          :disabled="!batchSelectedCount(batch.batch_id) || isPrinting"
                        >
                          <span v-if="isPrinting" class="spinner-border spinner-border-sm me-2"></span>
                          Печать
                        </button>
                      </div>
                    </div>
                    <div class="table-responsive fbs-table-wrapper">
                    <table class="table fbs-table align-middle">
                      <thead>
                        <tr>
                          <th class="text-center fbs-col-check">
                            <input
                              type="checkbox"
                              class="form-check-input"
                              :checked="isBatchAllSelected(batch.batch_id)"
                              @change="toggleBatchSelectAll(batch.batch_id, ($event.target as HTMLInputElement).checked)"
                            />
                          </th>
                          <th class="fbs-col-number">Номер отправления</th>
                          <th class="fbs-col-status">Статус</th>
                          <th class="fbs-col-date">Дата отгрузки</th>
                          <th class="fbs-col-products">Товары</th>
                          <th class="fbs-col-warehouse">Склад</th>
                          <th class="fbs-col-delivery">Доставка</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="posting in batchPostings(batch.batch_id)"
                          :key="posting.id"
                          :class="{ 'row-selected': isBatchRowSelected(batch.batch_id, posting.posting_number) }"
                          @click.stop="toggleBatchRow(batch.batch_id, posting.posting_number)"
                        >
                          <td class="text-center">
                            <input
                              type="checkbox"
                              class="form-check-input"
                              :checked="batchSelectedMap(batch.batch_id)[posting.posting_number]"
                              @click.stop
                              @change="toggleBatchRow(batch.batch_id, posting.posting_number)"
                            />
                          </td>
                          <td>
                            <div class="fw-semibold">{{ posting.posting_number }}</div>
                            <div v-if="posting.order_number" class="text-muted small">{{ posting.order_number }}</div>
                          </td>
                          <td>
                            <span class="status-pill" :class="statusClass(posting.status)">
                              {{ statusLabel(posting.status) }}
                            </span>
                            <div v-if="posting.substatus" class="text-muted small">{{ posting.substatus }}</div>
                          </td>
                          <td>
                            <div class="fw-semibold">{{ formatDateTime(primaryDate(posting)) }}</div>
                            <div v-if="posting.status_changed_at" class="text-muted small">
                              Обновлено: {{ formatDateTime(posting.status_changed_at) }}
                            </div>
                          </td>
                          <td>
                            <div class="fbs-product">
                              <div class="fw-semibold">{{ primaryProductTitle(posting) }}</div>
                              <div class="text-muted small">{{ primaryProductMeta(posting) }}</div>
                              <div v-if="extraProductsCount(posting)" class="text-muted small">
                                + ещё {{ extraProductsCount(posting) }} товар(ов)
                              </div>
                            </div>
                          </td>
                          <td>
                            <div class="fw-semibold">{{ posting.delivery_method_warehouse || '—' }}</div>
                            <div class="text-muted small">{{ posting.delivery_method_name || '—' }}</div>
                          </td>
                          <td>
                            <div class="fw-semibold">{{ posting.tpl_provider || '—' }}</div>
                            <div class="text-muted small">{{ posting.tpl_integration_type || '—' }}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  </div>
                  <div v-else class="text-muted py-3 text-center">Нет отправлений</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="isAwaitingDeliver && selectedPostingNumbers.length"
          class="fbs-label-fab"
        >
          <button
            class="btn btn-primary btn-sm"
            type="button"
            @click="handleLabels()"
            :disabled="isLabeling"
          >
            <span v-if="isLabeling" class="spinner-border spinner-border-sm me-2"></span>
            Сформировать этикетки
          </button>
        </div>
        <div
          v-if="isAwaitingPackaging && selectedPostingNumbers.length"
          class="fbs-ship-fab"
        >
          <button
            class="btn btn-primary btn-sm"
            type="button"
            @click="openShipmentDialog"
          >
            Создать отгрузку
          </button>
        </div>
      </div>
    </section>
  </div>

  <Modal v-if="shipmentDialogOpen" @close="closeShipmentDialog">
    <div class="fbs-modal">
      <h5 class="mb-3">Создать отгрузку</h5>
      <label class="form-label text-uppercase text-muted small fw-semibold">Название отгрузки</label>
      <input
        type="text"
        class="form-control form-control-sm"
        v-model="shipmentName"
        placeholder="Введите название"
      />
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeShipmentDialog">
          Отмена
        </button>
        <button
          class="btn btn-primary btn-sm"
          type="button"
          @click="createShipment"
          :disabled="isShipping"
        >
          <span v-if="isShipping" class="spinner-border spinner-border-sm me-2"></span>
          Создать
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { apiService } from '@/services/api'

const props = defineProps<{
  storeId: string
}>()

interface FbsPostingProduct {
  name?: string
  offer_id?: string
  quantity?: number
  sku?: number | string
  price?: number
}

interface FbsPosting {
  id: number | string
  posting_number: string
  order_number?: string
  status: string
  substatus?: string
  delivery_method_name?: string
  delivery_method_warehouse?: string
  tpl_provider?: string
  tpl_integration_type?: string
  shipment_date?: string | null
  status_changed_at?: string | null
  awaiting_packaging_at?: string | null
  awaiting_deliver_at?: string | null
  acceptance_in_progress_at?: string | null
  delivering_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  needs_label?: boolean
  shipment_batch_id?: string | null
  shipment_batch_seq?: number | null
  shipment_batch_name?: string | null
  label_ready?: boolean
  label_status?: string | null
  label_file_url?: string | null
  label_file_path?: string | null
  products?: FbsPostingProduct[]
  last_synced_at?: string | null
}

interface FbsShipBatch {
  batch_id: string
  batch_seq?: number | null
  name?: string | null
  status?: string | null
  total_count?: number | null
  success_count?: number | null
  failed_count?: number | null
  error_message?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  postings_count?: number | null
  items_count?: number | null
}

interface FbsShipBatchDetail {
  batch: FbsShipBatch
  postings: FbsPosting[]
  count?: number | null
  items_count?: number | null
}

const statusKeys = ['awaiting_packaging', 'awaiting_deliver', 'acceptance_in_progress', 'delivering']

const statusTabs = [
  { key: 'awaiting_packaging', label: 'Новые' },
  { key: 'ship_batches', label: 'На сборке' },
  { key: 'awaiting_deliver', label: 'Ожидают отгрузки' },
  { key: 'acceptance_in_progress', label: 'Приемка' },
  { key: 'delivering', label: 'Доставляются' }
]

const activeStatus = ref<string>('awaiting_packaging')
const needsLabel = ref(false)
const searchQuery = ref('')
const postings = ref<FbsPosting[]>([])
const shipBatches = ref<FbsShipBatch[]>([])
const shipBatchDetails = ref<Record<string, FbsShipBatchDetail>>({})
const shipBatchExpanded = ref<Set<string>>(new Set())
const batchDetailLoading = ref<Record<string, boolean>>({})
const batchDetailError = ref<Record<string, string>>({})
const statusCounts = ref<Record<string, number>>({})
const onPackagingTotal = ref<number | null>(null)
const totalCount = ref<number | null>(null)
const isLoading = ref(false)
const isBatchLoading = ref(false)
const isSyncing = ref(false)
const isPrinting = ref(false)
const isLabeling = ref(false)
const isShipping = ref(false)
const errorMessage = ref<string | null>(null)
const labelNotice = ref<string | null>(null)
const shipmentDialogOpen = ref(false)
const shipmentName = ref('')
const selectedPostings = ref<Set<string>>(new Set())
const rangeFrom = ref('')
const rangeTo = ref('')
const batchSelections = ref<Record<string, Set<string>>>({})

const statusLabelMap: Record<string, string> = {
  awaiting_packaging: 'Ожидает сборки',
  awaiting_deliver: 'Ожидает отгрузки',
  acceptance_in_progress: 'Приемка',
  delivering: 'Доставляется',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
  unknown: 'Неизвестно'
}

const statusDateField: Record<string, keyof FbsPosting> = {
  awaiting_packaging: 'awaiting_packaging_at',
  awaiting_deliver: 'awaiting_deliver_at',
  acceptance_in_progress: 'acceptance_in_progress_at',
  delivering: 'delivering_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at'
}

const selectedMap = computed(() => {
  const map: Record<string, boolean> = {}
  selectedPostings.value.forEach((value) => {
    map[value] = true
  })
  return map
})

const selectedPostingNumbers = computed(() => Array.from(selectedPostings.value))

const filteredPostings = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return postings.value
  return postings.value.filter((posting) => {
    if (posting.posting_number?.toLowerCase().includes(query)) return true
    if (posting.order_number?.toLowerCase().includes(query)) return true
    const products = Array.isArray(posting.products) ? posting.products : []
    return products.some((product) => {
      const fields = [product.name, product.offer_id, product.sku?.toString()]
      return fields.some((field) => (field || '').toString().toLowerCase().includes(query))
    })
  })
})

const isBatchTab = computed(() => activeStatus.value === 'ship_batches')
const isStatusTab = computed(() => statusKeys.includes(activeStatus.value))
const isAwaitingDeliver = computed(() => activeStatus.value === 'awaiting_deliver')
const isAwaitingPackaging = computed(() => activeStatus.value === 'awaiting_packaging')

const missingLabelPostings = computed(() =>
  filteredPostings.value.filter((posting) => !posting.label_ready)
)

const selectedRowsSize = computed(() => selectedPostings.value.size)

const hasCounts = computed(() => totalCount.value !== null || Object.keys(statusCounts.value).length > 0)

const tabCount = (key: string) => {
  if (key === 'ship_batches') {
    if (activeStatus.value === 'ship_batches' && onPackagingTotal.value !== null) {
      return onPackagingTotal.value
    }
    const onPackaging = statusCounts.value.on_packaging
    if (typeof onPackaging === 'number') return onPackaging
    if (onPackagingTotal.value !== null) return onPackagingTotal.value
    return shipBatches.value.length
  }
  if (key === 'all') {
    return totalCount.value ?? (hasCounts.value ? 0 : filteredPostings.value.length)
  }
  const value = statusCounts.value[key]
  if (typeof value === 'number') return value
  if (!hasCounts.value && key === activeStatus.value) {
    return filteredPostings.value.length
  }
  return 0
}

const allVisibleSelected = computed(() => {
  if (!filteredPostings.value.length) return false
  return filteredPostings.value.every((posting) => selectedPostings.value.has(posting.posting_number))
})

const lastSyncedAt = computed(() => {
  const dates = postings.value
    .map((posting) => posting.last_synced_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
  if (!dates.length) return null
  return new Date(Math.max(...dates)).toISOString()
})

const statusLabel = (status?: string) => statusLabelMap[status || 'unknown'] || status

const statusClass = (status?: string) => `status-pill--${status || 'unknown'}`

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const datePart = date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
  const timePart = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${datePart} ${timePart}`
}

const primaryDate = (posting: FbsPosting) => {
  const field = statusDateField[posting.status]
  return (field && posting[field] ? String(posting[field]) : posting.shipment_date) || null
}

const primaryProduct = (posting: FbsPosting) => {
  const products = Array.isArray(posting.products) ? posting.products : []
  return products[0]
}

const primaryProductTitle = (posting: FbsPosting) => {
  const product = primaryProduct(posting)
  if (!product) return '—'
  return product.offer_id || product.name || `SKU ${product.sku ?? ''}`.trim()
}

const primaryProductMeta = (posting: FbsPosting) => {
  const product = primaryProduct(posting)
  if (!product) return ''
  const qty = product.quantity ? `${product.quantity} шт.` : ''
  const sku = product.sku ? `SKU ${product.sku}` : ''
  return [qty, sku].filter(Boolean).join(' · ')
}

const extraProductsCount = (posting: FbsPosting) => {
  const products = Array.isArray(posting.products) ? posting.products : []
  return products.length > 1 ? products.length - 1 : 0
}

const batchTitle = (batch: FbsShipBatch) => {
  if (batch.name) return batch.name
  if (batch.batch_seq) return `Поставка #${batch.batch_seq}`
  return 'Поставка без названия'
}

const isBatchExpanded = (batchId: string) => shipBatchExpanded.value.has(batchId)

const batchPostings = (batchId: string) => {
  const detail = shipBatchDetails.value[batchId]
  return Array.isArray(detail?.postings) ? detail!.postings : []
}

const batchSelectedNumbers = (batchId: string) => Array.from(batchSelections.value[batchId] || new Set())

const batchSelectedCount = (batchId: string) => batchSelections.value[batchId]?.size ?? 0

const batchSelectedMap = (batchId: string) => {
  const selection = batchSelections.value[batchId] || new Set()
  const map: Record<string, boolean> = {}
  selection.forEach((value) => {
    map[value] = true
  })
  return map
}

const isBatchRowSelected = (batchId: string, postingNumber: string) =>
  batchSelections.value[batchId]?.has(postingNumber) ?? false

const selectBatchAll = (batchId: string) => {
  const next = new Set<string>()
  batchPostings(batchId).forEach((posting) => {
    if (posting.posting_number) {
      next.add(posting.posting_number)
    }
  })
  batchSelections.value = { ...batchSelections.value, [batchId]: next }
}

const resetBatchSelection = (batchId: string) => {
  batchSelections.value = { ...batchSelections.value, [batchId]: new Set() }
}

const toggleBatchRow = (batchId: string, postingNumber: string) => {
  const next = new Set(batchSelections.value[batchId] || [])
  if (next.has(postingNumber)) {
    next.delete(postingNumber)
  } else {
    next.add(postingNumber)
  }
  batchSelections.value = { ...batchSelections.value, [batchId]: next }
}

const isBatchAllSelected = (batchId: string) => {
  const postings = batchPostings(batchId)
  if (!postings.length) return false
  const selection = batchSelections.value[batchId]
  if (!selection || !selection.size) return false
  return postings.every((posting) => selection.has(posting.posting_number))
}

const toggleBatchSelectAll = (batchId: string, checked: boolean) => {
  if (checked) {
    selectBatchAll(batchId)
  } else {
    resetBatchSelection(batchId)
  }
}

const batchHasPostings = (batch: FbsShipBatch) => {
  const detail = shipBatchDetails.value[batch.batch_id]
  if (detail) {
    return Array.isArray(detail.postings) && detail.postings.length > 0
  }
  return (batch.postings_count ?? 0) > 0
}

const buildSyncPayload = (options?: { includeStatus?: boolean }) => {
  const payload: Record<string, unknown> = {
    store_id: Number(props.storeId),
    limit: 1000
  }
  if (options?.includeStatus !== false && isStatusTab.value) {
    payload.status = activeStatus.value
  }

  return payload
}

const applyPostingsResponse = (response: unknown, options?: { skipPostings?: boolean }) => {
  if (response && typeof response === 'object') {
    const counts = (response as any).counts
    const total = (response as any).total
    const sync = (response as any).sync
    let nextCounts = counts && typeof counts === 'object' ? { ...(counts as Record<string, number>) } : {}
    let nextTotal = typeof total === 'number' ? total : null
    const awaitingDeliverCount =
      counts && typeof counts === 'object'
        ? (counts as any).awaiting_deliver ?? (counts as any).awaiting_delive
        : undefined
    if (typeof awaitingDeliverCount === 'number') {
      nextCounts.awaiting_deliver = awaitingDeliverCount
    }

    if (sync && typeof sync === 'object') {
      const awaitingPackaging = Number((sync as any).awaiting_packaging?.synced)
      const awaitingDeliver = Number(
        (sync as any).awaiting_deliver?.synced ?? (sync as any).awaiting_delive?.synced
      )
      const hasPackaging = Number.isFinite(awaitingPackaging)
      const hasDeliver = Number.isFinite(awaitingDeliver)
      const hasAwaitingPackagingCount = typeof nextCounts.awaiting_packaging === 'number'
      const hasAwaitingDeliverCount = typeof nextCounts.awaiting_deliver === 'number'
      if (!hasAwaitingPackagingCount && hasPackaging) {
        nextCounts.awaiting_packaging = awaitingPackaging
      }
      if (!hasAwaitingDeliverCount && hasDeliver) {
        nextCounts.awaiting_deliver = awaitingDeliver
      }
      if (nextTotal === null && (hasPackaging || hasDeliver)) {
        nextTotal = (hasPackaging ? awaitingPackaging : 0) + (hasDeliver ? awaitingDeliver : 0)
      }
    }

    statusCounts.value = nextCounts
    if (typeof nextTotal === 'number') {
      totalCount.value = nextTotal
    }
    if (options?.skipPostings) {
      return
    }
    const list = (response as any).postings
    if (Array.isArray(list)) {
      postings.value = list
      return
    }
  }

  if (Array.isArray(response)) {
    postings.value = response as FbsPosting[]
    return
  }

  postings.value = []
}

const loadShipBatches = async (options?: { showLoader?: boolean }) => {
  if (!props.storeId) return
  const showLoader = Boolean(options?.showLoader || !shipBatches.value.length)
  if (showLoader) {
    isBatchLoading.value = true
  }
  errorMessage.value = null
  try {
    const response = await apiService.getFbsShipBatches({ storeId: props.storeId })
    const total = Number((response as any)?.on_packaging_total)
    onPackagingTotal.value = Number.isFinite(total) ? total : null
    const list = (response as any)?.batches
    shipBatches.value = Array.isArray(list) ? (list as FbsShipBatch[]) : []
    shipBatchExpanded.value = new Set()
    shipBatchDetails.value = {}
    batchDetailLoading.value = {}
    batchDetailError.value = {}
    batchSelections.value = {}
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить батчи'
    shipBatches.value = []
    onPackagingTotal.value = null
  } finally {
    if (showLoader) {
      isBatchLoading.value = false
    }
  }
}

const loadShipBatchDetail = async (batchId: string) => {
  if (!batchId) return
  batchDetailLoading.value = { ...batchDetailLoading.value, [batchId]: true }
  batchDetailError.value = { ...batchDetailError.value, [batchId]: '' }
  try {
    const response = await apiService.getFbsShipBatchDetail(batchId)
    const detail: FbsShipBatchDetail = {
      batch: (response as any)?.batch || { batch_id: batchId },
      postings: Array.isArray((response as any)?.postings) ? (response as any).postings : [],
      count: (response as any)?.count ?? null,
      items_count: (response as any)?.items_count ?? null
    }
    shipBatchDetails.value = { ...shipBatchDetails.value, [batchId]: detail }
  } catch (error) {
    batchDetailError.value = {
      ...batchDetailError.value,
      [batchId]: error instanceof Error ? error.message : 'Не удалось загрузить отправления'
    }
  } finally {
    batchDetailLoading.value = { ...batchDetailLoading.value, [batchId]: false }
  }
}

const ensureBatchDetail = async (batchId: string) => {
  if (!shipBatchDetails.value[batchId]) {
    await loadShipBatchDetail(batchId)
  }
}

const toggleBatch = async (batch: FbsShipBatch) => {
  const batchId = batch.batch_id
  const next = new Set(shipBatchExpanded.value)
  if (next.has(batchId)) {
    next.delete(batchId)
    shipBatchExpanded.value = next
    return
  }
  next.add(batchId)
  shipBatchExpanded.value = next
  await ensureBatchDetail(batchId)
  selectBatchAll(batchId)
}

const refreshPostings = async (options?: { showLoader?: boolean }) => {
  if (!props.storeId) return
  if (!isStatusTab.value) return
  const showLoader = Boolean(options?.showLoader || !postings.value.length)
  const skipPostings = activeStatus.value === 'all'
  if (showLoader) {
    isLoading.value = true
  }
  isSyncing.value = true
  errorMessage.value = null
  labelNotice.value = null
  try {
    const payload = buildSyncPayload({ includeStatus: activeStatus.value !== 'all' })
    const response = await apiService.refreshFbsPostings(payload)
    applyPostingsResponse(response, { skipPostings })
    if (skipPostings) {
      await loadPostings()
    } else {
      selectedPostings.value.clear()
      rangeFrom.value = ''
      rangeTo.value = ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось синхронизировать заказы'
  } finally {
    isSyncing.value = false
    if (showLoader) {
      isLoading.value = false
    }
  }
}

const loadPostings = async () => {
  if (!props.storeId) return
  if (!isStatusTab.value) return
  isLoading.value = true
  errorMessage.value = null
  try {
    const params: Record<string, string> = {
      store_id: String(props.storeId)
    }
    if (activeStatus.value !== 'all') {
      params.status = activeStatus.value
    } else {
      params.status = statusKeys
        .join(',')
      params.include_archived = '1'
    }
    if (needsLabel.value) params.needs_label = '1'
    const response = await apiService.getFbsPostings(params)
    applyPostingsResponse(response)
    selectedPostings.value.clear()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить заказы'
    postings.value = []
  } finally {
    isLoading.value = false
  }
}

const handleRefresh = async () => {
  if (isBatchTab.value) {
    isSyncing.value = true
    try {
      await loadShipBatches({ showLoader: true })
    } finally {
      isSyncing.value = false
    }
    return
  }
  await refreshPostings({ showLoader: true })
}

const loadImmediate = async () => {
  if (isBatchTab.value) {
    await loadShipBatches({ showLoader: true })
    return
  }
  await refreshPostings({ showLoader: true })
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatBatchName = (date: Date) => {
  const day = pad2(date.getDate())
  const month = pad2(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())
  return `${day}-${month}-${year} ${hours}-${minutes}`
}

const openShipmentDialog = () => {
  if (!selectedPostings.value.size) return
  shipmentName.value = formatBatchName(new Date())
  shipmentDialogOpen.value = true
}

const closeShipmentDialog = () => {
  shipmentDialogOpen.value = false
}

const createShipment = async () => {
  if (!props.storeId || !selectedPostingNumbers.value.length || isShipping.value) return
  isShipping.value = true
  errorMessage.value = null
  try {
    const payload: Record<string, unknown> = {
      store_id: Number(props.storeId),
      posting_numbers: selectedPostingNumbers.value
    }
    const trimmed = shipmentName.value.trim()
    if (trimmed) {
      payload.batch_name = trimmed
    }
    await apiService.createFbsShipment(payload)
    closeShipmentDialog()
    resetSelection()
    await refreshPostings()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось создать отгрузку'
  } finally {
    isShipping.value = false
  }
}

const selectRange = () => {
  const from = Number(rangeFrom.value)
  const to = Number(rangeTo.value)
  const total = filteredPostings.value.length
  if (Number.isNaN(from) || Number.isNaN(to) || from < 1 || to < from || to > total) return
  const next = new Set(selectedPostings.value)
  for (let i = from; i <= to; i++) {
    const posting = filteredPostings.value[i - 1]
    if (posting?.posting_number) {
      next.add(posting.posting_number)
    }
  }
  selectedPostings.value = next
}

const resetSelection = () => {
  selectedPostings.value = new Set()
  rangeFrom.value = ''
  rangeTo.value = ''
}

const toggleRow = (postingNumber: string) => {
  const next = new Set(selectedPostings.value)
  if (next.has(postingNumber)) {
    next.delete(postingNumber)
  } else {
    next.add(postingNumber)
  }
  selectedPostings.value = next
}

const isRowSelected = (postingNumber: string) => selectedPostings.value.has(postingNumber)

const toggleSelection = (postingNumber: string) => {
  toggleRow(postingNumber)
}

const toggleSelectAll = (checked: boolean) => {
  if (!checked) {
    selectedPostings.value.clear()
    return
  }
  filteredPostings.value.forEach((posting) => {
    selectedPostings.value.add(posting.posting_number)
  })
}

const handlePrint = async (postingNumbers?: string[]) => {
  const numbers = postingNumbers && postingNumbers.length ? postingNumbers : selectedPostingNumbers.value
  if (!props.storeId || !numbers.length) return
  isPrinting.value = true
  errorMessage.value = null
  try {
    const response = await apiService.printFbsPostings({
      store_id: Number(props.storeId),
      posting_numbers: numbers,
      force: false
    })
    if (response && response.needsForce) {
      const confirmText = response.message || 'Этот заказ уже был распечатан. Повторить печать?'
      if (window.confirm(confirmText)) {
        await apiService.printFbsPostings({
          store_id: Number(props.storeId),
          posting_numbers: numbers,
          force: true
        })
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось запустить печать'
  } finally {
    isPrinting.value = false
  }
}

const handleBatchLabels = async (batchId: string) => {
  await ensureBatchDetail(batchId)
  const numbers = batchPostings(batchId).map((posting) => posting.posting_number).filter(Boolean)
  if (!numbers.length) return
  await handleLabels(numbers)
}

const handleBatchSelectionLabels = async (batchId: string) => {
  const numbers = batchSelectedNumbers(batchId)
  if (!numbers.length) return
  await handleLabels(numbers)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const selectMissingLabels = () => {
  selectedPostings.value.clear()
  missingLabelPostings.value.forEach((posting) => {
    selectedPostings.value.add(posting.posting_number)
  })
}

const handleLabels = async (postingNumbers?: string[]) => {
  if (!props.storeId) return
  const numbers = postingNumbers && postingNumbers.length ? postingNumbers : selectedPostingNumbers.value
  if (!numbers.length) return
  isLabeling.value = true
  errorMessage.value = null
  labelNotice.value = null
  try {
    const response = await apiService.createFbsLabels({
      store_id: Number(props.storeId),
      posting_numbers: numbers,
      label_type: 'big_label',
      wait_seconds: 2
    })

    if (response && response.pending) {
      const pending = Array.isArray(response.pending) ? response.pending : []
      const ready = Array.isArray(response.ready) ? response.ready : []
      const parts = []
      if (ready.length) parts.push(`Готово: ${ready.length}`)
      if (pending.length) parts.push(`Готовится: ${pending.length}`)
      labelNotice.value = parts.length ? parts.join(' · ') : 'Этикетки готовятся'
    }

    if (response && response.blob instanceof Blob) {
      downloadBlob(response.blob, `labels_${Date.now()}.pdf`)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось сформировать этикетки'
  } finally {
    isLabeling.value = false
    await loadPostings()
  }
}

const downloadLabel = (posting: FbsPosting) => {
  if (posting.label_file_url) {
    window.open(posting.label_file_url, '_blank')
    return
  }
  handleLabels([posting.posting_number])
}

watch(
  () => props.storeId,
  async () => {
    postings.value = []
    shipBatches.value = []
    shipBatchDetails.value = {}
    shipBatchExpanded.value = new Set()
    batchDetailLoading.value = {}
    batchDetailError.value = {}
    batchSelections.value = {}
    selectedPostings.value.clear()
    statusCounts.value = {}
    onPackagingTotal.value = null
    totalCount.value = null
    activeStatus.value = 'awaiting_packaging'
    rangeFrom.value = ''
    rangeTo.value = ''
    await loadImmediate()
  },
  { immediate: true }
)

watch(
  () => activeStatus.value,
  async () => {
    selectedPostings.value.clear()
    rangeFrom.value = ''
    rangeTo.value = ''
    if (isBatchTab.value) {
      await loadShipBatches()
      return
    }
    await loadPostings()
  }
)

watch(
  needsLabel,
  async () => {
    if (isBatchTab.value) return
    await loadPostings()
  }
)
</script>

<style scoped>
.fbs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
}

.fbs-card {
  border: none;
  border-radius: 16px;
  box-shadow: none;
}

.fbs-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.04);
  margin-bottom: 1rem;
}

.fbs-tab-hint {
  margin: -0.35rem 0 1rem;
  font-size: 0.85rem;
  color: #64748b;
}

.fbs-batches {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fbs-batch-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fbs-batch-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 1rem;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.fbs-batch-card * {
  cursor: inherit;
}

.fbs-batch-card:hover {
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
}

.fbs-batch-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.fbs-batch-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #0f172a;
}

.fbs-batch-meta__strong {
  font-weight: 700;
}

.fbs-batch-meta__sep,
.fbs-batch-meta__dot {
  font-weight: 500;
}

.fbs-batch-body {
  margin-top: 0.75rem;
}

.batch-selection-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
}

.fbs-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-weight: 600;
  font-size: 0.9rem;
}

.fbs-tab.active {
  background: #fff;
  border-color: rgba(15, 23, 42, 0.12);
  color: #0f172a;
}

.fbs-tab__count {
  background: rgba(249, 115, 22, 0.15);
  color: #ea580c;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.fbs-tab-sync {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
}

.fbs-toolbar {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #fff;
}

.fbs-toolbar__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
}

.fbs-filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fbs-filter-group--toggle {
  min-width: 160px;
}

.fbs-filter-group--search {
  flex: 1 1 220px;
}

.fbs-filter-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 600;
}

.fbs-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.fbs-chip {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  background: #f8fafc;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}

.fbs-chip.active {
  background: #fff;
  border-color: rgba(15, 23, 42, 0.2);
  color: #0f172a;
}

.fbs-loading {
  padding: 2rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  color: #0f172a;
  font-weight: 600;
}

.fbs-table-wrapper {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

.fbs-table {
  margin-bottom: 0;
  font-size: 0.86rem;
}

.fbs-table thead th {
  background: #f8fafc;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.fbs-col-check {
  width: 48px;
}

.fbs-col-number {
  min-width: 160px;
}

.fbs-col-status {
  min-width: 170px;
}

.fbs-col-date {
  min-width: 190px;
}

.fbs-col-products {
  min-width: 240px;
}

.fbs-col-warehouse,
.fbs-col-delivery {
  min-width: 190px;
}

.fbs-col-label {
  min-width: 140px;
}

.fbs-table tbody tr {
  cursor: pointer;
}

.fbs-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.04);
}

.fbs-table tbody tr.row-selected {
  background: rgba(34, 197, 94, 0.15);
}

.fbs-table tbody tr.row-selected td {
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.2);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #0f172a;
}

.status-pill--awaiting_packaging {
  background: #ffedd5;
  color: #c2410c;
}

.status-pill--awaiting_deliver {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill--acceptance_in_progress {
  background: #ede9fe;
  color: #6d28d9;
}

.status-pill--delivering {
  background: #e0f2fe;
  color: #0284c7;
}

.status-pill--delivered {
  background: #dcfce7;
  color: #15803d;
}

.status-pill--cancelled {
  background: #fee2e2;
  color: #b91c1c;
}

.status-pill--unknown {
  background: #e2e8f0;
  color: #475569;
}

.fbs-product {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.fbs-label-fab {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 50;
}

.fbs-ship-fab {
  position: fixed;
  left: 50%;
  bottom: 1.5rem;
  transform: translateX(-50%);
  z-index: 50;
}

.fbs-modal {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selection-bar {
  align-items: flex-end !important;
}

@media (max-width: 992px) {
  .fbs-tabs {
    border-radius: 16px;
  }
}
</style>
