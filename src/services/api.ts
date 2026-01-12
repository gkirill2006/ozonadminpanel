import { useAuthStore } from '@/stores/auth'

// Базовый URL API: по умолчанию относительные пути (через Vite proxy)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''

class ApiService {
  private getHeaders(options?: { contentType?: 'json' | 'form-data' | null }): HeadersInit {
    const authStore = useAuthStore()
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Accept': 'application/json'
    }
    const contentType = options?.contentType === undefined ? 'json' : options.contentType
    if (contentType === 'json') {
      headers['Content-Type'] = 'application/json'
    }
    if (contentType === 'form-data') {
      delete headers['Content-Type']
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

      let errorData: any = null
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = null
      }

      if (errorData) {
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        ;(error as any).data = errorData
        ;(error as any).status = response.status
        throw error
      }

      throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 100)}`)
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

  pollForToken(
    sessionId: string, 
    onSuccess: (data: any) => void, 
    onError: (error: string) => void,
    onProgress?: (progress: number) => void
  ) {
    const maxAttempts = 600 // 10 минут * 60 попыток (каждую секунду)
    const pollInterval = 1000 // 1 секунда
    let attempts = 0
    let isPolling = true
    let pollTimeout: ReturnType<typeof setTimeout> | null = null
    
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
          pollTimeout = setTimeout(poll, pollInterval)
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
            pollTimeout = setTimeout(poll, pollInterval)
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
          pollTimeout = setTimeout(poll, pollInterval)
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
      if (pollTimeout) {
        clearTimeout(pollTimeout)
        pollTimeout = null
      }
    }
  }

  async getAuthStores() {
    const response = await fetch(`${API_BASE_URL}/auth/stores/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createAuthStore(storeData: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(storeData)
    })
    return this.handleResponse(response)
  }

  async getStoreFilters(storeId: string | number) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/filters/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async updateStoreFilters(storeId: string | number, payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/filters/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async fetchPlannerData(storeId: string | number) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/planner/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ store_id: storeId })
    })
    return this.handleResponse(response)
  }

  async fetchPlannerPivot(storeId: string | number) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/planner/pivot/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ store_id: storeId })
    })
    return this.handleResponse(response)
  }

  async syncFbsPostings(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/sync/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async refreshFbsPostings(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/refresh/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async getFbsPostings(params: Record<string, string>) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/`, window.location.origin)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getFbsPostingCounts(params: { storeId: string | number; includeArchived?: boolean | number }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/counts/`, window.location.origin)
    url.searchParams.set('store_id', String(params.storeId))
    if (params.includeArchived) {
      url.searchParams.set('include_archived', '1')
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async printFbsPostings(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/print/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })

    if (response.status === 409) {
      try {
        const data = await response.json()
        return { needsForce: true, ...data }
      } catch {
        return { needsForce: true, message: 'Этот заказ уже был распечатан. Повторить?' }
      }
    }

    return this.handleResponse(response)
  }

  async exportFbsPostings(
    storeId: string | number,
    options?: { format?: 'csv' | 'xlsx'; limit?: number }
  ) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/export/`, window.location.origin)
    url.searchParams.set('store_id', String(storeId))
    if (options?.format) {
      url.searchParams.set('format', options.format)
    }
    if (typeof options?.limit === 'number') {
      url.searchParams.set('limit', String(options.limit))
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    if (!response.ok) {
      return this.handleResponse(response)
    }
    const blob = await response.blob()
    return { blob }
  }

  async exportFbsHistory(
    storeId: string | number,
    options?: { format?: 'csv' | 'xlsx'; limit?: number }
  ) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/export/history/`, window.location.origin)
    url.searchParams.set('store_id', String(storeId))
    if (options?.format) {
      url.searchParams.set('format', options.format)
    }
    if (typeof options?.limit === 'number') {
      url.searchParams.set('limit', String(options.limit))
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    if (!response.ok) {
      return this.handleResponse(response)
    }
    const blob = await response.blob()
    return { blob }
  }

  async getFbsHistory(params: {
    storeId: string | number
    includeArchived?: boolean | number
    postingNumbers?: string
    status?: string
    since?: string
    to?: string
    limit?: number
    offset?: number
  }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/history/`, window.location.origin)
    url.searchParams.set('store_id', String(params.storeId))
    if (params.includeArchived) {
      url.searchParams.set('include_archived', '1')
    }
    if (params.postingNumbers) {
      url.searchParams.set('posting_numbers', params.postingNumbers)
    }
    if (params.status) {
      url.searchParams.set('status', params.status)
    }
    if (params.since) {
      url.searchParams.set('since', params.since)
    }
    if (params.to) {
      url.searchParams.set('to', params.to)
    }
    if (params.limit) {
      url.searchParams.set('limit', String(params.limit))
    }
    if (params.offset) {
      url.searchParams.set('offset', String(params.offset))
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createFbsLabels(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/labels/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })

    if (response.status === 202) {
      try {
        return { pending: true, ...(await response.json()) }
      } catch {
        return { pending: true }
      }
    }

    const contentType = response.headers.get('content-type') || ''
    if (response.ok && contentType.includes('application/pdf')) {
      const blob = await response.blob()
      return { blob }
    }

    return this.handleResponse(response)
  }

  async createFbsShipment(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/ship/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async getFbsShipBatches(params: { storeId: string | number }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/ship/batches/`, window.location.origin)
    url.searchParams.set('store_id', String(params.storeId))
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getFbsShipBatchDetail(batchId: string) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/ship/batches/${batchId}/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async moveFbsShipBatch(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/ship/batches/move/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async createFbsCarriage(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/carriage/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async getFbsCarriages(params: { storeId: string | number }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/carriages/`, window.location.origin)
    url.searchParams.set('store_id', String(params.storeId))
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getFbsCarriageDetail(carriageId: string | number) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/postings/carriages/${carriageId}/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getFbsNotShipped(params: {
    storeId: string | number
    refresh?: boolean | number
    since?: string
    to?: string
    limit?: number
  }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/postings/not-shipped/`, window.location.origin)
    url.searchParams.set('store_id', String(params.storeId))
    if (params.refresh) {
      url.searchParams.set('refresh', '1')
    }
    if (params.since) {
      url.searchParams.set('since', params.since)
    }
    if (params.to) {
      url.searchParams.set('to', params.to)
    }
    if (params.limit) {
      url.searchParams.set('limit', String(params.limit))
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createSupplyDrafts(payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/create/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async getSupplyDraftBatch(batchId: string) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/batch/${batchId}/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getSupplyDraftBatches(params?: { storeId?: string | number }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/drafts/batches/`, window.location.origin)
    if (params?.storeId) url.searchParams.set('store_id', String(params.storeId))
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async selectDraftWarehouse(draftId: string | number, warehouseId: string | number) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/${draftId}/select-warehouse/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ warehouse_id: warehouseId })
    })
    return this.handleResponse(response)
  }

  async fetchDraftTimeslots(payload: { batch_id: string; date_from: string; days: number }) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/timeslots/fetch/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async getDraftTimeslots(batchId: string) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/batch/${batchId}/timeslots/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async confirmSupplyDraftBatch(
    batchId: string,
    timeslot: { from_in_timezone: string; to_in_timezone: string }
  ) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/batch/${batchId}/confirm-supply/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ timeslot })
    })
    return this.handleResponse(response)
  }

  async getConfirmedDraftBatches(params?: { storeId?: string | number }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/drafts/batches/confirmed/`, window.location.origin)
    if (params?.storeId) url.searchParams.set('store_id', String(params.storeId))
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getSupplyInfo(batchId: string, params?: { refresh?: boolean }) {
    const url = new URL(`${API_BASE_URL}/api/ozon/drafts/batch/${batchId}/supply-info/`, window.location.origin)
    if (params?.refresh) {
      url.searchParams.set('refresh', '1')
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async deleteSupplyDraft(draftId: string | number) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/${draftId}/`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async moveDraftToNewBatch(batchId: string, draftId: string | number) {
    const response = await fetch(`${API_BASE_URL}/api/ozon/drafts/batch/${batchId}/move-draft/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ draft_id: draftId })
    })
    return this.handleResponse(response)
  }

  async searchFboWarehouses(params: { storeId: string | number; supplyTypes?: string[] | string; search?: string }) {
    const { storeId, supplyTypes, search } = params
    const payload: Record<string, unknown> = { store_id: storeId }
    if (supplyTypes) payload.filter_by_supply_type = supplyTypes
    if (search) payload.search = search

    const response = await fetch(`${API_BASE_URL}/api/ozon/warehouse/fbo/search/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  // Stores endpoints
  async getStores() {
    const response = await fetch(`${API_BASE_URL}/auth/stores/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStore(storeId: string) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStoreInvites() {
    const response = await fetch(`${API_BASE_URL}/auth/stores/invites/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStoreAccesses(storeId: string | number) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/accesses/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async getStoreNotifications(storeId: string | number) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/notifications/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async updateStoreNotifications(storeId: string | number, payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/notifications/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async deleteStoreAccess(storeId: string | number, userId: string | number) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/accesses/${userId}/`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createStore(storeData: any) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(storeData)
    })
    return this.handleResponse(response)
  }

  async updateStore(storeId: string, storeData: any) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(storeData)
    })
    return this.handleResponse(response)
  }

  async getUserStoreFilters(storeId: string | number) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/filters/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async updateUserStoreFilters(storeId: string | number, payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/filters/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async setStoreFilters(storeId: string | number, payload: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/filters/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })
    return this.handleResponse(response)
  }

  async deleteStore(storeId: string) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async inviteStoreUser(storeId: string | number, username: string) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/invite/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username })
    })
    return this.handleResponse(response)
  }

  async revokeStoreInvite(storeId: string | number, username: string) {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/invite/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ username })
    })
    return this.handleResponse(response)
  }

  async respondStoreInvite(storeId: string | number, decision: 'accept' | 'reject') {
    const response = await fetch(`${API_BASE_URL}/auth/stores/${storeId}/invite/respond/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ decision })
    })
    return this.handleResponse(response)
  }

  async getBusinessTypes() {
    const response = await fetch(`${API_BASE_URL}/stores/business-types/`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async setStoreBusinessType(storeId: string, businessType: string) {
    const response = await fetch(`${API_BASE_URL}/stores/stores/${storeId}/set-business-type/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ business_type: businessType })
    })
    return this.handleResponse(response)
  }

  async getCategoriesByType(type: string) {
    const response = await fetch(`${API_BASE_URL}/stores/categories/?type=${encodeURIComponent(type)}`, {
      method: 'GET',
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

  async getCatalogSections(params: { store: string; parent?: string | null } | null = null) {
    const query = new URLSearchParams()
    if (params?.store) query.append('store', params.store)
    if (params?.parent !== undefined) {
      if (params.parent === null) {
        query.append('parent', 'null')
      } else {
        query.append('parent', params.parent)
      }
    }

    const url = `${API_BASE_URL}/stores/catalog-sections/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createCatalogSection(sectionData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/catalog-sections/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(sectionData)
    })
    return this.handleResponse(response)
  }

  async getProducts(params: { store: string; section?: string | null } | null = null) {
    const query = new URLSearchParams()
    if (params?.store) query.append('store', params.store)
    if (params?.section) query.append('section', params.section)

    const url = `${API_BASE_URL}/stores/products/${query.toString() ? `?${query.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return this.handleResponse(response)
  }

  async createProduct(productData: FormData | Record<string, any>) {
    const isFormData = typeof FormData !== 'undefined' && productData instanceof FormData
    const response = await fetch(`${API_BASE_URL}/stores/products/`, {
      method: 'POST',
      headers: this.getHeaders(isFormData ? { contentType: 'form-data' } : undefined),
      body: isFormData ? productData : JSON.stringify(productData)
    })
    return this.handleResponse(response)
  }

  async createProductVariant(variantData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/product-variants/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(variantData)
    })
    return this.handleResponse(response)
  }

  async createProductComponent(componentData: any) {
    const response = await fetch(`${API_BASE_URL}/stores/product-components/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(componentData)
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
