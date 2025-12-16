<template>
  <div class="section-body">
    <div v-if="loading" class="state state--loading">
      <span class="spinner-border spinner-border-sm me-2"></span>
      Загружаем доступы...
    </div>
    <div v-else-if="error" class="alert alert-danger d-flex align-items-center justify-content-between gap-2">
      <span>{{ error }}</span>
      <button class="btn btn-outline-secondary btn-sm" type="button" @click="fetchStore">Повторить</button>
    </div>
    <div v-else class="settings-card">
      <div class="settings-card__header">
        <div>
          <h5 class="mb-1">Доступ к магазину</h5>
          <p class="text-muted small mb-0">Владелец может приглашать/удалять пользователей. Приглашенные работают с данными, но не меняют ключи и не удаляют магазин.</p>
        </div>
      </div>

      <div class="settings-card__body">
        <div class="mb-3">
          <strong>Владелец:</strong> {{ ownerUsername || '—' }}
          <span v-if="storeDetail?.is_owner" class="badge bg-primary ms-2">Вы — владелец</span>
        </div>

        <div v-if="storeDetail?.is_owner" class="mb-4">
          <label class="form-label">Никнейм Telegram</label>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              class="form-control"
              v-model="inviteUsername"
              placeholder="@username"
              :disabled="inviteLoading"
              style="max-width: 280px"
            />
            <button class="btn btn-primary btn-sm" type="button" :disabled="inviteLoading" @click="sendInvite">
              <span v-if="inviteLoading" class="spinner-border spinner-border-sm me-1"></span>
              Пригласить
            </button>
          </div>
          <div v-if="inviteError" class="text-danger small mt-2">{{ inviteError }}</div>
          <div v-if="inviteMessage" class="text-success small mt-2">{{ inviteMessage }}</div>
        </div>

        <div class="mb-3">
          <h6 class="mb-2">Активные пользователи</h6>
          <div v-if="accessesLoading" class="text-muted small d-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm"></span>
            <span>Загружаем список...</span>
          </div>
          <div v-else-if="!managers.length" class="text-muted small">Активных пользователей нет.</div>
          <div v-else class="d-flex flex-column gap-2">
            <div
              v-for="user in managers"
              :key="user?.user_id || getUserName(user)"
              class="d-flex align-items-center justify-content-between access-row"
            >
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-light text-dark">@{{ getUserName(user) }}</span>
                <span v-if="user?.is_owner" class="badge bg-primary">Владелец</span>
                <span v-else-if="user?.status && user?.status !== 'accepted'" class="badge bg-warning text-dark">
                  {{ user.status }}
                </span>
              </div>
              <button
                v-if="storeDetail?.is_owner && !user?.is_owner"
                class="btn btn-outline-danger btn-sm"
                type="button"
                @click="openRemove(user)"
              >
                Удалить доступ
              </button>
            </div>
          </div>
        </div>

        <div>
          <h6 class="mb-2">Ожидают подтверждения</h6>
          <div v-if="!pendingInvites.length" class="text-muted small">Нет активных приглашений.</div>
          <div v-else class="d-flex flex-column gap-2">
            <div
              v-for="inv in pendingInvites"
              :key="getUserName(inv) || inv?.username || inv?.id"
              class="d-flex align-items-center justify-content-between access-row"
            >
              <div>
                <span class="badge bg-warning text-dark">@{{ getUserName(inv) }}</span>
                <span class="text-muted small ms-2">Статус: {{ inv?.status || inv?.state || 'pending' }}</span>
              </div>
              <button
                v-if="storeDetail?.is_owner"
                class="btn btn-outline-danger btn-sm"
                type="button"
                @click="openRemove(inv)"
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Modal v-if="removeTarget" :show="true" @close="closeRemove">
      <h5 class="mb-3">Удалить доступ?</h5>
      <p class="mb-3">
        Пользователь <strong>@{{ getUserName(removeTarget) }}</strong> потеряет доступ к магазину. Продолжить?
      </p>
      <div v-if="removeError" class="alert alert-danger py-2 px-3">{{ removeError }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeRemove">Отмена</button>
        <button class="btn btn-danger btn-sm" type="button" :disabled="removeLoading" @click="confirmRemove">
          <span v-if="removeLoading" class="spinner-border spinner-border-sm me-1"></span>
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

const props = defineProps<{
  storeId: string
  store: any
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const storeDetail = ref<any>(null)

const inviteUsername = ref('')
const inviteLoading = ref(false)
const inviteError = ref<string | null>(null)
const inviteMessage = ref<string | null>(null)

const removeTarget = ref<any | null>(null)
const removeLoading = ref(false)
const removeError = ref<string | null>(null)

const ownerUsername = computed(
  () => storeDetail.value?.owner_username || storeDetail.value?.owner?.username || ''
)

const accesses = ref<any[]>([])
const accessesLoading = ref(false)

const managers = computed(() => {
  if (storeDetail.value?.is_owner && accesses.value.length) return accesses.value
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

const getUserName = (user: any) => user?.username || user?.telegram_username || user?.name || ''

const fetchStore = async () => {
  if (!props.storeId) return
  loading.value = true
  error.value = null
  try {
    const data = await apiService.getStore(props.storeId)
    storeDetail.value = data
    if (storeDetail.value?.is_owner) {
      await fetchAccesses()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить магазин'
  } finally {
    loading.value = false
  }
}

const fetchAccesses = async () => {
  if (!props.storeId) return
  accessesLoading.value = true
  try {
    const data = await apiService.getStoreAccesses(props.storeId)
    accesses.value = Array.isArray(data) ? data : data?.results || []
  } catch (err) {
    // не блокируем экран, просто оставляем прошлое значение
  } finally {
    accessesLoading.value = false
  }
}

const sendInvite = async () => {
  const username = inviteUsername.value.trim().replace(/^@/, '')
  if (!username) {
    inviteError.value = 'Введите никнейм телеграма'
    return
  }
  inviteLoading.value = true
  inviteError.value = null
  inviteMessage.value = null
  try {
    await apiService.inviteStoreUser(props.storeId, username)
    inviteMessage.value = 'Приглашение отправлено'
    inviteUsername.value = ''
    await fetchStore()
  } catch (err) {
    inviteError.value = err instanceof Error ? err.message : 'Не удалось отправить приглашение'
  } finally {
    inviteLoading.value = false
    setTimeout(() => (inviteMessage.value = null), 3000)
  }
}

const openRemove = (user: any) => {
  removeTarget.value = user
  removeError.value = null
}
const closeRemove = () => {
  removeTarget.value = null
  removeError.value = null
}

const confirmRemove = async () => {
  if (!removeTarget.value) return
  const userId =
    removeTarget.value?.user_id ||
    removeTarget.value?.id ||
    removeTarget.value?.user ||
    null
  const username = getUserName(removeTarget.value)
  if (!userId && !username) {
    removeError.value = 'Не удалось определить пользователя'
    return
  }
  removeLoading.value = true
  removeError.value = null
  try {
    if (userId) {
      await apiService.deleteStoreAccess(props.storeId, userId)
    } else if (username) {
      await apiService.revokeStoreInvite(props.storeId, username)
    }
    await fetchStore()
    closeRemove()
  } catch (err) {
    removeError.value = err instanceof Error ? err.message : 'Не удалось удалить доступ'
  } finally {
    removeLoading.value = false
  }
}

onMounted(() => {
  if (props.store && Object.keys(props.store).length) {
    storeDetail.value = props.store
  }
  fetchStore()
})

watch(
  () => props.storeId,
  () => {
    fetchStore()
  }
)
</script>

<style scoped>
.settings-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #f8fafc;
  padding: 1.25rem;
}

.settings-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.settings-card__body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.access-row .badge {
  font-size: 0.9rem;
}

.access-row {
  padding: 0.35rem 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 10px;
  background: #fff;
}

.state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  border: 1px dashed rgba(15, 23, 42, 0.1);
  border-radius: 12px;
}
</style>
