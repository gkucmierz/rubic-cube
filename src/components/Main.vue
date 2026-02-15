<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCube } from '../composables/useCube'

const { cubeState, initCube, rotateLayer, COLOR_MAP } = useCube()

const getFaceColors = (faceName) => {
  if (!cubeState.value || !cubeState.value[faceName]) {
    // Return placeholder colors if state is not ready
    return Array(9).fill('#333');
  }
  // cubeState.value[faceName] is a 3x3 matrix.
  // We need to flatten it.
  try {
    return cubeState.value[faceName].flat().map(c => COLOR_MAP[c] || 'gray');
  } catch (e) {
    console.error('Error mapping face colors', e);
    return Array(9).fill('red'); // Error state
  }
};

// ...ref(25)
const ry = ref(25)
const rz = ref(0)

const isDragging = ref(false)
const dragMode = ref('view') // 'view' or 'layer'
const startMouseX = ref(0)
const startMouseY = ref(0)
const lastMouseX = ref(0)
const lastMouseY = ref(0)
const selectedFace = ref(null)
const selectedStickerIndex = ref(null)

const onMouseDown = (event) => {
  isDragging.value = true
  startMouseX.value = event.clientX
  startMouseY.value = event.clientY
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
  
  // Check target
  const target = event.target
  // Find closest face
  const faceEl = target.closest('.face')
  const stickerEl = target.closest('.sticker')
  
  if (faceEl && stickerEl) {
    const face = Array.from(faceEl.classList).find(c => ['top','bottom','left','right','front','back'].includes(c))
    const index = parseInt(stickerEl.dataset.index)
    
    selectedFace.value = face
    selectedStickerIndex.value = index

    // Center piece logic (index 4 is center)
    if (index === 4) {
      dragMode.value = 'view'
    } else {
      dragMode.value = 'layer'
    }
  } else {
    dragMode.value = 'view'
    selectedFace.value = null
    selectedStickerIndex.value = null
  }
}

const onMouseMove = (event) => {
  if (!isDragging.value) return
  
  const deltaX = event.clientX - lastMouseX.value
  const deltaY = event.clientY - lastMouseY.value
  
  if (dragMode.value === 'view') {
    ry.value += deltaX * 0.5
    rx.value -= deltaY * 0.5
  } else if (dragMode.value === 'layer' && selectedFace.value) {
    const threshold = 10
    const absX = Math.abs(event.clientX - startMouseX.value)
    const absY = Math.abs(event.clientY - startMouseY.value)
    
    if (absX > threshold || absY > threshold) {
      handleLayerDrag(event.clientX - startMouseX.value, event.clientY - startMouseY.value)
      isDragging.value = false
    }
  }
  
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const handleLayerDrag = (dx, dy) => {
  if (!selectedFace.value || selectedStickerIndex.value === null) return
  
  const face = selectedFace.value
  const idx = selectedStickerIndex.value
  
  // Determine row/col from index
  const row = Math.floor(idx / 3)
  const col = idx % 3
  
  // Determine drag axis (Horizontal or Vertical)
  const isHorizontal = Math.abs(dx) > Math.abs(dy)
  const direction = isHorizontal ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1)
  
  // Direction logic:
  // For standard faces (Front, Right, Top, etc.)
  // Horizontal drag moves along Row -> Rotates the layer corresponding to that Row.
  // Vertical drag moves along Col -> Rotates the layer corresponding to that Col.
  
  let targetLayer = null
  let rotDir = 1
  
  // Map rows/cols to layers based on Face
  // Note: Directions need careful mapping (CW/CCW).
  // Assuming standard view for Front.
  
  if (isHorizontal) {
    // Dragging along a Row
    if (row === 0) targetLayer = 'top'
    if (row === 2) targetLayer = 'bottom'
    // Middle row (1) - ignore or equator
    
    // Direction mapping
    // Drag Right (dx > 0) on Top Row of Front Face -> Top Layer rotates Left (CCW) or Right (CW)?
    // Dragging Top layer Right -> moves face stickers Right. This is Y axis CW (viewed from top).
    // Let's assume dx > 0 -> CW (1), dx < 0 -> CCW (-1).
    // Adjust for specific faces (Back might be inverted).
    if (face === 'back' || face === 'bottom') rotDir = -direction // Test this
    else rotDir = direction
    
  } else {
    // Dragging along a Col
    if (col === 0) targetLayer = 'left'
    if (col === 2) targetLayer = 'right'
    
    // Direction mapping
    // Drag Down (dy > 0) on Right Col of Front Face -> Right Layer rotates Down.
    // Right layer Down is X axis CW? No, X axis is Right. R layer moves "towards you" or "away".
    // Wait, Right Face rotation (R) is CW.
    // R (CW) moves top stickers to back. (Up).
    // So R moves stickers Up.
    // If I drag Down, I want R' (CCW).
    // So dy > 0 -> -1.
    rotDir = -direction
    
    if (face === 'left' || face === 'back') rotDir = -rotDir // Invert again?
  }
  
  if (targetLayer) {
    rotateLayer(targetLayer, rotDir)
  }
}

const onMouseUp = () => {
  isDragging.value = false
  selectedFace.value = null
  selectedStickerIndex.value = null
}

onMounted(() => {
  initCube()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

const cubeStyle = computed(() => ({
  transform: `rotateX(${rx.value}deg) rotateY(${ry.value}deg) rotateZ(${rz.value}deg)`
}))
</script>

<template>
  <div class="wrapper">
    <div class="container" @mousedown="onMouseDown">
      <div class="cube" :style="cubeStyle">
        <div class="face top">
          <div class="stickers">
            <div class="sticker" v-for="(color, i) in getFaceColors('up')" :key="'t'+i" :data-index="i" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
        <div class="face bottom">
          <div class="stickers">
            <div class="sticker" v-for="(color, i) in getFaceColors('down')" :key="'b'+i" :data-index="i" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
        <div class="face left">
          <div class="stickers">
            <div class="sticker" v-for="(color, i) in getFaceColors('left')" :key="'l'+i" :data-index="i" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
        <div class="face right">
          <div class="stickers">
            <div class="sticker" v-for="(color, i) in getFaceColors('right')" :key="'r'+i" :data-index="i" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
        <div class="face front">
          <div class="stickers">
            <div class="sticker" v-for="(color, i) in getFaceColors('front')" :key="'f'+i" :data-index="i" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
        <div class="face back">
          <div class="stickers">
            <div class="sticker" v-for="(color, i) in getFaceColors('back')" :key="'k'+i" :data-index="i" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
      </div>
    </div>
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

.container {
  width: 300px;
  height: 300px;
  perspective: 900px;
  pointer-events: auto; 
}

.cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s;
}

.face {
  position: absolute;
  width: 300px;
  height: 300px;
  border: 2px solid #000;
  display: flex;
  flex-wrap: wrap;
  opacity: 0.95;
  background: #000;
}

.face.front  { transform: rotateY(0deg) translateZ(150px); }
.face.right  { transform: rotateY(90deg) translateZ(150px); }
.face.back   { transform: rotateY(180deg) translateZ(150px); }
.face.left   { transform: rotateY(-90deg) translateZ(150px); }
.face.top    { transform: rotateX(90deg) translateZ(150px); }
.face.bottom { transform: rotateX(-90deg) translateZ(150px); }

.stickers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px; /* Gap between stickers */
  width: 100%;
  height: 100%;
  padding: 4px;
  box-sizing: border-box;
}

.sticker {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
}
</style>
