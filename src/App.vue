<script setup>
import CubeCSS from './components/renderers/CubeCSS.vue'
import DebugPanel from './components/DebugPanel.vue'
import InteractionReplay from './components/InteractionReplay.vue'
</script>

<template>
  <div class="app-content">
    <DebugPanel />
    <InteractionReplay />
    <CubeCSS />
  </div>
</template>

<style scoped>
.app-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 2rem 0;
  position: relative;
  z-index: 1;
  user-select: none;
  -webkit-user-select: none;
}
</style>
