<template>
  <div class="store-settings-page" v-if="isStoreLoading">
    <div class="card border-0 shadow-sm">
      <div class="card-body py-5 d-flex justify-content-center align-items-center gap-2">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span>Загрузка магазина...</span>
      </div>
    </div>
  </div>
  <div v-else-if="storeError" class="store-settings-page">
    <div class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
      <span>{{ storeError }}</span>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="retryFetch">Повторить</button>
    </div>
  </div>
  <div v-else-if="!currentStoreId" class="store-settings-page">
    <div class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <h3 class="mb-3">Магазин не найден</h3>
        <p class="text-body-secondary mb-4">Создайте магазин на дэшборде, чтобы перейти к настройкам.</p>
        <button type="button" class="btn btn-primary" @click="goToDashboard">Вернуться на главную</button>
      </div>
    </div>
  </div>
  <div v-else class="store-settings-page">
    <div class="store-settings-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h1 class="store-settings-title mb-1">Настройки магазина</h1>
        <p class="store-settings-subtitle mb-0">Управляйте основными параметрами вашего магазина</p>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="goToOverview">
          ← Обзор
        </button>
      </div>
    </div>

    <div class="store-settings-accordion">
      <!-- Базовая информация -->
      <section class="settings-section" :class="{ open: openSections.basic }">
        <button type="button" class="settings-section__toggle" @click="toggleSection('basic')">
          <span class="settings-section__icon"><i data-feather="store"></i></span>
          <span class="settings-section__title">Основная информация</span>
          <span class="settings-section__chevron" :class="{ rotated: openSections.basic }"><i data-feather="chevron-down"></i></span>
        </button>
        <transition name="settings-collapse">
          <div v-show="openSections.basic" class="settings-section__content">
            <div class="settings-card">
              <div class="settings-card__header">
                <span class="settings-card__title">Тип бизнеса</span>
              </div>
              <div class="settings-card__body">
                <template v-if="storeDetail?.business_type">
                  <p class="mb-1">Тип: <strong>{{ businessTypeLabel }}</strong></p>
                  <p class="text-body-secondary mb-0 small">Тип выбран и изменить его нельзя.</p>
                </template>
                <template v-else>
                  <p class="text-body-secondary">Выберите, что вы предлагаете клиентам. После выбора изменить тип нельзя.</p>
                  <div class="business-type-options mb-3">
                    <button
                      v-for="type in businessTypes"
                      :key="type.value"
                      type="button"
                      class="type-chip"
                      :class="{ active: selectedBusinessType === type.value }"
                      :disabled="typeSaveLoading"
                      @click="selectedBusinessType = type.value"
                    >
                      {{ type.label }}
                    </button>
                  </div>
                  <div v-if="businessTypesLoading" class="text-body-secondary small">Загружаем типы бизнеса…</div>
                  <div v-else-if="businessTypesError" class="alert alert-danger" role="alert">{{ businessTypesError }}</div>
                  <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="typeSaveLoading || !selectedBusinessType"
                    @click="saveBusinessType"
                  >
                    <span v-if="typeSaveLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Сохранить тип
                  </button>
                  <div v-if="typeSaveError" class="alert alert-danger mt-3 mb-0" role="alert">
                    {{ typeSaveError }}
                  </div>
                </template>
              </div>
            </div>

            <div v-if="storeDetail?.business_type" class="settings-card">
              <div class="settings-card__header">
                <span class="settings-card__title">Категория витрины</span>
              </div>
              <div class="settings-card__body">
                <div class="row g-3">
                  <div class="col-12 col-md-6">
                    <label class="form-label">Категория</label>
                    <select
                      class="form-select"
                      v-model="selectedCategoryId"
                      :disabled="categoriesLoading || categorySaveLoading"
                      @change="handleCategorySelect"
                    >
                      <option value="">Указать свою</option>
                      <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                        {{ category.name }}
                      </option>
                    </select>
                    <div v-if="categoriesLoading" class="text-body-secondary small mt-2">Загружаем возможные категории…</div>
                    <div v-else-if="categoriesError" class="text-danger small mt-2">{{ categoriesError }}</div>
                  </div>
                  <div class="col-12 col-md-6">
                    <label class="form-label">Своя категория</label>
                    <input
                      v-model="customCategoryValue"
                      type="text"
                      class="form-control"
                      placeholder="Например, Авторские изделия"
                      :disabled="categorySaveLoading"
                      @input="handleCustomCategoryInput"
                    />
                    <small class="text-body-secondary">Оставьте пустым, если выбрали категорию из списка.</small>
                  </div>
                </div>
                <div class="mt-3 d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
                  <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="categorySaveLoading"
                    @click="saveCategory"
                  >
                    <span v-if="categorySaveLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Сохранить категорию
                  </button>
                  <span v-if="categorySaveMessage" class="text-success small">{{ categorySaveMessage }}</span>
                </div>
                <div v-if="categorySaveError" class="alert alert-danger mt-3 mb-0" role="alert">
                  {{ categorySaveError }}
                </div>
              </div>
            </div>

            <div v-if="storeDetail?.business_type" class="settings-card">
              <div class="settings-card__header">
                <span class="settings-card__title">Основная информация</span>
              </div>
              <div class="settings-card__body">
                <form @submit.prevent="saveStore" class="settings-form">
                  <div class="mb-3">
                    <label for="settings-store-name" class="form-label">Название магазина</label>
                    <input
                      id="settings-store-name"
                      v-model="storeForm.name"
                      type="text"
                      class="form-control"
                      placeholder="Например, OPanel Маркет"
                      required
                      :disabled="isSavingStore"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Ссылка на витрину</label>
                    <div class="input-group">
                      <input type="text" class="form-control" :value="storePublicLink" readonly />
                      <button type="button" class="btn btn-outline-secondary" :disabled="!storePublicLink" @click="copyStoreLink">
                        <i :data-feather="isLinkCopied ? 'check' : 'copy'"></i>
                      </button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Email (опционально)</label>
                    <input type="email" class="form-control" v-model="storeForm.email" placeholder="info@flowerparadise.ru" />
                  </div>
                  <div class="d-flex justify-content-end">
                    <button type="submit" class="btn btn-primary" :disabled="isSavingStore">
                      <span v-if="isSavingStore" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Сохранить изменения
                    </button>
                  </div>
                  <div v-if="storeSaveMessage" class="alert alert-success mt-3 mb-0" role="alert">
                    {{ storeSaveMessage }}
                  </div>
                  <div v-if="storeSaveError" class="alert alert-danger mt-3 mb-0" role="alert">
                    {{ storeSaveError }}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- Доступ к магазину -->
      <section class="settings-section" :class="{ open: openSections.access }">
        <button type="button" class="settings-section__toggle" @click="toggleSection('access')">
          <span class="settings-section__icon"><i data-feather="users"></i></span>
          <span class="settings-section__title">Доступ к магазину</span>
          <span class="settings-section__chevron" :class="{ rotated: openSections.access }"><i data-feather="chevron-down"></i></span>
        </button>
        <transition name="settings-collapse">
          <div v-show="openSections.access" class="settings-section__content">
            <div class="settings-card">
              <div class="settings-card__header">
                <span class="settings-card__title">Управление пользователями</span>
              </div>
              <div class="settings-card__body">
                <p class="mb-2">
                  <strong>Владелец:</strong> {{ ownerUsername || '—' }}
                </p>
                <p class="text-body-secondary small mb-3">Приглашайте пользователей по Telegram никнейму. Они смогут работать с данными, но не менять ключи и не удалять магазин.</p>
                <div v-if="isOwner" class="mb-3">
                  <label class="form-label">Никнейм Telegram</label>
                  <div class="d-flex gap-2 flex-wrap">
                    <input
                      type="text"
                      class="form-control"
                      placeholder="@username"
                      v-model="inviteUsername"
                      :disabled="inviteLoading"
                      style="max-width: 320px"
                    />
                    <button type="button" class="btn btn-primary" :disabled="inviteLoading" @click="sendInvite">
                      <span v-if="inviteLoading" class="spinner-border spinner-border-sm me-1"></span>
                      Пригласить
                    </button>
                  </div>
                  <div v-if="inviteError" class="text-danger small mt-2">{{ inviteError }}</div>
                  <div v-if="inviteMessage" class="text-success small mt-2">{{ inviteMessage }}</div>
                </div>

                <div class="mb-3">
                  <h6 class="mb-2">Активные пользователи</h6>
                  <div v-if="!managers.length" class="text-body-secondary small">Активных пользователей нет.</div>
                  <div v-else class="d-flex flex-column gap-2">
                    <div
                      v-for="user in managers"
                      :key="getUserName(user)"
                      class="d-flex align-items-center justify-content-between access-row"
                    >
                      <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-light text-dark">@{{ getUserName(user) }}</span>
                        <span v-if="user?.is_owner" class="badge bg-primary">Владелец</span>
                      </div>
                      <button
                        v-if="isOwner && !user?.is_owner"
                        class="btn btn-outline-danger btn-sm"
                        type="button"
                        @click="openRemoveManager(user)"
                      >
                        Удалить доступ
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h6 class="mb-2">Ожидают подтверждения</h6>
                  <div v-if="!pendingInvites.length" class="text-body-secondary small">Нет активных приглашений.</div>
                  <div v-else class="d-flex flex-column gap-2">
                    <div
                      v-for="inv in pendingInvites"
                      :key="getUserName(inv) || inv?.username || inv?.id"
                      class="d-flex align-items-center justify-content-between access-row"
                    >
                      <div>
                        <span class="badge bg-warning text-dark">@{{ getUserName(inv) }}</span>
                        <span class="text-body-secondary small ms-2">Статус: {{ inv?.status || inv?.state || 'pending' }}</span>
                      </div>
                      <button
                        v-if="isOwner"
                        class="btn btn-outline-danger btn-sm"
                        type="button"
                        @click="openRemoveManager(inv)"
                      >
                        Отменить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- Адреса и телефоны -->
      <section class="settings-section" :class="{ open: openSections.contacts }">
        <button type="button" class="settings-section__toggle" @click="toggleSection('contacts')">
          <span class="settings-section__icon"><i data-feather="map-pin"></i></span>
          <span class="settings-section__title">Адреса и телефоны</span>
          <span class="settings-section__chevron" :class="{ rotated: openSections.contacts }"><i data-feather="chevron-down"></i></span>
        </button>
        <transition name="settings-collapse">
          <div v-show="openSections.contacts" class="settings-section__content">
            <div class="settings-card">
              <div class="settings-card__header">
                <span class="settings-card__title">Адреса магазина</span>
                <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchAddresses" :disabled="addressesLoading">
                  <span v-if="addressesLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Обновить
                </button>
              </div>
              <div class="settings-card__body">
                <div v-if="addressesLoading" class="d-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Загрузка адресов...</span>
                </div>
                <div v-else-if="addressesError" class="alert alert-danger" role="alert">
                  {{ addressesError }}
                </div>
                <div v-else>
                  <p v-if="!addresses.length" class="text-body-secondary mb-3">Адреса еще не добавлены.</p>
                  <ul v-else class="settings-list">
                    <li v-for="address in addresses" :key="address.id" class="settings-list__item">
                      <div>
                        <h6 class="mb-1">{{ address.label || 'Без названия' }}</h6>
                        <p class="mb-0 text-body-secondary">{{ address.address_text }}</p>
                      </div>
                      <button type="button" class="btn btn-outline-danger btn-sm" @click="deleteAddress(address.id)" :disabled="deletingAddressId === address.id">
                        <span v-if="deletingAddressId === address.id" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span v-else>Удалить</span>
                      </button>
                    </li>
                  </ul>
                </div>
                <form class="settings-inline-form" @submit.prevent="createAddress">
                  <h6 class="mb-3">Добавить новый адрес</h6>
                  <div class="mb-3">
                    <label for="settings-address-label" class="form-label">Название (опционально)</label>
                    <input id="settings-address-label" v-model="addressForm.label" type="text" class="form-control" placeholder="Например, Главный офис" />
                  </div>
                  <div class="mb-3">
                    <label for="settings-address-text" class="form-label">Адрес</label>
                    <textarea id="settings-address-text" v-model="addressForm.address_text" class="form-control" rows="3" placeholder="Город, улица, дом" required></textarea>
                  </div>
                  <div class="d-flex justify-content-end">
                    <button type="submit" class="btn btn-primary" :disabled="isCreatingAddress">
                      <span v-if="isCreatingAddress" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Добавить адрес
                    </button>
                  </div>
                  <div v-if="addressCreateError" class="alert alert-danger mt-3 mb-0" role="alert">
                    {{ addressCreateError }}
                  </div>
                </form>
              </div>
            </div>

            <div class="settings-card">
              <div class="settings-card__header">
                <span class="settings-card__title">Телефоны магазина</span>
                <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchPhones" :disabled="phonesLoading">
                  <span v-if="phonesLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Обновить
                </button>
              </div>
              <div class="settings-card__body">
                <div v-if="phonesLoading" class="d-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Загрузка телефонов...</span>
                </div>
                <div v-else-if="phonesError" class="alert alert-danger" role="alert">
                  {{ phonesError }}
                </div>
                <div v-else>
                  <p v-if="!phones.length" class="text-body-secondary mb-3">Телефоны еще не добавлены.</p>
                  <ul v-else class="settings-list">
                    <li v-for="phone in phones" :key="phone.id" class="settings-list__item">
                      <div>
                        <h6 class="mb-1">{{ phone.label || 'Без названия' }}</h6>
                        <p class="mb-0 text-body-secondary">{{ phone.number }}</p>
                      </div>
                      <button type="button" class="btn btn-outline-danger btn-sm" @click="deletePhone(phone.id)" :disabled="deletingPhoneId === phone.id">
                        <span v-if="deletingPhoneId === phone.id" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span v-else>Удалить</span>
                      </button>
                    </li>
                  </ul>
                </div>
                <form class="settings-inline-form" @submit.prevent="createPhone">
                  <h6 class="mb-3">Добавить телефон</h6>
                  <div class="mb-3">
                    <label for="settings-phone-label" class="form-label">Название (опционально)</label>
                    <input id="settings-phone-label" v-model="phoneForm.label" type="text" class="form-control" placeholder="Например, Для заказов" />
                  </div>
                  <div class="mb-3">
                    <label for="settings-phone-number" class="form-label">Номер телефона</label>
                    <input id="settings-phone-number" v-model="phoneForm.number" type="tel" class="form-control" placeholder="+7 900 000-00-00" required />
                  </div>
                  <div class="d-flex justify-content-end">
                    <button type="submit" class="btn btn-primary" :disabled="isCreatingPhone">
                      <span v-if="isCreatingPhone" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Добавить телефон
                    </button>
                  </div>
                  <div v-if="phoneCreateError" class="alert alert-danger mt-3 mb-0" role="alert">
                    {{ phoneCreateError }}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- Telegram -->
      <section class="settings-section" :class="{ open: openSections.telegram }">
        <button type="button" class="settings-section__toggle" @click="toggleSection('telegram')">
          <span class="settings-section__icon"><i data-feather="send"></i></span>
          <span class="settings-section__title">Интеграция с Telegram</span>
          <span class="settings-section__chevron" :class="{ rotated: openSections.telegram }"><i data-feather="chevron-down"></i></span>
        </button>
        <transition name="settings-collapse">
          <div v-show="openSections.telegram" class="settings-section__content">
            <div class="settings-card">
              <div class="settings-card__body settings-card__body--telegram">
                <div class="mb-3">
                  <label class="form-label">Название Telegram-бота</label>
                  <input type="text" class="form-control" v-model="storeForm.telegramBotUsername" placeholder="@myshop_bot" />
                </div>
                <div class="mb-3">
                  <label class="form-label">API токен</label>
                  <div class="input-group">
                    <input type="text" class="form-control" v-model="storeForm.telegramBotToken" placeholder="Введите токен бота" />
                    <button type="button" class="btn btn-outline-secondary" @click="checkTelegramToken" :disabled="telegramCheckLoading">
                      <span v-if="telegramCheckLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span v-else>Проверить</span>
                    </button>
                  </div>
                </div>
                <div class="settings-status">
                  <span class="settings-status__label">Статус подключения</span>
                  <div class="settings-status__value" :class="{ success: telegramStatus.connected, error: !telegramStatus.connected }">
                    <span class="settings-status__icon">
                      <i :data-feather="telegramStatus.connected ? 'check-circle' : 'x-circle'"></i>
                    </span>
                    <span>{{ telegramStatus.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- Дополнительные настройки -->
      <section class="settings-section" :class="{ open: openSections.advanced }">
        <button type="button" class="settings-section__toggle" @click="toggleSection('advanced')">
          <span class="settings-section__icon"><i data-feather="sliders"></i></span>
          <span class="settings-section__title">Дополнительные настройки</span>
          <span class="settings-section__chevron" :class="{ rotated: openSections.advanced }"><i data-feather="chevron-down"></i></span>
        </button>
        <transition name="settings-collapse">
          <div v-show="openSections.advanced" class="settings-section__content">
            <div class="settings-card">
              <div class="settings-card__body text-body-secondary">
                Дополнительные параметры появятся здесь позже.
              </div>
            </div>
          </div>
        </transition>
      </section>
    </div>

    <div class="store-settings-actions">
      <button type="button" class="btn btn-primary btn-lg" @click="saveStore" :disabled="isSavingStore">
        <span v-if="isSavingStore" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Сохранить изменения
      </button>
    </div>

    <Modal v-if="managerToRemove" :show="true" @close="closeRemoveManager">
      <h5 class="mb-3">Удалить доступ?</h5>
      <p class="mb-3">
        Пользователь <strong>@{{ getUserName(managerToRemove) }}</strong> потеряет доступ к магазину. Продолжить?
      </p>
      <div v-if="removeError" class="alert alert-danger py-2 px-3">{{ removeError }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="closeRemoveManager">Отмена</button>
        <button type="button" class="btn btn-danger btn-sm" :disabled="removeLoading" @click="confirmRemoveManager">
          <span v-if="removeLoading" class="spinner-border spinner-border-sm me-1"></span>
          Удалить
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/stores'
import { apiService } from '@/services/api'
import Modal from '@/components/Modal.vue'

interface StoreAddress {
  id: string
  label: string | null
  address_text: string
}

interface StorePhone {
  id: string
  label: string | null
  number: string
  store?: string
}

const route = useRoute()
const router = useRouter()
const storesStore = useStoresStore()
const { primaryStore, stores, isLoading: storesLoading } = storeToRefs(storesStore)

const isStoreLoading = ref(true)
const storeError = ref<string | null>(null)
const storeDetail = ref<any>(null)
const isTelegramApp = ref(false)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
const inviteUsername = ref('')
const inviteLoading = ref(false)
const inviteError = ref<string | null>(null)
const inviteMessage = ref<string | null>(null)
const managerToRemove = ref<any | null>(null)
const removeLoading = ref(false)
const removeError = ref<string | null>(null)

const updateViewportWidth = () => {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
}

const isSavingStore = ref(false)
const storeSaveMessage = ref<string | null>(null)
const storeSaveError = ref<string | null>(null)
const isLinkCopied = ref(false)
const hasTelegramBackButton = ref(typeof window !== 'undefined' && !!window.Telegram?.WebApp?.BackButton)
let copyTimeout: number | undefined

const storeForm = reactive({
  name: '',
  email: '',
  publicUrl: '',
  telegramBotUsername: '',
  telegramBotToken: ''
})

const addresses = ref<StoreAddress[]>([])
const addressesLoading = ref(false)
const addressesError = ref<string | null>(null)
const isCreatingAddress = ref(false)
const addressCreateError = ref<string | null>(null)
const deletingAddressId = ref<string | null>(null)

const addressForm = reactive({
  label: '',
  address_text: ''
})

const businessTypes = ref<{ value: string; label: string }[]>([])
const businessTypesLoading = ref(false)
const businessTypesError = ref<string | null>(null)
const selectedBusinessType = ref('')
const typeSaveLoading = ref(false)
const typeSaveError = ref<string | null>(null)
const businessTypeLabel = computed(() => {
  const value = storeDetail.value?.business_type
  if (!value) return ''
  return businessTypes.value.find((item) => item.value === value)?.label || value
})

const categories = ref<{ id: number; name: string }[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref<string | null>(null)
const selectedCategoryId = ref<string | null>(null)
const customCategoryValue = ref('')
const categorySaveLoading = ref(false)
const categorySaveMessage = ref<string | null>(null)
const categorySaveError = ref<string | null>(null)

const phones = ref<StorePhone[]>([])
const phonesLoading = ref(false)
const phonesError = ref<string | null>(null)
const isCreatingPhone = ref(false)
const phoneCreateError = ref<string | null>(null)
const deletingPhoneId = ref<string | null>(null)

const phoneForm = reactive({
  label: '',
  number: ''
})

const openSections = reactive<Record<string, boolean>>({
  basic: true,
  contacts: true,
  telegram: false,
  access: true,
  advanced: false
})

const telegramStatus = reactive({
  connected: false,
  message: 'Бот не подключен'
})
const telegramCheckLoading = ref(false)

const currentStoreId = computed(() => {
  const fromQuery = route.query.store
  if (typeof fromQuery === 'string' && fromQuery.length) {
    return fromQuery
  }
  return primaryStore.value?.id ?? null
})

const storeDisplayName = computed(() => storeDetail.value?.name || 'Без названия')
const storePublicLink = computed(() => storeForm.publicUrl || storeDetail.value?.public_url || '')
const isOwner = computed(() => !!storeDetail.value?.is_owner)
const ownerUsername = computed(() => storeDetail.value?.owner_username || storeDetail.value?.owner?.username || '')

const managers = computed(() => {
  const list =
    storeDetail.value?.managers ||
    storeDetail.value?.shared_users ||
    storeDetail.value?.collaborators ||
    []
  return Array.isArray(list) ? list : []
})

const pendingInvites = computed(() => {
  const list =
    storeDetail.value?.pending_invites ||
    storeDetail.value?.invites ||
    storeDetail.value?.invitations ||
    []
  return Array.isArray(list) ? list : []
})

const copyStoreLink = async () => {
  if (!storePublicLink.value) return
  try {
    await navigator.clipboard.writeText(storePublicLink.value)
    isLinkCopied.value = true
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = window.setTimeout(() => {
      isLinkCopied.value = false
      if (window.feather) window.feather.replace()
    }, 1500)
    if (window.feather) window.feather.replace()
  } catch (error) {
    console.error('Clipboard copy failed', error)
  }
}

const toggleSection = (key: string) => {
  openSections[key] = !openSections[key]
  nextTick(() => {
    if (window.feather) window.feather.replace()
  })
}

const goToDashboard = () => {
  storesStore.setActiveStoreId(null)
  router.push({ name: 'dashboard' })
}

const goToOverview = () => {
  const query = currentStoreId.value ? { store: currentStoreId.value } : undefined
  router.push({ name: 'stores', query })
}

const getUserName = (user: any) => user?.username || user?.telegram_username || user?.name || ''

const sendInvite = async () => {
  if (!isOwner.value || !currentStoreId.value) return
  const username = inviteUsername.value.trim().replace(/^@/, '')
  if (!username) {
    inviteError.value = 'Введите никнейм телеграма'
    return
  }
  inviteLoading.value = true
  inviteError.value = null
  inviteMessage.value = null
  try {
    await apiService.inviteStoreUser(currentStoreId.value, username)
    inviteMessage.value = 'Приглашение отправлено'
    inviteUsername.value = ''
    await fetchStore()
  } catch (error) {
    inviteError.value = error instanceof Error ? error.message : 'Не удалось отправить приглашение'
  } finally {
    inviteLoading.value = false
    setTimeout(() => (inviteMessage.value = null), 3000)
  }
}

const openRemoveManager = (user: any) => {
  managerToRemove.value = user
  removeError.value = null
}

const closeRemoveManager = () => {
  managerToRemove.value = null
  removeError.value = null
}

const confirmRemoveManager = async () => {
  if (!managerToRemove.value || !currentStoreId.value) return
  const username = getUserName(managerToRemove.value)
  if (!username) {
    removeError.value = 'Не удалось определить пользователя'
    return
  }
  removeLoading.value = true
  removeError.value = null
  try {
    await apiService.revokeStoreInvite(currentStoreId.value, username)
    await fetchStore()
    closeRemoveManager()
  } catch (error) {
    removeError.value = error instanceof Error ? error.message : 'Не удалось удалить доступ'
  } finally {
    removeLoading.value = false
  }
}

const fetchStore = async () => {
  const storeId = currentStoreId.value
  if (!storeId) {
    isStoreLoading.value = false
    storeDetail.value = null
    storesStore.setActiveStoreId(null)
    return
  }

  isStoreLoading.value = true
  storeError.value = null

  try {
    if (!businessTypes.value.length) await fetchBusinessTypes()
    const data = await apiService.getStore(storeId)
    storeDetail.value = data
    storesStore.setActiveStoreId(storeId)
    storeForm.name = data?.name || ''
    storeForm.publicUrl = data?.public_url || data?.url || ''
    storeForm.email = data?.email || ''
    storeForm.telegramBotUsername = data?.telegram_bot_username || ''
    storeForm.telegramBotToken = data?.telegram_bot_token || ''
    selectedBusinessType.value = data?.business_type || ''
    const currentCategory = data?.category
    if (currentCategory && typeof currentCategory === 'object') {
      selectedCategoryId.value = currentCategory.id ? String(currentCategory.id) : null
    } else if (currentCategory) {
      selectedCategoryId.value = String(currentCategory)
    } else {
      selectedCategoryId.value = null
    }
    customCategoryValue.value = data?.custom_category || ''
    if (selectedBusinessType.value) await fetchCategories(selectedBusinessType.value)
    await Promise.all([fetchAddresses(), fetchPhones()])
  } catch (error) {
    console.error(error)
    storeError.value = error instanceof Error ? error.message : 'Не удалось загрузить магазин'
    storeDetail.value = null
  } finally {
    isStoreLoading.value = false
    nextTick(() => {
      if (window.feather) window.feather.replace()
    })
  }
}

const fetchAddresses = async () => {
  const storeId = currentStoreId.value
  if (!storeId) {
    addresses.value = []
    return
  }
  addressesLoading.value = true
  addressesError.value = null
  try {
    const data = await apiService.getStoreAddresses(storeId)
    const list = Array.isArray(data) ? data : data?.results ?? []
    addresses.value = list as StoreAddress[]
  } catch (error) {
    addressesError.value = error instanceof Error ? error.message : 'Не удалось загрузить адреса'
    addresses.value = []
  } finally {
    addressesLoading.value = false
  }
}

const fetchPhones = async () => {
  const storeId = currentStoreId.value
  if (!storeId) {
    phones.value = []
    return
  }
  phonesLoading.value = true
  phonesError.value = null
  try {
    const data = await apiService.getStorePhones(storeId)
    const list = Array.isArray(data) ? data : data?.results ?? []
    phones.value = (list as StorePhone[]).filter((item) => !item.store || item.store === storeId)
  } catch (error) {
    phonesError.value = error instanceof Error ? error.message : 'Не удалось загрузить телефоны'
    phones.value = []
  } finally {
    phonesLoading.value = false
  }
}

const fetchBusinessTypes = async () => {
  businessTypesLoading.value = true
  businessTypesError.value = null
  try {
    const data = await apiService.getBusinessTypes()
    businessTypes.value = Array.isArray(data) ? data : []
  } catch (error) {
    businessTypesError.value = error instanceof Error ? error.message : 'Не удалось загрузить типы бизнеса'
  } finally {
    businessTypesLoading.value = false
  }
}

const fetchCategories = async (type: string) => {
  if (!type) {
    categories.value = []
    return
  }
  categoriesLoading.value = true
  categoriesError.value = null
  try {
    const data = await apiService.getCategoriesByType(type)
    categories.value = Array.isArray(data) ? data : []
  } catch (error) {
    categoriesError.value = error instanceof Error ? error.message : 'Не удалось загрузить категории'
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

const saveStore = async () => {
  if (!currentStoreId.value || !storeForm.name.trim()) return
  isSavingStore.value = true
  storeSaveError.value = null
  storeSaveMessage.value = null
  try {
    const payload = {
      name: storeForm.name.trim(),
      email: storeForm.email.trim() || null,
      public_url: storeForm.publicUrl.trim() || null,
      telegram_bot_username: storeForm.telegramBotUsername.trim() || null,
      telegram_bot_token: storeForm.telegramBotToken.trim() || null
    }
    const updated = await apiService.updateStore(currentStoreId.value, payload)
    storeDetail.value = updated
    storeSaveMessage.value = 'Изменения сохранены'
    await storesStore.fetchStores()
  } catch (error) {
    storeSaveError.value = error instanceof Error ? error.message : 'Не удалось сохранить изменения'
  } finally {
    isSavingStore.value = false
    setTimeout(() => {
      storeSaveMessage.value = null
    }, 3000)
  }
}

const createAddress = async () => {
  if (!currentStoreId.value || !addressForm.address_text.trim()) return
  isCreatingAddress.value = true
  addressCreateError.value = null
  try {
    await apiService.createStoreAddress({
      store: currentStoreId.value,
      label: addressForm.label.trim() || null,
      address_text: addressForm.address_text.trim(),
      phones: []
    })
    addressForm.label = ''
    addressForm.address_text = ''
    await fetchAddresses()
  } catch (error) {
    addressCreateError.value = error instanceof Error ? error.message : 'Не удалось добавить адрес'
  } finally {
    isCreatingAddress.value = false
  }
}

const createPhone = async () => {
  if (!currentStoreId.value || !phoneForm.number.trim()) return
  isCreatingPhone.value = true
  phoneCreateError.value = null
  try {
    const payload = {
      store: currentStoreId.value,
      number: phoneForm.number.trim(),
      label: phoneForm.label.trim() || null
    }
    const created = await apiService.createStorePhone(payload)
    phoneForm.number = ''
    phoneForm.label = ''
    if (created?.id) {
      phones.value = [created as StorePhone, ...phones.value]
    } else {
      await fetchPhones()
    }
  } catch (error) {
    phoneCreateError.value = error instanceof Error ? error.message : 'Не удалось добавить телефон'
  } finally {
    isCreatingPhone.value = false
  }
}

const deleteAddress = async (addressId: string) => {
  if (!addressId) return
  deletingAddressId.value = addressId
  addressesError.value = null
  try {
    await apiService.deleteStoreAddress(addressId)
    addresses.value = addresses.value.filter((item) => item.id !== addressId)
  } catch (error) {
    addressesError.value = error instanceof Error ? error.message : 'Не удалось удалить адрес'
  } finally {
    deletingAddressId.value = null
  }
}

const deletePhone = async (phoneId: string) => {
  if (!phoneId) return
  deletingPhoneId.value = phoneId
  phonesError.value = null
  try {
    await apiService.deleteStorePhone(phoneId)
    phones.value = phones.value.filter((item) => item.id !== phoneId)
  } catch (error) {
    phonesError.value = error instanceof Error ? error.message : 'Не удалось удалить телефон'
  } finally {
    deletingPhoneId.value = null
  }
}

const saveBusinessType = async () => {
  if (!currentStoreId.value || !selectedBusinessType.value) return
  typeSaveLoading.value = true
  typeSaveError.value = null

  try {
    await apiService.setStoreBusinessType(currentStoreId.value, selectedBusinessType.value)
    if (storeDetail.value) {
      storeDetail.value.business_type = selectedBusinessType.value
    }
    await fetchCategories(selectedBusinessType.value)
    selectedCategoryId.value = null
    customCategoryValue.value = ''
    await storesStore.fetchStores()
  } catch (error) {
    typeSaveError.value = error instanceof Error ? error.message : 'Не удалось сохранить тип бизнеса'
  } finally {
    typeSaveLoading.value = false
  }
}

const saveCategory = async () => {
  if (!currentStoreId.value) return
  if (!selectedCategoryId.value && !customCategoryValue.value.trim()) {
    categorySaveError.value = 'Выберите категорию или укажите свою'
    return
  }
  categorySaveLoading.value = true
  categorySaveError.value = null
  categorySaveMessage.value = null

  try {
    const payload: Record<string, unknown> = {}
    if (selectedCategoryId.value) {
      payload.category = Number(selectedCategoryId.value)
      payload.custom_category = null
    } else {
      payload.category = null
      payload.custom_category = customCategoryValue.value.trim()
    }
    const updated = await apiService.updateStore(currentStoreId.value, payload)
    storeDetail.value = updated
    const newCategory = updated?.category
    if (newCategory && typeof newCategory === 'object') {
      selectedCategoryId.value = newCategory.id ? String(newCategory.id) : null
    } else if (newCategory) {
      selectedCategoryId.value = String(newCategory)
    } else {
      selectedCategoryId.value = null
    }
    customCategoryValue.value = updated?.custom_category || ''
    categorySaveMessage.value = 'Категория сохранена'
    setTimeout(() => (categorySaveMessage.value = null), 3000)
  } catch (error) {
    categorySaveError.value = error instanceof Error ? error.message : 'Не удалось сохранить категорию'
  } finally {
    categorySaveLoading.value = false
  }
}

const handleCategorySelect = () => {
  customCategoryValue.value = ''
  categorySaveError.value = null
  categorySaveMessage.value = null
}

const handleCustomCategoryInput = () => {
  selectedCategoryId.value = null
  categorySaveError.value = null
  categorySaveMessage.value = null
}

const retryFetch = () => {
  fetchStore()
}

const checkTelegramToken = async () => {
  telegramCheckLoading.value = true
  try {
    if (storeForm.telegramBotToken.trim().length > 10) {
      telegramStatus.connected = true
      telegramStatus.message = 'Бот подключен'
    } else {
      telegramStatus.connected = false
      telegramStatus.message = 'Бот не подключен'
    }
  } finally {
    telegramCheckLoading.value = false
    nextTick(() => {
      if (window.feather) window.feather.replace()
    })
  }
}

onMounted(async () => {
  isTelegramApp.value = document.body.classList.contains('tg-webapp') || document.documentElement.classList.contains('tg-webapp')
  if (typeof window !== 'undefined') {
    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
  }
  if (!stores.value.length && !storesLoading.value) {
    await storesStore.fetchStores()
  }
  await fetchStore()
  nextTick(() => {
    if (window.feather) window.feather.replace()
  })
})

watch(
  () => currentStoreId.value,
  () => {
    fetchStore()
  }
)

watch(
  () => stores.value,
  () => {
    if (!currentStoreId.value && primaryStore.value?.id) {
      fetchStore()
    }
  }
)

watch(
  () => selectedBusinessType.value,
  (value) => {
    if (!storeDetail.value?.business_type && value) {
      fetchCategories(value)
    }
    if (typeSaveError.value) typeSaveError.value = null
  }
)

watch(
  () => route.query.store,
  () => {
    fetchStore()
  }
)

watch(
  () => [storeForm.telegramBotUsername, storeForm.telegramBotToken],
  () => {
    telegramStatus.connected = !!storeForm.telegramBotToken.trim()
    telegramStatus.message = telegramStatus.connected ? 'Бот подключен' : 'Бот не подключен'
  },
  { immediate: true, deep: true }
)

watch(
  () => openSections,
  () => {
    nextTick(() => {
      if (window.feather) window.feather.replace()
    })
  },
  { deep: true }
)

watch(
  () => isStoreLoading.value,
  (loading) => {
    if (!loading && window.feather) {
      nextTick(() => window.feather?.replace())
    }
  }
)

onUnmounted(() => {
  if (copyTimeout) {
    clearTimeout(copyTimeout)
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }
})
</script>

<style scoped>
.store-settings-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 0;
}

.store-settings-header {
  margin-bottom: 2rem;
}

.store-settings-title {
  font-size: 1.75rem;
  font-weight: 700;
}

.store-settings-subtitle {
  color: #6b7280;
}

.store-settings-accordion {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-section {
  background: #fff;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.settings-section.open {
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.settings-section__toggle {
  width: 100%;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  font-weight: 600;
  font-size: 1rem;
}

.settings-section__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  margin-right: 0.75rem;
}

.settings-section__icon i {
  width: 16px;
  height: 16px;
}

.settings-section__title {
  flex: 1 1 auto;
}

.settings-section__chevron {
  display: inline-flex;
  transition: transform 0.2s ease;
}

.settings-section__chevron.rotated {
  transform: rotate(180deg);
}

.settings-section__content {
  padding: 0 1.5rem 1.5rem;
}

.settings-card {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 16px;
  background: #f8fafc;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}

.settings-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.settings-card__title {
  font-weight: 600;
  font-size: 1rem;
}

.settings-inline-form h6 {
  font-weight: 600;
}

.settings-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-list__item {
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.settings-status {
  margin-top: 1rem;
}

.settings-status__label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.settings-status__value {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.settings-status__value.success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.settings-status__icon i {
  width: 16px;
  height: 16px;
}

.store-settings-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
}

.access-row .badge {
  font-size: 0.9rem;
}

.settings-collapse-enter-active,
.settings-collapse-leave-active {
  transition: all 0.2s ease;
}

.settings-collapse-enter-from,
.settings-collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .store-settings-actions {
    justify-content: stretch;
  }
  .store-settings-actions .btn {
    width: 100%;
  }
}
</style>
