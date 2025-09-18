import { useAuthStore } from '@/stores/auth'

// Базовый URL API: по умолчанию относительные пути (через Vite proxy)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''

class ApiService {
  private getHeaders(): HeadersInit {
    const authStore = useAuthStore()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
    
    if (authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    }
    
    return headers
  }

  private async handleResponse(response: Response) {
    console.log(`API Response Status: ${response.status}`)
    console.log(`API Response URL: ${response.url}`)
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }
      
      if (response.status === 0) {
        throw new Error('CORS Error: Unable to connect to server. Please check your network connection.')
      }
      
      // Попробуем получить текст ответа для отладки
      const responseText = await response.text()
      console.error('API Error Response:', responseText)
      
      try {
        const errorData = JSON.parse(responseText)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      } catch {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 100)}`)
      }
    }
    
    // Безопасная обработка JSON
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Unexpected response type: ${contentType}. First bytes: ${text.slice(0, 60)}`)
    }
    return response.json()
  }

  // Debug logging endpoint for Mini App
  async miniappLog(message: string, level: 'info'|'warn'|'error' = 'info', meta?: any) {
    try {
      await fetch(`${API_BASE_URL}/auth/miniapp-log/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message, level, meta })
      })
    } catch (e) {
      // swallow
    }
  }

  // Auth endpoints
  async telegramWebAppLogin(initData: string) {
    const response = await fetch(`${API_BASE_URL}/auth/LJDHEDergf32fdf45gb7h54gfdsdcn34/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ initData })
    })
    return this.handleResponse(response)
  }

  async generateSessionId() {
    const url = `${API_BASE_URL}/auth/generate-session-id/`
    console.log('Making request to:', url)
    console.log('Headers:', this.getHeaders())
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      })
      console.log('Response received:', response)
      return this.handleResponse(response)
    } catch (error) {
      console.error('Fetch error:', error)
      throw error
    }
  }

  async obtainToken(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/auth/obtain-token/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ session_id: sessionId })
    })
    return this.handleResponse(response)
  }

  async pollForToken(
    sessionId: string, 
    onSuccess: (data: any) => void, 
    onError: (error: string) => void,
    onProgress?: (progress: number) => void
  ) {
    const maxAttempts = 600 // 10 минут * 60 попыток (каждую секунду)
    const pollInterval = 1000 // 1 секунда
    let attempts = 0
    let isPolling = true
    
    const poll = async () => {
      if (!isPolling) return // Остановка поллинга
      
      try {
        console.log(`Polling attempt ${attempts + 1} for session: ${sessionId}`)
        const data = await this.obtainToken(sessionId)
        
        if (data.status === 'success') {
          console.log('Token obtained successfully!')
          onSuccess(data)
          return
        } else if (data.status === 'pending') {
          attempts++
          console.log(`Still pending... Attempt ${attempts}/${maxAttempts}`)
          
          if (onProgress) {
            const progress = Math.min((attempts / maxAttempts) * 100, 100)
            onProgress(progress)
          }
          
          if (attempts >= maxAttempts) {
            console.log('Max attempts reached, stopping polling')
            onError('Время ожидания истекло (10 минут). Попробуйте еще раз.')
            return
          }
          setTimeout(poll, pollInterval)
        } else {
          // Если сервер вернул ошибку, но не статус success/pending
          if (data.error && data.error.includes('Invalid or expired session_id')) {
            attempts++
            if (onProgress) {
              const progress = Math.min((attempts / maxAttempts) * 100, 100)
              onProgress(progress)
            }
            if (attempts >= maxAttempts) {
              onError('Время ожидания истекло (10 минут). Попробуйте еще раз.')
              return
            }
            setTimeout(poll, pollInterval)
          } else {
            onError(data.error || 'Неизвестная ошибка')
          }
        }
      } catch (error: any) {
        // Проверяем текст ошибки
        if (
          error.message &&
          error.message.includes('Invalid or expired session_id')
        ) {
          attempts++
          if (onProgress) {
            const progress = Math.min((attempts / maxAttempts) * 100, 100)
            onProgress(progress)
          }
          if (attempts >= maxAttempts) {
            onError('Время ожидания истекло (10 минут). Попробуйте еще раз.')
            return
          }
          setTimeout(poll, pollInterval)
        } else {
          onError(error.message || 'Ошибка при получении токена')
        }
      }
    }
    
    // Начинаем поллинг сразу
    console.log('Starting polling for session:', sessionId)
    poll()
    
    // Возвращаем функцию для остановки поллинга
    return () => {
      console.log('Stopping polling for session:', sessionId)
      isPolling = false
    }
  }

  // Stores endpoints
  async getStores() {
    const response = await fetch(`${API_BASE_URL}/stores/stores/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStore(storeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/stores/${storeId}/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createStore(storeData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/stores/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(storeData)
    })
    return this.handleResponse(response)
  }

  async updateStore(storeId: string, storeData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/stores/${storeId}/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(storeData)
    })
    return this.handleResponse(response)
  }

  async deleteStore(storeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/stores/${storeId}/`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStoreAddresses(storeId?: string) {
    const baseUrl = `${API_BASE_URL}/stores/store-addresses/`
    const url = storeId ? `${baseUrl}?store=${encodeURIComponent(storeId)}` : baseUrl
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createStoreAddress(addressData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/store-addresses/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(addressData)
    })
    return this.handleResponse(response)
  }

  async deleteStoreAddress(addressId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/store-addresses/${addressId}/`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStorePhones(storeId?: string) {
    const baseUrl = `${API_BASE_URL}/stores/store-phones/`
    const url = storeId ? `${baseUrl}?store=${encodeURIComponent(storeId)}` : baseUrl
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createStorePhone(phoneData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/store-phones/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(phoneData)
    })
    return this.handleResponse(response)
  }

  async deleteStorePhone(phoneId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/store-phones/${phoneId}/`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  // Dashboard stats
  async getDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }
}

export const apiService = new ApiService() 
