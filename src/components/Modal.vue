<template>
  <div class="modal-backdrop">
    <div class="modal-content">
      <button class="modal-close" @click="$emit('close')">&times;</button>
      <slot />
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  position: relative;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: #888;
  cursor: pointer;
}
</style>
