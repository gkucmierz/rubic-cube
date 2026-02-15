<script setup>
import { computed } from 'vue'
import { useRenderer } from '../composables/useRenderer'
import CubeCSS from './renderers/CubeCSS.vue'
import CubeSVG from './renderers/CubeSVG.vue'
import CubeCanvas from './renderers/CubeCanvas.vue'

const { activeRenderer, RENDERERS } = useRenderer()

const currentRendererComponent = computed(() => {
  switch (activeRenderer.value) {
    case RENDERERS.CSS:
      return CubeCSS
    case RENDERERS.SVG:
      return CubeSVG
    case RENDERERS.CANVAS:
      return CubeCanvas
    default:
      return CubeCSS
  }
})
</script>

<template>
  <div class="wrapper">
    <component :is="currentRendererComponent" />
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
  justify-content: center;
}
</style>
