/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

interface TelegramBackButton {
  show(): void
  hide(): void
  onClick(callback: () => void): void
  offClick(callback: () => void): void
}

interface TelegramWebApp {
  ready(): void
  expand(): void
  initData: string
  initDataUnsafe: Record<string, unknown>
  BackButton?: TelegramBackButton
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
}

interface TelegramNamespace {
  WebApp?: TelegramWebApp
}

interface Window {
  Telegram?: TelegramNamespace
  feather?: {
    replace(): void
  }
}
