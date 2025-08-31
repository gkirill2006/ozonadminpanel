import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Import Feather Icons
import 'feather-icons'

// Убираем Bootstrap - используем только Phoenix CSS
// import 'bootstrap/dist/css/bootstrap.min.css'
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Убираем кастомные стили - используем только Phoenix
// import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Ждем загрузки всех Phoenix скриптов перед монтированием
const waitForPhoenix = async (): Promise<void> => {
  return new Promise((resolve) => {
    const checkPhoenix = () => {
      // Проверяем наличие Phoenix и Bootstrap
      if (window.phoenix && window.bootstrap && window.config) {
        resolve()
      } else {
        // Проверяем каждые 100мс
        setTimeout(checkPhoenix, 100)
      }
    }
    checkPhoenix()
  })
}

// Инициализируем приложение после загрузки Phoenix
const initApp = async () => {
  await waitForPhoenix()
  
  app.mount('#app')

  // Initialize Feather Icons
  if (window.feather) {
    window.feather.replace()
  }

  // Re-initialize Feather Icons after DOM updates
  const observer = new MutationObserver(() => {
    if (window.feather) {
      window.feather.replace()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  // Initialize SimpleBar
  if (window.SimpleBar) {
    window.SimpleBar.initEl = function(el: any) {
      if (el && !el.classList.contains('simplebar-scrollable-y')) {
        new window.SimpleBar(el);
      }
    }
  }
}

// Запускаем инициализацию
initApp()
