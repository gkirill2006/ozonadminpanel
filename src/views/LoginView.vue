<template>
  <div class="login-page d-flex align-items-center justify-content-center">
    <div class="card shadow-lg">
      <div class="card-body text-center">
        <h2 class="mb-4">Вход в админ-панель</h2>
        <p class="text-muted mb-4">Войдите через Telegram для доступа к панели управления</p>
        
        <button 
          @click="openTelegramModal" 
          class="btn btn-primary btn-lg"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
          {{ isLoading ? 'Подключение...' : 'Войти через Telegram' }}
        </button>

        <div v-if="error" class="alert alert-danger mt-3">
          {{ error }}
        </div>

        <div v-if="apiTestResult" class="alert alert-info mt-3">
          <strong>API Test Result:</strong><br>
          {{ apiTestResult }}
        </div>
      </div>
    </div>

    <Modal v-if="showModal" @close="closeModal">
      <div class="text-center">
        <h4 class="mb-3">Авторизация через Telegram</h4>
        
        <div class="mb-4">
          <qrcode-vue :value="telegramLink" :size="200" class="mb-3" />
        </div>
        
        <a 
          :href="telegramLink" 
          target="_blank" 
          class="btn btn-primary btn-lg mb-3"
        >
          <i class="feather icon-message-circle me-2"></i>
          Открыть в Telegram
        </a>
        
        <p class="text-muted mb-3">
          Отсканируйте QR-код или нажмите кнопку для входа через Telegram
        </p>
        
        <div v-if="pollingStatus" class="alert alert-info">
          {{ pollingStatus }}
        </div>
        
        <div v-if="pollingError" class="alert alert-danger">
          {{ pollingError }}
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'
import Modal from '@/components/Modal.vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const showModal = ref(false)
const isLoading = ref(false)
const error = ref('')
const apiTestResult = ref('')
const sessionId = ref('')
const telegramLink = ref('')
const pollingStatus = ref('')
const pollingError = ref('')
const stopPolling = ref<null | (() => void)>(null)

const openTelegramModal = async () => {
  try {
    isLoading.value = true
    error.value = ''
    pollingError.value = ''
    pollingStatus.value = ''
    
    const data = await apiService.generateSessionId()
    sessionId.value = data.session_id
    const botName = import.meta.env.VITE_TELEGRAM_BOT || 'TGPoint_bot'
    telegramLink.value = `tg://resolve?domain=${botName}&start=${sessionId.value}`
    showModal.value = true
    
    // Начинаем поллинг сразу при открытии модального окна
    startPolling()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка при создании сессии'
    error.value = message
    console.error('Error generating session ID:', err)
  } finally {
    isLoading.value = false
  }
}

const closeModal = () => {
  // Останавливаем поллинг если он активен
  if (typeof stopPolling.value === 'function') {
    stopPolling.value()
  }
  stopPolling.value = null

  showModal.value = false;
  pollingStatus.value = '';
  pollingError.value = '';
}

const startPolling = () => {
  pollingStatus.value = 'Ожидание авторизации в Telegram...'
  try {
    stopPolling.value = apiService.pollForToken(sessionId.value, 
      (data) => {
        // Успешная авторизация
        authStore.setTokens(data.access, data.refresh)
        authStore.setUser(data.user)
        closeModal()
        router.push('/')
      }, 
      (err) => {
        // Ошибка при поллинге
        pollingError.value = err
        console.error('Polling error:', err)
      }
    )
  } catch (error) {
    pollingError.value = error instanceof Error ? error.message : 'Ошибка при запуске поллинга'
    console.error('Polling start error:', error)
  }
}
</script>

<style scoped>
.login-page {
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  min-height: 100vh;
}

.card {
  border: none;
  border-radius: 1rem;
  max-width: 400px;
  width: 100%;
}

.card-body {
  padding: 3rem;
}

.btn {
  border-radius: 0.5rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
}

.form-control {
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.alert {
  border-radius: 0.5rem;
  border: none;
}

code {
  background-color: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.spinner-border {
  width: 1rem;
  height: 1rem;
}
</style> 
