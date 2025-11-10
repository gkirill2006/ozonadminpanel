<template>
  <div class="planner">
    <section class="card shadow-sm planner-card">
      <div class="card-header">
        <h5 class="mb-0">Фильтры</h5>
      </div>
      <div class="card-body">
        <div class="row g-2">
          <div
            class="col-12 col-md-6 col-lg-4"
            v-for="field in numericFields"
            :key="field.key"
          >
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
                id="showNoNeedPlanner"
                v-model="filters.showNoNeed"
              >
              <label class="form-check-label" for="showNoNeedPlanner">
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
        <div class="mt-2 d-flex flex-column flex-md-row align-items-start gap-2">
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
      <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 class="mb-0">Таблица планирования</h5>
        <span class="text-muted small">Показано {{ plannerRows.length }} SKU</span>
      </div>
      <div class="card-body">
        <div class="planner-table-wrapper">          
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
import { reactive } from 'vue'


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
]

const priceFields: Array<{ key: keyof FilterState; label: string }> = [
  { key: 'priceMin', label: 'Цена MIN' },
  { key: 'priceMax', label: 'Цена MAX' }
]

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

const applyFilters = () => {
  console.log('apply planner filters', { ...filters })
}


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
