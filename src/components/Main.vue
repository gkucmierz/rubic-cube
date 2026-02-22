<script setup>
import { computed } from 'vue'
import { useRenderer } from '../composables/useRenderer'
import { useCube } from '../composables/useCube'
import CubeCSS from './renderers/CubeCSS.vue'
import CubeSVG from './renderers/CubeSVG.vue'
import CubeCanvas from './renderers/CubeCanvas.vue'
import CubeRubiksJS from './renderers/CubeRubiksJS.vue'

const { activeRenderer, RENDERERS } = useRenderer()
const { cubeState } = useCube()

const currentRendererComponent = computed(() => {
  switch (activeRenderer.value) {
    case RENDERERS.CSS:
      return CubeCSS
    case RENDERERS.SVG:
      return CubeSVG
    case RENDERERS.CANVAS:
      return CubeCanvas
    case RENDERERS.RUBIKS_JS:
      return CubeRubiksJS
    default:
      return CubeCSS
  }
})

const formattedState = computed(() => {
  if (!cubeState.value) return '{}'

  // Custom formatter to keep faces compact
  const s = cubeState.value
  const faces = Object.keys(s)

  // Helper to shorten colors
  const shortColor = (c) => c && typeof c === 'string' ? c[0].toUpperCase() : '-'

  let out = '{\n'
  faces.forEach((face, i) => {
    const matrix = s[face]
    // Format as ["WWW", "WWW", "WWW"]
    const rows = matrix.map(row => `"${row.map(shortColor).join('')}"`).join(', ')
    out += `  "${face}": [ ${rows} ]`
    if (i < faces.length - 1) out += ','
    out += '\n'
  })
  out += '}'
  return out
})
</script>

<template>
  <div class="wrapper">
    <div class="renderer-container">
      <component :is="currentRendererComponent" />
    </div>

    <div class="state-panel">
      <h3>Cube State</h3>
      <pre>{{ formattedState }}</pre>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
  padding: 2rem;
  box-sizing: border-box;
}

.renderer-container {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-width: 300px;
}

.state-panel {
  flex: 1;
  max-width: 400px;
  background: rgba(0, 0, 0, 0.05);
  padding: 1rem;
  border-radius: 8px;
  max-height: 80vh;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.8rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #333;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
