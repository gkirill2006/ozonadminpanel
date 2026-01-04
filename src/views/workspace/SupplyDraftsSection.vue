<template>
  <div class="drafts-page">
    <section class="card shadow-sm">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="mb-0">Заявки поставок</h5>
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
        <div v-else-if="!isLoading && !batches.length" class="text-muted small">Заявок пока нет.</div>
        <div v-if="batches.length">
          <div v-for="batch in batches" :key="batch.batch_id" class="batch-block">
            <div class="batch-header d-flex flex-wrap align-items-center gap-3 mb-2">
              <div class="fw-semibold">Поставка: {{ batch.batch_id }}</div>
              <span
                v-if="batch.status"
                class="batch-status-badge"
                :class="batchStatusClass(batch.status)"
              >
                {{ formatBatchStatus(batch.status) }}
              </span>
              <div class="text-muted small">Склад сдачи: {{ batch.drop_off_point_name || batch.drop_off_point_warehouse?.name || '—' }}</div>
            </div>
            <div v-if="!shouldShowSupplyCreation(batch)">
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
                  max="28"
                  class="form-control form-control-sm days-input"
                  :class="{ 'is-invalid': isTimeslotDaysInvalid(getBatchKey(batch)) }"
                  v-model.number="timeslotDays[getBatchKey(batch)]"
                  placeholder="дней"
                />
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  :disabled="timeslotLoading === getBatchKey(batch) || isTimeslotDaysInvalid(getBatchKey(batch))"
                  @click="applyBatchDate(batch, true)"
                >
                  <span v-if="timeslotLoading === getBatchKey(batch)" class="spinner-border spinner-border-sm me-1"></span>
                  Запросить
                </button>
                <div v-if="isTimeslotDaysInvalid(getBatchKey(batch))" class="text-danger small">
                  Максимум 28 дней
                </div>
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
                        <div class="d-flex align-items-center gap-2 draft-cluster-cell">
                          <button
                            class="btn btn-link btn-sm p-0 text-primary move-btn"
                            type="button"
                            title="Перенести в новый батч"
                            @click="openMoveDraft(batch, draft)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                            </svg>
                          </button>
                          <span>{{ draft.logistic_cluster_name || draft.warehouse || '—' }}</span>
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
                          <div class="timeslot-grid">
                            <div
                              v-for="(slotsByDate, date) in getSlotsGroupedByDate(draft)"
                              :key="`${getDraftKey(draft)}-${date}`"
                              class="timeslot-item"
                            >
                              <div class="timeslot-date">
                                <button
                                  type="button"
                                  class="timeslot-date-btn"
                                  :class="{ 'timeslot-date-btn--active': isDateExpanded(draft, date) }"
                                  @click="toggleDateExpanded(draft, date)"
                                >
                                  <span>{{ formatDateDayMonth(date) }}</span>
                                </button>
                              </div>
                              <div v-if="isDateExpanded(draft, date)" class="timeslot-list timeslot-list--draft timeslot-list--full mt-2">
                                <div class="slot-option" v-for="slot in slotsByDate" :key="slot.key">
                                  <span>{{ slot.from }} — {{ slot.to }}</span>
                                </div>
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
                          <div class="timeslot-grid timeslot-grid--single">
                            <div
                              v-for="(slotsByDate, date) in getCommonTimeslotsByDate(batch)"
                              :key="`${getBatchKey(batch)}-common-${date}`"
                              class="timeslot-item"
                            >
                              <div class="timeslot-date">
                                <button
                                  type="button"
                                  class="timeslot-date-btn"
                                  :class="{ 'timeslot-date-btn--active': isCommonDateExpanded(batch, date) }"
                                  @click="toggleCommonDateExpanded(batch, date)"
                                >
                                  <span>{{ formatDateDayMonth(date) }}</span>
                                </button>
                              </div>
                              <div v-if="isCommonDateExpanded(batch, date)" class="timeslot-list timeslot-list--draft timeslot-list--full mt-2">
                                <div class="slot-option slot-option--common" v-for="slot in slotsByDate" :key="slot.key">
                                  <label
                                    class="d-flex align-items-center gap-2"
                                    @click.prevent="toggleCommonTimeslot(getBatchKey(batch), slot.key)"
                                  >
                                    <input
                                      type="radio"
                                      :name="`common-slot-${getBatchKey(batch)}`"
                                      :value="slot.key"
                                      :checked="selectedCommonTimeslot[getBatchKey(batch)] === slot.key"
                                    />
                                    <span>{{ slot.from }} — {{ slot.to }}</span>
                                  </label>
                                </div>
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
                          <div
                            v-if="confirmSupplyExpired[getBatchKey(batch)]"
                            class="alert alert-warning py-2 px-3 mt-2"
                          >
                            <div class="fw-semibold">Время создания поставки из черновика истекло.</div>
                            <div class="small text-muted">
                              Создано:
                              {{ formatDateTimeShort(confirmSupplyExpired[getBatchKey(batch)]?.createdAt || '') }}
                            </div>
                            <div class="small text-muted">Создайте новую поставку.</div>
                          </div>
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

            <div v-if="shouldShowSupplyCreation(batch)" class="card shadow-sm supply-status-card">
              <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span class="fw-semibold">Создание заявки</span>
                  <span v-if="!isSupplyCreationComplete(batch)" class="spinner-border spinner-border-sm" role="status"></span>
                </div>
              </div>
              <div class="card-body py-2 px-3 supply-status-body">
                <div v-if="batch.drafts?.length">
                  <table class="table table-sm mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>Кластер</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="draft in batch.drafts"
                        :key="getDraftKey(draft)"
                        :class="{
                          'supply-row--done': isSupplyResultFinal(getBatchKey(batch), draft, getSupplyResultEntry(getBatchKey(batch), draft))
                        }"
                      >
                        <td>{{ draft.logistic_cluster_name || draft.warehouse || '—' }}</td>
                        <td>
                          <span
                            v-if="isSupplyResultFinal(getBatchKey(batch), draft, getSupplyResultEntry(getBatchKey(batch), draft))"
                          >
                            {{ formatSupplyCreationStatus(getBatchKey(batch), draft) }}
                          </span>
                          <span v-else class="spinner-border spinner-border-sm" role="status"></span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="text-muted small">Нет данных по черновикам</div>
              </div>
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
          <div v-for="batch in confirmedBatches" :key="getBatchKey(batch)" class="batch-block confirmed-batch">
            <div class="batch-header d-flex flex-wrap align-items-center gap-3 mb-2">
              <div class="fw-semibold">Поставка: {{ batch.batch_id }}</div>
              <div class="text-muted small">Склад сдачи: {{ batch.drop_off_point_name || batch.drop_off_point_warehouse?.name || '—' }}</div>
              <button
                class="btn btn-outline-secondary btn-sm ms-auto"
                type="button"
                :disabled="supplyInfoLoading[getBatchKey(batch)]"
                @click="refreshSupplyInfo(batch)"
              >
                <span v-if="supplyInfoLoading[getBatchKey(batch)]" class="spinner-border spinner-border-sm me-1"></span>
                Обновить статусы
              </button>
            </div>
            <div v-if="!batch.drafts?.length" class="text-muted small">Нет черновиков</div>
            <div v-else class="confirmed-drafts">
              <div v-for="draft in batch.drafts" :key="`${getBatchKey(batch)}-${getDraftKey(draft)}`" class="confirmed-draft">
                <div class="confirmed-draft-header d-flex flex-wrap align-items-center gap-3 mb-2">
                  <div class="confirmed-col confirmed-col--date">
                    <div class="text-muted small">Дата</div>
                    <div class="fw-semibold">
                      <span v-if="getDraftTimeslot(draft)">
                        {{ formatDateTimeShort(getDraftTimeslot(draft) || '') }}
                      </span>
                      <span v-else>—</span>
                    </div>
                  </div>
                  <div class="confirmed-col confirmed-col--cluster">
                    <div class="text-muted small">Кластер</div>
                    <div class="fw-semibold">{{ draft.logistic_cluster_name || draft.warehouse || '—' }}</div>
                  </div>
                  <div class="confirmed-col confirmed-col--status">
                    <div class="text-muted small">Статус</div>
                    <div :class="['fw-semibold', isCancelled(getOrderStateForDraft(batch, draft)) ? 'text-danger' : '']">
                      {{ getOrderStateForDraft(batch, draft) }}
                    </div>
                  </div>
                  <div class="ms-auto">
                    <button
                      class="btn btn-outline-secondary btn-sm"
                      type="button"
                      @click="toggleSupplyExpand(getConfirmedDraftKey(batch, draft))"
                    >
                      {{ isSupplyExpanded(getConfirmedDraftKey(batch, draft)) ? 'Свернуть' : 'Развернуть' }}
                    </button>
                  </div>
                </div>
                <div v-if="isSupplyExpanded(getConfirmedDraftKey(batch, draft))" class="table-responsive">
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
                      <template v-if="getBundleItemsForDraft(getBatchKey(batch), draft).length">
                        <tr
                          v-for="(itemRow, idx) in getBundleItemsForDraft(getBatchKey(batch), draft)"
                          :key="`${getBatchKey(batch)}-${getDraftKey(draft)}-${itemRow.sku}-${idx}`"
                        >
                          <td>
                            <img v-if="itemRow.icon_path" :src="itemRow.icon_path" alt="" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" />
                          </td>
                          <td>{{ itemRow.sku || '—' }}</td>
                          <td>{{ itemRow.offer_id || itemRow.name || '—' }}</td>
                          <td>{{ itemRow.barcode || '—' }}</td>
                          <td>{{ itemRow.product_id || '—' }}</td>
                          <td>{{ itemRow.quantity || 0 }}</td>
                        </tr>
                      </template>
                      <tr v-else>
                        <td colspan="6" class="text-muted">Нет товаров</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Modal v-if="draftToMove" :show="true" @close="closeMoveDraft">
      <p class="mb-3">
        Заявка
        <strong>{{ draftToMove?.draft?.logistic_cluster_name || draftToMove?.draft?.warehouse || draftToMove?.draft?.draft_id }}</strong>
        будет перенесён в новую поставку.
      </p>
      <div v-if="moveError" class="alert alert-danger py-2 px-3">{{ moveError }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeMoveDraft">Отмена</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="moveLoading" @click="confirmMoveDraft">
          <span v-if="moveLoading" class="spinner-border spinner-border-sm me-1"></span>
          Перенести
        </button>
      </div>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { apiService } from '@/services/api'

const props = defineProps<{ storeId: string }>()

const batches = ref<any[]>([])
const confirmedBatches = ref<any[]>([])
const supplyInfoLoading = ref<Record<string, boolean>>({})
const isLoading = ref(false)
const confirmedLoading = ref(false)
const error = ref<string | null>(null)
const confirmedError = ref<string | null>(null)
const MAX_TIMESLOT_DAYS = 28
const supplyInfo = ref<Record<string, any>>({})
const batchDates = ref<Record<string, string>>({})
const appliedBatchDates = ref<Record<string, string>>({})
const timeslotDays = ref<Record<string, number>>({})
const timeslotData = ref<Record<string, any>>({})
const timeslotDataByDraft = ref<
  Record<string, Array<{ key: string; date: string; from: string; to: string; fromRaw?: string; toRaw?: string }>>
>({})
const timeslotLoading = ref<string | null>(null)
const timeslotError = ref<Record<string, string>>({})
const selectedTimeslot = ref<Record<string, string>>({})
const selectedCommonTimeslot = ref<Record<string, string>>({})
const confirmSupplyLoading = ref<string | null>(null)
const confirmSupplyError = ref<Record<string, string>>({})
const confirmSupplyExpired = ref<Record<string, { createdAt?: string }>>({})
const supplyPolling = ref<Record<string, boolean>>({})
const supplyPollTimers: Record<string, ReturnType<typeof setInterval> | null> = {}
const expandedDraftKey = ref<string | null>(null)
const warehouseOptionsInline = ref<any[]>([])
const expandedDates = ref<Record<string, Record<string, boolean>>>({})
const expandedCommonDates = ref<Record<string, Record<string, boolean>>>({})
const draftToMove = ref<{ draft: any; batchId: string } | null>(null)
const moveLoading = ref(false)
const moveError = ref<string | null>(null)
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
  confirmSupplyError.value = {}
  confirmSupplyExpired.value = {}
  try {
    const response = await apiService.getSupplyDraftBatches({ storeId: props.storeId })
    batches.value = Array.isArray(response) ? response : []
    ensureBatchDates(batches.value)
    // Автоподгрузка таймслотов для уже существующих батчей
    for (const batch of batches.value) {
      const key = getBatchKey(batch)
      loadBatchTimeslots(batch, key, true)
      const drafts = Array.isArray(batch?.drafts) ? batch.drafts : []
      if (drafts.some((draft: any) => String(draft?.status || '').toLowerCase().includes('supply_'))) {
        startSupplyInfoPolling(batch)
      }
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
      if (needsSupplyInfo(batch)) {
        await fetchSupplyInfo(batch)
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
  const value = String(dateStr)
  const match = value.match(/(?:T|^)(\d{1,2}):(\d{2})/)
  if (match) {
    const hh = match[1].padStart(2, '0')
    return `${hh}:${match[2]}`
  }
  return value
}

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('ru-RU')
}

const getLocalMinutes = (raw?: string, fallback?: string) => {
  const value = raw ?? fallback
  if (value) {
    const match = String(value).match(/(?:T|^)(\d{1,2}):(\d{2})/)
    if (match) {
      return Number(match[1]) * 60 + Number(match[2])
    }
  }
  return 0
}

const formatDateDayMonth = (dateStr?: string | number) => {
  if (!dateStr) return '—'
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}.${match[2]}`
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

const getDateKey = (dateStr?: string) => {
  if (!dateStr) return ''
  const value = String(dateStr)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

const formatDateTimeShort = (dateStr?: string) => {
  if (!dateStr) return '—'
  const value = String(dateStr)
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
  if (match) {
    const yy = match[1].slice(-2)
    return `${match[3]}-${match[2]}-${yy} ${match[4]}:${match[5]}`
  }
  return value
}

const formatBatchStatus = (status?: string | null) => {
  if (!status) return '—'
  const value = String(status).toLowerCase()
  if (value === 'completed') return 'Готово'
  if (value === 'partial') return 'Частично'
  if (value === 'processing') return 'В работе'
  return status
}

const batchStatusClass = (status?: string | null) => {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'batch-status-badge--completed'
  if (value === 'partial') return 'batch-status-badge--partial'
  if (value === 'processing') return 'batch-status-badge--processing'
  return ''
}

const getBatchKey = (batch: any) => String(batch?.batch_id ?? Math.random())
// Важно: для "черновика" используем локальный id (draft.id), т.к. draft.draft_id может быть OZON draft_id.
const getDraftKey = (draft: any) => String(draft?.id ?? draft?.draft_id ?? Math.random())

const ensureBatchDates = (batchesList: any[]) => {
  batchesList.forEach((batch) => {
    const key = getBatchKey(batch)
    if (!batchDates.value[key]) batchDates.value[key] = defaultDate()
    if (!appliedBatchDates.value[key]) appliedBatchDates.value[key] = batchDates.value[key]
    if (!timeslotDays.value[key]) timeslotDays.value[key] = MAX_TIMESLOT_DAYS
  })
}

const isTimeslotDaysInvalid = (batchKey: string) => {
  const value = Number(timeslotDays.value[batchKey] || 0)
  return Number.isFinite(value) && value > MAX_TIMESLOT_DAYS
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
  const days = Number(timeslotDays.value[key] || MAX_TIMESLOT_DAYS)
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
  const slots: Array<{ key: string; date: string; from: string; to: string; fromRaw?: string; toRaw?: string }> = []

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
            date: getDateKey(day?.date || from),
            from: formatTime(from),
            to: formatTime(to),
            fromRaw: from,
            toRaw: to
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
            date: getDateKey(from),
            from: formatTime(from),
            to: formatTime(to),
            fromRaw: from
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
  const grouped: Record<
    string,
    Array<{ key: string; date: string; from: string; to: string; fromRaw?: string }>
  > = {}
  getSlotsForDraft(draft)
    .slice()
    .sort((a, b) => {
      const dateOrder = String(a.date).localeCompare(String(b.date))
      if (dateOrder !== 0) return dateOrder
      return getLocalMinutes(a.fromRaw, a.from) - getLocalMinutes(b.fromRaw, b.from)
    })
    .forEach((slot) => {
      if (!grouped[slot.date]) grouped[slot.date] = []
      grouped[slot.date].push(slot)
    })
  return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => String(a).localeCompare(String(b))))
}

const toggleDateExpanded = (draft: any, date: string | number) => {
  const draftKey = getDraftKey(draft)
  const dateKey = String(date)
  const current = expandedDates.value[draftKey]?.[dateKey]
  expandedDates.value[draftKey] = {}
  if (!current) {
    expandedDates.value[draftKey][dateKey] = true
  }
}

const isDateExpanded = (draft: any, date: string | number) => {
  const draftKey = getDraftKey(draft)
  return !!expandedDates.value[draftKey]?.[String(date)]
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
  const sorted = Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => String(a).localeCompare(String(b)))
  )
  Object.values(sorted).forEach((slots) => {
    slots.sort((a, b) => getLocalMinutes(a.fromRaw, a.from) - getLocalMinutes(b.fromRaw, b.from))
  })
  return sorted
}

const toggleCommonDateExpanded = (batch: any, date: string | number) => {
  const key = getBatchKey(batch)
  const dateKey = String(date)
  if (!expandedCommonDates.value[key]) expandedCommonDates.value[key] = {}
  expandedCommonDates.value[key][dateKey] = !expandedCommonDates.value[key][dateKey]
}

const isCommonDateExpanded = (batch: any, date: string | number) => {
  const key = getBatchKey(batch)
  return !!expandedCommonDates.value[key]?.[String(date)]
}

const toggleCommonTimeslot = (batchKey: string, slotKey: string) => {
  if (selectedCommonTimeslot.value[batchKey] === slotKey) {
    selectedCommonTimeslot.value[batchKey] = ''
  } else {
    selectedCommonTimeslot.value[batchKey] = slotKey
  }
}

const toggleSupplyExpand = (key: string) => {
  const set = expandedSupplies.value
  if (set.has(key)) {
    set.delete(key)
  } else {
    set.add(key)
  }
  // trigger reactivity
  expandedSupplies.value = new Set(set)
}

const isSupplyExpanded = (key: string) => expandedSupplies.value.has(key)

const getConfirmedDraftKey = (batch: any, draft: any) =>
  `${getBatchKey(batch)}-${getDraftKey(draft)}`

const getBundleItemsForDraft = (batchKey: string, draft: any) => {
  if (Array.isArray(draft?.supply_bundle_items) && draft.supply_bundle_items.length) {
    return draft.supply_bundle_items
  }
  const info = supplyInfo.value[batchKey]
  if (!info?.results) return []
  const draftId = draft?.id ?? draft?.draft_id
  const entry = info.results.find((r: any) => r?.draft_id === draftId)
  if (Array.isArray(entry?.bundle_items) && entry.bundle_items.length) {
    return entry.bundle_items
  }
  return []
}

const getOrderStateForDraft = (batch: any, draft: any) => {
  const batchKey = getBatchKey(batch)
  const errorReason = getSupplyErrorForDraft(batchKey, draft)
  if (errorReason) {
    return errorReason
  }
  const info = supplyInfo.value[batchKey]
  const draftId = draft?.id ?? draft?.draft_id
  const entry = Array.isArray(info?.results) ? info.results.find((r: any) => r?.draft_id === draftId) : null
  if (Array.isArray(entry?.order_states) && entry.order_states.length) {
    return entry.order_states.join(', ')
  }
  if (Array.isArray(draft?.supply_order_states) && draft.supply_order_states.length) {
    return draft.supply_order_states.join(', ')
  }
  return '—'
}

const getSupplyErrorForDraft = (batchKey: string, draft: any) => {
  const info = supplyInfo.value[batchKey]
  const draftId = draft?.id ?? draft?.draft_id
  if (Array.isArray(info?.results)) {
    const entry = info.results.find((result: any) => result?.draft_id === draftId)
    const status = String(entry?.status || '').toLowerCase()
    if (status.includes('failed') && entry?.error_message) {
      return String(entry.error_message)
    }
  }
  if (!Array.isArray(info?.errors)) return ''
  const entry = info.errors.find((err: any) => err?.draft_id === draftId)
  if (!entry) return ''
  const errorValue = entry.error
  if (Array.isArray(errorValue) && errorValue.length) {
    return String(errorValue[0])
  }
  if (errorValue) {
    return String(errorValue)
  }
  return ''
}

const getSupplyResultEntry = (batchKey: string, draft: any) => {
  const info = supplyInfo.value[batchKey]
  if (!Array.isArray(info?.results)) return null
  const draftId = draft?.id ?? draft?.draft_id
  return info.results.find((entry: any) => entry?.draft_id === draftId) || null
}

const isSupplyResultFinal = (batchKey: string, draft: any, entry: any) => {
  if (getSupplyErrorForDraft(batchKey, draft)) return true
  if (!entry) return false
  if (entry.pending) return false
  const status = String(entry.status || '').toLowerCase()
  if (!status) return false
  if (status.includes('in_progress') || status.includes('queued')) return false
  return true
}

const formatSupplyCreationStatus = (batchKey: string, draft: any) => {
  const errorReason = getSupplyErrorForDraft(batchKey, draft)
  if (errorReason) return errorReason
  const entry = getSupplyResultEntry(batchKey, draft)
  const raw = entry?.status ?? draft?.status
  if (!raw) return '—'
  if (String(raw).toLowerCase() === 'success') return 'Готово'
  return String(raw)
}

const shouldShowSupplyCreation = (batch: any) => {
  const key = getBatchKey(batch)
  if (supplyPolling.value[key]) return true
  const info = supplyInfo.value[key]
  if (Array.isArray(info?.results) && info.results.length) return true
  const drafts = Array.isArray(batch?.drafts) ? batch.drafts : []
  return drafts.some((draft: any) => String(draft?.status || '').toLowerCase().includes('supply_'))
}

const isSupplyCreationComplete = (batch: any) => {
  const key = getBatchKey(batch)
  const drafts = Array.isArray(batch?.drafts) ? batch.drafts : []
  if (!drafts.length) return false
  return drafts.every((draft: any) => {
    const entry = getSupplyResultEntry(key, draft)
    return isSupplyResultFinal(key, draft, entry)
  })
}

const stopSupplyInfoPolling = (batchKey: string) => {
  const timer = supplyPollTimers[batchKey]
  if (timer) {
    clearInterval(timer)
    supplyPollTimers[batchKey] = null
  }
  const next = { ...supplyPolling.value }
  delete next[batchKey]
  supplyPolling.value = next
}

const stopAllSupplyPolling = () => {
  Object.keys(supplyPollTimers).forEach((key) => stopSupplyInfoPolling(key))
}

const startSupplyInfoPolling = async (batch: any) => {
  const key = getBatchKey(batch)
  stopSupplyInfoPolling(key)
  supplyPolling.value = { ...supplyPolling.value, [key]: true }
  let info: any = null
  try {
    info = await fetchSupplyInfo(batch, true)
  } catch {
    stopSupplyInfoPolling(key)
    return
  }
  if (info && isSupplyCreationComplete(batch)) {
    stopSupplyInfoPolling(key)
    return
  }
  supplyPollTimers[key] = setInterval(async () => {
    if (supplyInfoLoading.value[key]) return
    try {
      const nextInfo = await fetchSupplyInfo(batch, true)
      if (nextInfo && isSupplyCreationComplete(batch)) {
        stopSupplyInfoPolling(key)
      }
    } catch {
      // ignore polling errors
    }
  }, 5000)
}

const getDraftTimeslot = (draft: any) => {
  const slot = draft?.selected_timeslot
  return slot?.from_in_timezone || slot?.from || ''
}

const isCancelled = (state: string) => state?.toLowerCase().includes('cancel')

const needsSupplyInfo = (batch: any) => {
  const drafts = Array.isArray(batch?.drafts) ? batch.drafts : []
  return drafts.some((draft: any) => !Array.isArray(draft?.supply_bundle_items))
}

const fetchSupplyInfo = async (batch: any, refresh = false) => {
  const key = getBatchKey(batch)
  supplyInfoLoading.value[key] = true
  try {
    const info = await apiService.getSupplyInfo(batch.batch_id, refresh ? { refresh: true } : undefined)
    supplyInfo.value[key] = info
    return info
  } finally {
    supplyInfoLoading.value[key] = false
  }
}

const refreshSupplyInfo = async (batch: any) => {
  await fetchSupplyInfo(batch, true)
}

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
  confirmSupplyExpired.value = Object.fromEntries(
    Object.entries(confirmSupplyExpired.value).filter(([entryKey]) => entryKey !== key)
  )
  try {
    const result = await apiService.confirmSupplyDraftBatch(batch.batch_id, {
      from_in_timezone: slot.fromRaw,
      to_in_timezone: slot.toRaw
    })
    console.log('[Confirm supply result]', result)
    await fetchBatches()
    const freshBatch =
      batches.value.find((item) => String(item?.batch_id) === String(batch?.batch_id)) || batch
    await startSupplyInfoPolling(freshBatch)
  } catch (err) {
    const errorData = (err as any)?.data
    if (errorData?.batch_created_at) {
      confirmSupplyExpired.value = {
        ...confirmSupplyExpired.value,
        [key]: { createdAt: String(errorData.batch_created_at) }
      }
    } else {
      confirmSupplyError.value[key] = err instanceof Error ? err.message : 'Не удалось создать заявку'
    }
  } finally {
    confirmSupplyLoading.value = null
  }
}

const openMoveDraft = (batch: any, draft: any) => {
  const batchId = batch?.batch_id
  if (!batchId) return
  draftToMove.value = { draft, batchId }
  moveError.value = null
}

const closeMoveDraft = () => {
  draftToMove.value = null
  moveError.value = null
}

const confirmMoveDraft = async () => {
  if (!draftToMove.value) return
  const draftId = getDraftApiId(draftToMove.value.draft)
  if (!draftId) return
  moveLoading.value = true
  moveError.value = null
  try {
    await apiService.moveDraftToNewBatch(draftToMove.value.batchId, draftId)
    closeMoveDraft()
    await fetchBatches()
  } catch (err) {
    moveError.value = err instanceof Error ? err.message : 'Не удалось перенести черновик'
  } finally {
    moveLoading.value = false
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
    supplyInfo.value = {}
    stopAllSupplyPolling()
    fetchBatches()
    fetchConfirmedBatches()
  }
)

onBeforeUnmount(() => {
  stopAllSupplyPolling()
})
</script>

<style scoped>
.drafts-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.batch-block {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 0.75rem;
  background: #fff;
}

.batch-block + .batch-block {
  margin-top: 0.75rem;
}

.batch-header {
  border-bottom: 1px dashed rgba(15, 23, 42, 0.1);
  padding-bottom: 0.4rem;
}

.batch-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.batch-status-badge--completed {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.batch-status-badge--partial {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.batch-status-badge--processing {
  background: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.confirmed-drafts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.confirmed-draft {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  padding: 0.65rem;
  background: #fff;
}

.confirmed-draft-header {
  border-bottom: 1px dashed rgba(15, 23, 42, 0.08);
  padding-bottom: 0.4rem;
}

.confirmed-col {
  min-width: 0;
}

.confirmed-col--date {
  min-width: 140px;
}

.confirmed-col--cluster {
  min-width: 260px;
  max-width: 360px;
}

.confirmed-col--status {
  min-width: 180px;
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

.supply-status-card {
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.supply-status-body {
  background: #fff;
}

.supply-row--done {
  background: rgba(34, 197, 94, 0.08);
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

.timeslot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.timeslot-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.timeslot-item {
  display: contents;
}

.timeslot-date {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.timeslot-date-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  border-radius: 6px;
  padding: 0.15rem 0.3rem;
  font-size: 0.7rem;
  color: #334155;
  line-height: 1.2;
}

.timeslot-date-btn:hover {
  background: #eef2ff;
  border-color: rgba(99, 102, 241, 0.35);
}

.timeslot-date-btn--active {
  background: #e0e7ff;
  border-color: rgba(99, 102, 241, 0.45);
  color: #1e3a8a;
}

.days-input {
  min-width: 110px;
}

.timeslot-grid .timeslot-date + .timeslot-date {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.timeslot-list {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.timeslot-list--draft {
  padding-left: 0;
  width: 100%;
  align-items: stretch;
  font-size: 0.75rem;
}

.timeslot-list--full {
  grid-column: 1 / -1;
}

.slot-option--common {
  border-radius: 6px;
  padding: 0.1rem 0.35rem;
}

.slot-option--common:hover {
  background: rgba(15, 23, 42, 0.06);
}

.draft-cluster-cell {
  justify-content: flex-start;
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

.move-btn svg {
  vertical-align: middle;
}

.filter-row .date-input {
  width: 180px;
}

.filter-row .days-input {
  width: 120px;
}
</style>
