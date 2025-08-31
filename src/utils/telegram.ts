import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export function initTelegramUI(): void {
  try {
    const w = window as any
    const tg = w?.Telegram?.WebApp
    if (!tg) return
    tg.ready && tg.ready()
    tg.expand && tg.expand()
    try {
      tg.setHeaderColor && tg.setHeaderColor('secondary_bg_color')
      tg.setBackgroundColor && tg.setBackgroundColor('#ffffff')
    } catch {}
    document.documentElement.classList.add('tg-webapp')
  } catch {}
}

export async function tryTelegramAutoLogin(): Promise<boolean> {
  try {
    const w = window as any
    const tg = w?.Telegram?.WebApp
    await apiService.miniappLog('tryTelegramAutoLogin start')
    if (!tg) {
      await apiService.miniappLog('Telegram.WebApp not found', 'warn')
      return false
    }

    // Ensure WebApp is ready
    try {
      tg.ready && tg.ready()
      tg.expand && tg.expand()
      await apiService.miniappLog('tg.ready/expand called')
    } catch (e) {
      await apiService.miniappLog('tg.ready/expand error', 'warn', String(e))
    }

    const initData = tg.initData as string
    await apiService.miniappLog('initData length', 'info', initData ? initData.length : 0)
    if (!initData) {
      await apiService.miniappLog('initData is empty, skip auto-login', 'warn')
      return false
    }

    await apiService.miniappLog('Sending initData to backend TelegramWebAppLoginAPIView')
    const data = await apiService.telegramWebAppLogin(initData)
    await apiService.miniappLog('Backend response OK, saving tokens')

    const authStore = useAuthStore()
    authStore.setTokens(data.access, data.refresh)
    authStore.setUser({
      username: data.username,
      telegram_id: data.telegram_id
    })
    await apiService.miniappLog('Auth stored successfully')
    return true
  } catch (e) {
    await apiService.miniappLog('auto-login failed', 'error', String(e))
    return false
  }
}
