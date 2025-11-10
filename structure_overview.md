# Структура `adminpanel`

Кодовая база — фронтенд админ-панели OPanel на Vue 3 + TypeScript (Vite, Pinia, Vue Router) с шаблоном Phoenix 1.23 (Bootstrap 5). Вся папка `public/` содержит статические ассеты Phoenix; `src/` хранит Vue-приложение и бизнес‑логику.

## Верхний уровень
```
adminpanel/
├── README.md, front_project_notes.md      — описание проекта и нюансов Phoenix-интеграции
├── index.html                             — точка входа, подключает Phoenix CSS/JS и div#app
├── package.json / package-lock.json       — зависимости (Vue 3, Pinia, Router, Bootstrap, Chart.js)
├── vite.config.ts                         — конфиг dev-сервера (порт 5173, proxy /auth|/stores|/dashboard)
├── eslint.config.ts, tsconfig*.json, env.d.ts — конфигурация TypeScript/ESLint
├── public/                                — статика Phoenix (css, vendors, assets)
├── src/                                   — исходники Vue + TypeScript
├── dist/                                  — собранный Vite-бандл (после `npm run build`)
├── node_modules/                          — установленные npm-зависимости
└── front_project_notes.md                 — дополнительные заметки по шаблону и бэкенду
```

## `src/` (Vue + логика)
- `main.ts` — создает приложение, ждет загрузку `window.phoenix/bootstrap/config`, затем монтирует `App.vue`, включает Pinia и Router, следит за Feather Icons и SimpleBar.
- `App.vue` — контейнер приложения: запускает `initTelegramUI()`/`tryTelegramAutoLogin()`, строит лэйаут (Sidebar + TopNavbar) только после авторизации.
- `router/index.ts` — объявляет маршруты (`/login`, `/`, `/stores`, `/store-settings`, `/products`, `/subscription`, `/users`, `/settings`), добавляет guard через `useAuthStore`.
- `assets/` — локальная копия Phoenix ассетов (в дополнение к `public/`):
  - `css/` — темы `theme*.css`, `user*.css` + RTL-версии.
  - `js/` — `config.js`, `phoenix.js`, `pages/` и `dashboards/` для шаблонных страниц.
  - `data/`, `img/`, `video/`, `logo.svg`, `base.css` — вспомогательные медиа и стили.
- `components/` — переиспользуемые Vue-компоненты Phoenix-лэйаута:
  - `Sidebar.vue` — вертикальное меню с режимом магазинов/общего ядра.
  - `TopNavbar.vue` — верхняя панель (аватар, уведомления).
  - `Modal.vue`, `HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue` — базовые шаблонные примеры/заготовки.
  - `icons/` — SVG-компоненты (`IconCommunity.vue`, `IconTooling.vue` и т.д.).
- `views/` — страницы под роуты:
  - `LoginView.vue` — Telegram WebApp / JWT вход.
  - `DashboardView.vue` — дашборд с графиками Phoenix.
  - `StoresView.vue`, `StoreSettingsView.vue` — список магазинов и настройки конкретного магазина.
  - `ProductsView.vue`, `UsersView.vue`, `SubscriptionView.vue`, `SettingsView.vue`, `AboutView.vue` — заготовки для соответствующих разделов.
- `services/api.ts` — единый `ApiService` (авторизация, магазины, debug-логгер для Telegram MiniApp, методы `generateSessionId`, `obtainToken`, `pollForToken`, `getStores`, `createStore` и т.д.). Использует `VITE_API_BASE_URL` или Vite proxy, автоматически подставляет JWT заголовки из Pinia.
- `stores/` — Pinia-хранилища:
  - `auth.ts` — управление `accessToken`, `refreshToken`, профилем пользователя, logout очищает localStorage.
  - `stores.ts` — загрузка/кеширование магазинов (`fetchStores`, `createStore`, `setActiveStoreId`).
  - `counter.ts` — пример счётчика (шаблон от Vite).
- `utils/telegram.ts` — интеграция с Telegram WebApp (`initTelegramUI`, `tryTelegramAutoLogin`, логирование MiniApp).
- `services/`, `types/`, `stores.ts`, `env.d.ts` — общие типы и объявления.

## `public/` (статические ассеты Phoenix)
- `index.html` использует файлы отсюда через `<link>/<script>`.
- `css/` — продовые минифицированные Phoenix стили (`theme*.css`, `user*.css`, `overrides.css`).
- `assets/` — изображения, иконки, иллюстрации, данные и скрипты Phoenix (аналогичная структура `animated-icons/`, `brands/`, `chat/`, `sections/`, `js/`, `spot-illustrations/`, т.д.).
- `vendors/` — внешние библиотеки, которые ожидает Phoenix (Bootstrap bundle, SimpleBar, Glightbox, Leaflet и др.).
- `favicon.ico` — иконка приложения.

## Конфигурация и вспомогательные файлы
- `env.d.ts` (корневой и внутри `src/`) — типы модулей и `import.meta`.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — раздельные настройки компиляции для приложения и скриптов.
- `eslint.config.ts` — единая конфигурация ESLint + `@vue/eslint-config-typescript`.
- `front_project_notes.md` — подробные заметки по сборке, Telegram-логике и работе с Phoenix.

## Служебные каталоги
- `dist/` — результат `npm run build`, готов к деплою (чистится/создается Vite).
- `node_modules/` — зависимости (не редактировать вручную).

> Чтобы запустить проект: `npm install` → `npm run dev` (Vite на 5173, проксирует `/auth|/stores|/dashboard` на `http://localhost:9000`). Для продакшена задать `VITE_API_BASE_URL` и собрать `npm run build`.
