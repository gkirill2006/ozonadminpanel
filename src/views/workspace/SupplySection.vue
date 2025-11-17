<template>
  <div class="planner">
    <section class="card shadow-sm planner-card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="mb-0">Поставка</h5>
        <span class="text-muted small">Кластеров: {{ clusterHeaders.length }} · Товаров: {{ products.length }}</span>
      </div>
      <div class="card-body">
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
          <button class="btn btn-primary btn-sm" type="button" @click="fetchPivotData" :disabled="isLoading || !storeId">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
            {{ isLoading ? 'Обновляем...' : 'Обновить' }}
          </button>
          <span v-if="loadError" class="text-danger small">{{ loadError }}</span>
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
                <th class="barcode-col">ШК</th>
                <th class="total-col">Количество, шт</th>
                <th v-for="cluster in clusterHeaders" :key="cluster" class="text-center">
                  {{ cluster }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in products" :key="row.id">
                <td class="sticky-col index-col">{{ idx + 1 }}</td>
                <td class="sticky-col name-col">
                  <div class="d-flex align-items-center gap-2">
                    <img v-if="row.photo" :src="row.photo" alt="photo" class="pivot-photo" />
                    <div class="d-flex flex-column pivot-text">
                      <span class="pivot-name fw-semibold">{{ row.offerId || '—' }}</span>
                      <a
                        v-if="row.link"
                        :href="row.link"
                        target="_blank"
                        rel="noopener"
                        class="small pivot-link"
                      >Ссылка</a>
                    </div>
                  </div>
                </td>
                <td class="barcode-col">{{ row.barcode || '—' }}</td>
                <td class="total-col text-center fw-semibold">{{ formatNumber(row.totalForDelivery) }}</td>
                <td v-for="cluster in clusterHeaders" :key="cluster" class="text-center">
                  {{ formatNumber(row.clusters[cluster]) }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="planner-table-empty">Нет данных для отображения</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { apiService } from '@/services/api'

const props = defineProps<{ storeId: string }>()

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
const products = ref<PivotProduct[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const formatNumber = (value: number | null | undefined) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('ru-RU').format(num)
}

const fetchPivotData = async () => {
  if (!props.storeId) return
  isLoading.value = true
  loadError.value = null
  try {
    const response = await apiService.fetchPlannerPivot(props.storeId)
    const headers = Array.isArray((response as any)?.cluster_headers) ? (response as any).cluster_headers : []
    clusterHeaders.value = headers
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
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (props.storeId) fetchPivotData()
})

watch(
  () => props.storeId,
  (next) => {
    if (!next) return
    products.value = []
    clusterHeaders.value = []
    fetchPivotData()
  }
)
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
  max-width: 200px;
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
</style>
