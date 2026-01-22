<template>
  <div class="fbs">
    <section class="card shadow-sm fbs-card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2 fbs-card-header">
          <div>
            <h5 class="mb-1">FBS заказы</h5>
            <!-- <p class="text-muted small mb-0" v-if="lastSyncedAt">
              Обновлено: {{ formatDateTime(lastSyncedAt) }}
            </p> -->
          </div>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="handleRefresh" :disabled="isSyncing">
              <span v-if="isSyncing" class="spinner-border spinner-border-sm me-2"></span>
              Обновить
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
        <p v-else-if="isCarriageTab" class="fbs-tab-hint">
          Отгрузки, сформированные из батчей. Нажмите, чтобы увидеть отправления.
        </p>

        <div v-if="!isBatchTab && !isCarriageTab" class="fbs-toolbar">
          <div class="fbs-toolbar__row">
            <div v-if="showNeedsLabelToggle" class="fbs-filter-group fbs-filter-group--toggle">
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

            <div v-if="isAwaitingPackaging" class="fbs-filter-group fbs-filter-group--sort">
              <span class="text-muted small">Сортировка:</span>
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                :class="{ 'btn-primary text-white': newSortBy === 'offer_id' }"
                @click="setNewSort('offer_id')"
              >
                По артикулу
                <span
                  class="sort-arrow"
                  :class="{ 'sort-arrow--hidden': newSortBy !== 'offer_id' }"
                >
                  <svg
                    v-if="newSortDirection === 1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="sort-arrow__icon"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75 12 3m0 0 3.75 3.75M12 3v18" />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="sort-arrow__icon"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25 12 21m0 0-3.75-3.75M12 21V3" />
                  </svg>
                </span>
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                :class="{ 'btn-primary text-white': newSortBy === 'weight' }"
                @click="setNewSort('weight')"
              >
                По весу
                <span
                  class="sort-arrow"
                  :class="{ 'sort-arrow--hidden': newSortBy !== 'weight' }"
                >
                  <svg
                    v-if="newSortDirection === 1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="sort-arrow__icon"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75 12 3m0 0 3.75 3.75M12 3v18" />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="sort-arrow__icon"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25 12 21m0 0-3.75-3.75M12 21V3" />
                  </svg>
                </span>
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                :class="{ 'btn-primary text-white': newSortBy === 'date' }"
                @click="setNewSort('date')"
              >
                По времени
                <span
                  class="sort-arrow"
                  :class="{ 'sort-arrow--hidden': newSortBy !== 'date' }"
                >
                  <svg
                    v-if="newSortDirection === 1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="sort-arrow__icon"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75 12 3m0 0 3.75 3.75M12 3v18" />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="sort-arrow__icon"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25 12 21m0 0-3.75-3.75M12 21V3" />
                  </svg>
                </span>
              </button>
            </div>

            <div class="fbs-filter-group fbs-filter-group--search">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Поиск по отправлению или товару"
                v-model="searchQuery"
              />
              <div v-if="isHistoryTab" class="fbs-export-controls">
                <select class="form-select form-select-sm fbs-export-format" v-model="exportFormat">
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                </select>
                <div class="fbs-export-limit">
                  <span class="text-muted small">Записей</span>
                  <input
                    type="number"
                    min="1"
                    class="form-control form-control-sm"
                    v-model="exportLimit"
                    placeholder="1000"
                  />
                </div>
                <button
                  class="btn btn-primary btn-sm"
                  type="button"
                  @click="handleExport"
                  :disabled="isExporting"
                >
                  <span v-if="isExporting" class="spinner-border spinner-border-sm me-2"></span>
                  Экспорт
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showSelectionBar" class="selection-bar">
          <span class="fbs-filter-label">Выделить:</span>
          <div class="selection-actions">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectBeforeToday">
              До сегодняшнего дня
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectAllVisible">
              Все
            </button>
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              @click="resetSelection"
              :disabled="!selectedRowsSize"
            >
              Сбросить
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-1 px-2 mb-3">
          {{ errorMessage }}
        </div>
        <div v-if="labelNotice" class="alert alert-info py-1 px-2 mb-3">
          {{ labelNotice }}
        </div>

        <div v-if="!isBatchTab && !isCarriageTab">
          <div v-if="isTableLoading" class="fbs-loading">
            <span class="spinner-border spinner-border-sm me-2"></span>
            {{ isHistoryTab ? 'Загружаем историю...' : 'Загружаем заказы...' }}
          </div>

          <div v-else>
            <div v-if="isHistoryTab" class="table-responsive fbs-table-wrapper">
              <table class="table fbs-table align-middle">
                <thead>
                  <tr>
                    <th class="fbs-col-offer fbs-history-offer">Артикул</th>
                    <th class="fbs-col-number">Номер отправления</th>
                    <th class="fbs-col-date">Ожидают сборки</th>
                    <th class="fbs-col-date">Ожидают отгрузки</th>
                    <th class="fbs-col-date">Отгружены</th>
                    <th class="fbs-col-date">Доставляются</th>
                    <th class="fbs-col-date">Отменены</th>
                  </tr>
                </thead>
                <tbody v-if="filteredHistoryItems.length">
                  <tr v-for="(item, index) in filteredHistoryItems" :key="`${item.posting_number}-${index}`">
                    <td class="fbs-history-offer">
                      <div class="fw-semibold">{{ item.offer_id || '—' }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ item.posting_number }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ formatHistoryDate(item.awaiting_packaging) }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ formatHistoryDate(item.awaiting_deliver) }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ formatHistoryDate(item.acceptance_in_progress) }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ formatHistoryDate(item.delivering) }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ formatHistoryDate(item.cancelled) }}</div>
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                      Нет истории для отображения
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else ref="postingsWrapperRef" class="table-responsive fbs-table-wrapper">
              <table class="table fbs-table align-middle">
                <thead>
                  <tr>
                    <th v-if="showRowSelection" class="text-center fbs-col-check">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="allVisibleSelected"
                        @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                      />
                    </th>
                    <th class="fbs-col-number">Номер отправления</th>
                    <th class="fbs-col-status">Статус</th>
                    <th class="fbs-col-date">Принят</th>
                    <th class="fbs-col-products">Товары</th>
                    <th v-if="showWarehouseDeliveryColumns" class="fbs-col-warehouse">Склад</th>
                    <th v-if="showLabelColumn" class="fbs-col-label">Этикетка</th>
                    <th v-if="showCancelPosting" class="fbs-col-action text-center"></th>
                  </tr>
                </thead>
                <tbody v-if="displayPostings.length">
                  <tr
                    v-for="(posting, index) in displayPostings"
                    :key="posting.id"
                    :class="{ 'row-selected': showRowSelection && isRowSelected(posting.posting_number) }"
                    @click="showRowSelection && handleRowClick(posting.posting_number)"
                    :data-row="index + 1"
                  >
                    <td v-if="showRowSelection" class="text-center">
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
                    </td>
                    <td>
                      <div v-if="isNotShippedTab" class="fbs-product-list">
                        <div
                          v-for="(product, index) in posting.products || []"
                          :key="`${product.offer_id || product.sku || 'item'}-${index}`"
                          class="fbs-product-item"
                        >
                          <div class="fw-semibold">
                            {{ product.offer_id || product.name || (product.sku ? `SKU ${product.sku}` : '—') }}
                          </div>
                          <div class="text-muted small">
                            <span v-if="product.quantity">Кол-во: {{ product.quantity }}</span>
                            <span v-if="product.sku"> · SKU {{ product.sku }}</span>
                          </div>
                        </div>
                        <div v-if="!(posting.products || []).length" class="text-muted small">Товары отсутствуют</div>
                      </div>
                      <div v-else class="fbs-product">
                        <div class="fw-semibold">{{ primaryProductTitle(posting) }}</div>
                        <div class="text-muted small">{{ primaryProductMeta(posting) }}</div>
                        <div
                          v-if="shouldShowWeight(posting)"
                          class="small"
                          :class="shouldHighlightWeight(posting) ? 'text-danger fw-semibold' : 'text-muted'"
                        >
                          Вес: {{ formatWeight(posting.total_weight_g) }}
                        </div>
                        <div v-if="extraProductsCount(posting)" class="text-muted small">
                          + ещё {{ extraProductsCount(posting) }} товар(ов)
                        </div>
                      </div>
                    </td>
                    <td v-if="showWarehouseDeliveryColumns">
                      <div class="fw-semibold">{{ posting.delivery_method_warehouse || '—' }}</div>
                      <div class="text-muted small">{{ posting.delivery_method_name || '—' }}</div>
                    </td>
                    <td v-if="showLabelColumn">
                      <button
                        class="btn btn-outline-primary btn-sm"
                        type="button"
                        @click.stop="downloadLabel(posting)"
                      >
                        Этикетка
                      </button>
                    </td>
                    <td v-if="showCancelPosting" class="text-center">
                      <button
                        class="btn btn-link p-0 fbs-delete-btn"
                        type="button"
                        title="Удалить отправление"
                        @click.stop="openCancelPosting(posting)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v9h-2v-9Zm4 0h2v9h-2v-9ZM6 10h2v9H6v-9Z"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td :colspan="tableColumnCount" class="text-center text-muted py-4">
                      Нет заказов для отображения
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-else-if="isBatchTab" class="fbs-batches">
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
              :class="{ 'fbs-batch-card--drag-target': dragOverBatchId === batch.batch_id }"
              @click="toggleBatch(batch)"
              @dragenter.prevent="onBatchDragEnter(batch, $event)"
              @dragover.prevent="onBatchDragOver(batch, $event)"
              @dragleave="onBatchDragLeave(batch, $event)"
              @drop.prevent.stop="onBatchDrop(batch, $event)"
            >
              <div class="fbs-batch-header">
                <div class="fbs-batch-meta">
                  <span class="fbs-batch-meta__strong">{{ batchTitle(batch) }}</span>
                  <span class="fbs-batch-meta__sep">|</span>
                  <span>
                    Отправлений:
                    <span
                      class="fbs-batch-meta__strong"
                      :class="{ 'fbs-batch-meta__strong--alert': isBatchCountMismatch(batch) }"
                    >
                      {{ batch.postings_count ?? '—' }}
                    </span>
                    <span v-if="typeof batch.expected_postings_count === 'number'">
                      из {{ batch.expected_postings_count }}
                    </span>
                  </span>
                  <span class="fbs-batch-meta__dot">·</span>
                  <span>
                    Товаров:
                    <span class="fbs-batch-meta__strong">{{ batch.items_count ?? '—' }}</span>
                  </span>
                  <span class="fbs-batch-meta__dot">·</span>
                  <span class="fbs-batch-status-tag">
                    {{ batch.sent_to_delivery ? 'Передан в доставку' : 'Ожидает сборку' }}
                  </span>
                </div>
                <div class="fbs-batch-actions" @click.stop>
                  <select
                    class="form-select form-select-sm fbs-label-sort-select"
                    v-model="labelSortMode"
                    :disabled="labelSortSaving"
                    @change="saveLabelSortSettings"
                  >
                    <option value="offer_id">По артикулу</option>
                    <option value="weight">По весу</option>
                    <option value="created_at">По дате заказа</option>
                  </select>
                  <button
                    class="btn btn-outline-primary btn-sm"
                    type="button"
                    :disabled="!batchHasPostings(batch) || batchLabelLoading[batch.batch_id] || !isBatchLabelActionAllowed(batch)"
                    @click.stop="handleBatchLabels(batch.batch_id)"
                  >
                    <span v-if="batchLabelLoading[batch.batch_id]" class="spinner-border spinner-border-sm me-2"></span>
                    Скачать этикетки
                  </button>
                </div>
              </div>
              <div
                v-if="!isBatchFinished(batch)"
                class="fbs-batch-progress"
                @click.stop
              >
                <div class="fbs-batch-progress__meta">
                  Готово {{ batchProgressText(batch) }} · {{ batchProgressPercent(batch) }}%
                </div>
                <div class="fbs-batch-progress__bar">
                  <span :style="{ width: `${batchProgressPercent(batch)}%` }"></span>
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
                      <div class="batch-selection-left">
                        <span class="text-muted small">Выбрано: {{ batchSelectedCount(batch.batch_id) }}</span>
                        <div class="batch-selection-controls">
                          <span class="text-muted small">Выделить:</span>
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
                          <select
                            class="form-select form-select-sm fbs-batch-sort-select"
                            :value="getBatchSortKey(batch.batch_id) || ''"
                            @change="setBatchSort(batch.batch_id, ($event.target as HTMLSelectElement).value as 'offer_id' | 'weight' | 'date')"
                          >
                            <option value="" disabled>Сортировка</option>
                            <option value="offer_id">По артикулу</option>
                            <option value="weight">По весу</option>
                            <option value="date">По времени</option>
                          </select>
                          <div class="batch-status-filters">
                            <span class="text-muted small">Статус:</span>
                            <label
                              v-for="status in BATCH_STATUS_FILTERS"
                              :key="status.key"
                              class="form-check form-check-inline mb-0 batch-status-check"
                            >
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="isBatchStatusFilterActive(batch.batch_id, status.key)"
                                @change="setBatchStatusFilter(batch.batch_id, status.key, ($event.target as HTMLInputElement).checked)"
                              />
                              <span class="form-check-label">{{ status.label }}</span>
                            </label>
                          </div>
                          <label class="form-check form-switch mb-0 batch-split-filter">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :checked="isBatchSplitParentOnly(batch.batch_id)"
                              @change="toggleBatchSplitParentOnly(batch.batch_id, ($event.target as HTMLInputElement).checked)"
                            />
                            <span class="form-check-label">Отобразить разделенные товары</span>
                          </label>
                          <input
                            type="text"
                            class="form-control form-control-sm batch-search-input"
                            placeholder="Поиск по отправлению"
                            :value="getBatchSearchQuery(batch.batch_id)"
                            @input="setBatchSearchQuery(batch.batch_id, ($event.target as HTMLInputElement).value)"
                            @click.stop
                          />
                        </div>
                      </div>
                      <div class="batch-selection-right">
                        <button
                          v-if="batchSelectedCount(batch.batch_id)"
                          class="btn btn-primary btn-sm"
                          type="button"
                          @click.stop="openMoveDialog(batch.batch_id)"
                        >
                          Переместить поставку в другое отправление
                        </button>
                        <button
                          class="btn btn-outline-secondary btn-sm"
                          type="button"
                          :disabled="batchCarriageLoading[batch.batch_id] || isSystemBatch(batch)"
                          @click.stop="openCarriageDialog(batch)"
                        >
                          <span v-if="batchCarriageLoading[batch.batch_id]" class="spinner-border spinner-border-sm me-2"></span>
                          Создать отгрузку
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
                    <th class="fbs-col-date">Принят</th>
                          <th class="fbs-col-products">Товары</th>
                          <th class="fbs-col-warehouse">Склад</th>
                          <th class="fbs-col-label">Этикетка</th>
                          <th class="fbs-col-action text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="posting in batchDisplayPostings(batch.batch_id)"
                          :key="posting.id"
                          :data-posting-number="posting.posting_number"
                          :class="{
                            'row-selected': isBatchRowSelected(batch.batch_id, posting.posting_number),
                            'row-delivery-warning': isBatchDeliveryLagging(batch, posting)
                          }"
                          @click.stop="toggleBatchRow(batch.batch_id, posting.posting_number)"
                        >
                          <td class="text-center fbs-col-check">
                            <div class="fbs-check-cell">
                              <span
                                class="drag-handle"
                                draggable="true"
                                title="Перетащить"
                                @dragstart="onBatchDragStart(batch.batch_id, posting.posting_number, $event)"
                                @dragend="onBatchDragEnd"
                                @click.stop
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                  <circle cx="6" cy="5" r="1.5" />
                                  <circle cx="14" cy="5" r="1.5" />
                                  <circle cx="6" cy="10" r="1.5" />
                                  <circle cx="14" cy="10" r="1.5" />
                                  <circle cx="6" cy="15" r="1.5" />
                                  <circle cx="14" cy="15" r="1.5" />
                                </svg>
                              </span>
                              <input
                                type="checkbox"
                                class="form-check-input"
                                :checked="batchSelectedMap(batch.batch_id)[posting.posting_number]"
                                @click.stop
                                @change="toggleBatchRow(batch.batch_id, posting.posting_number)"
                              />
                            </div>
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
                            <button
                              class="btn btn-outline-primary btn-sm"
                              type="button"
                              :disabled="!isBatchLabelActionAllowed(batch)"
                              @click.stop="downloadLabel(posting)"
                            >
                              Этикетка
                            </button>
                          </td>
                          <td class="text-center">
                            <button
                              class="btn btn-link p-0 fbs-delete-btn"
                              type="button"
                              title="Удалить отправление"
                              @click.stop="openCancelPosting(posting)"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v9h-2v-9Zm4 0h2v9h-2v-9ZM6 10h2v9H6v-9Z"
                                />
                              </svg>
                            </button>
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

        <div v-else-if="isCarriageTab" class="fbs-batches">
          <div v-if="isCarriageLoading" class="fbs-loading">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Загружаем отгрузки...
          </div>
          <div v-else-if="!carriages.length" class="text-center text-muted py-4">
            Отгрузки пока не созданы
          </div>
          <div v-else class="fbs-batch-list">
            <div
              v-for="carriage in carriages"
              :key="carriage.carriage_id"
              class="fbs-batch-card"
              @click="toggleCarriage(carriage)"
            >
              <div class="fbs-batch-header">
                <div class="fbs-batch-meta">
                  <span class="fbs-batch-meta__strong">{{ carriageTitle(carriage) }}</span>
                  <span class="fbs-batch-meta__sep">|</span>
                  <span>
                    Отправлений:
                    <span class="fbs-batch-meta__strong">{{ carriage.postings_count ?? '—' }}</span>
                  </span>
                  <span class="fbs-batch-meta__dot">·</span>
                  <span>
                    Товаров:
                    <span class="fbs-batch-meta__strong">{{ carriage.items_count ?? '—' }}</span>
                  </span>
                  <template v-if="carriage.status">
                    <span class="fbs-batch-meta__dot">·</span>
                    <span>Статус: {{ carriage.status }}</span>
                  </template>
                </div>
                <div class="fbs-batch-actions" @click.stop>
                  <button
                    class="btn btn-outline-primary btn-sm"
                    type="button"
                    :disabled="carriageLabelLoading[String(carriage.carriage_id)]"
                    @click.stop="handleCarriageLabels(carriage.carriage_id)"
                  >
                    <span
                      v-if="carriageLabelLoading[String(carriage.carriage_id)]"
                      class="spinner-border spinner-border-sm me-2"
                    ></span>
                    Скачать этикетки
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    type="button"
                    :disabled="carriageCancelLoading[String(carriage.carriage_id)]"
                    @click.stop="handleCarriageCancel(carriage.carriage_id)"
                  >
                    <span
                      v-if="carriageCancelLoading[String(carriage.carriage_id)]"
                      class="spinner-border spinner-border-sm me-2"
                    ></span>
                    Отменить доставку
                  </button>
                </div>
              </div>
              <div v-if="isCarriageExpanded(carriage.carriage_id)" class="fbs-batch-body" @click.stop>
                <div v-if="carriageDetailLoading[String(carriage.carriage_id)]" class="fbs-loading">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Загружаем отправления...
                </div>
                <div v-else-if="carriageDetailError[String(carriage.carriage_id)]" class="alert alert-danger py-1 px-2 mb-2">
                  {{ carriageDetailError[String(carriage.carriage_id)] }}
                </div>
                <div v-else>
                  <div v-if="carriagePostings(carriage.carriage_id).length" class="table-responsive fbs-table-wrapper">
                    <table class="table fbs-table align-middle">
                      <thead>
                        <tr>
                          <th class="fbs-col-number">Номер отправления</th>
                          <th class="fbs-col-status">Статус</th>
                          <th class="fbs-col-date">Принят</th>
                          <th class="fbs-col-products">Товары</th>
                          <th class="fbs-col-warehouse">Склад</th>
                          <th class="fbs-col-label">Этикетка</th>
                          <th class="fbs-col-action text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="posting in carriagePostings(carriage.carriage_id)" :key="posting.id">
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
                            <button
                              class="btn btn-outline-primary btn-sm"
                              type="button"
                              @click.stop="downloadLabel(posting)"
                            >
                              Этикетка
                            </button>
                          </td>
                          <td class="text-center">
                            <button
                              class="btn btn-link p-0 fbs-delete-btn"
                              type="button"
                              title="Удалить отправление"
                              @click.stop="openCancelPosting(posting)"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v9h-2v-9Zm4 0h2v9h-2v-9ZM6 10h2v9H6v-9Z"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="text-center text-muted py-3">Нет отправлений</div>
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
        <div
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

  <Modal v-if="shipmentProgressOpen" @close="closeShipmentProgress">
    <div class="fbs-modal">
      <h5 class="mb-2 d-flex align-items-center gap-2">
        Создание отгрузки
        <span
          v-if="!isShipmentProgressReady"
          class="spinner-border spinner-border-sm text-primary"
          aria-hidden="true"
        ></span>
      </h5>
      <div v-if="shipmentProgressBatch?.name" class="text-muted small mb-2">
        {{ shipmentProgressBatch.name }}
      </div>
      <div v-if="shipmentProgressBatch?.status" class="text-muted small mb-2">
        Статус: {{ shipmentProgressBatch.status }}
      </div>
      <div class="fbs-progress">
        <span
          class="fbs-progress__bar"
          :style="{ width: `${batchProgressPercent(shipmentProgressBatch)}%` }"
        ></span>
      </div>
      <div class="d-flex justify-content-between text-muted small mt-2">
        <span>Готово {{ batchProgressText(shipmentProgressBatch) }}</span>
        <span>{{ batchProgressPercent(shipmentProgressBatch) }}%</span>
      </div>
      <div v-if="labelStatusTotal(shipmentProgressBatch)" class="mt-3">
        <div class="fbs-progress">
          <span
            class="fbs-progress__bar"
            :style="{ width: `${labelProgressPercent(shipmentProgressBatch)}%` }"
          ></span>
        </div>
        <div class="d-flex justify-content-between text-muted small mt-2">
          <span>Этикетки: готово {{ labelProgressText(shipmentProgressBatch) }}</span>
          <span>{{ labelProgressPercent(shipmentProgressBatch) }}%</span>
        </div>
      </div>
      <div v-if="shipmentProgressError" class="alert alert-danger py-1 px-2 mt-2">
        {{ shipmentProgressError }}
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button
          v-if="isShipmentProgressReady"
          class="btn btn-primary btn-sm"
          type="button"
          @click="goToCarriagesFromProgress"
        >
          Перейти в доставку
        </button>
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeShipmentProgress">
          Закрыть
        </button>
      </div>
    </div>
  </Modal>

  <Modal v-if="carriageDialogOpen" @close="closeCarriageDialog">
    <div class="fbs-modal">
      <h5 class="mb-3">Создать отгрузку</h5>
      <label class="form-label text-uppercase text-muted small fw-semibold">Количество мест</label>
      <input
        type="number"
        min="1"
        class="form-control form-control-sm"
        v-model="carriagePlacesCount"
        placeholder="Например, 1"
      />
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeCarriageDialog">
          Отмена
        </button>
        <button
          class="btn btn-primary btn-sm"
          type="button"
          @click="submitBatchCarriage"
          :disabled="isCarriageSubmitting"
        >
          <span v-if="isCarriageSubmitting" class="spinner-border spinner-border-sm me-2"></span>
          Создать
        </button>
      </div>
    </div>
  </Modal>

  <Modal v-if="carriageSuccessOpen" @close="closeCarriageSuccess">
    <div class="fbs-modal">
      <h5 class="mb-3">Отгрузка создана</h5>
      <p class="mb-0 text-muted">Данные обновятся во вкладке «На сборке».</p>
      <div class="d-flex justify-content-end mt-3">
        <button class="btn btn-primary btn-sm" type="button" @click="closeCarriageSuccess">
          ОК
        </button>
      </div>
    </div>
  </Modal>

  <Modal v-if="moveDialogOpen" @close="closeMoveDialog">
    <div class="fbs-modal">
      <h5 class="mb-3">Переместить отправления</h5>
      <p class="text-muted small mb-3">Выбрано: {{ movePostingNumbers.length }}</p>
      <div class="fbs-move-section">
        <label class="form-label text-uppercase text-muted small fw-semibold">Существующие отправления</label>
        <select class="form-select form-select-sm" v-model="moveTargetBatchId">
          <option value="">Выберите отправление</option>
          <option v-for="batch in moveTargetBatches" :key="batch.batch_id" :value="batch.batch_id">
            {{ batchTitle(batch) }}
          </option>
        </select>
        <button
          class="btn btn-primary btn-sm mt-2"
          type="button"
          @click="submitMoveToExisting"
          :disabled="moveLoading || !moveTargetBatchId"
        >
          <span v-if="moveLoading" class="spinner-border spinner-border-sm me-2"></span>
          Переместить
        </button>
      </div>
      <div class="fbs-move-divider">или</div>
      <div class="fbs-move-section">
        <label class="form-label text-uppercase text-muted small fw-semibold">Новое отправление</label>
        <input
          type="text"
          class="form-control form-control-sm"
          v-model="moveNewBatchName"
          placeholder="Название отправления"
        />
        <button
          class="btn btn-primary btn-sm mt-2"
          type="button"
          @click="submitMoveToNewBatch"
          :disabled="moveLoading"
        >
          <span v-if="moveLoading" class="spinner-border spinner-border-sm me-2"></span>
          Новое отправление
        </button>
      </div>
      <div v-if="moveError" class="alert alert-danger py-1 px-2 mt-2">
        {{ moveError }}
      </div>
      <div class="d-flex justify-content-end mt-3">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeMoveDialog">
          Отмена
        </button>
      </div>
    </div>
  </Modal>

  <Modal v-if="dragConfirmOpen" @close="closeDragConfirm">
    <div class="fbs-modal">
      <h5 class="mb-2">Подтвердите перенос</h5>
      <p class="mb-3 text-muted">
        <span>{{ dragConfirmLead }}</span>
        <br />
        <span class="fw-bold">«{{ dragConfirmBatchName }}»</span>?
      </p>
      <div v-if="dragConfirmError" class="alert alert-danger py-1 px-2">
        {{ dragConfirmError }}
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeDragConfirm">
          Отмена
        </button>
        <button
          class="btn btn-primary btn-sm"
          type="button"
          @click="confirmDragMove"
          :disabled="dragConfirmLoading"
        >
          <span v-if="dragConfirmLoading" class="spinner-border spinner-border-sm me-2"></span>
          Переместить
        </button>
      </div>
    </div>
  </Modal>

  <Modal v-if="cancelPostingOpen" @close="closeCancelPosting">
    <div class="fbs-modal">
      <h5 class="mb-2">Удалить отправление</h5>
      <p class="mb-3 text-muted">
        Удаление безвозвратное. Подтвердить удаление отправления
        <span class="fw-semibold">{{ cancelPostingTarget?.posting_number }}</span>?
      </p>
      <div v-if="cancelPostingError" class="alert alert-danger py-1 px-2">
        {{ cancelPostingError }}
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeCancelPosting">
          Отмена
        </button>
        <button
          class="btn btn-danger btn-sm"
          type="button"
          @click="confirmCancelPosting"
          :disabled="cancelPostingLoading"
        >
          <span v-if="cancelPostingLoading" class="spinner-border spinner-border-sm me-2"></span>
          Удалить
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  storeId: string
}>()

interface FbsPostingProduct {
  name?: string
  offer_id?: string
  quantity?: number
  sku?: number | string
  price?: number
  weight_g?: number | string
  total_weight_g?: number | string
}

interface FbsPosting {
  id: number | string
  posting_number: string
  order_number?: string
  order_id?: number | string
  status: string
  substatus?: string
  in_delivery?: boolean | null
  is_split_parent?: boolean | null
  delivery_method_name?: string
  delivery_method_warehouse?: string
  tpl_provider?: string
  tpl_integration_type?: string
  shipment_date?: string | null
  status_changed_at?: string | null
  in_process_at?: string | null
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
  total_weight_g?: number | string | null
  products?: FbsPostingProduct[]
  last_synced_at?: string | null
}

interface FbsShipBatch {
  batch_id: string
  batch_seq?: number | null
  name?: string | null
  status?: string | null
  sent_to_delivery?: boolean | null
  is_system?: boolean | null
  system_code?: string | null
  expected_postings_count?: number | null
  total_count?: number | null
  success_count?: number | null
  failed_count?: number | null
  processed_count?: number | null
  progress?: number | null
  batch_labels?: {
    error?: number | null
    ready?: number | null
    total?: number | null
    status?: string | null
    missing?: number | null
    pending?: number | null
    file_url?: string | null
    file_name?: string | null
    file_path?: string | null
    sort_mode?: string | null
    label_type?: string | null
    sort_ascending?: boolean | null
    generated_at?: string | null
    last_attempt_at?: string | null
  } | null
  label_tasks?: {
    created?: number | null
    errors?: number | null
    skipped?: number | null
  } | null
  label_status?: {
    ready?: number | null
    pending?: number | null
    error?: number | null
    missing?: number | null
    total?: number | null
  } | null
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

interface FbsCarriage {
  carriage_id: string | number
  status?: string | null
  delivery_method_id?: string | number | null
  batch_id?: string | null
  batch_seq?: number | null
  batch_name?: string | null
  response_payload?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
  postings_count?: number | null
  items_count?: number | null
  labels?: {
    status?: string | null
    file_url?: string | null
    file_name?: string | null
    file_path?: string | null
    error?: string | null
  } | null
}

interface FbsCarriageDetail {
  carriage: FbsCarriage
  postings: FbsPosting[]
  count?: number | null
  items_count?: number | null
  labels?: {
    status?: string | null
    file_url?: string | null
    file_name?: string | null
    file_path?: string | null
    error?: string | null
  } | null
}

interface FbsHistoryItem {
  posting_number: string
  offer_id?: string | null
  awaiting_packaging?: string | null
  awaiting_deliver?: string | null
  acceptance_in_progress?: string | null
  delivering?: string | null
  cancelled?: string | null
}

const statusKeys = ['awaiting_packaging', 'delivering']

const statusTabs = [
  { key: 'awaiting_packaging', label: 'Новые' },
  { key: 'ship_batches', label: 'На сборке' },
  { key: 'carriages', label: 'В доставке' },
  { key: 'not_shipped', label: 'Не переданы в доставку' },
  { key: 'delivering', label: 'Доставляются' },
  { key: 'history', label: 'История' }
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
const batchSearchQuery = ref<Record<string, string>>({})
const carriages = ref<FbsCarriage[]>([])
const carriageDetails = ref<Record<string, FbsCarriageDetail>>({})
const carriageExpanded = ref<Set<string>>(new Set())
const carriageDetailLoading = ref<Record<string, boolean>>({})
const carriageDetailError = ref<Record<string, string>>({})
const historyItems = ref<FbsHistoryItem[]>([])
const historyCount = ref<number | null>(null)
const historyTotal = ref<number | null>(null)
const historyLastSync = ref<string | null>(null)
const statusCounts = ref<Record<string, number>>({})
const onPackagingTotal = ref<number | null>(null)
const notShippedCount = ref<number | null>(null)
const notShippedLastSync = ref<string | null>(null)
const totalCount = ref<number | null>(null)
const isLoading = ref(false)
const isBatchLoading = ref(false)
const isCarriageLoading = ref(false)
const isNotShippedLoading = ref(false)
const isHistoryLoading = ref(false)
const isSyncing = ref(false)
const isPrinting = ref(false)
const isLabeling = ref(false)
const isShipping = ref(false)
const isCarriageSubmitting = ref(false)
const isExporting = ref(false)
const exportFormat = ref<'csv' | 'xlsx'>('csv')
const exportLimit = ref('1000')
const errorMessage = ref<string | null>(null)
const labelNotice = ref<string | null>(null)
const shipmentDialogOpen = ref(false)
const shipmentName = ref('')
const shipmentProgressOpen = ref(false)
const shipmentProgressBatch = ref<FbsShipBatch | null>(null)
const shipmentProgressLoading = ref(false)
const shipmentProgressError = ref<string | null>(null)
const shipmentProgressTimer = ref<number | null>(null)
const labelSortMode = ref<'offer_id' | 'weight' | 'created_at'>('offer_id')
const labelSortAscending = ref(true)
const labelSortSaving = ref(false)
const carriageDialogOpen = ref(false)
const carriageSuccessOpen = ref(false)
const carriagePlacesCount = ref('1')
const carriageBatch = ref<FbsShipBatch | null>(null)
const selectedPostings = ref<Set<string>>(new Set())
const rangeFrom = ref('')
const rangeTo = ref('')
const postingsWrapperRef = ref<HTMLElement | null>(null)
const batchSelections = ref<Record<string, Set<string>>>({})
const batchLabelLoading = ref<Record<string, boolean>>({})
const batchLabelPolling = ref<Record<string, number>>({})
const batchLabelPollingInFlight = ref<Record<string, boolean>>({})
const batchCarriageLoading = ref<Record<string, boolean>>({})
const batchSortBy = ref<Record<string, 'offer_id' | 'weight' | 'date'>>({})
const batchStatusFilters = ref<Record<string, Set<string> | null>>({})
const batchSplitParentOnly = ref<Record<string, boolean>>({})
const newSortBy = ref<'' | 'offer_id' | 'weight' | 'date'>('')
const newSortDirection = ref<1 | -1>(1)
const shipBatchPollingTimer = ref<number | null>(null)
const shipBatchPollingInFlight = ref(false)
const carriageLabelLoading = ref<Record<string, boolean>>({})
const carriageLabelPolling = ref<Record<string, number>>({})
const carriageLabelPollingInFlight = ref<Record<string, boolean>>({})
const carriageCancelLoading = ref<Record<string, boolean>>({})
const cancelPostingOpen = ref(false)
const cancelPostingTarget = ref<FbsPosting | null>(null)
const cancelPostingLoading = ref(false)
const cancelPostingError = ref<string | null>(null)
const moveDialogOpen = ref(false)
const moveSourceBatchId = ref<string | null>(null)
const moveTargetBatchId = ref('')
const movePostingNumbers = ref<string[]>([])
const moveNewBatchName = ref('')
const moveLoading = ref(false)
const moveError = ref<string | null>(null)
const dragPayload = ref<{ sourceBatchId: string; postingNumbers: string[] } | null>(null)
const dragOverBatchId = ref<string | null>(null)
const dragConfirmOpen = ref(false)
const dragConfirmBatch = ref<FbsShipBatch | null>(null)
const dragConfirmPayload = ref<{ sourceBatchId: string; postingNumbers: string[] } | null>(null)
const dragConfirmLoading = ref(false)
const dragConfirmError = ref<string | null>(null)

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

const filteredHistoryItems = computed(() => {
  if (!isHistoryTab.value) return historyItems.value
  const query = searchQuery.value.trim().toLowerCase()
  if (!query || query.length < 4) return historyItems.value
  return historyItems.value.filter((item) => {
    if (item.posting_number?.toLowerCase().includes(query)) return true
    if (item.offer_id?.toLowerCase().includes(query)) return true
    return false
  })
})

const displayPostings = computed(() => {
  const list = filteredPostings.value
  if (!isAwaitingPackaging.value || !newSortBy.value) return list
  const direction = newSortDirection.value
  return [...list].sort((a, b) => {
    if (newSortBy.value === 'offer_id') {
      return direction * compareOfferIds(postingPrimaryOfferId(a), postingPrimaryOfferId(b))
    }
    if (newSortBy.value === 'weight') {
      return direction * (postingTotalWeight(a) - postingTotalWeight(b))
    }
    return direction * (postingSortDate(a) - postingSortDate(b))
  })
})

const isBatchTab = computed(() => activeStatus.value === 'ship_batches')
const isCarriageTab = computed(() => activeStatus.value === 'carriages')
const isNotShippedTab = computed(() => activeStatus.value === 'not_shipped')
const isHistoryTab = computed(() => activeStatus.value === 'history')
const isStatusTab = computed(() => statusKeys.includes(activeStatus.value))
const isAwaitingDeliver = computed(() => activeStatus.value === 'awaiting_deliver')
const isAwaitingPackaging = computed(() => activeStatus.value === 'awaiting_packaging')
const isDeliveringTab = computed(() => activeStatus.value === 'delivering')
const showCancelPosting = computed(() => isAwaitingPackaging.value || isNotShippedTab.value)
const showLabelColumn = computed(() => isAwaitingDeliver.value || isNotShippedTab.value)
const showRowSelection = computed(() => isStatusTab.value && !isDeliveringTab.value)
const showNeedsLabelToggle = computed(() => showRowSelection.value && !isAwaitingPackaging.value)
const showSelectionBar = computed(() => showRowSelection.value)
const showWarehouseDeliveryColumns = computed(() => !isDeliveringTab.value)
const isShipmentProgressReady = computed(() => shouldStopShipmentProgress(shipmentProgressBatch.value))

const missingLabelPostings = computed(() =>
  filteredPostings.value.filter((posting) => !posting.label_ready)
)

const selectedRowsSize = computed(() => selectedPostings.value.size)

const hasCounts = computed(() => totalCount.value !== null || Object.keys(statusCounts.value).length > 0)

const tableColumnCount = computed(() => {
  const base = 4
  const selection = showRowSelection.value ? 1 : 0
  const warehouse = showWarehouseDeliveryColumns.value ? 1 : 0
  const label = showLabelColumn.value ? 1 : 0
  const cancel = showCancelPosting.value ? 1 : 0
  return base + selection + warehouse + label + cancel
})

const isTableLoading = computed(() => {
  if (isNotShippedTab.value) return isNotShippedLoading.value
  if (isHistoryTab.value) return isHistoryLoading.value
  return isLoading.value
})

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
  if (key === 'carriages') {
    const inDelivery = statusCounts.value.in_delivery
    if (typeof inDelivery === 'number') return inDelivery
    return carriages.value.length
  }
  if (key === 'not_shipped') {
    if (typeof notShippedCount.value === 'number') return notShippedCount.value
    const count = statusCounts.value.acceptance_in_progress
    return typeof count === 'number' ? count : 0
  }
  if (key === 'all') {
    return totalCount.value ?? (hasCounts.value ? 0 : filteredPostings.value.length)
  }
  if (key === 'history') {
    return historyTotal.value ?? historyCount.value ?? 0
  }
  const value = statusCounts.value[key]
  if (typeof value === 'number') return value
  if (!hasCounts.value && key === activeStatus.value) {
    return filteredPostings.value.length
  }
  return 0
}

const allVisibleSelected = computed(() => {
  if (!displayPostings.value.length) return false
  return displayPostings.value.every((posting) => selectedPostings.value.has(posting.posting_number))
})

const lastSyncedAt = computed(() => {
  if (isNotShippedTab.value && notShippedLastSync.value) {
    return notShippedLastSync.value
  }
  if (isHistoryTab.value && historyLastSync.value) {
    return historyLastSync.value
  }
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

const formatHistoryDate = (value?: string | null) => {
  if (!value) return '—'
  const trimmed = value.trim()
  if (/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed
  }
  return formatDateTime(trimmed)
}

const formatWeight = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return ''
  return `${Math.round(num)} г`
}

const primaryDate = (posting: FbsPosting) => {
  if (posting.in_process_at) return String(posting.in_process_at)
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

const shouldShowWeight = (posting: FbsPosting) =>
  isAwaitingPackaging.value && Number.isFinite(Number(posting.total_weight_g))

const postingTotalQuantity = (posting: FbsPosting) => {
  const products = Array.isArray(posting.products) ? posting.products : []
  return products.reduce((sum, product) => sum + Number(product.quantity || 0), 0)
}

const shouldHighlightWeight = (posting: FbsPosting) => {
  const weight = Number(posting.total_weight_g)
  if (!Number.isFinite(weight)) return false
  return weight > 1000 && postingTotalQuantity(posting) > 1
}

const batchTitle = (batch: FbsShipBatch) => {
  if (batch.name) return batch.name
  if (batch.batch_seq) return `Поставка #${batch.batch_seq}`
  return 'Поставка без названия'
}

const isBatchCountMismatch = (batch: FbsShipBatch) => {
  const expected = batch.expected_postings_count
  const actual = batch.postings_count
  if (typeof expected !== 'number' || typeof actual !== 'number') return false
  return expected !== actual
}


const carriageTitle = (carriage: FbsCarriage) => {
  if (carriage.batch_name) return carriage.batch_name
  if (carriage.batch_seq) return `Поставка #${carriage.batch_seq}`
  return `Отгрузка ${carriage.carriage_id}`
}

const isBatchLabelActionAllowed = (batch?: FbsShipBatch | null) => {
  const status = batch?.status
  return status === 'completed' || status === 'failed' || status === 'partial'
}

const isSystemBatch = (batch?: FbsShipBatch | null) => {
  if (!batch) return false
  if (batch.is_system) return true
  if (batch.system_code) return batch.system_code === 'unrecognized_postings'
  return false
}

const isBatchExpanded = (batchId: string) => shipBatchExpanded.value.has(batchId)

const batchPostings = (batchId: string) => {
  const detail = shipBatchDetails.value[batchId]
  return Array.isArray(detail?.postings) ? detail!.postings : []
}

const isCarriageExpanded = (carriageId: string | number) =>
  carriageExpanded.value.has(String(carriageId))

const carriagePostings = (carriageId: string | number) => {
  const detail = carriageDetails.value[String(carriageId)]
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

const moveTargetBatches = computed(() =>
  shipBatches.value.filter((batch) => batch.batch_id !== moveSourceBatchId.value)
)

const dragConfirmBatchName = computed(() =>
  dragConfirmBatch.value ? batchTitle(dragConfirmBatch.value) : 'выбранный батч'
)

const dragConfirmLead = computed(() => {
  const count = dragConfirmPayload.value?.postingNumbers.length ?? 0
  if (count === 1) {
    return 'Переместить отправление в'
  }
  if (count > 1) {
    return `Переместить ${count} отправлений в`
  }
  return 'Переместить отправления в'
})

const isBatchRowSelected = (batchId: string, postingNumber: string) =>
  batchSelections.value[batchId]?.has(postingNumber) ?? false

const BATCH_STATUS_FILTERS = [
  { key: 'awaiting_deliver', label: 'Ожидает отгрузки' },
  { key: 'acceptance_in_progress', label: 'Приемка' },
  { key: 'cancelled', label: 'Отменен' },
  { key: 'delivering', label: 'Доставляется' }
]

const getBatchStatusFilter = (batchId: string) => batchStatusFilters.value[batchId] ?? null

const isBatchStatusFilterActive = (batchId: string, status: string) => {
  const filter = getBatchStatusFilter(batchId)
  if (!filter) return true
  return filter.has(status)
}

const setBatchStatusFilter = (batchId: string, status: string, checked: boolean) => {
  const current = getBatchStatusFilter(batchId)
  if (!current) {
    if (checked) return
    const next = new Set(BATCH_STATUS_FILTERS.map((item) => item.key).filter((key) => key !== status))
    batchStatusFilters.value = { ...batchStatusFilters.value, [batchId]: next }
    return
  }
  const next = new Set(current)
  if (checked) {
    next.add(status)
  } else {
    next.delete(status)
  }
  batchStatusFilters.value = { ...batchStatusFilters.value, [batchId]: next }
}

const isBatchSplitParentOnly = (batchId: string) => Boolean(batchSplitParentOnly.value[batchId])

const toggleBatchSplitParentOnly = (batchId: string, checked: boolean) => {
  batchSplitParentOnly.value = { ...batchSplitParentOnly.value, [batchId]: checked }
}

const isBatchDeliveryLagging = (batch: FbsShipBatch, posting: FbsPosting) => {
  if (!batch.sent_to_delivery) return false
  return posting.status === 'awaiting_packaging' || posting.status === 'awaiting_deliver'
}

const getBatchSortKey = (batchId: string) => batchSortBy.value[batchId] || ''

const setBatchSort = (batchId: string, key: 'offer_id' | 'weight' | 'date') => {
  if (batchSortBy.value[batchId] === key) return
  batchSortBy.value = { ...batchSortBy.value, [batchId]: key }
}

const getBatchSearchQuery = (batchId: string) => batchSearchQuery.value[batchId] || ''

const setBatchSearchQuery = (batchId: string, value: string) => {
  batchSearchQuery.value = { ...batchSearchQuery.value, [batchId]: value }
}

const postingTotalWeight = (posting: FbsPosting) => {
  const products = Array.isArray(posting.products) ? posting.products : []
  return products.reduce((sum, product) => {
    const quantity = Number(product.quantity || 0)
    const total = Number(product.total_weight_g)
    const single = Number(product.weight_g)
    if (Number.isFinite(total)) {
      return sum + total
    }
    if (Number.isFinite(single)) {
      return sum + single * (Number.isFinite(quantity) ? quantity : 0)
    }
    return sum
  }, 0)
}

const postingPrimaryOfferId = (posting: FbsPosting) => {
  const product = primaryProduct(posting)
  return product?.offer_id ? String(product.offer_id) : ''
}

const offerIdGroup = (value: string) => {
  const match = value.match(/[A-Za-zА-Яа-яЁё]/)
  const firstLetter = match?.[0] || ''
  if (/[A-Za-z]/.test(firstLetter)) return 0
  if (/[А-Яа-яЁё]/.test(firstLetter)) return 1
  return 2
}

const compareOfferIds = (left: string, right: string) => {
  const leftValue = left.trim()
  const rightValue = right.trim()
  const leftGroup = offerIdGroup(leftValue)
  const rightGroup = offerIdGroup(rightValue)
  if (leftGroup !== rightGroup) {
    return leftGroup - rightGroup
  }
  if (leftGroup === 0) {
    return leftValue.localeCompare(rightValue, 'en', { sensitivity: 'base' })
  }
  if (leftGroup === 1) {
    return leftValue.localeCompare(rightValue, 'ru', { sensitivity: 'base' })
  }
  return leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' })
}

const postingSortDate = (posting: FbsPosting) => {
  const value = primaryDate(posting)
  if (!value) return Number.POSITIVE_INFINITY
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts
}

const batchProgressPercent = (batch?: FbsShipBatch | null) => {
  if (!batch) return 0
  const progress = Number(batch.progress)
  if (Number.isFinite(progress)) {
    return Math.max(0, Math.min(100, Math.round(progress * 100)))
  }
  const processed = Number(batch.processed_count)
  const total = Number(batch.total_count)
  if (Number.isFinite(processed) && Number.isFinite(total) && total > 0) {
    return Math.max(0, Math.min(100, Math.round((processed / total) * 100)))
  }
  return 0
}

const batchProgressText = (batch?: FbsShipBatch | null) => {
  if (!batch) return '—'
  const processed = Number(batch.processed_count)
  const total = Number(batch.total_count)
  if (Number.isFinite(processed) && Number.isFinite(total) && total > 0) {
    return `${processed} из ${total}`
  }
  return '—'
}

const labelStatusTotal = (batch?: FbsShipBatch | null) => {
  const status = batch?.label_status
  if (!status) return 0
  const total = Number(status.total)
  if (Number.isFinite(total)) return total
  const ready = Number(status.ready) || 0
  const pending = Number(status.pending) || 0
  const error = Number(status.error) || 0
  const missing = Number(status.missing) || 0
  return ready + pending + error + missing
}

const labelStatusReady = (batch?: FbsShipBatch | null) => {
  const status = batch?.label_status
  if (!status) return 0
  const ready = Number(status.ready)
  return Number.isFinite(ready) ? ready : 0
}

const labelProgressPercent = (batch?: FbsShipBatch | null) => {
  const total = labelStatusTotal(batch)
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((labelStatusReady(batch) / total) * 100)))
}

const labelProgressText = (batch?: FbsShipBatch | null) => {
  const total = labelStatusTotal(batch)
  if (!total) return '—'
  return `${labelStatusReady(batch)} из ${total}`
}

const labelStatusPending = (batch?: FbsShipBatch | null) => {
  const status = batch?.label_status
  if (!status) return 0
  const total = labelStatusTotal(batch)
  if (!total) return 0
  const ready = labelStatusReady(batch)
  const error = Number(status.error) || 0
  return Math.max(0, total - ready - error)
}

const shouldStopShipmentProgress = (batch?: FbsShipBatch | null) => {
  if (!batch || !isBatchFinished(batch)) return false
  const total = labelStatusTotal(batch)
  if (!total) {
    const batchStatus = batch.batch_labels?.status
    if (batchStatus === 'pending') return false
    if (batchStatus === 'ready' || batchStatus === 'error') return true
    return true
  }
  return labelStatusPending(batch) <= 0
}

const isBatchFinished = (batch?: FbsShipBatch | null) => {
  if (!batch) return true
  if (batch.status === 'completed' || batch.status === 'partial') return true
  const total = Number(batch.total_count)
  const processed = Number(batch.processed_count)
  if (Number.isFinite(total) && Number.isFinite(processed) && total > 0) {
    return processed >= total
  }
  return false
}

const hasProcessingBatches = computed(() =>
  shipBatches.value.some((batch) => !isBatchFinished(batch))
)

const batchDisplayPostings = (batchId: string) => {
  let list = batchPostings(batchId)
  const query = getBatchSearchQuery(batchId).trim().toLowerCase()
  if (query) {
    list = list.filter((posting) =>
      String(posting.posting_number || '').toLowerCase().includes(query)
    )
  }
  const statusFilters = getBatchStatusFilter(batchId)
  if (statusFilters) {
    list = list.filter((posting) => statusFilters.has(posting.status))
  }
  if (isBatchSplitParentOnly(batchId)) {
    list = list.filter((posting) => Boolean(posting.is_split_parent))
  }
  const sortKey = getBatchSortKey(batchId)
  if (!sortKey) return list
  return [...list].sort((a, b) => {
    if (sortKey === 'offer_id') {
      return compareOfferIds(postingPrimaryOfferId(a), postingPrimaryOfferId(b))
    }
    if (sortKey === 'weight') {
      return postingTotalWeight(a) - postingTotalWeight(b)
    }
    return postingSortDate(a) - postingSortDate(b)
  })
}

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
    const historyTotalFromCounts =
      counts && typeof counts === 'object' ? Number((counts as any).history_total) : Number.NaN
    const awaitingDeliverCount =
      counts && typeof counts === 'object'
        ? (counts as any).awaiting_deliver ?? (counts as any).awaiting_delive
        : undefined
    if (typeof awaitingDeliverCount === 'number') {
      nextCounts.awaiting_deliver = awaitingDeliverCount
    }
    if (Number.isFinite(historyTotalFromCounts)) {
      historyTotal.value = historyTotalFromCounts
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

const loadShipBatches = async (options?: { showLoader?: boolean; preserveState?: boolean }) => {
  if (!props.storeId) return
  const showLoader = Boolean(options?.showLoader || !shipBatches.value.length)
  if (showLoader) {
    isBatchLoading.value = true
  }
  errorMessage.value = null
  try {
    const response = await apiService.getFbsShipBatches({ storeId: props.storeId })
    const counts = (response as any)?.counts
    if (counts && typeof counts === 'object') {
      applyPostingsResponse(response, { skipPostings: true })
    }
    const total = Number((response as any)?.on_packaging_total)
    onPackagingTotal.value = Number.isFinite(total) ? total : null
    const list = (response as any)?.batches
    const nextBatches = Array.isArray(list) ? (list as FbsShipBatch[]) : []
    shipBatches.value = nextBatches
    if (!options?.preserveState) {
      shipBatchExpanded.value = new Set()
      shipBatchDetails.value = {}
      batchDetailLoading.value = {}
      batchDetailError.value = {}
      batchSelections.value = {}
      batchCarriageLoading.value = {}
      batchSearchQuery.value = {}
      batchStatusFilters.value = {}
      batchSplitParentOnly.value = {}
    } else {
      const ids = new Set(nextBatches.map((batch) => batch.batch_id))
      shipBatchExpanded.value = new Set([...shipBatchExpanded.value].filter((id) => ids.has(id)))
      shipBatchDetails.value = Object.fromEntries(
        Object.entries(shipBatchDetails.value).filter(([id]) => ids.has(id))
      )
      batchDetailLoading.value = Object.fromEntries(
        Object.entries(batchDetailLoading.value).filter(([id]) => ids.has(id))
      )
      batchDetailError.value = Object.fromEntries(
        Object.entries(batchDetailError.value).filter(([id]) => ids.has(id))
      )
      batchSelections.value = Object.fromEntries(
        Object.entries(batchSelections.value).filter(([id]) => ids.has(id))
      )
      batchCarriageLoading.value = Object.fromEntries(
        Object.entries(batchCarriageLoading.value).filter(([id]) => ids.has(id))
      )
      batchSearchQuery.value = Object.fromEntries(
        Object.entries(batchSearchQuery.value).filter(([id]) => ids.has(id))
      )
      batchStatusFilters.value = Object.fromEntries(
        Object.entries(batchStatusFilters.value).filter(([id]) => ids.has(id))
      )
      batchSplitParentOnly.value = Object.fromEntries(
        Object.entries(batchSplitParentOnly.value).filter(([id]) => ids.has(id))
      )
      nextBatches.forEach((batch) => {
        const detail = shipBatchDetails.value[batch.batch_id]
        if (detail) {
          detail.batch = { ...detail.batch, ...batch }
        }
      })
    }
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

const startShipBatchPolling = () => {
  if (shipBatchPollingTimer.value) return
  shipBatchPollingTimer.value = window.setInterval(async () => {
    if (activeStatus.value !== 'ship_batches') return
    if (shipBatchPollingInFlight.value) return
    shipBatchPollingInFlight.value = true
    try {
      await loadShipBatches({ showLoader: false, preserveState: true })
    } finally {
      shipBatchPollingInFlight.value = false
    }
  }, 2000)
}

const stopShipBatchPolling = () => {
  if (shipBatchPollingTimer.value) {
    window.clearInterval(shipBatchPollingTimer.value)
    shipBatchPollingTimer.value = null
  }
  shipBatchPollingInFlight.value = false
}

const updateShipBatchPolling = () => {
  if (activeStatus.value === 'ship_batches' && hasProcessingBatches.value) {
    startShipBatchPolling()
    return
  }
  stopShipBatchPolling()
}

const updateBatchInList = (batch: FbsShipBatch) => {
  shipBatches.value = shipBatches.value.map((item) =>
    item.batch_id === batch.batch_id ? { ...item, ...batch } : item
  )
}

const applyLabelSortSettings = (data: any) => {
  const mode = data?.label_sort_mode
  if (mode === 'offer_id' || mode === 'weight' || mode === 'created_at') {
    labelSortMode.value = mode
  } else {
    labelSortMode.value = 'offer_id'
  }
  labelSortAscending.value = true
}

const loadLabelSortSettings = async () => {
  if (!props.storeId) return
  try {
    const data = await apiService.getUserStoreFilters(props.storeId)
    applyLabelSortSettings(data)
  } catch (error) {
    labelSortMode.value = 'offer_id'
    labelSortAscending.value = true
  }
}

const saveLabelSortSettings = async () => {
  if (!props.storeId || labelSortSaving.value) return
  labelSortSaving.value = true
  try {
    await apiService.updateUserStoreFilters(props.storeId, {
      label_sort_mode: labelSortMode.value,
      label_sort_ascending: labelSortAscending.value
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Не удалось сохранить сортировку этикеток'
  } finally {
    labelSortSaving.value = false
  }
}

const fetchShipmentProgress = async (batchId: string) => {
  if (!batchId || shipmentProgressLoading.value) return
  shipmentProgressLoading.value = true
  shipmentProgressError.value = null
  try {
    const response = await apiService.getFbsShipBatchDetail(batchId)
    const batch = ((response as any)?.batch || response) as FbsShipBatch
    const labelStatus = (response as any)?.label_status ?? (batch as any)?.label_status
    const labelTasks = (response as any)?.label_tasks ?? (batch as any)?.label_tasks
    if (batch && batch.batch_id) {
      const mergedBatch: FbsShipBatch = {
        ...(shipmentProgressBatch.value || { batch_id: batchId }),
        ...batch,
        label_status: labelStatus ?? null,
        label_tasks: labelTasks ?? null
      }
      shipmentProgressBatch.value = mergedBatch
      updateBatchInList(batch)
      updateShipBatchPolling()
      if (shouldStopShipmentProgress(mergedBatch)) {
        stopShipmentProgressPolling()
      }
    }
  } catch (error) {
    shipmentProgressError.value =
      error instanceof Error ? error.message : 'Не удалось загрузить прогресс'
  } finally {
    shipmentProgressLoading.value = false
  }
}

const startShipmentProgressPolling = (batchId: string) => {
  if (shipmentProgressTimer.value) {
    window.clearInterval(shipmentProgressTimer.value)
  }
  void fetchShipmentProgress(batchId)
  shipmentProgressTimer.value = window.setInterval(() => {
    void fetchShipmentProgress(batchId)
  }, 2000)
}

const stopShipmentProgressPolling = () => {
  if (shipmentProgressTimer.value) {
    window.clearInterval(shipmentProgressTimer.value)
    shipmentProgressTimer.value = null
  }
}

const applyShipBatchDetail = (batchId: string, response: any) => {
  const detail: FbsShipBatchDetail = {
    batch: response?.batch || { batch_id: batchId },
    postings: Array.isArray(response?.postings) ? response.postings : [],
    count: response?.count ?? null,
    items_count: response?.items_count ?? null
  }
  shipBatchDetails.value = { ...shipBatchDetails.value, [batchId]: detail }
  updateBatchInList(detail.batch)
  return detail
}

const loadShipBatchDetail = async (batchId: string) => {
  if (!batchId) return
  batchDetailLoading.value = { ...batchDetailLoading.value, [batchId]: true }
  batchDetailError.value = { ...batchDetailError.value, [batchId]: '' }
  try {
    const response = await apiService.getFbsShipBatchDetail(batchId)
    applyShipBatchDetail(batchId, response)
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

const loadCarriages = async (options?: { showLoader?: boolean }) => {
  if (!props.storeId) return
  const showLoader = Boolean(options?.showLoader || !carriages.value.length)
  if (showLoader) {
    isCarriageLoading.value = true
  }
  errorMessage.value = null
  try {
    const response = await apiService.getFbsCarriages({ storeId: props.storeId })
    const counts = (response as any)?.counts
    if (counts && typeof counts === 'object') {
      applyPostingsResponse(response, { skipPostings: true })
    }
    const list = (response as any)?.carriages
    carriages.value = Array.isArray(list) ? (list as FbsCarriage[]) : []
    carriageExpanded.value = new Set()
    carriageDetails.value = {}
    carriageDetailLoading.value = {}
    carriageDetailError.value = {}
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить отгрузки'
    carriages.value = []
  } finally {
    if (showLoader) {
      isCarriageLoading.value = false
    }
  }
}

const loadNotShipped = async (options?: { showLoader?: boolean; refresh?: boolean }) => {
  if (!props.storeId) return
  const showLoader = options?.showLoader ?? true
  if (showLoader) {
    isNotShippedLoading.value = true
  }
  errorMessage.value = null
  try {
    const response = await apiService.getFbsNotShipped({
      storeId: props.storeId,
      refresh: options?.refresh ? 1 : 0,
      limit: 1000
    })
    const counts = (response as any)?.counts
    if (counts && typeof counts === 'object') {
      applyPostingsResponse(response, { skipPostings: true })
    }
    const list = (response as any)?.postings
    postings.value = Array.isArray(list) ? (list as FbsPosting[]) : []
    const count = Number((response as any)?.count)
    notShippedCount.value = Number.isFinite(count) ? count : postings.value.length
    const lastSync = (response as any)?.last_sync
    notShippedLastSync.value = lastSync ? String(lastSync) : null
    if (Number.isFinite(count)) {
      statusCounts.value = { ...statusCounts.value, acceptance_in_progress: count }
    }
    selectedPostings.value.clear()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить отправления'
    postings.value = []
  } finally {
    if (showLoader) {
      isNotShippedLoading.value = false
    }
  }
}

const loadHistory = async (options?: { showLoader?: boolean }) => {
  if (!props.storeId) return
  const showLoader = options?.showLoader ?? true
  if (showLoader) {
    isHistoryLoading.value = true
  }
  errorMessage.value = null
  try {
    const response = await apiService.getFbsHistory({
      storeId: props.storeId,
      limit: 1000
    })
    const counts = (response as any)?.counts
    const historyTotalFromCounts =
      counts && typeof counts === 'object' ? Number((counts as any).history_total) : Number.NaN
    if (counts && typeof counts === 'object') {
      applyPostingsResponse(response, { skipPostings: true })
    }
    const list = (response as any)?.results
    historyItems.value = Array.isArray(list) ? (list as FbsHistoryItem[]) : []
    const count = Number((response as any)?.count)
    historyCount.value = Number.isFinite(count) ? count : historyItems.value.length
    const total = Number((response as any)?.total)
    if (Number.isFinite(historyTotalFromCounts)) {
      historyTotal.value = historyTotalFromCounts
    } else {
      historyTotal.value = Number.isFinite(total) ? total : historyCount.value
    }
    historyLastSync.value = new Date().toISOString()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить историю'
    historyItems.value = []
  } finally {
    if (showLoader) {
      isHistoryLoading.value = false
    }
  }
}

const updateCarriageInList = (carriage: FbsCarriage) => {
  carriages.value = carriages.value.map((item) =>
    String(item.carriage_id) === String(carriage.carriage_id) ? { ...item, ...carriage } : item
  )
}

const applyCarriageDetail = (carriageId: string | number, response: any) => {
  const detail: FbsCarriageDetail = {
    carriage: (response as any)?.carriage || { carriage_id: carriageId },
    postings: Array.isArray((response as any)?.postings) ? (response as any).postings : [],
    count: (response as any)?.count ?? null,
    items_count: (response as any)?.items_count ?? null,
    labels: (response as any)?.labels ?? null
  }
  carriageDetails.value = { ...carriageDetails.value, [String(carriageId)]: detail }
  updateCarriageInList(detail.carriage)
  return detail
}

const loadCarriageDetail = async (carriageId: string | number) => {
  if (!carriageId) return
  const key = String(carriageId)
  carriageDetailLoading.value = { ...carriageDetailLoading.value, [key]: true }
  carriageDetailError.value = { ...carriageDetailError.value, [key]: '' }
  try {
    const response = await apiService.getFbsCarriageDetail(key)
    applyCarriageDetail(key, response)
  } catch (error) {
    carriageDetailError.value = {
      ...carriageDetailError.value,
      [key]: error instanceof Error ? error.message : 'Не удалось загрузить отправления'
    }
  } finally {
    carriageDetailLoading.value = { ...carriageDetailLoading.value, [key]: false }
  }
}

const ensureCarriageDetail = async (carriageId: string | number) => {
  const key = String(carriageId)
  if (!carriageDetails.value[key]) {
    await loadCarriageDetail(key)
  }
}

const toggleCarriage = async (carriage: FbsCarriage) => {
  const key = String(carriage.carriage_id)
  const next = new Set(carriageExpanded.value)
  if (next.has(key)) {
    next.delete(key)
    carriageExpanded.value = next
    return
  }
  next.add(key)
  carriageExpanded.value = next
  await ensureCarriageDetail(key)
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
    if (needsLabel.value && showNeedsLabelToggle.value) params.needs_label = '1'
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
  if (isCarriageTab.value) {
    isSyncing.value = true
    try {
      await loadCarriages({ showLoader: true })
    } finally {
      isSyncing.value = false
    }
    return
  }
  if (isHistoryTab.value) {
    isSyncing.value = true
    try {
      await loadHistory({ showLoader: true })
    } finally {
      isSyncing.value = false
    }
    return
  }
  if (isNotShippedTab.value) {
    isSyncing.value = true
    try {
      await loadNotShipped({ showLoader: true, refresh: true })
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
  if (isCarriageTab.value) {
    await loadCarriages({ showLoader: true })
    return
  }
  if (isHistoryTab.value) {
    await loadHistory({ showLoader: true })
    return
  }
  if (isNotShippedTab.value) {
    await loadNotShipped({ showLoader: true })
    return
  }
  await loadPostings()
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

const openShipmentProgress = (batch: FbsShipBatch) => {
  shipmentProgressBatch.value = batch
  shipmentProgressError.value = null
  shipmentProgressOpen.value = true
  startShipmentProgressPolling(batch.batch_id)
}

const closeShipmentProgress = () => {
  shipmentProgressOpen.value = false
  shipmentProgressBatch.value = null
  shipmentProgressError.value = null
  stopShipmentProgressPolling()
}

const goToCarriagesFromProgress = async () => {
  closeShipmentProgress()
  activeStatus.value = 'carriages'
  await loadCarriages({ showLoader: true })
}

const openCarriageDialog = (batch: FbsShipBatch) => {
  if (!batch) return
  carriageBatch.value = batch
  carriagePlacesCount.value = '1'
  carriageDialogOpen.value = true
}

const closeCarriageDialog = () => {
  carriageDialogOpen.value = false
  carriageBatch.value = null
}

const closeCarriageSuccess = async () => {
  carriageSuccessOpen.value = false
  carriageBatch.value = null
  if (activeStatus.value === 'ship_batches') {
    await loadShipBatches()
    return
  }
  activeStatus.value = 'ship_batches'
}

const openMoveDialog = (batchId: string) => {
  const numbers = batchSelectedNumbers(batchId)
  if (!numbers.length) return
  moveSourceBatchId.value = batchId
  moveTargetBatchId.value = ''
  movePostingNumbers.value = numbers
  moveNewBatchName.value = formatBatchName(new Date())
  moveError.value = null
  moveLoading.value = false
  moveDialogOpen.value = true
}

const closeMoveDialog = () => {
  moveDialogOpen.value = false
  moveSourceBatchId.value = null
  moveTargetBatchId.value = ''
  movePostingNumbers.value = []
  moveNewBatchName.value = ''
  moveError.value = null
  moveLoading.value = false
}

const finalizeMove = async (response?: any) => {
  const sourceId = moveSourceBatchId.value
  const targetId = (response as any)?.target_batch?.batch_id || moveTargetBatchId.value
  const affectedIds = new Set<string>()
  if (sourceId) affectedIds.add(sourceId)
  if (targetId) affectedIds.add(targetId)
  const affectedList = Array.isArray((response as any)?.affected_batches)
    ? ((response as any).affected_batches as Array<{ batch_id?: string; deleted?: boolean }>)
    : []
  affectedList.forEach((item) => {
    if (item?.batch_id && !item.deleted) affectedIds.add(item.batch_id)
  })
  closeMoveDialog()
  await loadShipBatches({ showLoader: false, preserveState: true })
  if (sourceId) {
    resetBatchSelection(sourceId)
    if (shipBatchExpanded.value.has(sourceId)) {
      await loadShipBatchDetail(sourceId)
    }
  }
  if (targetId && shipBatchExpanded.value.has(targetId)) {
    await loadShipBatchDetail(targetId)
  }
  affectedIds.forEach((batchId) => {
    startBatchLabelPolling(batchId)
  })
}

const submitMoveToExisting = async () => {
  if (!props.storeId || moveLoading.value) return
  if (!moveTargetBatchId.value) {
    moveError.value = 'Выберите отправление для переноса.'
    return
  }
  if (!movePostingNumbers.value.length) {
    moveError.value = 'Нет выбранных отправлений.'
    return
  }
  moveLoading.value = true
  moveError.value = null
  try {
    const response = await apiService.moveFbsShipBatch({
      store_id: Number(props.storeId),
      posting_numbers: movePostingNumbers.value,
      target_batch_id: moveTargetBatchId.value
    })
    await finalizeMove(response)
  } catch (error) {
    moveError.value = error instanceof Error ? error.message : 'Не удалось перенести отправления'
  } finally {
    moveLoading.value = false
  }
}

const submitMoveToNewBatch = async () => {
  if (!props.storeId || moveLoading.value) return
  if (!movePostingNumbers.value.length) {
    moveError.value = 'Нет выбранных отправлений.'
    return
  }
  const name = moveNewBatchName.value.trim()
  if (!name) {
    moveError.value = 'Укажите название нового отправления.'
    return
  }
  moveLoading.value = true
  moveError.value = null
  try {
    const response = await apiService.moveFbsShipBatch({
      store_id: Number(props.storeId),
      posting_numbers: movePostingNumbers.value,
      create_new_batch: true,
      batch_name: name
    })
    await finalizeMove(response)
  } catch (error) {
    moveError.value = error instanceof Error ? error.message : 'Не удалось перенести отправления'
  } finally {
    moveLoading.value = false
  }
}

const movePostingsToBatch = async (
  sourceBatchId: string,
  targetBatchId: string,
  postingNumbers: string[]
) => {
  if (!props.storeId || !postingNumbers.length) {
    return { ok: false, error: 'Нет отправлений для переноса.' }
  }
  moveSourceBatchId.value = sourceBatchId
  moveTargetBatchId.value = targetBatchId
  movePostingNumbers.value = postingNumbers
  try {
    const response = await apiService.moveFbsShipBatch({
      store_id: Number(props.storeId),
      posting_numbers: postingNumbers,
      target_batch_id: targetBatchId
    })
    await finalizeMove(response)
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось перенести отправления'
    errorMessage.value = message
    return { ok: false, error: message }
  }
}

const onBatchDragStart = (batchId: string, postingNumber: string, event: DragEvent) => {
  const selection = batchSelections.value[batchId]
  const postingNumbers =
    selection && selection.size && selection.has(postingNumber)
      ? Array.from(selection)
      : [postingNumber]
  dragPayload.value = { sourceBatchId: batchId, postingNumbers }
  dragOverBatchId.value = null
  const row = (event.target as HTMLElement | null)?.closest('tr') as HTMLElement | null
  const table = row?.closest('table') as HTMLTableElement | null
  const ghost = createDragGhost(table, postingNumbers, row)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
    event.dataTransfer.setData('text/plain', postingNumber)
    if (ghost) {
      event.dataTransfer.setDragImage(ghost, 24, 24)
    }
  }
  if (ghost) {
    window.setTimeout(() => {
      ghost.remove()
    }, 0)
  }
}

const onBatchDragEnd = () => {
  dragPayload.value = null
  dragOverBatchId.value = null
}

const openDragConfirm = (
  targetBatch: FbsShipBatch,
  payload: { sourceBatchId: string; postingNumbers: string[] }
) => {
  dragConfirmBatch.value = targetBatch
  dragConfirmPayload.value = payload
  dragConfirmLoading.value = false
  dragConfirmError.value = null
  dragConfirmOpen.value = true
}

const closeDragConfirm = () => {
  dragConfirmOpen.value = false
  dragConfirmBatch.value = null
  dragConfirmPayload.value = null
  dragConfirmLoading.value = false
  dragConfirmError.value = null
}

const confirmDragMove = async () => {
  const payload = dragConfirmPayload.value
  const targetBatch = dragConfirmBatch.value
  if (!payload || !targetBatch) return
  dragConfirmLoading.value = true
  dragConfirmError.value = null
  const result = await movePostingsToBatch(
    payload.sourceBatchId,
    targetBatch.batch_id,
    payload.postingNumbers
  )
  dragConfirmLoading.value = false
  if (result.ok) {
    closeDragConfirm()
    return
  }
  dragConfirmError.value = result.error || 'Не удалось перенести отправления'
}

const escapeSelectorValue = (value: string) => {
  const escaper = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape : null
  return escaper ? escaper(value) : value.replace(/["\\]/g, '\\$&')
}

const createDragGhost = (
  table: HTMLTableElement | null,
  postingNumbers: string[],
  fallbackRow: HTMLElement | null
) => {
  const count = postingNumbers.length
  const ghost = document.createElement('div')
  ghost.className = 'fbs-drag-ghost'
  ghost.style.position = 'absolute'
  ghost.style.top = '-9999px'
  ghost.style.left = '-9999px'
  ghost.style.pointerEvents = 'none'
  if (table || fallbackRow) {
    const tableEl = document.createElement('table')
    tableEl.className = 'fbs-drag-ghost-table'
    const tbody = document.createElement('tbody')
    tableEl.appendChild(tbody)
    const maxRows = Math.min(count, 5)
    const rows: HTMLTableRowElement[] = []
    for (let i = 0; i < maxRows; i += 1) {
      const postingNumber = postingNumbers[i]
      const selectorValue = escapeSelectorValue(postingNumber)
      const sourceRow = table
        ? (table.querySelector(`tr[data-posting-number="${selectorValue}"]`) as HTMLTableRowElement | null)
        : null
      if (sourceRow) {
        rows.push(sourceRow)
      }
    }
    if (!rows.length && fallbackRow) {
      rows.push(fallbackRow as HTMLTableRowElement)
    }
    rows.forEach((row) => {
      const clone = row.cloneNode(true) as HTMLTableRowElement
      tbody.appendChild(clone)
    })
    ghost.appendChild(tableEl)
  }
  const label = document.createElement('div')
  label.className = 'fbs-drag-ghost-label'
  if (count > 1) {
    label.textContent = `Перемещаем ${count} отправления`
  } else {
    label.textContent = 'Перемещаем 1 отправление'
  }
  ghost.appendChild(label)
  document.body.appendChild(ghost)
  return ghost
}

const onBatchDragEnter = (batch: FbsShipBatch, event: DragEvent) => {
  if (!dragPayload.value) return
  if (batch.batch_id === dragPayload.value.sourceBatchId) return
  dragOverBatchId.value = batch.batch_id
  event.preventDefault()
}

const onBatchDragOver = (batch: FbsShipBatch, event: DragEvent) => {
  if (!dragPayload.value) return
  if (batch.batch_id === dragPayload.value.sourceBatchId) return
  dragOverBatchId.value = batch.batch_id
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  event.preventDefault()
}

const onBatchDragLeave = (batch: FbsShipBatch, event: DragEvent) => {
  if (dragOverBatchId.value !== batch.batch_id) return
  const current = event.currentTarget as HTMLElement | null
  if (current && event.relatedTarget && current.contains(event.relatedTarget as Node)) return
  dragOverBatchId.value = null
}

const onBatchDrop = async (batch: FbsShipBatch, event: DragEvent) => {
  const payload = dragPayload.value
  dragPayload.value = null
  dragOverBatchId.value = null
  event.preventDefault()
  if (!payload) return
  if (payload.sourceBatchId === batch.batch_id) return
  openDragConfirm(batch, payload)
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
    const response = await apiService.createFbsShipment(payload)
    closeShipmentDialog()
    resetSelection()
    await refreshPostings()
    const batch = response as FbsShipBatch
    if (batch?.batch_id) {
      openShipmentProgress(batch)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось создать отгрузку'
  } finally {
    isShipping.value = false
  }
}

const selectRange = () => {
  const from = Number(rangeFrom.value)
  const to = Number(rangeTo.value)
  const total = displayPostings.value.length
  if (Number.isNaN(from) || Number.isNaN(to) || from < 1 || to < from || to > total) return
  const next = new Set(selectedPostings.value)
  for (let i = from; i <= to; i++) {
    const posting = displayPostings.value[i - 1]
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

const selectAllVisible = () => {
  const next = new Set<string>()
  displayPostings.value.forEach((posting) => {
    if (posting.posting_number) {
      next.add(posting.posting_number)
    }
  })
  selectedPostings.value = next
}

const scrollToRow = async (rowNumber: number) => {
  await nextTick()
  const wrapper = postingsWrapperRef.value
  if (!wrapper) return
  const row = wrapper.querySelector(`tr[data-row="${rowNumber}"]`) as HTMLElement | null
  if (!row) return
  const wrapperRect = wrapper.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const offset = rowRect.top - wrapperRect.top + wrapper.scrollTop - 8
  wrapper.scrollTo({ top: Math.max(offset, 0), behavior: 'smooth' })
}

const selectBeforeToday = () => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const threshold = startOfToday.getTime()
  const next = new Set<string>()
  let firstIndex = -1
  displayPostings.value.forEach((posting, index) => {
    const value = posting.awaiting_packaging_at || posting.in_process_at || primaryDate(posting)
    if (!value) return
    const ts = Date.parse(String(value))
    if (Number.isNaN(ts)) return
    if (ts < threshold) {
      next.add(posting.posting_number)
      if (firstIndex === -1) {
        firstIndex = index
      }
    }
  })
  selectedPostings.value = next
  if (firstIndex >= 0) {
    void scrollToRow(firstIndex + 1)
  }
}

const handleRowClick = (postingNumber: string) => {
  if (!isStatusTab.value) return
  toggleRow(postingNumber)
}

const setNewSort = (key: 'offer_id' | 'weight' | 'date') => {
  if (newSortBy.value === key) {
    newSortDirection.value = newSortDirection.value === 1 ? -1 : 1
    return
  }
  newSortBy.value = key
  newSortDirection.value = 1
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
  displayPostings.value.forEach((posting) => {
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

const handleExport = async () => {
  if (!props.storeId || isExporting.value) return
  isExporting.value = true
  errorMessage.value = null
  try {
    const limitValue = Number(exportLimit.value)
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : undefined
    const format = exportFormat.value
    const response = await apiService.exportFbsHistory(props.storeId, { format, limit })
    if (response && response.blob instanceof Blob) {
      const extension = format === 'xlsx' ? 'xlsx' : 'csv'
      downloadBlob(response.blob, `fbs_history_${Date.now()}.${extension}`)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось сформировать экспорт'
  } finally {
    isExporting.value = false
  }
}

const openCancelPosting = (posting: FbsPosting) => {
  cancelPostingTarget.value = posting
  cancelPostingError.value = null
  cancelPostingOpen.value = true
}

const closeCancelPosting = () => {
  cancelPostingOpen.value = false
  cancelPostingTarget.value = null
  cancelPostingError.value = null
  cancelPostingLoading.value = false
}

const confirmCancelPosting = async () => {
  const posting = cancelPostingTarget.value
  if (!posting || !props.storeId || cancelPostingLoading.value) return
  cancelPostingLoading.value = true
  cancelPostingError.value = null
  try {
    await apiService.cancelFbsPosting({
      store_id: Number(props.storeId),
      posting_number: posting.posting_number
    })
    closeCancelPosting()
    await loadPostings()
  } catch (error) {
    cancelPostingError.value =
      error instanceof Error ? error.message : 'Не удалось удалить отправление'
  } finally {
    cancelPostingLoading.value = false
  }
}

const setBatchLabelLoading = (batchId: string, value: boolean) => {
  batchLabelLoading.value = { ...batchLabelLoading.value, [batchId]: value }
}

const stopBatchLabelPolling = (batchId: string) => {
  const timer = batchLabelPolling.value[batchId]
  if (timer) {
    window.clearInterval(timer)
  }
  const next = { ...batchLabelPolling.value }
  delete next[batchId]
  batchLabelPolling.value = next
  if (batchLabelPollingInFlight.value[batchId]) {
    const nextInFlight = { ...batchLabelPollingInFlight.value }
    delete nextInFlight[batchId]
    batchLabelPollingInFlight.value = nextInFlight
  }
  setBatchLabelLoading(batchId, false)
}

const removeBatchFromState = (batchId: string) => {
  shipBatches.value = shipBatches.value.filter((item) => item.batch_id !== batchId)
  if (shipBatchExpanded.value.has(batchId)) {
    const next = new Set(shipBatchExpanded.value)
    next.delete(batchId)
    shipBatchExpanded.value = next
  }
  if (shipBatchDetails.value[batchId]) {
    const next = { ...shipBatchDetails.value }
    delete next[batchId]
    shipBatchDetails.value = next
  }
  if (batchDetailLoading.value[batchId]) {
    const next = { ...batchDetailLoading.value }
    delete next[batchId]
    batchDetailLoading.value = next
  }
  if (batchDetailError.value[batchId]) {
    const next = { ...batchDetailError.value }
    delete next[batchId]
    batchDetailError.value = next
  }
}

const startBatchLabelPolling = (batchId: string) => {
  if (!batchId || batchLabelPolling.value[batchId]) return
  setBatchLabelLoading(batchId, true)
  const poll = async () => {
    if (batchLabelPollingInFlight.value[batchId]) return
    batchLabelPollingInFlight.value = { ...batchLabelPollingInFlight.value, [batchId]: true }
    try {
      const response = await apiService.getFbsShipBatchDetail(batchId)
      const detail = applyShipBatchDetail(batchId, response)
      const labels = detail.batch.batch_labels
      if (labels?.file_url || labels?.status === 'error') {
        stopBatchLabelPolling(batchId)
      }
    } catch (error) {
      const status = (error as any)?.status
      if (status === 404) {
        stopBatchLabelPolling(batchId)
        removeBatchFromState(batchId)
        return
      }
    } finally {
      const nextInFlight = { ...batchLabelPollingInFlight.value, [batchId]: false }
      batchLabelPollingInFlight.value = nextInFlight
    }
  }
  void poll()
  const timer = window.setInterval(poll, 2000)
  batchLabelPolling.value = { ...batchLabelPolling.value, [batchId]: timer }
}

const stopAllBatchLabelPolling = () => {
  Object.values(batchLabelPolling.value).forEach((timer) => window.clearInterval(timer))
  batchLabelPolling.value = {}
  batchLabelPollingInFlight.value = {}
  batchLabelLoading.value = {}
}

const getBatchLabels = (batchId: string) => {
  const detail = shipBatchDetails.value[batchId]
  if (detail?.batch?.batch_labels) {
    return detail.batch.batch_labels
  }
  const listBatch = shipBatches.value.find((item) => item.batch_id === batchId)
  return listBatch?.batch_labels || null
}

const handleBatchLabels = async (batchId: string) => {
  if (batchLabelLoading.value[batchId]) return
  const batch = shipBatches.value.find((item) => item.batch_id === batchId)
  if (!isBatchLabelActionAllowed(batch)) return
  setBatchLabelLoading(batchId, true)
  try {
    let batchLabels = getBatchLabels(batchId)
    if (!batchLabels || batchLabels.status !== 'ready' || !batchLabels.file_url) {
      await ensureBatchDetail(batchId)
      batchLabels = getBatchLabels(batchId)
    }
    if (batchLabels?.status === 'ready' && batchLabels.file_url) {
      const filename = batchLabels.file_name || `batch_${batchId}_labels.pdf`
      await downloadFileUrl(batchLabels.file_url, filename)
      return
    }
    const numbers = batchPostings(batchId).map((posting) => posting.posting_number).filter(Boolean)
    if (!numbers.length) return
    await handleLabels(numbers, { skipGlobalLoading: true, skipReload: true })
  } finally {
    setBatchLabelLoading(batchId, false)
  }
}

const handleBatchSelectionLabels = async (batchId: string) => {
  if (batchLabelLoading.value[batchId]) return
  const batch = shipBatches.value.find((item) => item.batch_id === batchId)
  if (!isBatchLabelActionAllowed(batch)) return
  setBatchLabelLoading(batchId, true)
  try {
    const numbers = batchSelectedNumbers(batchId)
    if (!numbers.length) return
    await handleLabels(numbers, { skipGlobalLoading: true, skipReload: true })
  } finally {
    setBatchLabelLoading(batchId, false)
  }
}

const setCarriageLabelLoading = (carriageId: string | number, value: boolean) => {
  carriageLabelLoading.value = { ...carriageLabelLoading.value, [String(carriageId)]: value }
}

const getCarriageLabels = (carriageId: string | number) => {
  const key = String(carriageId)
  const detail = carriageDetails.value[key]
  if (detail?.labels) return detail.labels
  const list = carriages.value.find((item) => String(item.carriage_id) === key)
  return list?.labels || null
}

const stopCarriageLabelPolling = (carriageId: string | number) => {
  const key = String(carriageId)
  const timer = carriageLabelPolling.value[key]
  if (timer) {
    window.clearInterval(timer)
  }
  const next = { ...carriageLabelPolling.value }
  delete next[key]
  carriageLabelPolling.value = next
  if (carriageLabelPollingInFlight.value[key]) {
    const nextInFlight = { ...carriageLabelPollingInFlight.value }
    delete nextInFlight[key]
    carriageLabelPollingInFlight.value = nextInFlight
  }
  setCarriageLabelLoading(key, false)
}

const startCarriageLabelPolling = (carriageId: string | number) => {
  const key = String(carriageId)
  if (!key || carriageLabelPolling.value[key]) return
  setCarriageLabelLoading(key, true)
  const poll = async () => {
    if (carriageLabelPollingInFlight.value[key]) return
    carriageLabelPollingInFlight.value = { ...carriageLabelPollingInFlight.value, [key]: true }
    try {
      const response = await apiService.getFbsCarriageDetail(key)
      const detail = applyCarriageDetail(key, response)
      const labels = detail.labels
      if (labels?.status === 'ready' && labels.file_url) {
        const filename = labels.file_name || `carriage_${key}_labels.pdf`
        await downloadFileUrl(labels.file_url, filename)
        stopCarriageLabelPolling(key)
        return
      }
      if (labels?.status === 'failed') {
        errorMessage.value = labels.error || 'Не удалось сформировать этикетки'
        stopCarriageLabelPolling(key)
      }
    } catch (error) {
      // keep polling
    } finally {
      const nextInFlight = { ...carriageLabelPollingInFlight.value, [key]: false }
      carriageLabelPollingInFlight.value = nextInFlight
    }
  }
  void poll()
  const timer = window.setInterval(poll, 2000)
  carriageLabelPolling.value = { ...carriageLabelPolling.value, [key]: timer }
}

const stopAllCarriageLabelPolling = () => {
  Object.values(carriageLabelPolling.value).forEach((timer) => window.clearInterval(timer))
  carriageLabelPolling.value = {}
  carriageLabelPollingInFlight.value = {}
  carriageLabelLoading.value = {}
}

const setCarriageCancelLoading = (carriageId: string | number, value: boolean) => {
  carriageCancelLoading.value = { ...carriageCancelLoading.value, [String(carriageId)]: value }
}

const handleCarriageCancel = async (carriageId: string | number) => {
  const key = String(carriageId)
  if (carriageCancelLoading.value[key]) return
  if (!window.confirm('Отменить доставку?')) return
  setCarriageCancelLoading(key, true)
  errorMessage.value = null
  try {
    await apiService.cancelFbsCarriage(key)
    await loadCarriages()
    await loadShipBatches({ showLoader: false, preserveState: true })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось отменить доставку'
  } finally {
    setCarriageCancelLoading(key, false)
  }
}

const handleCarriageLabels = async (carriageId: string | number) => {
  const key = String(carriageId)
  if (carriageLabelLoading.value[key]) return
  setCarriageLabelLoading(key, true)
  try {
    let labels = getCarriageLabels(key)
    if (!labels) {
      await loadCarriageDetail(key)
      labels = getCarriageLabels(key)
    }
    if (labels?.status === 'ready' && labels.file_url) {
      const filename = labels.file_name || `carriage_${key}_labels.pdf`
      await downloadFileUrl(labels.file_url, filename)
      return
    }
    if (labels?.status === 'failed') {
      errorMessage.value = labels.error || 'Не удалось сформировать этикетки'
      return
    }
    labelNotice.value = 'Этикетки готовятся'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось получить этикетки'
  } finally {
    setCarriageLabelLoading(key, false)
  }
}

const setBatchCarriageLoading = (batchId: string, value: boolean) => {
  batchCarriageLoading.value = { ...batchCarriageLoading.value, [batchId]: value }
}

const submitBatchCarriage = async () => {
  const batch = carriageBatch.value
  if (!batch || !props.storeId) return
  const places = Number(carriagePlacesCount.value)
  if (!Number.isFinite(places) || places < 1) {
    errorMessage.value = 'Укажите количество мест (минимум 1).'
    return
  }
  if (isCarriageSubmitting.value) return
  isCarriageSubmitting.value = true
  const success = await handleBatchCarriage(batch, places)
  if (success) {
    carriageDialogOpen.value = false
    carriageSuccessOpen.value = true
  }
  isCarriageSubmitting.value = false
}

const handleBatchCarriage = async (batch: FbsShipBatch, placesCount: number) => {
  if (!props.storeId) return false
  const batchId = batch.batch_id
  if (batchCarriageLoading.value[batchId]) return false
  setBatchCarriageLoading(batchId, true)
  errorMessage.value = null
  labelNotice.value = null
  let succeeded = false
  try {
    await ensureBatchDetail(batchId)
    const selected = batchSelectedNumbers(batchId)
    const numbers = selected.length
      ? selected
      : batchPostings(batchId).map((posting) => posting.posting_number).filter(Boolean)
    if (!numbers.length) {
      errorMessage.value = 'Нет отправлений для отгрузки.'
      return false
    }
    const response = await apiService.createFbsCarriage({
      store_id: Number(props.storeId),
      batch_id: batchId,
      posting_numbers: numbers,
      places_count: placesCount
    })
    const missing = Array.isArray((response as any)?.missing) ? (response as any).missing : []
    const invalid = Array.isArray((response as any)?.invalid_status) ? (response as any).invalid_status : []
    const already = Array.isArray((response as any)?.already_in_carriage) ? (response as any).already_in_carriage : []
    const parts: string[] = []
    if (missing.length) parts.push(`Не найдено: ${missing.length}`)
    if (invalid.length) parts.push(`Неверный статус: ${invalid.length}`)
    if (already.length) parts.push(`Уже в отгрузке: ${already.length}`)
    if (parts.length) {
      labelNotice.value = parts.join(' · ')
    }
    await loadCarriages()
    succeeded = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось создать отгрузку'
  } finally {
    setBatchCarriageLoading(batchId, false)
  }
  return succeeded
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

const resolveFileUrl = (path: string) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
  if (!base) return path
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

const downloadFileUrl = async (path: string, filename: string) => {
  const url = resolveFileUrl(path)
  if (!url) return
  const authStore = useAuthStore()
  const headers: Record<string, string> = {}
  if (authStore.accessToken) {
    headers['Authorization'] = `Bearer ${authStore.accessToken}`
  }
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error('Не удалось скачать файл')
  }
  const blob = await response.blob()
  downloadBlob(blob, filename)
}

const selectMissingLabels = () => {
  selectedPostings.value.clear()
  missingLabelPostings.value.forEach((posting) => {
    selectedPostings.value.add(posting.posting_number)
  })
}

const handleLabels = async (
  postingNumbers?: string[],
  options?: { skipGlobalLoading?: boolean; skipReload?: boolean }
) => {
  if (!props.storeId) return
  const numbers = postingNumbers && postingNumbers.length ? postingNumbers : selectedPostingNumbers.value
  if (!numbers.length) return
  const useGlobalLoading = !options?.skipGlobalLoading
  if (useGlobalLoading) {
    isLabeling.value = true
  }
  errorMessage.value = null
  labelNotice.value = null
  try {
    const response = await apiService.createFbsLabels({
      store_id: Number(props.storeId),
      posting_numbers: numbers,
      label_type: 'big_label',
      wait_seconds: 2,
      sort_mode: labelSortMode.value,
      sort_ascending: labelSortAscending.value
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
    if (useGlobalLoading) {
      isLabeling.value = false
    }
    if (!options?.skipReload) {
      await loadPostings()
    }
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
    carriages.value = []
    carriageDetails.value = {}
    carriageExpanded.value = new Set()
    carriageDetailLoading.value = {}
    carriageDetailError.value = {}
    stopAllCarriageLabelPolling()
    carriageCancelLoading.value = {}
    batchSelections.value = {}
    stopAllBatchLabelPolling()
    selectedPostings.value.clear()
    statusCounts.value = {}
    onPackagingTotal.value = null
    notShippedCount.value = null
    notShippedLastSync.value = null
    historyItems.value = []
    historyCount.value = null
    historyTotal.value = null
    historyLastSync.value = null
    totalCount.value = null
    isCarriageLoading.value = false
    isNotShippedLoading.value = false
    isHistoryLoading.value = false
    activeStatus.value = 'awaiting_packaging'
    labelSortMode.value = 'offer_id'
    labelSortAscending.value = true
    labelSortSaving.value = false
    rangeFrom.value = ''
    rangeTo.value = ''
    batchCarriageLoading.value = {}
    moveDialogOpen.value = false
    moveSourceBatchId.value = null
    moveTargetBatchId.value = ''
    movePostingNumbers.value = []
    moveNewBatchName.value = ''
    moveLoading.value = false
    moveError.value = null
    dragPayload.value = null
    dragOverBatchId.value = null
    dragConfirmOpen.value = false
    dragConfirmBatch.value = null
    dragConfirmPayload.value = null
    dragConfirmLoading.value = false
    dragConfirmError.value = null
    cancelPostingOpen.value = false
    cancelPostingTarget.value = null
    cancelPostingLoading.value = false
    cancelPostingError.value = null
    await loadImmediate()
    await loadLabelSortSettings()
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
    if (isCarriageTab.value) {
      await loadCarriages()
      return
    }
    if (isHistoryTab.value) {
      await loadHistory()
      return
    }
    if (isNotShippedTab.value) {
      await loadNotShipped()
      return
    }
    await loadPostings()
  }
)

watch(
  needsLabel,
  async () => {
    if (isBatchTab.value || isCarriageTab.value || isNotShippedTab.value || isHistoryTab.value)
      return
    await loadPostings()
  }
)

watch(
  [() => activeStatus.value, () => hasProcessingBatches.value],
  () => {
    updateShipBatchPolling()
  }
)

onBeforeUnmount(() => {
  stopShipBatchPolling()
  stopShipmentProgressPolling()
  stopAllBatchLabelPolling()
  stopAllCarriageLabelPolling()
  dragPayload.value = null
  dragOverBatchId.value = null
  dragConfirmOpen.value = false
  dragConfirmBatch.value = null
  dragConfirmPayload.value = null
  dragConfirmLoading.value = false
  dragConfirmError.value = null
  cancelPostingOpen.value = false
  cancelPostingTarget.value = null
  cancelPostingLoading.value = false
  cancelPostingError.value = null
})
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

.fbs-card-header {
  padding-top: 0 !important;
  padding-bottom: 0.5rem;
}

.fbs-card-header h5 {
  margin-top: 0;
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
  border: 1px solid rgba(248, 250, 252, 0.18);
  border-radius: 14px;
  padding: 1rem;
  background: #23364d;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.fbs-batch-card * {
  cursor: inherit;
}

.fbs-batch-card:hover {
  border-color: rgba(248, 250, 252, 0.3);
  background: #2b445d;
}

.fbs-batch-card--drag-target {
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
  background: #2f4f6f;
}

.fbs-batch-header {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  color: #f8fafc;
}

.fbs-batch-meta {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #f8fafc;
}

.fbs-batch-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.fbs-batch-meta__strong {
  font-weight: 700;
}

.fbs-batch-meta__strong--alert {
  color: #f87171;
}

.fbs-batch-meta__sep,
.fbs-batch-meta__dot {
  font-weight: 500;
  color: rgba(248, 250, 252, 0.75);
}

.fbs-batch-status-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.16);
  font-size: 0.78rem;
  font-weight: 600;
}

.fbs-batch-body {
  margin-top: 0.75rem;
  background: #fff;
  border-radius: 12px;
  padding: 0.75rem;
}

.fbs-batch-progress {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: rgba(248, 250, 252, 0.9);
  font-size: 0.78rem;
  font-weight: 600;
}

.fbs-batch-progress__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.2);
  overflow: hidden;
}

.fbs-batch-progress__bar span {
  display: block;
  height: 100%;
  background: #fbbf24;
  border-radius: 999px;
}

.fbs-batch-header .btn-outline-primary,
.fbs-batch-header .btn-outline-secondary {
  color: #f8fafc;
  border-color: rgba(248, 250, 252, 0.6);
}

.fbs-label-sort-select {
  width: max-content;
  min-width: 0;
  white-space: nowrap;
  background: rgba(15, 23, 42, 0.15);
  color: #f8fafc;
  border-color: rgba(248, 250, 252, 0.4);
}

.fbs-label-sort-select:disabled {
  opacity: 0.7;
}

.fbs-label-sort-select option {
  color: #0f172a;
}

.fbs-batch-header .btn-outline-primary:hover,
.fbs-batch-header .btn-outline-secondary:hover {
  background: rgba(248, 250, 252, 0.12);
  color: #fff;
}

.batch-selection-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
}

.batch-selection-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.batch-selection-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.batch-status-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.batch-status-check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-right: 0.25rem;
}

.batch-status-check .form-check-input {
  cursor: pointer;
}

.batch-status-check .form-check-label {
  font-size: 0.8rem;
  color: #64748b;
}

.batch-split-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.batch-split-filter .form-check-input {
  cursor: pointer;
}

.batch-split-filter .form-check-label {
  font-size: 0.8rem;
  color: #64748b;
}

.batch-search-input {
  min-width: 220px;
}

.batch-selection-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.fbs-batch-sort-select {
  min-width: 0;
  width: max-content;
  white-space: nowrap;
}


.fbs-move-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.fbs-move-section .btn {
  width: 100%;
}

.fbs-move-divider {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  margin: 0.75rem 0;
}

.batch-selection-bar .btn-primary {
  border-color: transparent;
}

.sort-arrow {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  position: relative;
  top: 1px;
  width: 0.9rem;
  height: 0.9rem;
  justify-content: center;
  flex: 0 0 0.9rem;
}

.sort-arrow__icon {
  width: 0.8rem;
  height: 0.8rem;
  display: block;
  transform-origin: center;
}

.sort-arrow--hidden {
  visibility: hidden;
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
  width: 100%;
  justify-content: space-between;
  flex-wrap: nowrap;
}

.fbs-filter-group--search .form-control {
  flex: 1 1 auto;
  max-width: none;
  min-width: 100px;
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
  overflow: auto;
  max-height: calc(100vh - var(--workspace-sticky-offset, 64px) -  140px);
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
  position: sticky;
  top: 0;
  z-index: 6;
}

.fbs-col-check {
  width: 68px;
}

.fbs-check-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #94a3b8;
  cursor: grab;
}

.drag-handle svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.drag-handle:hover {
  color: #475569;
}

.drag-handle:active {
  cursor: grabbing;
}

.fbs-drag-ghost {
  z-index: 9999;
}

.fbs-drag-ghost-table {
  width: 480px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  border-collapse: collapse;
}

.fbs-drag-ghost-table td {
  padding: 0.45rem 0.6rem;
  font-size: 0.78rem;
  color: #0f172a;
  background: #f1f5f9;
}

.fbs-drag-ghost-table tr + tr td {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.fbs-drag-ghost-table input,
.fbs-drag-ghost-table .drag-handle {
  display: none;
}

.fbs-drag-ghost-label {
  margin-top: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  text-align: right;
}

.fbs-col-number {
  min-width: 160px;
}

.fbs-col-offer {
  min-width: 180px;
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

.fbs-col-action {
  width: 56px;
}

.fbs-history-offer {
  padding-left: 1rem !important;
}

.fbs-delete-btn {
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fbs-delete-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.fbs-delete-btn:hover {
  color: #dc2626;
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

.fbs-table tbody tr.row-delivery-warning {
  background: rgba(251, 191, 36, 0.12);
}

.fbs-table tbody tr.row-delivery-warning td {
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.2);
}

.fbs-table tbody tr.row-selected.row-delivery-warning {
  background: rgba(34, 197, 94, 0.15);
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

.fbs-product-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.fbs-product-item {
  padding-bottom: 0.35rem;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.4);
}

.fbs-product-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
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
  bottom: 2.5rem;
  transform: translateX(-50%);
  z-index: 50;
}

.fbs-ship-fab .btn {
  padding: 0.6rem 1.4rem;
  font-size: 0.95rem;
}

.fbs-modal {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fbs-export-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
  margin-left: auto;
}

.fbs-export-format {
  width: 90px;
}

.fbs-export-limit {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.fbs-export-limit input {
  width: 60px;
}

.fbs-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.fbs-progress__bar {
  display: block;
  height: 100%;
  background: #22c55e;
  border-radius: 999px;
  transition: width 0.3s ease;
}


.selection-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #fff;
}

.selection-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 992px) {
  .fbs-tabs {
    border-radius: 16px;
  }
}
</style>
