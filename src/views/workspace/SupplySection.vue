<template>
  <div class="planner">
    <div class="planner-grid">
      <section class="card shadow-sm planner-card">
        <div class="card-header">
          <h5 class="mb-0">Фильтры</h5>
        </div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-12 col-md-6 col-lg-4" v-for="field in numericFields" :key="field.key">
              <label class="form-label text-uppercase text-muted small fw-semibold">{{ field.label }}</label>
              <input
                type="number"
                class="form-control form-control-sm"
                :step="field.step || 1"
                v-model.number="filters[field.key]"
              />
            </div>

            <div class="col-12 col-md-6 col-lg-4">
              <label class="form-label text-uppercase text-muted small fw-semibold">Показывать товары без потребности</label>
              <div class="form-check form-switch mt-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="showNoNeed"
                  v-model="filters.showNoNeed"
                >
                <label class="form-check-label" for="showNoNeed">
                  {{ filters.showNoNeed ? 'Да' : 'Нет' }}
                </label>
              </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
              <label class="form-label text-uppercase text-muted small fw-semibold">Сортировка</label>
              <select class="form-select form-select-sm" v-model="filters.sortBy">
                <option value="orders">Заказ шт.</option>
                <option value="revenue">Выручке, руб.</option>
                <option value="ozon-rec">Рек. Озона</option>
              </select>
            </div>
          </div>
          <div class="mt-2 d-flex flex-column flex-md-row gap-2 align-items-start">
            <div class="d-flex gap-2 flex-wrap">
              <div v-for="limit in priceFields" :key="limit.key" class="limits-input">
                <label class="form-label text-uppercase text-muted small fw-semibold">{{ limit.label }}</label>
                <input
                  type="number"
                  class="form-control form-control-sm"
                  v-model.number="filters[limit.key]"
                />
              </div>
            </div>
            <button class="btn btn-primary ms-md-auto" type="button" @click="applyFilters">
              Применить
            </button>
          </div>
        </div>
      </section>

      <section class="card shadow-sm planner-card">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row gap-3 align-items-end">
            <div class="d-flex flex-wrap gap-3 align-items-end">
              <div>
                <label class="form-label text-uppercase text-muted small fw-semibold">С строки</label>
                <input
                  type="number"
                  min="1"
                  :max="mockData.length"
                  class="form-control form-control-sm"
                  v-model="rangeFrom"
                />
              </div>
              <div>
                <label class="form-label text-uppercase text-muted small fw-semibold">По строку</label>
                <input
                  type="number"
                  min="1"
                  :max="mockData.length"
                  class="form-control form-control-sm"
                  v-model="rangeTo"
                />
              </div>
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectRange">
                Выделить
              </button>
              <button
                v-if="selectedRowsSize"
                class="btn btn-outline-secondary btn-sm"
                type="button"
                @click="resetSelection"
              >
                Сброс
              </button>
            </div>

            <div class="ms-md-auto d-flex align-items-center gap-3">
              <span class="text-muted small">Выбрано строк: {{ selectedRowsSize }}</span>
              <button
                class="btn btn-success btn-sm"
                type="button"
                :disabled="!selectedRowsSize"
                @click="openShipmentDialog"
              >
                Сформировать отгрузку
              </button>
            </div>
          </div>

          <div class="table-wrapper mt-2">
            <table class="planner-table">
              <thead>
                <tr>
                  <th class="sticky-col index-col">№</th>
                  <th class="sticky-col name-col">Название артикула</th>
                  <th v-for="warehouse in warehouses" :key="warehouse">
                    {{ warehouse }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in mockData"
                  :key="row.id"
                  :class="{ selected: isRowSelected(idx + 1) }"
                  @click="toggleRow(idx + 1)"
                >
                  <td class="sticky-col index-col">{{ idx + 1 }}</td>
                  <td class="sticky-col name-col">{{ row.name }}</td>
                  <td v-for="(quantity, colIdx) in row.warehouses" :key="colIdx" class="text-center">
                    {{ quantity }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <div v-if="dialogOpen" class="planner-modal">
      <div class="planner-modal__backdrop" @click="closeDialog"></div>
      <div class="planner-modal__body card shadow-lg">
        <div class="card-header d-flex align-items-center justify-content-between">
          <div>
            <h5 class="mb-0">
              {{ dialogStep === 1 ? 'Выберите склады для поставки' : 'Выберите склад для отгрузки' }}
            </h5>
            <p class="text-muted small mb-0">
              {{ dialogStep === 1
                ? 'Отметьте один или несколько складов, на которые будет отправлена поставка'
                : 'Укажите, с какого склада будет осуществлена отгрузка' }}
            </p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeDialog">
            Закрыть
          </button>
        </div>

        <div class="card-body">
          <template v-if="dialogStep === 1">
            <div class="d-flex gap-2 mb-3 flex-wrap">
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectAllWarehouses">
                Выделить все
              </button>
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="deselectAllWarehouses">
                Снять все
              </button>
            </div>
            <div class="warehouse-grid">
              <label
                v-for="warehouse in warehouses"
                :key="warehouse"
                class="form-check form-check-inline warehouse-option"
              >
                <input
                  class="form-check-input"
                  type="checkbox"
                  :value="warehouse"
                  :checked="selectedSupplyWarehouses.has(warehouse)"
                  @change="toggleWarehouse(warehouse)"
                >
                <span class="form-check-label">{{ warehouse }}</span>
              </label>
            </div>
          </template>

          <template v-else>
            <div class="shipment-options">
              <label
                v-for="warehouse in shipmentWarehouses"
                :key="warehouse"
                class="form-check shipment-option"
              >
                <input
                  class="form-check-input"
                  type="radio"
                  name="shipmentWarehouse"
                  :value="warehouse"
                  v-model="selectedShipmentWarehouse"
                >
                <span class="form-check-label">{{ warehouse }}</span>
              </label>
            </div>
          </template>
        </div>

        <div class="card-footer d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="dialogStep === 1 ? closeDialog() : backToStepOne()">
            {{ dialogStep === 1 ? 'Отменить' : 'Назад' }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="dialogStep === 1 ? goToStepTwo() : confirmShipment()"
            :disabled="dialogStep === 1 ? !selectedSupplyWarehouses.size : !selectedShipmentWarehouse"
          >
            {{ dialogStep === 1 ? 'Далее' : 'Сформировать' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

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

const warehouses = [
  'Москва, МО и Дальние регионы',
  'Санкт-Петербург и СЗО',
  'Юг',
  'Сибирь',
  'Воронеж',
  'Урал',
  'Казань',
  'Ярославль',
  'Уфа',
  'Кавказ',
  'Дальний Восток',
  'Красноярск',
  'Саратов',
  'Самара',
  'Тюмень',
  'Беларусь',
  'Калининград',
  'Казахстан',
  'Узбекистан',
  'Армения',
  'Кыргызстан',
  'Грузия',
  'Азербайджан',
  'Без кластера'
]

const shipmentWarehouses = ['Склад Москва', 'Склад Санкт-Петербург', 'Склад Казань']

const productNames = [
  'MATCHA,ЦЕНТР-НС',
  'DEFIANT №74',
  'Интрига жидкие гвозди',
  'Покрытие для садовых дорожек',
  'Аэрозоль JOLLY',
  'Аэрозоль Fénix Gloss',
  'Быстросохнущее покрытие',
  'Бронза МЦ-91T',
  'Краска акриловая',
  'Эмаль алкидная',
  'Грунтовка универсальная',
  'Лак паркетный',
  'Шпатлевка финишная',
  'Клей монтажный',
  'Герметик силиконовый',
  'Пена монтажная',
  'Растворитель',
  'Олифа натуральная',
  'Антисептик для дерева',
  'Пропитка влагозащитная'
]

const getRandomQuantity = () => Math.floor(Math.random() * 200)

const generateMockData = () => {
  const data: Array<{ id: number; name: string; warehouses: number[] }> = []
  for (let i = 1; i <= 200; i++) {
    const productName = productNames[Math.floor(Math.random() * productNames.length)]
    data.push({
      id: i,
      name: `${productName} №${i}`,
      warehouses: warehouses.map(() => getRandomQuantity())
    })
  }
  return data
}

const mockData = generateMockData()

const filters = reactive<FilterState>({
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
})

const numericFields: Array<{ key: keyof FilterState; label: string; step?: number }> = [
  { key: 'planningDays', label: 'На сколько дн. планируем' },
  { key: 'analysisPeriod', label: 'Анализируемый период' },
  { key: 'warehouseWeight', label: 'Учитывать вес склада' },
  { key: 'turnoverMin', label: 'Оборачиваемость MIN' },
  { key: 'turnoverMax', label: 'Оборачиваемость MAX' },
  { key: 'specificWeightThreshold', label: 'Если уд. вес <N, то он =', step: 0.01 },
  { key: 'turnoverFromStock', label: 'Оборач. от N остатков' }
] as const

const priceFields: Array<{ key: keyof FilterState; label: string }> = [
  { key: 'priceMin', label: 'Цена MIN' },
  { key: 'priceMax', label: 'Цена MAX' }
] as const

const selectedRows = ref<Set<number>>(new Set())
const rangeFrom = ref('')
const rangeTo = ref('')
const dialogOpen = ref(false)
const dialogStep = ref(1)
const selectedSupplyWarehouses = ref<Set<string>>(new Set(warehouses))
const selectedShipmentWarehouse = ref('')

const selectedRowsSize = computed(() => selectedRows.value.size)

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

const selectRange = () => {
  const from = Number(rangeFrom.value)
  const to = Number(rangeTo.value)
  if (Number.isNaN(from) || Number.isNaN(to) || from < 1 || to > mockData.length || from > to) {
    return
  }
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

const applyFilters = () => {
  console.log('Применение фильтров', { ...filters })
}

const openShipmentDialog = () => {
  if (!selectedRows.value.size) return
  dialogOpen.value = true
  dialogStep.value = 1
}

const closeDialog = () => {
  dialogOpen.value = false
  dialogStep.value = 1
  selectedShipmentWarehouse.value = ''
}

const selectAllWarehouses = () => {
  selectedSupplyWarehouses.value = new Set(warehouses)
}

const deselectAllWarehouses = () => {
  selectedSupplyWarehouses.value = new Set()
}

const toggleWarehouse = (warehouse: string) => {
  const next = new Set(selectedSupplyWarehouses.value)
  if (next.has(warehouse)) {
    next.delete(warehouse)
  } else {
    next.add(warehouse)
  }
  selectedSupplyWarehouses.value = next
}

const goToStepTwo = () => {
  if (!selectedSupplyWarehouses.value.size) return
  dialogStep.value = 2
}

const backToStepOne = () => {
  dialogStep.value = 1
}

const confirmShipment = () => {
  if (!selectedShipmentWarehouse.value) return
  console.log('Создание отгрузки', {
    rows: Array.from(selectedRows.value).sort((a, b) => a - b),
    supplyWarehouses: Array.from(selectedSupplyWarehouses.value),
    shipmentWarehouse: selectedShipmentWarehouse.value
  })
  closeDialog()
  resetSelection()
}

</script>

<style scoped>
.planner {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  /* min-height: calc(100vh - var(--workspace-sticky-offset, 64px)); */
}

.planner-grid {
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



.limits-input {
  min-width: 120px;
}

.table-wrapper {
  max-height: calc(100vh - 175px);
  /* height: calc(100vh - var(--workspace-sticky-offset, 5rem) - 0.5rem); */
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 10px;
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
  /* top: var(--workspace-sticky-offset, 5px); */
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
  z-index: 9;
}

.planner-table tbody .sticky-col {
  z-index: 7;
  background: #fff;
}

.planner-table .index-col {
  left: 0;
  min-width: 60px;
  text-align: center;
}

.planner-table .name-col {
  left: 60px;
  min-width: 260px;
}

.planner-table tbody tr {
  cursor: pointer;
  transition: background 0.15s ease;
}

.planner-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.03);
}

.planner-table tbody tr.selected {
  background-color: rgba(34, 197, 94, 0.15);
}

.planner-table tbody tr.selected .sticky-col {
  background-color: #d9fbe7 !important;
  box-shadow: inset -1px 0 rgba(15, 23, 42, 0.08);
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
  background: rgba(15, 23, 42, 0.4);
}

.planner-modal__body {
  position: relative;
  width: min(800px, 96vw);
  max-height: 90vh;
  overflow: hidden;
}

.warehouse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.warehouse-option {
  padding: 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  background: #f8fafc;
}

.shipment-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shipment-option {
  padding: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
}

.planner-modal__body .card-body {
  overflow-y: auto;
  max-height: 65vh;
}
@media (max-width: 768px) {
  .planner-table .name-col {
    min-width: 200px;
  }
}
</style>
