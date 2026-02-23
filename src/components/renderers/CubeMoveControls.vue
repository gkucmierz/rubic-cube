<script setup>
const emit = defineEmits(['move', 'scramble'])
</script>

<template>
  <div>
    <div class="controls controls-left">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'U')">U</button>
        <button class="btn-neon move-btn" @click="emit('move', 'D')">D</button>
        <button class="btn-neon move-btn" @click="emit('move', 'L')">L</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'U-prime')">U'</button>
        <button class="btn-neon move-btn" @click="emit('move', 'D-prime')">D'</button>
        <button class="btn-neon move-btn" @click="emit('move', 'L-prime')">L'</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'U2')">U2</button>
        <button class="btn-neon move-btn" @click="emit('move', 'D2')">D2</button>
        <button class="btn-neon move-btn" @click="emit('move', 'L2')">L2</button>
      </div>
    </div>

    <div class="controls controls-right">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'R')">R</button>
        <button class="btn-neon move-btn" @click="emit('move', 'F')">F</button>
        <button class="btn-neon move-btn" @click="emit('move', 'B')">B</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'R-prime')">R'</button>
        <button class="btn-neon move-btn" @click="emit('move', 'F-prime')">F'</button>
        <button class="btn-neon move-btn" @click="emit('move', 'B-prime')">B'</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'R2')">R2</button>
        <button class="btn-neon move-btn" @click="emit('move', 'F2')">F2</button>
        <button class="btn-neon move-btn" @click="emit('move', 'B2')">B2</button>
      </div>
    </div>

    <button class="btn-neon move-btn scramble-btn" @click="emit('scramble')">
      Scramble
    </button>
  </div>
</template>

<style scoped>
.controls {
  position: absolute;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}

.controls-left {
  left: 24px;
}

.controls-right {
  right: 24px;
}

.controls-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.move-btn {
  min-width: 44px;
  height: 36px;
  font-size: 0.9rem;
  padding: 0 10px;
}

.scramble-btn {
  position: absolute;
  bottom: 72px;
  left: 24px;
  z-index: 50;
}
</style>

