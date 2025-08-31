<template>
  <div class="products-page">
    <div class="row mb-4">
      <div class="col-12">
        <h1 class="h3 mb-0">Товары</h1>
        <p class="text-muted">Управление товарами в магазинах</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">Список товаров</h5>
        <button class="btn btn-primary">
          <i data-feather="plus"></i>
          Добавить товар
        </button>
      </div>
      <div class="card-body">
        <p class="text-muted">Здесь будет список товаров...</p>
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