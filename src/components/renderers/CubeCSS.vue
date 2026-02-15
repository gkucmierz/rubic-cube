<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCube } from '../../composables/useCube'

const { cubeState, initCube, rotateLayer, COLOR_MAP } = useCube()

const getFaceColors = (faceName) => {
  if (!cubeState.value || !cubeState.value[faceName]) {
    return Array(9).fill('#333');
  }
  try {
    return cubeState.value[faceName].flat().map(c => COLOR_MAP[c] || 'gray');
  } catch (e) {
    console.error('Error mapping face colors', e);
    return Array(9).fill('red');
  }
};

const rx = ref(25)
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

// Animation state
const activeLayer = ref(null)
const layerRotation = ref(0)
const isSnapping = ref(false)

// Layer definitions (which stickers belong to which layer)
const LAYER_MAP = {
  top: {
    up: [0,1,2,3,4,5,6,7,8],
    front: [0,1,2],
    right: [0,1,2],
    back: [0,1,2],
    left: [0,1,2]
  },
  bottom: {
    down: [0,1,2,3,4,5,6,7,8],
    front: [6,7,8],
    right: [6,7,8],
    back: [6,7,8],
    left: [6,7,8]
  },
  left: {
    left: [0,1,2,3,4,5,6,7,8],
    front: [0,3,6],
    up: [0,3,6],
    back: [2,5,8], // Opposite column on back face
    down: [0,3,6]
  },
  right: {
    right: [0,1,2,3,4,5,6,7,8],
    front: [2,5,8],
    up: [2,5,8],
    back: [0,3,6], // Opposite column on back face
    down: [2,5,8]
  },
  front: {
    front: [0,1,2,3,4,5,6,7,8],
    up: [6,7,8],
    right: [0,3,6],
    down: [0,1,2],
    left: [2,5,8]
  },
  back: {
    back: [0,1,2,3,4,5,6,7,8],
    up: [0,1,2],
    right: [2,5,8],
    down: [6,7,8],
    left: [0,3,6]
  }
}

const isStickerInLayer = (layer, face, index) => {
  if (!layer || !LAYER_MAP[layer]) return false
  const indices = LAYER_MAP[layer][face]
  return indices && indices.includes(index)
}

const onMouseDown = (event) => {
  if (isSnapping.value) return // Prevent interaction during snap
  
  isDragging.value = true
  startMouseX.value = event.clientX
  startMouseY.value = event.clientY
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
  
  const target = event.target
  const faceEl = target.closest('.face')
  const stickerEl = target.closest('.sticker')
  
  if (faceEl && stickerEl) {
    const face = Array.from(faceEl.classList).find(c => ['top','bottom','left','right','front','back'].includes(c))
    const index = parseInt(stickerEl.dataset.index)
    
    selectedFace.value = face
    selectedStickerIndex.value = index

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
    const totalDeltaX = event.clientX - startMouseX.value
    const totalDeltaY = event.clientY - startMouseY.value
    
    updateLayerDrag(totalDeltaX, totalDeltaY)
  }
  
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const updateLayerDrag = (dx, dy) => {
  if (!selectedFace.value || selectedStickerIndex.value === null) return
  
  // Determine direction if not yet determined (or update continuously)
  // Logic from previous handleLayerDrag, but adapted for continuous angle
  
  const face = selectedFace.value
  const idx = selectedStickerIndex.value
  
  const row = Math.floor(idx / 3)
  const col = idx % 3
  
  // Determine dominant axis for the drag
  const isHorizontal = Math.abs(dx) > Math.abs(dy)
  
  // Determine target layer based on drag start position and direction
  let targetLayer = null
  let rotSign = 1
  
  if (isHorizontal) {
    // Horizontal drag rotates Top or Bottom layers
    if (row === 0) targetLayer = 'top'
    if (row === 2) targetLayer = 'bottom'
    // Middle row horizontal drag -> rotates Middle layer (skip for now or map to 'middle')
    
    // Determine rotation sign
    // If dragging right (dx > 0):
    // On Front face: Top moves Left (CW? No).
    // Let's use standard:
    // Front Face, Top Row, Drag Right -> Face moves Right.
    // That is Anti-Clockwise Top Rotation (Top Face turns Left).
    // So dx > 0 -> angle < 0.
    
    if (face === 'back' || face === 'bottom') rotSign = 1 // Inverted logic for back/bottom
    else rotSign = -1
    
  } else {
    // Vertical drag rotates Left or Right layers
    if (col === 0) targetLayer = 'left'
    if (col === 2) targetLayer = 'right'
    
    // Sign logic
    // Front Face, Right Col, Drag Down (dy > 0).
    // Face moves Down.
    // Right Face rotates ... towards user?
    // Right Face CW: Front moves Up.
    // So Drag Down = Anti-Clockwise (-1).
    
    rotSign = -1
    if (face === 'left' || face === 'back') rotSign = 1 // Inverted
  }
  
  if (targetLayer) {
    activeLayer.value = targetLayer
    // Sensitivity: 1px = 0.5 degree
    const rawDelta = isHorizontal ? dx : dy
    layerRotation.value = rawDelta * rotSign * 0.5
  }
}

const onMouseUp = async () => {
  if (!isDragging.value) return
  isDragging.value = false
  
  if (dragMode.value === 'layer' && activeLayer.value) {
    isSnapping.value = true
    
    // Snap to nearest 90 degrees
    const currentRot = layerRotation.value
    const steps = Math.round(currentRot / 90)
    const targetRot = steps * 90
    
    // Animate to target
    layerRotation.value = targetRot
    
    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 200)) // Match CSS transition time
    
    // Commit changes to model
    if (steps !== 0) {
      // Rotate layer N times
      const direction = steps > 0 ? 1 : -1
      const count = Math.abs(steps)
      for (let i = 0; i < count; i++) {
        rotateLayer(activeLayer.value, direction)
      }
    }
    
    // Reset animation state silently
    // We need to disable transition temporarily to prevent "rewind" animation
    const movingCube = document.querySelector('.cube.moving')
    if (movingCube) movingCube.style.transition = 'none'
    
    activeLayer.value = null
    layerRotation.value = 0
    
    // Re-enable transition next tick
    nextTick(() => {
      if (movingCube) movingCube.style.transition = ''
      isSnapping.value = false
    })
    
  } else {
    selectedFace.value = null
    selectedStickerIndex.value = null
  }
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

const movingGroupStyle = computed(() => {
  if (!activeLayer.value) return {}
  
  // Determine axis of rotation
  let axis = 'Y'
  if (['top', 'bottom'].includes(activeLayer.value)) axis = 'Y'
  if (['left', 'right'].includes(activeLayer.value)) axis = 'X'
  if (['front', 'back'].includes(activeLayer.value)) axis = 'Z'
  
  // Correction for axis orientation to match standard rotation
  // Up/Down rotate around Y axis? No.
  // Standard CSS 3D:
  // rotateY -> horizontal rotation (Left/Right)
  // rotateX -> vertical rotation (Up/Down)
  // rotateZ -> in-plane rotation (Front/Back)
  
  // Map layer to axis:
  // Top/Bottom -> rotate around Y axis (vertical axis of the cube)
  // Left/Right -> rotate around X axis (horizontal axis)
  // Front/Back -> rotate around Z axis (depth axis)
  
  if (['top', 'bottom'].includes(activeLayer.value)) axis = 'Y'
  else if (['left', 'right'].includes(activeLayer.value)) axis = 'X'
  else axis = 'Z'
  
  // We must concatenate the transforms because Vue style array merging overrides properties with same name.
  // cubeStyle has 'transform' (view rotation).
  // We want to append the layer rotation to it.
  const viewTransform = cubeStyle.value.transform
  const layerTransform = `rotate${axis}(${layerRotation.value}deg)`
  
  return {
    transform: `${viewTransform} ${layerTransform}`
  }
})
</script>

<template>
  <div class="scene" @mousedown="onMouseDown">
    <div class="container">
      
      <!-- Static Group (Non-moving parts) -->
      <div class="cube static" :style="cubeStyle">
        <div v-for="faceName in ['top', 'bottom', 'left', 'right', 'front', 'back']" 
             :key="'static-'+faceName" 
             class="face" 
             :class="faceName">
          <div class="stickers">
            <div v-for="(color, i) in getFaceColors(faceName === 'top' ? 'up' : faceName === 'bottom' ? 'down' : faceName)" 
                 :key="'s-'+i" 
                 class="sticker-wrapper"
                 :data-index="i" 
                 :style="{ visibility: activeLayer && isStickerInLayer(activeLayer, faceName === 'top' ? 'up' : faceName === 'bottom' ? 'down' : faceName, i) ? 'hidden' : 'visible' }">
                 <div class="sticker" :style="{ backgroundColor: color }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Moving Group (Active layer) -->
      <div v-if="activeLayer" class="cube moving" :style="movingGroupStyle">
        <div v-for="faceName in ['top', 'bottom', 'left', 'right', 'front', 'back']" 
             :key="'moving-'+faceName" 
             class="face" 
             :class="faceName">
          <div class="stickers">
            <div v-for="(color, i) in getFaceColors(faceName === 'top' ? 'up' : faceName === 'bottom' ? 'down' : faceName)" 
                 :key="'m-'+i" 
                 class="sticker-wrapper"
                 :data-index="i" 
                 :style="{ visibility: isStickerInLayer(activeLayer, faceName === 'top' ? 'up' : faceName === 'bottom' ? 'down' : faceName, i) ? 'visible' : 'hidden' }">
                 <div class="sticker" :style="{ backgroundColor: color }"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.scene {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  width: 300px;
  height: 300px;
  perspective: 900px;
  pointer-events: auto; 
  position: relative;
}

.cube {
  width: 100%;
  height: 100%;
  position: absolute; /* Stack them */
  top: 0;
  left: 0;
  transform-style: preserve-3d;
  transition: transform 0.1s; /* View rotation transition */
}

.cube.moving {
  transition: transform 0.2s ease-out; /* Layer snap transition */
}

.face {
  position: absolute;
  width: 300px;
  height: 300px;
  border: 2px solid rgba(0,0,0,0.1);
  display: flex;
  flex-wrap: wrap;
  /* Transparent background to allow seeing through split parts */
  background: transparent;
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

.sticker-wrapper {
  width: 100%;
  height: 100%;
  background: black; /* The black plastic look */
  padding: 2px; /* Inner padding for sticker */
  box-sizing: border-box;
}

.sticker {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
}
</style>

