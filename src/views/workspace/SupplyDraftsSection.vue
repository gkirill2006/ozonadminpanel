<template>
  <div class="drafts-page">
    <section class="card shadow-sm">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="mb-0">Черновики поставок</h5>
        <div class="d-flex align-items-center gap-2">
          <span class="text-muted small">Магазин: {{ storeId }}</span>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="fetchBatches">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
            Обновить
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="error" class="alert alert-danger py-2 px-3 mb-3">{{ error }}</div>
        <div v-else-if="!isLoading && !batches.length" class="text-muted small">Черновиков пока нет.</div>
        <div v-if="batches.length">
          <div v-for="batch in batches" :key="batch.batch_id" class="batch-block">
            <div class="d-flex flex-wrap align-items-center gap-3 mb-2">
              <div class="fw-semibold">Batch: {{ batch.batch_id }}</div>
              <div class="text-muted small">Склад сдачи: {{ batch.drop_off_point_name || batch.drop_off_point_warehouse?.name || '—' }}</div>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2 mb-3 filter-row">
              <span class="text-muted small me-1">Запросить тайм-слоты:</span>
              <input
                type="date"
                class="form-control form-control-sm date-input"
                v-model="batchDates[getBatchKey(batch)]"
              />
              <input
                type="number"
                min="1"
                max="14"
                class="form-control form-control-sm days-input"
                v-model.number="timeslotDays[getBatchKey(batch)]"
                placeholder="дней"
              />
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                :disabled="timeslotLoading === getBatchKey(batch)"
                @click="applyBatchDate(batch, true)"
              >
                <span v-if="timeslotLoading === getBatchKey(batch)" class="spinner-border spinner-border-sm me-1"></span>
                Запросить
              </button>
              <div class="text-muted small ms-auto">Текущая дата: {{ appliedBatchDates[getBatchKey(batch)] || 'не выбрана' }}</div>
            </div>

            <div class="table-responsive drafts-table mb-3">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Кластер</th>
                    <th>Склад</th>
                    <th>Таймслоты</th>
                    <th>Общие временные слоты</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(draft, draftIndex) in batch.drafts || []" :key="getDraftKey(draft)">
                    <td class="fw-semibold">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <span>{{ draft.logistic_cluster_name || draft.warehouse || '—' }}</span>
                        <button
                          class="btn btn-link btn-sm p-0 text-danger delete-btn"
                          type="button"
                          title="Удалить черновик"
                          @click="openDeleteDraft(draft)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0V6h-3v6.5a.5.5 0 0 1-1 0v-7z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2h3l.5-1h3l.5 1h3a1 1 0 0 1 1 1zM4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4H4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div class="small fw-semibold">{{ getSelectedWarehouseName(draft) || '—' }}</div>
                      <button class="btn btn-link btn-sm p-0" type="button" @click="toggleInlineWarehouse(draft)">
                        Изменить
                      </button>
                      <div v-if="expandedDraftKey === getDraftKey(draft)" class="inline-warehouses mt-2">
                        <div v-if="warehouseOptionsInline.length" class="list-group">
                          <label
                            v-for="option in warehouseOptionsInline"
                            :key="option.warehouse_id"
                            class="list-group-item d-flex align-items-start gap-2"
                            :class="{ 'opacity-50': option.is_available === false }"
                          >
                            <input
                              class="form-check-input mt-1"
                              type="radio"
                              :value="option.warehouse_id"
                              :name="`inline-warehouse-${expandedDraftKey}`"
                              :checked="Number(option.warehouse_id) === Number(getSelectedWarehouseId(draft))"
                              :disabled="option.is_available === false"
                              @change="saveWarehouseSelectionInline(draft, option.warehouse_id)"
                            />
                            <div class="flex-grow-1">
                              <div class="fw-semibold">{{ option.name || '—' }}</div>
                              <div class="text-muted small">{{ option.address || '—' }}</div>
                            </div>
                          </label>
                        </div>
                        <div v-else class="text-muted small">Нет доступных складов</div>
                      </div>
                    </td>
                    <td>
                      <div v-if="timeslotError[getBatchKey(batch)]" class="text-danger small mb-1">
                        {{ timeslotError[getBatchKey(batch)] }}
                      </div>
                      <div v-if="Object.keys(getSlotsGroupedByDate(draft)).length" class="timeslot-block">
                        <div
                          class="timeslot-date"
                          v-for="(slotsByDate, date) in getSlotsGroupedByDate(draft)"
                          :key="`${getDraftKey(draft)}-${date}`"
                        >
                          <button
                            type="button"
                            class="btn btn-link btn-sm p-0 d-flex align-items-center gap-1"
                            @click="toggleDateExpanded(draft, date)"
                          >
                            <span class="chevron" :class="{ open: isDateExpanded(draft, date) }">▸</span>
                            <span>{{ date }}</span>
                          </button>
                          <div v-if="isDateExpanded(draft, date)" class="timeslot-list mt-1">
                            <div class="slot-option" v-for="slot in slotsByDate" :key="slot.key">
                              <label class="d-flex align-items-center gap-2">
                                <input
                                  type="radio"
                                  :name="`slot-${getDraftKey(draft)}`"
                                  :value="slot.key"
                                  v-model="selectedTimeslot[getDraftKey(draft)]"
                                />
                                <span>{{ slot.from }} — {{ slot.to }}</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else class="text-muted small">Слотов нет</div>
                    </td>
                    <td
                      v-if="draftIndex === 0"
                      :rowspan="(batch.drafts && batch.drafts.length) || 1"
                      class="common-slots-cell"
                    >
                      <div v-if="Object.keys(getCommonTimeslotsByDate(batch)).length">
                        <div
                          class="timeslot-date"
                          v-for="(slotsByDate, date) in getCommonTimeslotsByDate(batch)"
                          :key="`${getBatchKey(batch)}-common-${date}`"
                        >
                          <button
                            type="button"
                            class="btn btn-link btn-sm p-0 d-flex align-items-center gap-1"
                            @click="toggleCommonDateExpanded(batch, date)"
                          >
                            <span class="chevron" :class="{ open: isCommonDateExpanded(batch, date) }">▸</span>
                            <span>{{ formatDateShort(date) }}</span>
                          </button>
                          <div v-if="isCommonDateExpanded(batch, date)" class="timeslot-list mt-1">
                            <div class="slot-option" v-for="slot in slotsByDate" :key="slot.key">
                              <label class="d-flex align-items-center gap-2">
                                <input
                                  type="radio"
                                  :name="`common-slot-${getBatchKey(batch)}`"
                                  :value="slot.key"
                                  v-model="selectedCommonTimeslot[getBatchKey(batch)]"
                                />
                                <span>{{ slot.from }} — {{ slot.to }}</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <button
                          class="btn btn-primary btn-sm mt-3"
                          type="button"
                          :disabled="!selectedCommonTimeslot[getBatchKey(batch)] || confirmSupplyLoading === getBatchKey(batch)"
                          @click="createCommonApplication(batch)"
                        >
                          <span v-if="confirmSupplyLoading === getBatchKey(batch)" class="spinner-border spinner-border-sm me-1"></span>
                          Создать заявку
                        </button>
                        <div v-if="confirmSupplyError[getBatchKey(batch)]" class="text-danger small mt-2">
                          {{ confirmSupplyError[getBatchKey(batch)] }}
                        </div>
                      </div>
                      <div v-else class="text-muted small">Нет общих слотов</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card shadow-sm mt-4">
      <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 class="mb-0">Актуальные поставки</h5>
        <div class="text-muted small">Магазин: {{ storeId }}</div>
      </div>
      <div class="card-body">
        <div v-if="confirmedLoading" class="state state--loading">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Загружаем подтвержденные поставки...
        </div>
        <div v-else-if="confirmedError" class="alert alert-danger py-2 px-3">{{ confirmedError }}</div>
        <div v-else-if="!confirmedBatches.length" class="text-muted small">Пока нет подтвержденных поставок.</div>
        <div v-else class="d-flex flex-column gap-3">
          <div
            v-for="batch in confirmedBatches"
            :key="getBatchKey(batch)"
            class="p-3 border rounded-3 bg-light-subtle"
          >
            <div class="d-flex flex-wrap align-items-center gap-3 mb-2">
              <div>
                <div class="text-muted small">Дата</div>
                <div class="fw-semibold">
                  <span v-if="batch.drafts?.[0]?.selected_timeslot">
                    {{ formatDateTimeShort(batch.drafts[0].selected_timeslot.from_in_timezone || batch.drafts[0].selected_timeslot.from || '') }}
                  </span>
                  <span v-else>—</span>
                </div>
              </div>
              <div>
                <div class="text-muted small">Склад сдачи</div>
                <div class="fw-semibold">{{ batch.drop_off_point_name || batch.drop_off_point_warehouse?.name || '—' }}</div>
              </div>
              <div>
                <div class="text-muted small">Кластер</div>
                <div class="fw-semibold">
                  {{ batch.drafts?.[0]?.logistic_cluster_name || batch.drafts?.[0]?.warehouse || '—' }}
                </div>
              </div>
              <div>
                <div class="text-muted small">Статус</div>
                <div :class="['fw-semibold', isCancelled(getOrderStateForBatch(batch)) ? 'text-danger' : '']">
                  {{ getOrderStateForBatch(batch) }}
                </div>
              </div>
              <div class="ms-auto">
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  @click="toggleSupplyExpand(batch)"
                >
                  {{ isSupplyExpanded(getBatchKey(batch)) ? 'Свернуть' : 'Развернуть' }}
                </button>
              </div>
            </div>
            <div v-if="isSupplyExpanded(getBatchKey(batch))" class="table-responsive">
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Фото</th>
                    <th>SKU</th>
                    <th>Товар</th>
                    <th>ШК</th>
                    <th>Product ID</th>
                    <th>Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="draft in batch.drafts || []" :key="`orders-${getDraftKey(draft)}`">
                    <template v-if="getBundleItemsForDraft(getBatchKey(batch), draft).length">
                      <tr
                        v-for="(item, idx) in getBundleItemsForDraft(getBatchKey(batch), draft)"
                        :key="`${getBatchKey(batch)}-${getDraftKey(draft)}-${item.sku}-${idx}`"
                      >
                        <td>
                          <img v-if="item.icon_path" :src="item.icon_path" alt="" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" />
                        </td>
                        <td>{{ item.sku || '—' }}</td>
                        <td>{{ item.offer_id || item.name || '—' }}</td>
                        <td>{{ item.barcode || '—' }}</td>
                        <td>{{ item.product_id || '—' }}</td>
                        <td>{{ item.quantity || 0 }}</td>
                      </tr>
                    </template>
                    <tr v-else>
                      <td colspan="6" class="text-muted">Нет товаров</td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Modal v-if="draftToDelete" :show="true" @close="closeDeleteDraft">
      <h5 class="mb-3">Удалить черновик?</h5>
      <p class="mb-3">
        Черновик
        <strong>{{ draftToDelete?.logistic_cluster_name || draftToDelete?.warehouse || draftToDelete?.draft_id }}</strong>
        будет удалён. Продолжить?
      </p>
      <div v-if="deleteError" class="alert alert-danger py-2 px-3">{{ deleteError }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeDeleteDraft">Отмена</button>
        <button class="btn btn-danger btn-sm" type="button" :disabled="deleteLoading" @click="confirmDeleteDraft">
          <span v-if="deleteLoading" class="spinner-border spinner-border-sm me-1"></span>
          Удалить
        </button>
      </div>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { apiService } from '@/services/api'

const props = defineProps<{ storeId: string }>()

const batches = ref<any[]>([])
const confirmedBatches = ref<any[]>([])
const isLoading = ref(false)
const confirmedLoading = ref(false)
const error = ref<string | null>(null)
const confirmedError = ref<string | null>(null)
const supplyInfo = ref<Record<string, any>>({})
const batchDates = ref<Record<string, string>>({})
const appliedBatchDates = ref<Record<string, string>>({})
const timeslotDays = ref<Record<string, number>>({})
const timeslotData = ref<Record<string, any>>({})
const timeslotDataByDraft = ref<Record<string, Array<{ key: string; date: string; from: string; to: string }>>>({})
const timeslotLoading = ref<string | null>(null)
const timeslotError = ref<Record<string, string>>({})
const selectedTimeslot = ref<Record<string, string>>({})
const selectedCommonTimeslot = ref<Record<string, string>>({})
const confirmSupplyLoading = ref<string | null>(null)
const confirmSupplyError = ref<Record<string, string>>({})
const expandedDraftKey = ref<string | null>(null)
const warehouseOptionsInline = ref<any[]>([])
const expandedDates = ref<Record<string, Record<string, boolean>>>({})
const expandedCommonDates = ref<Record<string, Record<string, boolean>>>({})
const draftToDelete = ref<any | null>(null)
const deleteLoading = ref(false)
const deleteError = ref<string | null>(null)
const expandedSupplies = ref<Set<string>>(new Set())

const draftRows = computed(() =>
  batches.value.flatMap((batch) => {
    const draftList = Array.isArray(batch?.drafts) ? batch.drafts : []
    const batchKey = getBatchKey(batch)
    return draftList.map((draft: any) => ({
      batch,
      draft,
      batchKey,
      draftKey: String(draft?.draft_id ?? draft?.id ?? `${batchKey}-${Math.random()}`),
      rowKey: `${batchKey}-${draft?.draft_id ?? draft?.id ?? Math.random()}`
    }))
  })
)

const fetchBatches = async () => {
  if (!props.storeId) return
  isLoading.value = true
  error.value = null
  timeslotData.value = {}
  timeslotDataByDraft.value = {}
  timeslotError.value = {}
  selectedTimeslot.value = {}
  expandedDraftKey.value = null
  try {
    const response = await apiService.getSupplyDraftBatches({ storeId: props.storeId })
    batches.value = Array.isArray(response) ? response : []
    ensureBatchDates(batches.value)
    // Автоподгрузка таймслотов для уже существующих батчей
    for (const batch of batches.value) {
      const key = getBatchKey(batch)
      loadBatchTimeslots(batch, key, true)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить черновики'
    batches.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchConfirmedBatches = async () => {
  if (!props.storeId) return
  confirmedLoading.value = true
  confirmedError.value = null
  supplyInfo.value = {}
  try {
    const resp = await apiService.getConfirmedDraftBatches({ storeId: props.storeId })
    confirmedBatches.value = Array.isArray(resp) ? resp : []
    for (const batch of confirmedBatches.value) {
      try {
        const info = await apiService.getSupplyInfo(batch.batch_id)
        supplyInfo.value[getBatchKey(batch)] = info
      } catch (e) {
        // не блокируем остальные
      }
    }
  } catch (err) {
    confirmedError.value = err instanceof Error ? err.message : 'Не удалось загрузить актуальные поставки'
    confirmedBatches.value = []
  } finally {
    confirmedLoading.value = false
  }
}

const defaultDate = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString('ru-RU')
}

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('ru-RU')
}

const formatDateTimeShort = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yy} ${hh}:${min}`
}

const getBatchKey = (batch: any) => String(batch?.batch_id ?? Math.random())
// Важно: для "черновика" используем локальный id (draft.id), т.к. draft.draft_id может быть OZON draft_id.
const getDraftKey = (draft: any) => String(draft?.id ?? draft?.draft_id ?? Math.random())

const ensureBatchDates = (batchesList: any[]) => {
  batchesList.forEach((batch) => {
    const key = getBatchKey(batch)
    if (!batchDates.value[key]) batchDates.value[key] = defaultDate()
    if (!appliedBatchDates.value[key]) appliedBatchDates.value[key] = batchDates.value[key]
    if (!timeslotDays.value[key]) timeslotDays.value[key] = 3
  })
}

const applyBatchDate = (batch: any, withFetch = false) => {
  const key = getBatchKey(batch)
  if (!batchDates.value[key]) batchDates.value[key] = defaultDate()
  appliedBatchDates.value[key] = batchDates.value[key]
  if (withFetch) {
    fetchTimeslots(batch)
  }
}

const getSelectedWarehouseId = (draft: any) => {
  const selected = draft?.selected_supply_warehouse
  const rawId =
    selected?.supply_warehouse?.warehouse_id ??
    selected?.warehouse_id ??
    selected?.id ??
    selected?.warehouseId ??
    draft?.selected_supply_warehouse_id
  if (rawId === undefined || rawId === null) return null
  return rawId
}

const getSelectedWarehouseName = (draft: any) =>
  draft?.selected_supply_warehouse?.supply_warehouse?.name ||
  draft?.selected_supply_warehouse?.name ||
  draft?.selected_supply_warehouse?.supply_warehouse_name ||
  ''

const draftHasSelectedWarehouse = (draft: any) => getSelectedWarehouseId(draft) !== null

const pickAutoWarehouse = (draft: any) => {
  if (!Array.isArray(draft?.supply_warehouse)) return null
  for (const entry of draft.supply_warehouse) {
    if (!Array.isArray(entry?.warehouses)) continue
    const available = entry.warehouses.find((w: any) => w?.status?.is_available && w?.supply_warehouse)
    if (available?.supply_warehouse?.warehouse_id) return available.supply_warehouse
    const first = entry.warehouses.find((w: any) => w?.supply_warehouse)
    if (first?.supply_warehouse?.warehouse_id) return first.supply_warehouse
    if (entry?.warehouse_id) {
      const availableFlat = entry?.status?.is_available !== false
      if (availableFlat) return entry
    }
  }
  return null
}

const getDraftApiId = (draft: any) =>
  draft?.id !== undefined && draft?.id !== null ? draft.id : draft?.draft_id

const fetchTimeslots = async (batch: any) => {
  const key = getBatchKey(batch)
  if (!batchDates.value[key]) batchDates.value[key] = defaultDate()
  const dateFrom = new Date(batchDates.value[key]).toISOString()
  const days = Number(timeslotDays.value[key] || 7)
  const drafts = Array.isArray(batch?.drafts) ? batch.drafts : []
  // сбрасываем предыдущие слоты, чтобы не висели старые данные
  drafts.forEach((draft: any) => {
    timeslotDataByDraft.value[getDraftKey(draft)] = []
  })
  const missingDrafts = drafts.filter((draft: any) => !draftHasSelectedWarehouse(draft))
  if (missingDrafts.length) {
    const failed: string[] = []
    for (const draft of missingDrafts) {
      const candidate = pickAutoWarehouse(draft)
      if (!candidate?.warehouse_id) {
        failed.push(draft?.logistic_cluster_name || draft?.warehouse || draft?.draft_id || '—')
        continue
      }
      try {
        const apiDraftId = getDraftApiId(draft)
        await apiService.selectDraftWarehouse(apiDraftId, candidate.warehouse_id)
      } catch (err) {
        failed.push(draft?.logistic_cluster_name || draft?.warehouse || draft?.draft_id || '—')
      }
    }
    if (failed.length) {
      timeslotError.value[key] = `Выберите склад для: ${failed.join(', ')}`
      return
    }
    // обновить данные черновиков после авто-выбора склада
    await fetchBatches()
  }
  timeslotLoading.value = key
  timeslotError.value[key] = ''
  try {
    await apiService.fetchDraftTimeslots({
      batch_id: batch.batch_id,
      date_from: dateFrom,
      days
    })
    await loadBatchTimeslots(batch, key)
  } catch (err) {
    timeslotError.value[key] = err instanceof Error ? err.message : 'Не удалось получить таймслоты'
  } finally {
    timeslotLoading.value = null
  }
}

const mapTimeslotsForDraft = (draft: any) => {
  const warehouseId = getSelectedWarehouseId(draft)
  const slots: Array<{ key: string; date: string; from: string; to: string }> = []

  // Новый формат: timeslots_by_warehouse -> dates -> timeslots
  if (Array.isArray(draft?.timeslots_by_warehouse) && draft.timeslots_by_warehouse.length) {
    let entries = draft.timeslots_by_warehouse.filter(
      (item: any) => !warehouseId || item?.warehouse_id === warehouseId
    )
    // если для выбранного склада слотов нет, показываем все доступные записи
    if (!entries.length) {
      entries = draft.timeslots_by_warehouse
    }
    entries.forEach((entry: any) => {
      if (!Array.isArray(entry?.dates)) return
      entry.dates.forEach((day: any) => {
        if (!Array.isArray(day?.timeslots)) return
        day.timeslots.forEach((slot: any) => {
          const from = slot?.from
          const to = slot?.to
          slots.push({
            key: `${entry?.warehouse_id || 'w'}_${day?.date || ''}_${from || ''}_${to || ''}`,
            date: formatDateShort(day?.date || from),
            from: formatTime(from),
            to: formatTime(to)
          })
        })
      })
    })
  }

  // Старый формат: timeslot_response.drop_off_warehouse_timeslots
  if (!slots.length && draft?.timeslot_response && Array.isArray(draft.timeslot_response.drop_off_warehouse_timeslots)) {
    let entries = draft.timeslot_response.drop_off_warehouse_timeslots.filter(
      (item: any) => !warehouseId || item?.drop_off_warehouse_id === warehouseId
    )
    if (!entries.length) {
      entries = draft.timeslot_response.drop_off_warehouse_timeslots
    }
    entries.forEach((entry: any) => {
      if (!Array.isArray(entry?.days)) return
      entry.days.forEach((day: any) => {
        if (!Array.isArray(day?.timeslots)) return
        day.timeslots.forEach((slot: any) => {
          const from = slot?.from_in_timezone || slot?.from
          const to = slot?.to_in_timezone || slot?.to
          slots.push({
            key: `${from || ''}_${to || ''}`,
            date: formatDateShort(from),
            from: formatTime(from),
            to: formatTime(to)
          })
        })
      })
    })
  }

  return slots
}

const getSlotsForDraft = (draft: any) => {
  const key = getDraftKey(draft)
  const cached = timeslotDataByDraft.value[key]
  if (cached?.length) return cached
  // Фоллбэк: если слоты лежат прямо в draft (например, пришли в batches), посчитаем на лету
  if (draft?.timeslots_by_warehouse || draft?.timeslot_response) {
    const slots = mapTimeslotsForDraft(draft)
    if (slots.length) {
      timeslotDataByDraft.value[key] = slots
      return slots
    }
  }
  return []
}

const getSlotsGroupedByDate = (draft: any) => {
  const grouped: Record<string, Array<{ key: string; date: string; from: string; to: string }>> = {}
  getSlotsForDraft(draft).forEach((slot) => {
    if (!grouped[slot.date]) grouped[slot.date] = []
    grouped[slot.date].push(slot)
  })
  return grouped
}

const toggleDateExpanded = (draft: any, date: string) => {
  const draftKey = getDraftKey(draft)
  if (!expandedDates.value[draftKey]) expandedDates.value[draftKey] = {}
  expandedDates.value[draftKey][date] = !expandedDates.value[draftKey][date]
}

const isDateExpanded = (draft: any, date: string) => {
  const draftKey = getDraftKey(draft)
  return !!expandedDates.value[draftKey]?.[date]
}

const getCommonTimeslotsByDate = (batch: any) => {
  const grouped: Record<
    string,
    Array<{ key: string; from: string; to: string; fromRaw: string; toRaw: string }>
  > = {}
  const batchKey = getBatchKey(batch)
  const source = Array.isArray(batch?.common_timeslots)
    ? batch.common_timeslots
    : Array.isArray(timeslotData.value[batchKey]?.common_timeslots)
      ? timeslotData.value[batchKey].common_timeslots
      : []

  source.forEach((entry: any, idx: number) => {
    const date = entry?.date
    if (!date || !Array.isArray(entry?.timeslots)) return
    entry.timeslots.forEach((slot: any, sIdx: number) => {
      const from = slot?.from
      const to = slot?.to
      const key = `${date}-${from || ''}-${to || ''}-${idx}-${sIdx}`
      if (!grouped[date]) grouped[date] = []
      grouped[date].push({
        key,
        from: formatTime(from),
        to: formatTime(to),
        fromRaw: from,
        toRaw: to
      })
    })
  })
  return grouped
}

const toggleCommonDateExpanded = (batch: any, date: string) => {
  const key = getBatchKey(batch)
  if (!expandedCommonDates.value[key]) expandedCommonDates.value[key] = {}
  expandedCommonDates.value[key][date] = !expandedCommonDates.value[key][date]
}

const isCommonDateExpanded = (batch: any, date: string) => {
  const key = getBatchKey(batch)
  return !!expandedCommonDates.value[key]?.[date]
}

const toggleSupplyExpand = (batch: any) => {
  const key = getBatchKey(batch)
  const set = expandedSupplies.value
  if (set.has(key)) {
    set.delete(key)
  } else {
    set.add(key)
  }
  // trigger reactivity
  expandedSupplies.value = new Set(set)
}

const isSupplyExpanded = (batchKey: string) => expandedSupplies.value.has(batchKey)

const getBundleItemsForDraft = (batchKey: string, draft: any) => {
  const info = supplyInfo.value[batchKey]
  if (!info?.results) return []
  const draftId = draft?.id ?? draft?.draft_id
  const entries = info.results.filter((r: any) => r?.draft_id === draftId)
  const items: any[] = []
  entries.forEach((entry: any) => {
    if (Array.isArray(entry?.bundle_items)) {
      entry.bundle_items.forEach((item: any) => items.push(item))
    }
  })
  return items
}

const getOrderStateForItem = (batchKey: string, draft: any) => {
  const info = supplyInfo.value[batchKey]
  if (!info?.results) return '—'
  const draftId = draft?.id ?? draft?.draft_id
  const entry = info.results.find((r: any) => r?.draft_id === draftId)
  if (Array.isArray(entry?.order_states) && entry.order_states.length) {
    return entry.order_states.join(', ')
  }
  return '—'
}

const getOrderStateForBatch = (batch: any) => {
  const key = getBatchKey(batch)
  if (!supplyInfo.value[key]?.results?.length) return '—'
  const states: string[] = []
  supplyInfo.value[key].results.forEach((r: any) => {
    if (Array.isArray(r?.order_states)) {
      states.push(...r.order_states)
    }
  })
  if (!states.length) return '—'
  const unique = Array.from(new Set(states))
  return unique.join(', ')
}

const isCancelled = (state: string) => state?.toLowerCase().includes('cancel')

const getSelectedCommonSlot = (batch: any) => {
  const batchKey = getBatchKey(batch)
  const selectedKey = selectedCommonTimeslot.value[batchKey]
  if (!selectedKey) return null
  const grouped = getCommonTimeslotsByDate(batch)
  for (const date of Object.keys(grouped)) {
    const slot = grouped[date].find((item) => item.key === selectedKey)
    if (slot) return slot
  }
  return null
}

const createCommonApplication = async (batch: any) => {
  const key = getBatchKey(batch)
  const slot = getSelectedCommonSlot(batch)
  if (!slot?.fromRaw || !slot?.toRaw) {
    confirmSupplyError.value[key] = 'Выберите тайм-слот'
    return
  }

  confirmSupplyLoading.value = key
  confirmSupplyError.value[key] = ''
  try {
    const result = await apiService.confirmSupplyDraftBatch(batch.batch_id, {
      from_in_timezone: slot.fromRaw,
      to_in_timezone: slot.toRaw
    })
    console.log('[Confirm supply result]', result)
    await fetchBatches()
  } catch (err) {
    confirmSupplyError.value[key] = err instanceof Error ? err.message : 'Не удалось создать заявку'
  } finally {
    confirmSupplyLoading.value = null
  }
}

const openDeleteDraft = (draft: any) => {
  draftToDelete.value = draft
  deleteError.value = null
}

const closeDeleteDraft = () => {
  draftToDelete.value = null
  deleteError.value = null
}

const confirmDeleteDraft = async () => {
  if (!draftToDelete.value) return
  const draftId = getDraftApiId(draftToDelete.value)
  if (!draftId) return
  deleteLoading.value = true
  deleteError.value = null
  try {
    await apiService.deleteSupplyDraft(draftId)
    closeDeleteDraft()
    await fetchBatches()
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Не удалось удалить черновик'
  } finally {
    deleteLoading.value = false
  }
}

const loadBatchTimeslots = async (batch: any, key?: string, silent = false) => {
  const k = key || getBatchKey(batch)
  if (!batch?.batch_id) return
  try {
    const result = await apiService.getDraftTimeslots(batch.batch_id)
    timeslotData.value[k] = result
    // очистить старые слоты по всем драфтам этого батча
    if (Array.isArray(batch?.drafts)) {
      batch.drafts.forEach((draft: any) => {
        const dk = getDraftKey(draft)
        timeslotDataByDraft.value[dk] = []
      })
    }
    // распределяем слоты по черновикам
    if (Array.isArray(result?.drafts)) {
      result.drafts.forEach((draft: any) => {
        const draftKey = getDraftKey(draft)
        timeslotDataByDraft.value[draftKey] = mapTimeslotsForDraft(draft)
      })
    }
  } catch (err) {
    if (!silent) {
      timeslotError.value[k] = err instanceof Error ? err.message : 'Не удалось получить таймслоты'
    }
  }
}

const extractWarehouseOptions = (draft: any) => {
  const list: any[] = []
  if (Array.isArray(draft?.supply_warehouse)) {
    draft.supply_warehouse.forEach((entry: any) => {
      // вариант с вложенными warehouses
      if (Array.isArray(entry?.warehouses)) {
        entry.warehouses.forEach((w: any) => {
          const source = w?.supply_warehouse || w
          const available = w?.status?.is_available !== false
          if (!available) return
          if (source?.warehouse_id) {
            list.push({
              ...source,
              is_available: available
            })
          }
        })
      }
      // вариант, когда supply_warehouse на верхнем уровне или в плоском виде
      else {
        const source = entry?.supply_warehouse || entry
        const available = entry?.status?.is_available !== false
        if (source?.warehouse_id && available !== false) {
          list.push({
            ...source,
            is_available: available
          })
        }
      }
    })
  }
  if (
    !list.length &&
    (draft?.selected_supply_warehouse?.supply_warehouse?.warehouse_id || draft?.selected_supply_warehouse?.warehouse_id)
  ) {
    const sw = draft.selected_supply_warehouse.supply_warehouse || draft.selected_supply_warehouse
    list.push({
      ...sw,
      is_available: draft?.selected_supply_warehouse?.status?.is_available !== false
    })
  }
  console.log('[Warehouse options]', {
    draftId: draft?.draft_id ?? draft?.id,
    options: list
  })
  return list
}

const toggleInlineWarehouse = (draft: any) => {
  const key = getDraftKey(draft)
  if (expandedDraftKey.value === key) {
    expandedDraftKey.value = null
    warehouseOptionsInline.value = []
    return
  }
  expandedDraftKey.value = key
  warehouseOptionsInline.value = extractWarehouseOptions(draft)
}

const saveWarehouseSelectionInline = async (draft: any, warehouseId: string | number) => {
  const draftId = getDraftApiId(draft)
  if (!draftId || !warehouseId) return
  try {
    await apiService.selectDraftWarehouse(draftId, Number(warehouseId))
    await fetchBatches()
    expandedDraftKey.value = null
    warehouseOptionsInline.value = []
  } catch (err) {
  } finally {
  }
}

onMounted(() => {
  fetchBatches()
  fetchConfirmedBatches()
})

watch(
  () => props.storeId,
  () => {
    batches.value = []
    confirmedBatches.value = []
    fetchBatches()
    fetchConfirmedBatches()
  }
)
</script>

<style scoped>
.drafts-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.drafts-table {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  overflow: hidden;
}

.drafts-table table {
  table-layout: fixed;
}

.drafts-table th:first-child,
.drafts-table td:first-child {
  min-width: 180px;
  max-width: 220px;
  width: 200px;
}

.drafts-table th:nth-child(2),
.drafts-table td:nth-child(2) {
  min-width: 210px;
}

.drafts-table th:nth-child(3),
.drafts-table td:nth-child(3) {
  min-width: 240px;
  max-width: 320px;
}

.drafts-table th:nth-child(4),
.drafts-table td:nth-child(4) {
  min-width: 220px;
}

.drafts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.draft-pill {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  background: #f8fafc;
  min-width: 180px;
}

.list-group-item {
  cursor: pointer;
}

.list-group-item:hover {
  background: rgba(15, 23, 42, 0.03);
}

.timeslot-block {
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
}

.days-input {
  min-width: 110px;
}

.timeslot-date + .timeslot-date {
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px dashed rgba(15, 23, 42, 0.08);
}

.timeslot-list {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chevron {
  display: inline-block;
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.common-slots-cell {
  vertical-align: top;
  text-align: center;
}

.delete-btn svg {
  vertical-align: middle;
}

.filter-row .date-input {
  width: 180px;
}

.filter-row .days-input {
  width: 120px;
}
</style>
