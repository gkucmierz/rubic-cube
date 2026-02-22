
<script setup>
import { useDebug } from '../composables/useDebug'
import { ref } from 'vue'

const { settings } = useDebug()
const isOpen = ref(true)

const toggle = () => isOpen.value = !isOpen.value
</script>

<template>
  <div class="debug-panel" :class="{ open: isOpen }">
    <div class="header" @click="toggle">
      <span>🛠️ Debug Config</span>
      <span>{{ isOpen ? '▼' : '▲' }}</span>
    </div>
    
    <div v-if="isOpen" class="content">
      <div class="section">
        <h3>View Rotation</h3>
        <label>
          <input type="checkbox" v-model="settings.viewRotation.invertX"> Invert X (Up/Down)
        </label>
        <label>
          <input type="checkbox" v-model="settings.viewRotation.invertY"> Invert Y (Left/Right)
        </label>
        <label>
          Speed: <input type="number" step="0.1" v-model="settings.viewRotation.speed">
        </label>
      </div>

      <div class="section">
        <h3>Drag Mappings (Sign)</h3>
        <p class="hint">Adjust signs (-1 or 1) to correct drag direction</p>
        
        <div class="face-group" v-for="(val, face) in settings.dragMapping" :key="face">
          <strong>{{ face.toUpperCase() }}</strong>
          <div class="controls">
            <label>X: <input type="number" :step="2" :min="-1" :max="1" v-model="settings.dragMapping[face].x"></label>
            <label>Y: <input type="number" :step="2" :min="-1" :max="1" v-model="settings.dragMapping[face].y"></label>
          </div>
        </div>
      </div>
      
       <div class="section">
        <h3>Physics</h3>
        <label>
          <input type="checkbox" v-model="settings.physics.enabled"> Inertia & Snap
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-panel {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 250px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 10px;
  background: #333;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  user-select: none;
}

.content {
  padding: 10px;
  overflow-y: auto;
}

.section {
  margin-bottom: 15px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

h3 {
  margin: 0 0 8px 0;
  color: #aaa;
  font-size: 11px;
  text-transform: uppercase;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  cursor: pointer;
}

input[type="number"] {
  width: 40px;
  background: #222;
  border: 1px solid #444;
  color: #fff;
  padding: 2px;
}

.face-group {
  margin-bottom: 8px;
  background: #222;
  padding: 5px;
  border-radius: 4px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.hint {
  font-size: 10px;
  color: #888;
  margin-bottom: 5px;
}
</style>
