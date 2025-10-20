# TGPoint Admin Frontend

## Что это
- Админ-панель TGPoint на Vue 3 + TypeScript (Vite).
- Используем Pinia и Vue Router, авторизация через JWT.
- Вёрстка основана на шаблоне Phoenix 1.23 (Bootstrap 5) из `phoenix-v1.23.0`, все его CSS/JS лежат в `public/`.

## Как запускать
- `cd /Users/kirill/Projects/TGPoint/tgpoint-admin`
- `npm install`
- `npm run dev` (порт 5173, Vite proxy шлёт `/auth`, `/stores`, `/dashboard` на `http://localhost:9000`).
- Для продакшена: `npm run build`, при необходимости задать `VITE_API_BASE_URL`.

## Ключевые файлы
- `src/main.ts` — монтирует приложение после загрузки Phoenix (`window.phoenix`, `window.bootstrap`, `window.config`), подключает Pinia/Router и инициализирует Feather/SimpleBar.
- `src/App.vue` — Telegram auto-login (`tryTelegramAutoLogin`), показ лэйаута (Sidebar + TopNavbar) только для авторизованных пользователей.
- `src/router/index.ts` — маршруты: `/login`, `/`, `/stores`, `/products`, `/subscription`, `/users`, `/settings`; есть guard по `authStore.isAuthenticated`.
- `src/stores/auth.ts`, `src/stores/stores.ts` — Pinia-хранилища токенов и списка магазинов.
- `src/services/api.ts` — один сервис для всех REST запросов; уважает `VITE_API_BASE_URL`, иначе работает через Vite proxy.
- `src/utils/telegram.ts` — интеграция с Telegram WebApp (`initTelegramUI`, `tryTelegramAutoLogin`).

## Phoenix integration
- Исходник шаблона: `/Users/kirill/Projects/TGPoint/phoenix-v1.23.0`. Разметку/стили берем оттуда.
- В `public/vendors`, `public/assets`, `public/css` лежат скопированные файлы Phoenix; порядок подключения см. `index.html` (скрипты config.js → CSS → Bootstrap → phoenix.js → Vue).
- `Sidebar.vue`, `TopNavbar.vue` повторяют DOM Phoenix; не удалять классы `navbar-vertical`, `dropdown-indicator` и т.д. — они нужны скриптам.
- Для новых страниц: копируем HTML из шаблона → переносим в `src/views/...` → заменяем статические данные на Vue. Feather icons (`data-feather`) обновляются автоматом через `window.feather.replace()`.
- Доп. правки стилей — в `public/css/overrides.css` или через scoped-стили в компонентах.

## Связка с бекендом
- Django API (порт 9000) отвечает за маршруты `/auth/*`, `/stores/*`, `/dashboard/*`.
- Токены сохраняются в localStorage (`authStore`), при 401 вызывается `logout()` и редирект на `/login`.
- Для прод-окружения задаём `VITE_API_BASE_URL=https://<host>` и отключаем dev-proxy.

## Особенности и заметки
- Компоненты активно используют глобальные объекты Phoenix (например `window.phoenix.toggleNavbarVerticalCollapsed`). Следим, чтобы эти скрипты были загружены до монтирования Vue.
- Telegram WebApp: `initTelegramUI()` настраивает тему, `tryTelegramAutoLogin()` отправляет `initData` на `/auth/LJDHEDergf32fdf45gb7h54gfdsdcn34/`.
- `apiService` содержит много методов (stores, products, catalog sections, dashboard). При добавлении новых ручек — расширяем этот класс, чтобы всё было в одном месте.
- Вьюхи (`src/views/*.vue`) пока черновые: Dashboard тянет Phoenix графики, остальные страницы подготавливают формы/таблицы.
- Если чего-то «не работает», первым делом проверяем консоль в `index.html` — там много диагностических логов по загрузке Phoenix/Bootstrap.
