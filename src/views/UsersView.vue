<template>
  <div class="users-page">
    <div class="row mb-4">
      <div class="col-12">
        <h1 class="h3 mb-0">Пользователи</h1>
        <p class="text-muted">Управление пользователями системы</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">Список пользователей</h5>
        <button class="btn btn-primary">
          <i data-feather="plus"></i>
          Добавить пользователя
        </button>
      </div>
      <div class="card-body">
        <p class="text-muted">Здесь будет список пользователей...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  if (window.feather) {
    window.feather.replace()
  }
})
</script> 