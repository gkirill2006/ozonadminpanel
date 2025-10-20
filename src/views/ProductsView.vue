<template>
  <div class="products-view">
    <div class="page-header d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-3 mb-4">
      <div>
        <h1 class="mb-1">Товары</h1>
        <p class="text-body-secondary mb-0">Управляйте ассортиментом магазина и добавляйте новые позиции.</p>
      </div>
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
        <div v-if="stores.length" class="store-select-wrapper">
          <label class="form-label mb-1 small text-body-secondary">Магазин</label>
          <select
            class="form-select form-select-sm"
            v-model="localSelectedStoreId"
            :disabled="storesLoading || isSyncingStore"
          >
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.name || 'Без названия' }}
            </option>
          </select>
        </div>
        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="productsLoading"
          @click="refreshProducts"
        >
          <span v-if="productsLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Обновить
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!localSelectedStoreId || isCreatingProduct"
          @click="toggleProductForm"
        >
          <span v-if="isCreatingProduct" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ showProductForm ? 'Скрыть форму' : 'Добавить товар' }}
        </button>
      </div>
    </div>

    <div v-if="storesLoading && !stores.length" class="card border-0 shadow-sm">
      <div class="card-body py-5 d-flex justify-content-center align-items-center gap-2">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span>Загружаем магазины…</span>
      </div>
    </div>

    <div v-else-if="storesError && !stores.length" class="alert alert-danger" role="alert">
      {{ storesError }}
    </div>

    <div v-else-if="!localSelectedStoreId" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <h3 class="mb-3">Нет доступных магазинов</h3>
        <p class="text-body-secondary mb-0">Создайте магазин, чтобы начать добавлять товары.</p>
      </div>
    </div>

    <template v-else>
      <div v-if="showProductForm" class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Новый товар</h5>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="resetProductForm" :disabled="isCreatingProduct">
            Отмена
          </button>
        </div>
        <div class="card-body">
          <form class="product-form" @submit.prevent="submitProduct">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">Название<span class="text-danger">*</span></label>
                <input
                  v-model.trim="productForm.name"
                  type="text"
                  class="form-control"
                  placeholder="Например, Фирменная пицца"
                  required
                />
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Цена<span class="text-danger">*</span></label>
                <input
                  v-model.trim="productForm.price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control"
                  placeholder="750.00"
                  required
                />
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Раздел каталога</label>
                <div class="d-flex gap-2">
                  <select v-model="productForm.section" class="form-select">
                    <option value="">Без раздела</option>
                    <option v-for="section in sectionOptions" :key="section.value" :value="section.value">
                      {{ section.label }}
                    </option>
                  </select>
                  <button type="button" class="btn btn-outline-secondary" @click="toggleSectionForm" :disabled="sectionCreating">
                    <span class="d-flex align-items-center">
                      <span class="me-1">+</span>
                      <span class="d-none d-xl-inline">Раздел</span>
                    </span>
                  </button>
                </div>
                <div v-if="sectionsLoading" class="form-text">Загружаем разделы…</div>
                <div v-else-if="sectionsError" class="text-danger small mt-2">{{ sectionsError }}</div>
              </div>

              <div class="col-12 col-md-3">
                <label class="form-label">Цена до скидки</label>
                <input
                  v-model.trim="productForm.compare_at_price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control"
                  placeholder="900.00"
                />
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Валюта</label>
                <input
                  v-model.trim="productForm.price_currency"
                  type="text"
                  class="form-control text-uppercase"
                  placeholder="RUB"
                  maxlength="3"
                />
              </div>

              <div class="col-12">
                <label class="form-label">Изображения</label>
                <input
                  ref="imageInputRef"
                  class="form-control"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="handleImageSelect"
                />
                <small class="text-body-secondary">До {{ MAX_PRODUCT_IMAGES }} файлов, первый будет обложкой.</small>

                <div v-if="productImages.length" class="product-images-preview">
                  <div
                    v-for="(image, index) in productImages"
                    :key="image.previewUrl"
                    class="image-thumb"
                  >
                    <img :src="image.previewUrl" alt="Превью изображения" />
                    <button
                      type="button"
                      class="btn btn-sm btn-light remove-image-btn"
                      aria-label="Удалить изображение"
                      @click="removeSelectedImage(index)"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div class="text-body-secondary small mt-1" v-else>
                  Изображения пока не выбраны.
                </div>
                <div v-if="imageUploadError" class="text-danger small mt-2">{{ imageUploadError }}</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Подзаголовок</label>
                <input v-model.trim="productForm.subtitle" type="text" class="form-control" placeholder="Например, 32 см" />
              </div>
              <div class="col-12">
                <label class="form-label">Описание</label>
                <textarea v-model.trim="productForm.description" class="form-control" rows="3" placeholder="Расскажите клиентам о товаре"></textarea>
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">SKU / Артикул</label>
                <input v-model.trim="productForm.sku" type="text" class="form-control" placeholder="PZ-001" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Единица измерения</label>
                <select v-model="productForm.unit" class="form-select">
                  <option v-for="unit in unitOptions" :key="unit.value" :value="unit.value">
                    {{ unit.label }}
                  </option>
                </select>
              </div>
              <div class="col-12 col-md-4" v-if="productForm.unit === 'custom'">
                <label class="form-label">Своя единица<span class="text-danger">*</span></label>
                <input v-model.trim="productForm.custom_unit" type="text" class="form-control" placeholder="Например, коробка" required />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Количество на складе</label>
                <input v-model.trim="productForm.stock_quantity" type="number" min="0" step="1" class="form-control" placeholder="10" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Ед. измерения остатка</label>
                <input v-model.trim="productForm.stock_unit" type="text" class="form-control" placeholder="piece" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Старт предзаказа</label>
                <input v-model="productForm.preorder_start" type="datetime-local" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Конец предзаказа</label>
                <input v-model="productForm.preorder_end" type="datetime-local" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Дата доступности</label>
                <input v-model="productForm.availability_date" type="datetime-local" class="form-control" />
              </div>
            </div>

            <div class="row g-3 mt-1">
              <div class="col-12 col-md-4">
                <div class="form-check">
                  <input id="is-available" v-model="productForm.is_available" class="form-check-input" type="checkbox" />
                  <label class="form-check-label" for="is-available">В наличии</label>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="form-check">
                  <input id="allow-preorders" v-model="productForm.allow_preorders" class="form-check-input" type="checkbox" />
                  <label class="form-check-label" for="allow-preorders">Разрешить предзаказ</label>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="form-check">
                  <input id="requires-prepayment" v-model="productForm.requires_prepayment" class="form-check-input" type="checkbox" />
                  <label class="form-check-label" for="requires-prepayment">Требуется предоплата</label>
                </div>
              </div>
            </div>

            <div class="row g-3 mt-1" v-if="productForm.requires_prepayment">
              <div class="col-12 col-md-4">
                <label class="form-label">Сумма предоплаты<span class="text-danger">*</span></label>
                <input v-model.trim="productForm.prepayment_amount" type="number" min="0" step="0.01" class="form-control" placeholder="200.00" />
              </div>
            </div>

            <div class="mt-4 d-flex flex-column flex-sm-row gap-2">
              <button type="submit" class="btn btn-primary" :disabled="isCreatingProduct || !isProductFormValid">
                <span v-if="isCreatingProduct" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Сохранить товар
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="resetProductForm" :disabled="isCreatingProduct">
                Отменить
              </button>
            </div>

            <div v-if="productCreateError" class="alert alert-danger mt-3 mb-0" role="alert">
              {{ productCreateError }}
            </div>
            <div v-if="productCreateSuccess" class="alert alert-success mt-3 mb-0" role="alert">
              {{ productCreateSuccess }}
            </div>
          </form>
        </div>
      </div>

      <div v-if="showSectionForm" class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Новый раздел каталога</h5>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleSectionForm" :disabled="sectionCreating">
            Закрыть
          </button>
        </div>
        <div class="card-body">
          <form class="section-form" @submit.prevent="submitSection">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">Название раздела<span class="text-danger">*</span></label>
                <input v-model.trim="sectionForm.name" type="text" class="form-control" placeholder="Например, Пицца" required />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Родительский раздел</label>
                <select v-model="sectionForm.parent" class="form-select">
                  <option value="">Корневой раздел</option>
                  <option v-for="section in sectionOptions" :key="section.value" :value="section.value">
                    {{ section.label }}
                  </option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Описание</label>
                <textarea v-model.trim="sectionForm.description" class="form-control" rows="2"></textarea>
              </div>
            </div>
            <div class="mt-4 d-flex flex-column flex-sm-row gap-2">
              <button type="submit" class="btn btn-primary" :disabled="sectionCreating || !sectionForm.name.trim()">
                <span v-if="sectionCreating" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Создать раздел
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="toggleSectionForm" :disabled="sectionCreating">
                Отменить
              </button>
            </div>
            <div v-if="sectionCreateError" class="alert alert-danger mt-3 mb-0" role="alert">
              {{ sectionCreateError }}
            </div>
            <div v-if="sectionCreateSuccess" class="alert alert-success mt-3 mb-0" role="alert">
              {{ sectionCreateSuccess }}
            </div>
          </form>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Ассортимент</h5>
          <span v-if="productsDisplay.length" class="text-body-secondary small">{{ productsDisplay.length }} {{ productsDisplay.length === 1 ? 'товар' : 'товара' }}</span>
        </div>
        <div class="card-body p-0">
          <div v-if="productsLoading" class="py-5 text-center">
            <span class="spinner-border" role="status" aria-hidden="true"></span>
            <p class="mt-3 mb-0 text-body-secondary">Загружаем товары…</p>
          </div>
          <div v-else-if="productsError" class="p-4">
            <div class="alert alert-danger mb-0" role="alert">{{ productsError }}</div>
          </div>
          <div v-else-if="!productsDisplay.length" class="py-5 text-center px-4">
            <h5 class="mb-2">Товаров пока нет</h5>
            <p class="text-body-secondary mb-3">Добавьте первую позицию, чтобы покупатели увидели ассортимент магазина.</p>
            <button type="button" class="btn btn-primary" @click="forceOpenProductForm">Добавить товар</button>
          </div>
          <div v-else class="table-responsive scrollbar">
            <table class="table table-sm fs-9 mb-0 product-table">
              <thead class="bg-body-tertiary text-body-tertiary text-uppercase fw-semibold">
                <tr>
                  <th scope="col" class="px-2" style="width: 2.5rem;">
                    <div class="form-check mb-0 fs-8">
                      <input class="form-check-input" type="checkbox" disabled />
                    </div>
                  </th>
                  <th scope="col" class="text-nowrap">Фото</th>
                  <th scope="col" class="text-nowrap">Товар</th>
                  <th scope="col" class="text-end text-nowrap">Цена</th>
                  <th scope="col" class="text-nowrap">Раздел</th>
                  <th scope="col" class="text-center text-nowrap">Статус</th>
                  <th scope="col" class="text-end text-nowrap">ID</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in productsDisplay" :key="product.id" class="position-static">
                  <td class="fs-9 align-middle px-2">
                    <div class="form-check mb-0 fs-8">
                      <input class="form-check-input" type="checkbox" disabled />
                    </div>
                  </td>
                  <td class="align-middle white-space-nowrap py-2">
                    <div class="product-thumb border border-translucent rounded-2 overflow-hidden" :class="{ 'thumb-placeholder': !product.firstImageUrl }">
                      <img v-if="product.firstImageUrl" :src="product.firstImageUrl" alt="Изображение товара" />
                      <span v-else class="text-body-tertiary">Нет</span>
                    </div>
                  </td>
                  <td class="product align-middle ps-4">
                    <div class="fw-semibold text-body">{{ product.name }}</div>
                    <div v-if="product.subtitle" class="text-body-secondary line-clamp-2 fs-9 mt-1">{{ product.subtitle }}</div>
                    <div v-if="product.sku" class="text-body-quaternary fs-10 mt-1">SKU: {{ product.sku }}</div>
                  </td>
                  <td class="price align-middle text-end fw-semibold text-body ps-4">
                    {{ formatPrice(product.price, product.price_currency) }}
                    <div v-if="product.compare_at_price" class="text-body-quaternary fs-10 text-decoration-line-through mt-1">
                      {{ formatPrice(product.compare_at_price, product.price_currency) }}
                    </div>
                  </td>
                  <td class="category align-middle text-body-secondary ps-4">
                    <span v-if="product.sectionDisplay">{{ product.sectionDisplay }}</span>
                    <span v-else class="text-body-tertiary">Без раздела</span>
                  </td>
                  <td class="align-middle text-center ps-4">
                    <span
                      v-if="product.is_available"
                      class="badge badge-phoenix badge-phoenix-success-subtle align-middle"
                    >В наличии</span>
                    <span
                      v-else
                      class="badge badge-phoenix badge-phoenix-secondary-subtle align-middle"
                    >Нет на складе</span>
                    <span
                      v-if="product.allow_preorders"
                      class="badge badge-phoenix badge-phoenix-primary-subtle align-middle ms-2"
                    >Предзаказ</span>
                  </td>
                  <td class="align-middle text-end pe-1 ps-4">
                    <code class="text-body-tertiary">{{ product.id }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useStoresStore } from '@/stores/stores'
import { apiService } from '@/services/api'

interface CatalogSection {
  id: number
  name: string
  parent: number | null
  description?: string | null
}

interface ProductImageInfo {
  id: number | string
  url: string
  alt_text?: string | null
  position?: number | null
}

interface ProductListItem {
  id: number | string
  name: string
  subtitle?: string | null
  price: string
  compare_at_price?: string | null
  price_currency?: string | null
  section?: number | null | string
  section_name?: string | null
  existing_images?: ProductImageInfo[]
  is_available?: boolean
  allow_preorders?: boolean
  sku?: string | null
  description?: string | null
  unit?: string | null
  custom_unit?: string | null
  stock_quantity?: string | number | null
  stock_unit?: string | null
  preorder_start?: string | null
  preorder_end?: string | null
  availability_date?: string | null
  requires_prepayment?: boolean
  prepayment_amount?: string | number | null
}

interface ProductDisplayItem extends ProductListItem {
  sectionDisplay: string | null
  firstImageUrl: string | null
}

interface SelectedImage {
  file: File
  previewUrl: string
}

const router = useRouter()
const route = useRoute()
const storesStore = useStoresStore()
const { stores, isLoading: storesLoading, error: storesError, activeStoreId } = storeToRefs(storesStore)

const localSelectedStoreId = ref<string | null>(null)
const isSyncingStore = ref(false)
const products = ref<ProductListItem[]>([])
const productsLoading = ref(false)
const productsError = ref<string | null>(null)
const sections = ref<CatalogSection[]>([])
const sectionsLoading = ref(false)
const sectionsError = ref<string | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const productImages = ref<SelectedImage[]>([])
const imageUploadError = ref<string | null>(null)
const showProductForm = ref(false)
const showSectionForm = ref(false)
const isCreatingProduct = ref(false)
const productCreateError = ref<string | null>(null)
const productCreateSuccess = ref<string | null>(null)
const sectionCreating = ref(false)
const sectionCreateError = ref<string | null>(null)
const sectionCreateSuccess = ref<string | null>(null)
const isEditingProduct = ref(false)
const editingProductId = ref<string | number | null>(null)
const editingExistingImages = ref<ProductImageInfo[]>([])

let productsRequestToken = 0
let sectionsRequestToken = 0
const MAX_PRODUCT_IMAGES = 6

const unitOptions = [
  { value: 'piece', label: 'Шт.' },
  { value: 'set', label: 'Набор' },
  { value: 'kg', label: 'Килограмм' },
  { value: 'g', label: 'Грамм' },
  { value: 'l', label: 'Литр' },
  { value: 'ml', label: 'Миллилитр' },
  { value: 'hour', label: 'Часы' },
  { value: 'service', label: 'Услуга' },
  { value: 'custom', label: 'Своя единица' }
]

const productForm = reactive({
  name: '',
  price: '',
  section: '',
  subtitle: '',
  description: '',
  sku: '',
  unit: 'piece',
  custom_unit: '',
  compare_at_price: '',
  price_currency: '',
  stock_quantity: '',
  stock_unit: '',
  is_available: true,
  allow_preorders: false,
  preorder_start: '',
  preorder_end: '',
  availability_date: '',
  requires_prepayment: false,
  prepayment_amount: ''
})

const sectionForm = reactive({
  name: '',
  parent: '',
  description: ''
})

const sectionOptions = computed(() => {
  if (!sections.value.length) return []
  const buildLabel = (section: CatalogSection) => {
    const segments: string[] = [section.name]
    let currentParent = section.parent
    let guard = 0
    while (currentParent !== null && guard < 10) {
      guard += 1
      const parentSection = sections.value.find((item) => item.id === currentParent)
      if (!parentSection) break
      segments.unshift(parentSection.name)
      currentParent = parentSection.parent
    }
    return segments.join(' / ')
  }
  return sections.value.map((section) => ({ value: String(section.id), label: buildLabel(section) }))
})

const sectionNameMap = computed<Record<number, string>>(() => {
  return sections.value.reduce((acc, section) => {
    acc[section.id] = section.name
    return acc
  }, {} as Record<number, string>)
})

const productsDisplay = computed<ProductDisplayItem[]>(() => {
  return products.value.map((product) => {
    const rawId = product.section
    const sectionId = typeof rawId === 'number' ? rawId : Number(rawId)
    const sectionDisplay = product.section_name && product.section_name.trim().length
      ? product.section_name
      : Number.isNaN(sectionId)
        ? null
        : sectionNameMap.value[sectionId] ?? null

    const firstImageUrl = Array.isArray(product.existing_images) && product.existing_images.length
      ? normalizeImageUrl(product.existing_images[0]?.url || null)
      : null

    return {
      ...product,
      sectionDisplay,
      firstImageUrl
    }
  })
})

const isProductFormValid = computed(() => {
  const name = typeof productForm.name === 'string' ? productForm.name : String(productForm.name ?? '')
  const priceValue = productForm.price
  const price = typeof priceValue === 'number' ? String(priceValue) : String(priceValue ?? '')
  const customUnit = typeof productForm.custom_unit === 'string'
    ? productForm.custom_unit
    : String(productForm.custom_unit ?? '')
  const prepayment = typeof productForm.prepayment_amount === 'string'
    ? productForm.prepayment_amount
    : String(productForm.prepayment_amount ?? '')

  if (!name.trim()) return false
  if (!price.trim()) return false
  if (productForm.unit === 'custom' && !customUnit.trim()) return false
  if (productForm.requires_prepayment && !prepayment.trim()) return false
  return true
})

const normalizeImageUrl = (value: string | null | undefined) => {
  if (!value) return null
  try {
    const parsed = new URL(value, window.location.origin)
    const encodedPath = parsed.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/')
    parsed.pathname = encodedPath
    return parsed.toString()
  } catch (error) {
    try {
      const parsedRelative = value.startsWith('/') ? new URL(value, window.location.origin) : new URL(`${window.location.origin.replace(/\/$/, '')}/${value.replace(/^\//, '')}`)
      const encodedPath = parsedRelative.pathname
        .split('/')
        .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
        .join('/')
      parsedRelative.pathname = encodedPath
      return parsedRelative.toString()
    } catch {
      return value.replace(/ /g, '%20')
    }
  }
}

const formatIsoForInput = (value: string | null | undefined) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => num.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const toStringValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : String(value)
}

const populateProductForm = (product: ProductListItem) => {
  productForm.name = product.name ?? ''
  productForm.price = toStringValue(product.price)
  productForm.section = product.section ? String(product.section) : ''
  productForm.subtitle = product.subtitle ?? ''
  productForm.description = product.description ?? ''
  productForm.sku = product.sku ?? ''
  productForm.unit = product.unit ?? 'piece'
  productForm.custom_unit = product.custom_unit ?? ''
  productForm.compare_at_price = toStringValue(product.compare_at_price)
  productForm.price_currency = product.price_currency ?? ''
  productForm.stock_quantity = toStringValue(product.stock_quantity)
  productForm.stock_unit = product.stock_unit ?? ''
  productForm.is_available = product.is_available ?? true
  productForm.allow_preorders = product.allow_preorders ?? false
  productForm.preorder_start = formatIsoForInput(product.preorder_start)
  productForm.preorder_end = formatIsoForInput(product.preorder_end)
  productForm.availability_date = formatIsoForInput(product.availability_date)
  productForm.requires_prepayment = product.requires_prepayment ?? false
  productForm.prepayment_amount = toStringValue(product.prepayment_amount)
}

const existingImagesPreview = computed(() => {
  return editingExistingImages.value.map((image) => ({
    ...image,
    url: normalizeImageUrl(image.url)
  }))
})

const clearSelectedImages = () => {
  productImages.value.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  productImages.value = []
  if (imageInputRef.value) {
    imageInputRef.value.value = ''
  }
  imageUploadError.value = null
}

const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const files = Array.from(target?.files ?? [])
  if (!files.length) return

  let availableSlots = MAX_PRODUCT_IMAGES - productImages.value.length
  let limitSkipped = 0
  let typeSkipped = 0

  files.forEach((file) => {
    if (availableSlots <= 0) {
      limitSkipped += 1
      return
    }

    if (!file.type.startsWith('image/')) {
      typeSkipped += 1
      return
    }

    const previewUrl = URL.createObjectURL(file)
    productImages.value.push({ file, previewUrl })
    availableSlots -= 1
  })

  if (limitSkipped || typeSkipped) {
    const parts: string[] = []
    if (limitSkipped) {
      parts.push(`ограничение в ${MAX_PRODUCT_IMAGES} изображений`)
    }
    if (typeSkipped) {
      parts.push('поддерживаются только файлы изображений')
    }
    imageUploadError.value = `Некоторые файлы не были добавлены: ${parts.join('; ')}.`
  } else {
    imageUploadError.value = null
  }

  if (target) {
    target.value = ''
  }
}

const removeSelectedImage = (index: number) => {
  if (index < 0 || index >= productImages.value.length) return
  const [removed] = productImages.value.splice(index, 1)
  if (removed) {
    URL.revokeObjectURL(removed.previewUrl)
  }
  imageUploadError.value = null
}

const ensureSelectedStore = (): string | null => {
  const queryStore = typeof route.query.store === 'string' ? route.query.store : null
  const existingIds = stores.value.map((store) => store.id)

  let nextStoreId: string | null = null

  if (queryStore && existingIds.includes(queryStore)) {
    nextStoreId = queryStore
  } else if (activeStoreId.value && existingIds.includes(activeStoreId.value)) {
    nextStoreId = activeStoreId.value
  } else if (localSelectedStoreId.value && existingIds.includes(localSelectedStoreId.value)) {
    nextStoreId = localSelectedStoreId.value
  } else if (existingIds.length) {
    nextStoreId = existingIds[0]
  } else {
    nextStoreId = null
  }

  if (localSelectedStoreId.value !== nextStoreId) {
    localSelectedStoreId.value = nextStoreId
  }

  return nextStoreId
}

const syncRouteWithStore = async (storeId: string | null) => {
  const currentQueryStore = typeof route.query.store === 'string' ? route.query.store : null
  if (storeId === currentQueryStore) return
  if (!storeId && !currentQueryStore) return

  try {
    isSyncingStore.value = true
    if (storeId) {
      await router.replace({ query: { ...route.query, store: storeId } })
    } else {
      const { store, ...rest } = route.query
      await router.replace({ query: rest })
    }
  } catch (error) {
    console.error('Не удалось синхронизировать маршрут с магазином', error)
  } finally {
    isSyncingStore.value = false
  }
}

let lastHandledStoreId: string | null = null

const handleStoreChange = async (storeId: string | null) => {
  const previousStoreId = lastHandledStoreId
  if (storeId === previousStoreId) return
  lastHandledStoreId = storeId

  if (previousStoreId && storeId !== previousStoreId) {
    resetProductForm()
    showSectionForm.value = false
    sectionForm.name = ''
    sectionForm.parent = ''
    sectionForm.description = ''
    sectionCreateError.value = null
    sectionCreateSuccess.value = null
    sectionCreating.value = false
  }

  if (!storeId) {
    resetProductForm()
    showSectionForm.value = false
    sectionCreating.value = false
  }

  await syncRouteWithStore(storeId)
  storesStore.setActiveStoreId(storeId)

  if (storeId) {
    await Promise.all([fetchSections(storeId), fetchProducts(storeId)])
  } else {
    products.value = []
    sections.value = []
  }
}

const fetchProducts = async (storeId: string) => {
  productsRequestToken += 1
  const token = productsRequestToken
  productsLoading.value = true
  productsError.value = null

  try {
    const data = await apiService.getProducts({ store: storeId })
    const list = Array.isArray(data) ? data : data?.results ?? []
    const normalized = Array.isArray(list)
      ? list.map((item: any) => ({
          ...item,
          section_name: item.section?.name || item.section?.title || item.section_name || null,
          section: typeof item.section === 'object' ? item.section?.id ?? null : item.section ?? null,
          existing_images: Array.isArray(item.existing_images) ? item.existing_images : []
        }))
      : []
    if (token === productsRequestToken) {
      products.value = normalized as ProductListItem[]
    }
  } catch (error: unknown) {
    if (token === productsRequestToken) {
      productsError.value = error instanceof Error ? error.message : 'Не удалось загрузить товары'
      products.value = []
    }
  } finally {
    if (token === productsRequestToken) {
      productsLoading.value = false
    }
  }
}

const fetchSections = async (storeId: string) => {
  sectionsRequestToken += 1
  const token = sectionsRequestToken
  sectionsLoading.value = true
  sectionsError.value = null

  try {
    const data = await apiService.getCatalogSections({ store: storeId })
    const list = Array.isArray(data) ? data : data?.results ?? []
    if (token === sectionsRequestToken) {
      sections.value = list as CatalogSection[]
    }
  } catch (error: unknown) {
    if (token === sectionsRequestToken) {
      sectionsError.value = error instanceof Error ? error.message : 'Не удалось загрузить разделы'
      sections.value = []
    }
  } finally {
    if (token === sectionsRequestToken) {
      sectionsLoading.value = false
    }
  }
}

const refreshProducts = () => {
  if (!localSelectedStoreId.value) return
  fetchProducts(localSelectedStoreId.value)
}

const toggleProductForm = () => {
  if (showProductForm.value) {
    resetProductForm()
    return
  }
  productCreateError.value = null
  productCreateSuccess.value = null
  imageUploadError.value = null
  showProductForm.value = true
}

const forceOpenProductForm = () => {
  if (!showProductForm.value) {
    productCreateError.value = null
    productCreateSuccess.value = null
    imageUploadError.value = null
    showProductForm.value = true
  }
}

const resetProductForm = () => {
  productForm.name = ''
  productForm.price = ''
  productForm.section = ''
  productForm.subtitle = ''
  productForm.description = ''
  productForm.sku = ''
  productForm.unit = 'piece'
  productForm.custom_unit = ''
  productForm.compare_at_price = ''
  productForm.price_currency = ''
  productForm.stock_quantity = ''
  productForm.stock_unit = ''
  productForm.is_available = true
  productForm.allow_preorders = false
  productForm.preorder_start = ''
  productForm.preorder_end = ''
  productForm.availability_date = ''
  productForm.requires_prepayment = false
  productForm.prepayment_amount = ''
  productCreateError.value = null
  productCreateSuccess.value = null
  imageUploadError.value = null
  clearSelectedImages()
  isCreatingProduct.value = false
  showProductForm.value = false
}

const submitProduct = async () => {
  if (!localSelectedStoreId.value || !isProductFormValid.value) return
  isCreatingProduct.value = true
  productCreateError.value = null
  productCreateSuccess.value = null

  const formData = new FormData()
  const toIsoString = (value: string) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  }

  const toStringValue = (value: unknown) => {
    if (value === null || value === undefined) return ''
    return typeof value === 'string' ? value : String(value)
  }

  const appendIfNotEmpty = (key: string, value: unknown) => {
    const stringValue = toStringValue(value).trim()
    if (stringValue) {
      formData.append(key, stringValue)
    }
  }

  formData.append('store', localSelectedStoreId.value)
  formData.append('name', toStringValue(productForm.name).trim())
  formData.append('price', toStringValue(productForm.price).trim())
  formData.append('is_available', productForm.is_available ? 'true' : 'false')
  formData.append('allow_preorders', productForm.allow_preorders ? 'true' : 'false')
  formData.append('requires_prepayment', productForm.requires_prepayment ? 'true' : 'false')

  if (productForm.section) formData.append('section', toStringValue(productForm.section))
  appendIfNotEmpty('subtitle', productForm.subtitle)
  appendIfNotEmpty('description', productForm.description)
  appendIfNotEmpty('sku', productForm.sku)
  if (productForm.unit) formData.append('unit', productForm.unit)
  if (productForm.unit === 'custom') {
    appendIfNotEmpty('custom_unit', productForm.custom_unit)
  }
  appendIfNotEmpty('compare_at_price', productForm.compare_at_price)
  const currency = toStringValue(productForm.price_currency).trim()
  if (currency) {
    formData.append('price_currency', currency.toUpperCase())
  }
  appendIfNotEmpty('stock_quantity', productForm.stock_quantity)
  appendIfNotEmpty('stock_unit', productForm.stock_unit)

  const preorderStartIso = toIsoString(productForm.preorder_start)
  const preorderEndIso = toIsoString(productForm.preorder_end)
  const availabilityIso = toIsoString(productForm.availability_date)

  if (preorderStartIso) formData.append('preorder_start', preorderStartIso)
  if (preorderEndIso) formData.append('preorder_end', preorderEndIso)
  if (availabilityIso) formData.append('availability_date', availabilityIso)

  if (productForm.requires_prepayment) {
    appendIfNotEmpty('prepayment_amount', productForm.prepayment_amount)
  }

  productImages.value.forEach((item) => {
    formData.append('images', item.file)
  })

  try {
    const created = await apiService.createProduct(formData)
    productCreateSuccess.value = 'Товар создан'
    if (created?.id) {
      await fetchProducts(localSelectedStoreId.value)
    }
    setTimeout(() => {
      resetProductForm()
    }, 1200)
  } catch (error: unknown) {
    productCreateError.value = error instanceof Error ? error.message : 'Не удалось создать товар'
  } finally {
    isCreatingProduct.value = false
  }
}

const toggleSectionForm = () => {
  showSectionForm.value = !showSectionForm.value
  if (!showSectionForm.value) {
    sectionForm.name = ''
    sectionForm.parent = ''
    sectionForm.description = ''
    sectionCreateError.value = null
    sectionCreateSuccess.value = null
  }
}

const submitSection = async () => {
  if (!localSelectedStoreId.value || !sectionForm.name.trim()) return
  sectionCreating.value = true
  sectionCreateError.value = null
  sectionCreateSuccess.value = null

  const payload: Record<string, any> = {
    store: localSelectedStoreId.value,
    name: sectionForm.name.trim(),
    parent: sectionForm.parent ? Number(sectionForm.parent) : null
  }

  if (sectionForm.description.trim()) payload.description = sectionForm.description.trim()

  try {
    const created = await apiService.createCatalogSection(payload)
    sectionCreateSuccess.value = 'Раздел добавлен'
    await fetchSections(localSelectedStoreId.value)
    if (created?.id) {
      productForm.section = String(created.id)
    }
    setTimeout(() => {
      toggleSectionForm()
    }, 800)
  } catch (error: unknown) {
    sectionCreateError.value = error instanceof Error ? error.message : 'Не удалось создать раздел'
  } finally {
    sectionCreating.value = false
  }
}

const formatPrice = (value: string | number | null | undefined, currency?: string | null) => {
  if (value === null || value === undefined) return '—'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) return String(value)
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  return formatter.format(numeric)
}

watch(
  () => route.query.store,
  () => {
    const nextStoreId = ensureSelectedStore()
    void handleStoreChange(nextStoreId)
  }
)

watch(
  () => stores.value.map((store) => store.id).join(','),
  () => {
    const nextStoreId = ensureSelectedStore()
    void handleStoreChange(nextStoreId)
  }
)

watch(
  () => localSelectedStoreId.value,
  (storeId, previous) => {
    if (storeId === previous) return
    void handleStoreChange(storeId)
  }
)

onMounted(async () => {
  if (!stores.value.length && !storesLoading.value) {
    await storesStore.fetchStores()
  }
  const initialStoreId = ensureSelectedStore()
  await handleStoreChange(initialStoreId)
})

onBeforeUnmount(() => {
  clearSelectedImages()
})
</script>

<style scoped>
.products-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.store-select-wrapper {
  min-width: 220px;
}

.product-form .form-select,
.product-form .form-control {
  min-height: 38px;
}

.product-images-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.image-thumb {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  background: #f8f9fa;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  line-height: 1;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-table thead th {
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}

.product-thumb {
  width: 53px;
  height: 53px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-thumb.thumb-placeholder {
  background: #f1f3f5;
  color: var(--phoenix-body-color-secondary, #6c757d);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.table-responsive {
  max-height: 520px;
  overflow-y: auto;
}
</style>
