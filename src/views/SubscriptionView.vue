<template>
  <div class="subscription-page">
    <div class="row mb-4">
      <div class="col-12">
        <h1 class="h3 mb-0">Подписки</h1>
        <p class="text-muted">Управление тарифными планами и подписками</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">Тарифные планы</h5>
        <button class="btn btn-primary">
          <i data-feather="plus"></i>
          Добавить план
        </button>
      </div>
      <div class="card-body">
        <p class="text-muted">Здесь будут тарифные планы...</p>
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