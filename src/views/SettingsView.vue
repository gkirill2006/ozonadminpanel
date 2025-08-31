<template>
  <div class="settings-page">
    <div class="row mb-4">
      <div class="col-12">
        <h1 class="h3 mb-0">Настройки</h1>
        <p class="text-muted">Настройки системы и администратора</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">Общие настройки</h5>
      </div>
      <div class="card-body">
        <p class="text-muted">Здесь будут настройки системы...</p>
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