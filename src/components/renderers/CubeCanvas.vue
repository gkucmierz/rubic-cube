<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('Canvas Renderer mounted (placeholder)')
})
</script>

<template>
  <div class="canvas-container">
    <canvas width="300" height="300"></canvas>
    <div class="overlay">
      Canvas Renderer (Coming Soon)
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  width: 300px;
  height: 300px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dashed rgba(255, 255, 255, 0.3);
}

.overlay {
  position: absolute;
  color: white;
  pointer-events: none;
}
</style>
