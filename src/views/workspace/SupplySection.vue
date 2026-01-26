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
                <span
                  v-if="draftBatchStatusLabel"
                  class="draft-status-badge"
                  :class="draftBatchStatusClass"
                >
                  {{ draftBatchStatusLabel }}
                </span>
                <span v-if="!isBatchFinal" class="spinner-border spinner-border-sm" role="status"></span>
              </div>
              <button
                v-if="isBatchFinal"
                class="btn btn-warning btn-sm"
                type="button"
                @click="goToCurrentSupply"
              >
                Перейти в текущую поставку
              </button>
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
                        <span v-if="isFinalDraftStatus(draft.status)">{{ formatDraftStatus(draft.status) }}</span>
                        <span v-else class="spinner-border spinner-border-sm" role="status"></span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-muted small">Нет данных по черновикам</div>
            </div>
          </div>

          <div class="table-tabs mt-2">
            <button
              type="button"
              class="table-tab"
              :class="{ 'table-tab--active': !isDataWorkActive }"
              @click="setActiveTable('main')"
            >
              Все товары
            </button>
            <button
              type="button"
              class="table-tab"
              :class="{ 'table-tab--active': isDataWorkActive }"
              :disabled="!selectedRowsSize"
              @click="setActiveTable('data')"
            >
              Выбранные ({{ selectedRowsSize }})
            </button>
          </div>

        <div
          v-if="!isDataWorkActive"
          ref="tableWrapperRef"
          class="table-wrapper mt-2"
          :class="{ 'table-wrapper--selecting': isCellDragging }"
        >
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
                      v-for="(cluster, colPos) in visibleClusters"
                      :key="cluster"
                      :class="['text-center', getImpactHeaderClass(cluster)]"
                    >
                    <div class="cluster-header">
                      <div v-if="selectedRowsSize" class="cluster-sum-row">
                        <span class="cluster-sum">
                          {{ formatNumber(selectedClusterTotals[cluster]) }}
                        </span>
                        <input
                          type="checkbox"
                          class="form-check-input cluster-sum-checkbox"
                          :checked="isShipmentClusterSelected(cluster)"
                          @click.stop
                          @change="toggleShipmentCluster(cluster, ($event.target as HTMLInputElement).checked)"
                        />
                      </div>
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
                :data-row="idx + 1"
                :data-row-pos="idx"
                :class="{ 'row-selected': isRowSelected(idx + 1) }"
                @click="handleRowClick($event, idx + 1)"
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
                    v-for="(cluster, colPos) in visibleClusters"
                    :key="cluster"
                    class="text-center cluster-cell"
                    :class="{ 'cluster-cell--selected': isCellSelected(idx, colPos, 'main') }"
                    :data-col-pos="colPos"
                    @mousedown.stop.prevent="startCellSelection(idx, colPos, 'main', $event)"
                    @mouseenter="updateCellSelection(idx, colPos, 'main')"
                    @click.stop="handleClusterCellClick(row, idx, idx, colPos, cluster, 'main')"
                  >
                    <input
                      v-if="isEditingCell(idx, cluster, 'main')"
                      :data-edit-key="getEditKey(idx, cluster)"
                      data-edit-context="main"
                      type="text"
                      class="cluster-edit-input"
                      v-model="editingValue"
                      @click.stop
                      @keydown.enter.prevent="commitEdit"
                      @keydown.escape.prevent="cancelEdit"
                      @blur="commitEdit"
                    />
                    <span v-else>{{ formatNumber(getClusterValue(row, idx, cluster)) }}</span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <div v-else class="planner-table-empty">Нет данных для отображения</div>
        </div>

        <div v-else class="table-wrapper mt-2 data-work-wrapper">
          <div class="data-work-body">
            <div class="data-work-filters d-flex flex-wrap gap-2 align-items-end">
              <div class="flex-grow-1">
                <label class="form-label text-uppercase text-muted small fw-semibold mb-1">Поиск</label>
                <input
                  v-model="dataWorkSearch"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Артикул, SKU или ШК"
                />
              </div>
              <div class="data-work-min">
                <label class="form-label text-uppercase text-muted small fw-semibold mb-1">Мин. количество</label>
                <input
                  v-model="dataWorkMinTotal"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                />
              </div>
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetDataWorkFilters">
                Сбросить
              </button>
            </div>
            <div
              ref="dataWorkWrapperRef"
              class="data-work-table-wrapper mt-3"
              :class="{ 'table-wrapper--selecting': isCellDragging }"
            >
              <table class="planner-table pivot-table data-work-table">
                <thead>
                  <tr>
                    <th class="sticky-col index-col">#</th>
                    <th class="sticky-col name-col">Артикул</th>
                    <th class="sku-col">SKU</th>
                    <th v-if="displaySettings.showBarcode" class="barcode-col">ШК</th>
                    <th class="total-col">Количество, шт</th>
                    <template v-if="displaySettings.showClusters">
                      <th
                        v-for="(cluster, colPos) in visibleClusters"
                        :key="cluster"
                        :class="['text-center', getImpactHeaderClass(cluster)]"
                      >
                        <div class="cluster-header data-work-cluster-header">
                          <div v-if="dataWorkRows.length" class="cluster-sum-row">
                            <span class="cluster-sum">
                              {{ formatNumber(dataWorkClusterTotals[cluster]) }}
                            </span>
                            <input
                              type="checkbox"
                              class="form-check-input cluster-sum-checkbox"
                              :checked="isShipmentClusterSelected(cluster)"
                              @click.stop
                              @change="toggleShipmentCluster(cluster, ($event.target as HTMLInputElement).checked)"
                            />
                          </div>
                          <button
                            type="button"
                            class="cluster-sort-btn"
                            @click.stop="setDataWorkSortCluster(cluster)"
                          >
                            <span class="cluster-name">{{ cluster }}</span>
                            <span v-if="dataWorkSortCluster === cluster" class="cluster-sort-indicator">▼</span>
                          </button>
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
                    v-for="(item, rowPos) in dataWorkRows"
                    :key="item.row.id || item.rowNumber"
                    :data-row="item.rowNumber"
                    :data-row-pos="rowPos"
                    :class="{ 'row-selected': isRowSelected(item.rowNumber) }"
                    @click="handleRowClick($event, item.rowNumber)"
                  >
                    <td class="sticky-col index-col">{{ item.rowNumber }}</td>
                    <td class="sticky-col name-col">
                      <div class="d-flex align-items-center gap-2">
                        <img
                          v-if="displaySettings.showImage && item.row.photo"
                          :src="item.row.photo"
                          alt="photo"
                          class="pivot-photo"
                        />
                        <div class="d-flex flex-column pivot-text">
                          <span class="pivot-name fw-semibold">{{ item.row.offerId || '—' }}</span>
                          <a
                            v-if="displaySettings.showLink && item.row.link"
                            :href="item.row.link"
                            target="_blank"
                            rel="noopener"
                            class="small pivot-link"
                          >Ссылка</a>
                        </div>
                      </div>
                    </td>
                    <td class="sku-col">{{ item.row.sku || '—' }}</td>
                    <td v-if="displaySettings.showBarcode" class="barcode-col">{{ item.row.barcode || '—' }}</td>
                    <td class="total-col text-center fw-semibold">{{ formatNumber(item.row.totalForDelivery) }}</td>
                    <template v-if="displaySettings.showClusters">
                      <td
                        v-for="(cluster, colPos) in visibleClusters"
                        :key="cluster"
                        class="text-center cluster-cell"
                        :class="{ 'cluster-cell--selected': isCellSelected(rowPos, colPos, 'modal') }"
                        :data-col-pos="colPos"
                        @mousedown.stop.prevent="startCellSelection(rowPos, colPos, 'modal', $event)"
                        @mouseenter="updateCellSelection(rowPos, colPos, 'modal')"
                        @click.stop="handleClusterCellClick(item.row, item.rowIndex, rowPos, colPos, cluster, 'modal')"
                      >
                        <input
                          v-if="isEditingCell(item.rowIndex, cluster, 'modal')"
                          :data-edit-key="getEditKey(item.rowIndex, cluster)"
                          data-edit-context="modal"
                          type="text"
                          class="cluster-edit-input"
                          v-model="editingValue"
                          @click.stop
                          @keydown.enter.prevent="commitEdit"
                          @keydown.escape.prevent="cancelEdit"
                          @blur="commitEdit"
                        />
                        <span v-else>{{ formatNumber(getClusterValue(item.row, item.rowIndex, cluster)) }}</span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
              <div v-if="!dataWorkRows.length" class="planner-table-empty">Нет данных по выбранным строкам</div>
            </div>
          </div>
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
        <h5 class="mb-0">Все заявки поставок</h5>
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
                <th>Заявки</th>
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
        <div v-else-if="!batchesLoading" class="text-muted small">Нет заявок</div>
      </div>
      <div class="card-footer d-flex justify-content-end">
        <button type="button" class="btn btn-primary btn-sm" @click="closeBatchesDialog">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
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
const tableWrapperRef = ref<HTMLElement | null>(null)

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

const editedClusterValues = ref<Record<string, Record<string, number>>>({})
const editingCell = ref<{ rowIndex: number; rowKey: string; cluster: string; rowPos: number } | null>(null)
const editingValue = ref('')
const editingContext = ref<'main' | 'modal'>('main')
const cellSelection = ref<{
  startRowPos: number
  endRowPos: number
  startColPos: number
  endColPos: number
  context: 'main' | 'modal'
} | null>(null)
const isCellDragging = ref(false)
const cellDragMoved = ref(false)

type DataWorkRow = {
  rowNumber: number
  rowIndex: number
  row: PivotProduct
}

const activeTable = ref<'main' | 'data'>('main')
const isDataWorkActive = computed(() => activeTable.value === 'data')
const dataWorkSearch = ref('')
const dataWorkMinTotal = ref('')
const dataWorkSortCluster = ref<string | null>(null)

const selectedClusterTotals = computed(() => {
  const totals: Record<string, number> = {}
  if (!selectedRows.value.size) return totals
  const clusters = visibleClusters.value
  clusters.forEach((cluster) => {
    totals[cluster] = 0
  })
  selectedRows.value.forEach((rowNumber) => {
    const row = products.value[rowNumber - 1]
    if (!row) return
    clusters.forEach((cluster) => {
      const value = getClusterValue(row, rowNumber - 1, cluster)
      const num = Number(value)
      if (Number.isFinite(num)) {
        totals[cluster] += num
      }
    })
  })
  return totals
})

const selectedRowItems = computed<DataWorkRow[]>(() =>
  Array.from(selectedRows.value)
    .sort((a, b) => a - b)
    .map((rowNumber) => {
      const rowIndex = rowNumber - 1
      const row = products.value[rowIndex]
      if (!row) return null
      return { rowNumber, rowIndex, row }
    })
    .filter((item): item is DataWorkRow => item !== null)
)

const dataWorkRows = computed<DataWorkRow[]>(() => {
  const query = dataWorkSearch.value.trim().toLowerCase()
  const minTotal = Number(dataWorkMinTotal.value)
  let rows = selectedRowItems.value

  if (query) {
    rows = rows.filter(({ row }) => {
      const parts = [row.offerId, row.sku, row.barcode, row.name]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).toLowerCase())
      return parts.some((value) => value.includes(query))
    })
  }

  if (Number.isFinite(minTotal)) {
    rows = rows.filter(({ row }) => Number(row.totalForDelivery ?? 0) >= minTotal)
  }

  if (dataWorkSortCluster.value) {
    const cluster = dataWorkSortCluster.value
    rows = rows.slice().sort((a, b) => {
      const aValue = Number(getClusterValue(a.row, a.rowIndex, cluster))
      const bValue = Number(getClusterValue(b.row, b.rowIndex, cluster))
      const aNum = Number.isFinite(aValue) ? aValue : Number.NEGATIVE_INFINITY
      const bNum = Number.isFinite(bValue) ? bValue : Number.NEGATIVE_INFINITY
      if (aNum !== bNum) return bNum - aNum
      return a.rowNumber - b.rowNumber
    })
  }

  return rows
})

const dataWorkClusterTotals = computed(() => {
  const totals: Record<string, number> = {}
  if (!dataWorkRows.value.length) return totals
  const clusters = visibleClusters.value
  clusters.forEach((cluster) => {
    totals[cluster] = 0
  })
  dataWorkRows.value.forEach(({ row, rowIndex }) => {
    clusters.forEach((cluster) => {
      const value = getClusterValue(row, rowIndex, cluster)
      const num = Number(value)
      if (Number.isFinite(num)) {
        totals[cluster] += num
      }
    })
  })
  return totals
})

const formatNumber = (value: number | null | undefined) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('ru-RU').format(num)
}

const getRowKey = (row: PivotProduct, rowIndex: number) => String(row.id ?? rowIndex)

const getClusterValue = (row: PivotProduct, rowIndex: number, cluster: string) => {
  const rowKey = getRowKey(row, rowIndex)
  const overrides = editedClusterValues.value[rowKey]
  if (overrides && overrides[cluster] !== undefined) {
    return overrides[cluster]
  }
  const raw = row.clusters?.[cluster]
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

const getEditKey = (rowIndex: number, cluster: string) => `${rowIndex}:${cluster}`

const isEditingCell = (rowIndex: number, cluster: string, context: 'main' | 'modal' = 'main') => {
  const current = editingCell.value
  return Boolean(
    current && current.rowIndex === rowIndex && current.cluster === cluster && editingContext.value === context
  )
}

const getCellSelectionRange = (selection: {
  startRowPos: number
  endRowPos: number
  startColPos: number
  endColPos: number
}) => {
  const rowStart = Math.min(selection.startRowPos, selection.endRowPos)
  const rowEnd = Math.max(selection.startRowPos, selection.endRowPos)
  const colStart = Math.min(selection.startColPos, selection.endColPos)
  const colEnd = Math.max(selection.startColPos, selection.endColPos)
  return { rowStart, rowEnd, colStart, colEnd }
}

const isCellSelected = (rowPos: number, colPos: number, context: 'main' | 'modal') => {
  const selection = cellSelection.value
  if (!selection) return false
  if (selection.context !== context) return false
  const { rowStart, rowEnd, colStart, colEnd } = getCellSelectionRange(selection)
  return rowPos >= rowStart && rowPos <= rowEnd && colPos >= colStart && colPos <= colEnd
}

const startCellSelection = (
  rowPos: number,
  colPos: number,
  context: 'main' | 'modal',
  event: MouseEvent
) => {
  if (event.button !== 0) return
  event.preventDefault()
  if (editingCell.value) {
    commitEdit()
  }
  const currentSelection = cellSelection.value
  if (
    currentSelection &&
    currentSelection.context === context
  ) {
    const { rowStart, rowEnd, colStart, colEnd } = getCellSelectionRange(currentSelection)
    if (rowPos >= rowStart && rowPos <= rowEnd && colPos >= colStart && colPos <= colEnd) {
      isCellDragging.value = false
      cellDragMoved.value = false
      return
    }
  }
  isCellDragging.value = true
  cellDragMoved.value = false
  cellSelection.value = {
    startRowPos: rowPos,
    endRowPos: rowPos,
    startColPos: colPos,
    endColPos: colPos,
    context
  }
}

const updateCellSelection = (rowPos: number, colPos: number, context: 'main' | 'modal') => {
  if (!isCellDragging.value) return
  const selection = cellSelection.value
  if (!selection) return
  if (selection.context !== context) return
  if (selection.endRowPos === rowPos && selection.endColPos === colPos) return
  cellSelection.value = { ...selection, endRowPos: rowPos, endColPos: colPos }
  cellDragMoved.value = true
}

const stopCellSelection = () => {
  if (!isCellDragging.value) return
  isCellDragging.value = false
}

const handleCellSelectionKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Backspace') return
  const target = event.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  ) {
    return
  }
  if (!cellSelection.value) return
  if (applySelectionValue(0)) {
    event.preventDefault()
  }
}

const handleCellDragMove = (event: MouseEvent) => {
  if (!isCellDragging.value) return
  const selection = cellSelection.value
  if (!selection) return
  const wrapper =
    selection.context === 'main' ? tableWrapperRef.value : dataWorkWrapperRef.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  const threshold = 40
  let scrollDelta = 0
  if (event.clientY < rect.top + threshold) {
    scrollDelta = -Math.min(24, rect.top + threshold - event.clientY)
  } else if (event.clientY > rect.bottom - threshold) {
    scrollDelta = Math.min(24, event.clientY - (rect.bottom - threshold))
  }
  if (scrollDelta !== 0) {
    wrapper.scrollTop += scrollDelta
  }

  let scrollXDelta = 0
  if (event.clientX < rect.left + threshold) {
    scrollXDelta = -Math.min(24, rect.left + threshold - event.clientX)
  } else if (event.clientX > rect.right - threshold) {
    scrollXDelta = Math.min(24, event.clientX - (rect.right - threshold))
  }
  if (scrollXDelta !== 0) {
    wrapper.scrollLeft += scrollXDelta
  }

  const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
  const rowEl = target?.closest('tr[data-row-pos]') as HTMLElement | null
  const cellEl = target?.closest('td[data-col-pos]') as HTMLElement | null
  const rowPosRaw = rowEl?.dataset.rowPos
  const colPosRaw = cellEl?.dataset.colPos ?? String(selection.endColPos)
  if (!rowPosRaw) return
  const rowPos = Number(rowPosRaw)
  const colPos = Number(colPosRaw)
  if (!Number.isFinite(rowPos) || !Number.isFinite(colPos)) return
  updateCellSelection(rowPos, colPos, selection.context)
}

const handleClusterCellClick = (
  row: PivotProduct,
  rowIndex: number,
  rowPos: number,
  colPos: number,
  cluster: string,
  context: 'main' | 'modal'
) => {
  if (cellDragMoved.value) {
    cellDragMoved.value = false
    return
  }
  const selection = cellSelection.value
  if (!selection || !isCellSelected(rowPos, colPos, context)) {
    cellSelection.value = {
      startRowPos: rowPos,
      endRowPos: rowPos,
      startColPos: colPos,
      endColPos: colPos,
      context
    }
  }
  startEditCell(row, rowIndex, cluster, context, rowPos)
}

const getSelectionRows = (selection: {
  startRowPos: number
  endRowPos: number
  startColPos: number
  endColPos: number
  context: 'main' | 'modal'
}) => {
  const { rowStart, rowEnd } = getCellSelectionRange(selection)
  const rows: Array<{ row: PivotProduct; rowIndex: number }> = []
  if (selection.context === 'main') {
    for (let pos = rowStart; pos <= rowEnd; pos += 1) {
      const row = products.value[pos]
      if (!row) continue
      rows.push({ row, rowIndex: pos })
    }
    return rows
  }
  const list = dataWorkRows.value
  for (let pos = rowStart; pos <= rowEnd; pos += 1) {
    const item = list[pos]
    if (!item) continue
    rows.push({ row: item.row, rowIndex: item.rowIndex })
  }
  return rows
}

const getSelectionClusters = (selection: {
  startRowPos: number
  endRowPos: number
  startColPos: number
  endColPos: number
}) => {
  const { colStart, colEnd } = getCellSelectionRange(selection)
  return visibleClusters.value.slice(colStart, colEnd + 1)
}

const startEditCell = (
  row: PivotProduct,
  rowIndex: number,
  cluster: string,
  context: 'main' | 'modal' = 'main',
  rowPos: number = rowIndex
) => {
  if (editingCell.value && !isEditingCell(rowIndex, cluster, context)) {
    commitEdit()
  }
  const rowKey = getRowKey(row, rowIndex)
  const value = getClusterValue(row, rowIndex, cluster)
  editingContext.value = context
  editingCell.value = { rowIndex, rowKey, cluster, rowPos }
  editingValue.value = value !== null && value !== undefined ? String(value) : ''
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(
      `.cluster-edit-input[data-edit-key="${getEditKey(rowIndex, cluster)}"][data-edit-context="${context}"]`
    )
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const applyEditValue = (rowKey: string, cluster: string, value: number | null) => {
  const current = editedClusterValues.value[rowKey] || {}
  const nextRow = { ...current }
  if (value === null) {
    delete nextRow[cluster]
  } else {
    nextRow[cluster] = value
  }
  const next = { ...editedClusterValues.value }
  if (Object.keys(nextRow).length) {
    next[rowKey] = nextRow
  } else {
    delete next[rowKey]
  }
  editedClusterValues.value = next
}

const commitEdit = () => {
  const current = editingCell.value
  if (!current) return
  const raw = editingValue.value.trim()
  const selection =
    cellSelection.value && cellSelection.value.context === editingContext.value ? cellSelection.value : null
  const selectionRows = selection ? getSelectionRows(selection) : null
  const selectionClusters = selection ? getSelectionClusters(selection) : null
  const applyToSelection =
    selectionRows &&
    selectionClusters &&
    selectionRows.some((rowItem) => rowItem.rowIndex === current.rowIndex) &&
    selectionClusters.includes(current.cluster)

  if (!raw) {
    if (applyToSelection && selectionRows && selectionClusters) {
      selectionRows.forEach((rowItem) => {
        const rowKey = getRowKey(rowItem.row, rowItem.rowIndex)
        selectionClusters.forEach((cluster) => {
          applyEditValue(rowKey, cluster, null)
        })
      })
    } else {
      applyEditValue(current.rowKey, current.cluster, null)
    }
    editingCell.value = null
    return
  }
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const num = Number(normalized)
  if (!Number.isFinite(num)) {
    editingCell.value = null
    return
  }
  if (applyToSelection && selectionRows && selectionClusters) {
    selectionRows.forEach((rowItem) => {
      const rowKey = getRowKey(rowItem.row, rowItem.rowIndex)
      selectionClusters.forEach((cluster) => {
        applyEditValue(rowKey, cluster, num)
      })
    })
  } else {
    applyEditValue(current.rowKey, current.cluster, num)
  }
  editingCell.value = null
}

const cancelEdit = () => {
  editingCell.value = null
}

const applySelectionValue = (value: number | null) => {
  const selection = cellSelection.value
  if (!selection) return false
  const rows = getSelectionRows(selection)
  const clusters = getSelectionClusters(selection)
  if (!rows.length || !clusters.length) return false
  rows.forEach((rowItem) => {
    const rowKey = getRowKey(rowItem.row, rowItem.rowIndex)
    clusters.forEach((cluster) => {
      applyEditValue(rowKey, cluster, value)
    })
  })
  return true
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

const getImpactHeaderClass = (cluster: string) => {
  const share = getClusterImpactShare(cluster)
  if (share === null) return ''
  if (share > 10) return 'impact-high'
  if (share > 5) return 'impact-medium'
  return 'impact-low'
}

const persistSettings = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(displaySettings))
}

const shipmentDialogOpen = ref(false)
const selectedShipmentWarehouses = ref<Set<string>>(new Set())
const supplyDialogOpen = ref(false)
const supplyCreateLoading = ref(false)
const supplyCreateError = ref<string | null>(null)
const dataWorkWrapperRef = ref<HTMLElement | null>(null)

const isShipmentClusterSelected = (cluster: string) => selectedShipmentWarehouses.value.has(cluster)

const toggleShipmentCluster = (cluster: string, checked: boolean) => {
  const next = new Set(selectedShipmentWarehouses.value)
  if (checked) {
    next.add(cluster)
  } else {
    next.delete(cluster)
  }
  selectedShipmentWarehouses.value = next
}

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
let draftBatchPollingInFlight = false
const draftItems = ref<any[]>([])
const batchStatusValue = computed(() => String(draftBatchStatusText.value || '').toLowerCase())
const isBatchFinal = computed(() => batchStatusValue.value === 'completed' || batchStatusValue.value === 'partial')
const draftBatchStatusLabel = computed(() => {
  if (!draftBatchStatusText.value || draftBatchStatusText.value === '—') return ''
  if (batchStatusValue.value === 'completed') return 'Готово'
  if (batchStatusValue.value === 'partial') return 'Частично'
  if (batchStatusValue.value === 'processing') return 'В работе'
  return draftBatchStatusText.value
})
const draftBatchStatusClass = computed(() => {
  if (batchStatusValue.value === 'completed') return 'draft-status-badge--completed'
  if (batchStatusValue.value === 'partial') return 'draft-status-badge--partial'
  if (batchStatusValue.value === 'processing') return 'draft-status-badge--processing'
  return ''
})

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
    const headerEntries = headers.map((name: string, index: number) => ({
      name,
      index,
      share: Number.isFinite(impactMap[name]) ? impactMap[name] : -Infinity
    }))
    clusterHeaders.value = headerEntries
      .sort((a: { name: string; index: number; share: number }, b: { name: string; index: number; share: number }) => {
        if (a.share !== b.share) return b.share - a.share
        return a.index - b.index
      })
      .map((entry: { name: string }) => entry.name)
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
    editedClusterValues.value = {}
    editingCell.value = null
    fetchPivotData()
  }
)

watch(
  selectedRowsSize,
  (size, prev) => {
    if (size > 0 && prev === 0) {
      selectedShipmentWarehouses.value = new Set()
    }
    if (size === 0 && prev > 0) {
      selectedShipmentWarehouses.value = new Set()
    }
    if (size === 0 && isDataWorkActive.value) {
      activeTable.value = 'main'
    }
  }
)

watch(
  availableShipmentClusters,
  (clusters) => {
    const allowed = new Set(clusters)
    const next = new Set(
      Array.from(selectedShipmentWarehouses.value).filter((cluster) => allowed.has(cluster))
    )
    if (next.size !== selectedShipmentWarehouses.value.size) {
      selectedShipmentWarehouses.value = next
    }
  },
  { deep: true }
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
  scrollToRow(from)
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

const handleRowClick = (event: MouseEvent, rowNumber: number) => {
  if (isCellDragging.value || cellDragMoved.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('td.cluster-cell')) return
  toggleRow(rowNumber)
}

const scrollToRow = async (rowNumber: number) => {
  await nextTick()
  const wrapper = tableWrapperRef.value
  if (!wrapper) return
  const row = wrapper.querySelector(`tr[data-row="${rowNumber}"]`) as HTMLElement | null
  if (!row) return
  const wrapperRect = wrapper.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const header = wrapper.querySelector('thead') as HTMLElement | null
  const headerHeight = header ? header.getBoundingClientRect().height : 0
  const offset = rowRect.top - wrapperRect.top + wrapper.scrollTop - headerHeight - 8
  wrapper.scrollTo({ top: Math.max(offset, 0), behavior: 'smooth' })
}

const openShipmentDialog = () => {
  if (!selectedRows.value.size) return
  shipmentDialogOpen.value = true
}

const closeShipmentDialog = () => {
  shipmentDialogOpen.value = false
}

const resetDataWorkFilters = () => {
  dataWorkSearch.value = ''
  dataWorkMinTotal.value = ''
  dataWorkSortCluster.value = null
}

const setDataWorkSortCluster = (cluster: string) => {
  dataWorkSortCluster.value = cluster
}

const setActiveTable = (table: 'main' | 'data') => {
  if (table === 'data' && !selectedRows.value.size) return
  activeTable.value = table
  cellSelection.value = null
  isCellDragging.value = false
  cellDragMoved.value = false
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

const formatDraftStatus = (status?: string | null) => {
  if (!status) return '—'
  const value = String(status).trim()
  if (!value) return '—'
  if (value.toLowerCase() === 'info_loaded') return 'Готово'
  return value
}

const goToCurrentSupply = () => {
  if (!isBatchFinal.value || !props.storeId) return
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
      const rawQty = product ? getClusterValue(product, rowNumber - 1, warehouse) : null
      const qty = Number.isFinite(Number(rawQty)) ? Number(rawQty) : 0
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
  if (!batchId || draftBatchPollingInFlight) return
  draftBatchPollingInFlight = true
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
  } finally {
    draftBatchPollingInFlight = false
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

onMounted(() => {
  window.addEventListener('mouseup', stopCellSelection)
  window.addEventListener('mouseleave', stopCellSelection)
  window.addEventListener('mousemove', handleCellDragMove)
  window.addEventListener('keydown', handleCellSelectionKeydown)
})

onBeforeUnmount(() => {
  stopDraftBatchPolling()
  if (searchDebounce) clearTimeout(searchDebounce)
  window.removeEventListener('mouseup', stopCellSelection)
  window.removeEventListener('mouseleave', stopCellSelection)
  window.removeEventListener('mousemove', handleCellDragMove)
  window.removeEventListener('keydown', handleCellSelectionKeydown)
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

.table-wrapper--selecting {
  user-select: none;
  -webkit-user-select: none;
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

.planner-table tbody td.cluster-cell {
  cursor: cell;
}

.planner-table tbody td.cluster-cell--selected {
  background: rgba(59, 130, 246, 0.12);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.cluster-edit-input {
  width: 100%;
  min-width: 60px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 4px;
  padding: 0.1rem 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  background: #fff;
  text-align: center;
}

.cluster-edit-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.cluster-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  text-transform: none;
  letter-spacing: normal;
  white-space: normal;
}

.data-work-cluster-header {
  gap: 0.2rem;
}

.cluster-sort-btn {
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-transform: none;
}

.cluster-sort-btn:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.45);
  outline-offset: 2px;
  border-radius: 4px;
}

.cluster-sort-indicator {
  font-size: 0.65rem;
  line-height: 1;
}

.cluster-name {
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.15);
  color: #0f172a;
  font-weight: 600;
  font-size: 0.72rem;
  text-align: center;
  white-space: normal;
}

.cluster-sum-row {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
}

.cluster-sum-checkbox {
  margin: 0;
  width: 0.9rem;
  height: 0.9rem;
}

.cluster-sum {
  font-size: 0.7rem;
  font-weight: 700;
  color: #0f172a;
  background: transparent;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.cluster-share {
  font-size: 0.62rem;
  color: #0f172a;
  font-weight: 600;
  text-transform: none;
}

.planner-table thead th.impact-high {
  background: #ff0000;
  color: #0f172a;
}

.planner-table thead th.impact-medium {
  background: #ffff00;
  color: #0f172a;
}

.planner-table thead th.impact-low {
  background: #bfe5d1;
  color: #0f172a;
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

.table-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.table-tab {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #0f172a;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.table-tab--active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.table-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.data-work-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.data-work-filters .form-control {
  min-width: 180px;
}

.data-work-min {
  width: 170px;
}

.data-work-table-wrapper {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  overflow: auto;
  max-height: 60vh;
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

.draft-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.draft-status-badge--completed {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.draft-status-badge--partial {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.draft-status-badge--processing {
  background: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
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
