# OPanel Admin Frontend

## Что это
- Админ-панель OPanel на Vue 3 + TypeScript (Vite).
- Используем Pinia и Vue Router, авторизация через JWT.
- Вёрстка основана на шаблоне Phoenix 1.23 (Bootstrap 5) из `phoenix-v1.23.0`, все его CSS/JS лежат в `public/`.

## Как запускать
- `cd /Users/kirill/Projects/OPanel/opanel-admin`
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
- Исходник шаблона: `/Users/kirill/Projects/OPanel/phoenix-v1.23.0`. Разметку/стили берем оттуда.
- В `public/vendors`, `public/assets`, `public/css` лежат скопированные файлы Phoenix; порядок подключения см. `index.html` (скрипты config.js → CSS → Bootstrap → phoenix.js → Vue).
- `Sidebar.vue`, `TopNavbar.vue` повторяют DOM Phoenix; не удалять классы `navbar-vertical`, `dropdown-indicator` и т.д. — они нужны скриптам.
- Для новых страниц: копируем HTML из шаблона → переносим в `src/views/...` → заменяем статические данные на Vue. Feather icons (`data-feather`) обновляются автоматом через `window.feather.replace()`.
- Доп. правки стилей — в `public/css/overrides.css` или через scoped-стили в компонентах.
- `Sidebar.vue` поддерживает «магазинный» режим: если выбран активный магазин или маршрут `/products`, меню переключается на магазинные пункты. Для Telegram WebApp отступ сверху задаётся через вычисляемый `navContentStyle` (safe-area + 72/172 px в зависимости от ширины окна), чтобы меню не перекрывалось системными элементами и кнопкой «Закрыть».

## Связка с бекендом
- Django API (порт 9000) отвечает за маршруты `/auth/*`, `/stores/*`, `/dashboard/*`.
- Токены сохраняются в localStorage (`authStore`), при 401 вызывается `logout()` и редирект на `/login`.
- Базовый URL API задаём через `VITE_API_BASE_URL` (см. `.env.example`). Для продового бэка: `VITE_API_BASE_URL=https://ozon.codemark.me`.

## Особенности и заметки
- Компоненты активно используют глобальные объекты Phoenix (например `window.phoenix.toggleNavbarVerticalCollapsed`). Следим, чтобы эти скрипты были загружены до монтирования Vue.
- Telegram WebApp: `initTelegramUI()` настраивает тему, `tryTelegramAutoLogin()` отправляет `initData` на `/auth/LJDHEDergf32fdf45gb7h54gfdsdcn34/`.
- `apiService` содержит много методов (stores, products, catalog sections, dashboard). При добавлении новых ручек — расширяем этот класс, чтобы всё было в одном месте.
- Вьюхи (`src/views/*.vue`) пока черновые: Dashboard тянет Phoenix графики, остальные страницы подготавливают формы/таблицы.
- Если чего-то «не работает», первым делом проверяем консоль в `index.html` — там много диагностических логов по загрузке Phoenix/Bootstrap.

## Planner (Store Workspace)
- Основная реализация в `src/views/workspace/PlannerSection.vue`:
  - Фильтры подтягиваются и сохраняются через `/auth/stores/<id>/filters/` (методы `apiService.getStoreFilters`, `apiService.updateStoreFilters`).
  - После загрузки/сохранения фильтра автоматически запрашиваем данные планера `POST /api/ozon/planner/` (`apiService.fetchPlannerData`). Ответ ожидается в формате `clusters[].products[]`; маппинг лежит в функции `extractPlannerRows`.
  - Таблица поддерживает два режима загрузки: сплэш «Готовим таблицу…» при первом запросе и полупрозрачный overlay при последующих пересчётах.
- Колонки «Категория» и «Тип товара» имеют фиксированную ширину, автоматически показывают Tooltip (через Teleport в `<body>`) при наведении и не влияют на hover строк.
- Группы заголовков подсвечены цветами (см. `headerColorClasses` и стили `header-soft-*`, `header-strong-blue`), последняя колонка «Количество, шт.» центрирована.
- Sticky-колонки: фиксированы только «Фото» и «Артикул поставщика», чтобы горизонтальный скролл был бесконфликтным; остальные колонки скроллятся свободно.
- Над таблицей есть переключатель «Планирование» ↔ «Заказать товар». Вторая вкладка показывает сводную таблицу по `summary[]` из ответа (`offer_id`, `barcode`, `total_for_delivery`). Запрос выполняется один раз, данные обеих вкладок обновляются синхронно.
