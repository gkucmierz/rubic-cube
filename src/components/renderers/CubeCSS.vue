<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCube } from '../../composables/useCube'

const { cubeState, initCube, rotateLayer, COLOR_MAP, FACES } = useCube()

// --- State ---
const rx = ref(25)
const ry = ref(25)
const rz = ref(0)

const isDragging = ref(false)
const dragMode = ref('view') // 'view' or 'layer'
const startMouseX = ref(0)
const startMouseY = ref(0)
const lastMouseX = ref(0)
const lastMouseY = ref(0)
const selectedCubieId = ref(null) // ID of the cubie where drag started
const selectedFaceNormal = ref(null) // Normal vector of the face clicked

// Animation state
  const activeLayer = ref(null) // { axis: 'x'|'y'|'z', index: -1|0|1 }
  const layerRotation = ref(0)
  const isSnapping = ref(false)
  const velocity = ref(0)
  const lastTime = ref(0)
  const rafId = ref(null)

// Cubies Model
// We represent the cube as 27 independent cubies.
// Each cubie has a current position (x, y, z) in grid coordinates [-1, 0, 1].
// And a rotation matrix (or simplified orientation).
// Actually, for CSS rendering, we can just keep track of their current (x,y,z) and applying transforms.
// But to match `useCube` state (which is color based), we need to map colors to cubies.
// 
// Alternative:
// `useCube` maintains the logical state of colors on faces.
// To render 27 cubies that MOVE, we need to know which color belongs to which face of which cubie.
// 
// Mapping:
// 27 Cubies. ID: 0..26.
// Position: x,y,z in {-1, 0, 1}.
// 
// Colors:
// A cubie at (x,y,z) exposes faces if x/y/z is +/- 1.
// e.g. (1, 1, 1) is Right-Top-Front corner.
// It has 3 colored faces: Right, Top, Front.
// We need to fetch the color from `cubeState` at the correct indices.
// 
// `cubeState` is organized by Faces.
// Front Face is a 3x3 matrix.
// (0,0) is Top-Left of Front Face.
// Front Face covers z=1 plane.
// x goes -1 (Left) to 1 (Right).
// y goes 1 (Top) to -1 (Bottom).
// 
// Let's define the 27 cubies.
const cubies = ref([])

const initCubies = () => {
  const newCubies = []
  let id = 0
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        newCubies.push({
          id: id++,
          x, y, z, // Current grid position
          // Store initial rotation or accumulate transform?
          // Simplest is to accumulate rotation transforms for the cubie div.
          // But for logic, we update x,y,z after snap.
          transform: '' 
        })
      }
    }
  }
  cubies.value = newCubies
}

// Map logical face colors to cubie faces
// We need a function that given a cubie (x,y,z) returns the colors of its 6 faces.
// If a face is internal, color is black (or null).
const getCubieFaces = (cubie) => {
  const { x, y, z } = cubie
  const faces = {}
  
  // Helper to map grid (x,y) to Matrix indices (row, col)
  // Grid: x (-1..1), y (-1..1).
  // Matrix: row (0..2), col (0..2).
  // 
  // Face UP (y=1). z: Back(-1)..Front(1). x: Left(-1)..Right(1).
  // Up Matrix: row 0 is Back, row 2 is Front. col 0 is Left, col 2 is Right.
  // So: row = z + 1? No.
  // z=-1 -> row 0. z=0 -> row 1. z=1 -> row 2. Yes.
  // x=-1 -> col 0. x=0 -> col 1. x=1 -> col 2. Yes.
  if (y === 1) {
    const row = z + 1
    const col = x + 1
    faces.up = getColor(FACES.UP, row, col)
  }
  
  // Face DOWN (y=-1). z: Back(-1)..Front(1). x: Left(-1)..Right(1).
  // Down Matrix: row 0 is Front, row 2 is Back. col 0 is Left, col 2 is Right.
  // Wait, check standard mapping in `Cube.js` or standard rubik.
  // Usually unfolding:
  // Up: Back row is top.
  // Down: Front row is top?
  // Let's assume standard intuitive mapping:
  // Down Face viewed from bottom.
  // Row 0 is Front (top of view).
  // z=1 -> row 0. z=-1 -> row 2.
  // So row = 1 - z.
  // x=-1 -> col 0. x=1 -> col 2.
  if (y === -1) {
    const row = 1 - z
    const col = x + 1
    faces.down = getColor(FACES.DOWN, row, col)
  }
  
  // Face FRONT (z=1). y: Top(1)..Bottom(-1). x: Left(-1)..Right(1).
  // Matrix: row 0 is Top.
  // y=1 -> row 0. y=-1 -> row 2.
  // row = 1 - y.
  // x=-1 -> col 0.
  if (z === 1) {
    const row = 1 - y
    const col = x + 1
    faces.front = getColor(FACES.FRONT, row, col)
  }
  
  // Face BACK (z=-1). y: Top(1)..Bottom(-1). x: Right(1)..Left(-1)?
  // Back Face viewed from Back.
  // Left side of view is Cube Right (x=1).
  // Right side of view is Cube Left (x=-1).
  // Matrix: row 0 is Top.
  // y=1 -> row 0.
  // col 0 (Left of view) -> x=1.
  // col 2 (Right of view) -> x=-1.
  // col = 1 - x.
  if (z === -1) {
    const row = 1 - y
    const col = 1 - x
    faces.back = getColor(FACES.BACK, row, col)
  }
  
  // Face RIGHT (x=1). y: Top(1)..Bottom(-1). z: Front(1)..Back(-1).
  // Right Face viewed from Right.
  // Left side of view is Front (z=1).
  // Right side of view is Back (z=-1).
  // Matrix: row 0 is Top.
  // y=1 -> row 0.
  // col 0 -> z=1.
  // col 2 -> z=-1.
  // col = 1 - z.
  if (x === 1) {
    const row = 1 - y
    const col = 1 - z
    faces.right = getColor(FACES.RIGHT, row, col)
  }
  
  // Face LEFT (x=-1). y: Top(1)..Bottom(-1). z: Back(-1)..Front(1).
  // Left Face viewed from Left.
  // Left side of view is Back (z=-1).
  // Right side of view is Front (z=1).
  // Matrix: row 0 is Top.
  // y=1 -> row 0.
  // col 0 -> z=-1.
  // col 2 -> z=1.
  // col = z + 1.
  if (x === -1) {
    const row = 1 - y
    const col = z + 1
    faces.left = getColor(FACES.LEFT, row, col)
  }
  
  return faces
}

const getColor = (face, row, col) => {
  if (!cubeState.value || !cubeState.value[face]) return 'black'
  const colorIndex = cubeState.value[face][row][col]
  return COLOR_MAP[colorIndex] || 'black'
}

// Mouse Interaction
const onMouseDown = (event) => {
  if (isSnapping.value) return
  
  isDragging.value = true
  startMouseX.value = event.clientX
  startMouseY.value = event.clientY
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
  lastTime.value = performance.now()
  velocity.value = 0 // Reset velocity
  
  const target = event.target
  const stickerEl = target.closest('.sticker-face')
  
  if (stickerEl) {
    // Clicked on a cubie face
    const cubieId = parseInt(stickerEl.dataset.cubieId)
    const faceName = stickerEl.dataset.face
    
    selectedCubieId.value = cubieId
    selectedFaceNormal.value = faceName // 'up', 'down', etc.
    
    // Check if it's a center face (implies View Drag)?
    // User wants drag to rotate layers if grabbing edge/corner.
    // Center face of the whole cube? No, center face of a side.
    // If I grab the center sticker of Front Face, I might want to rotate View OR Front Face?
    // User said: "jedynie centralny element kostki dragowany, bedzie ja po prostu obracal"
    // So Center Sticker -> View Drag.
    // Center Sticker is when x,y,z has two zeros? No.
    // Center of Front Face: (0,0,1).
    // Edge: (1,0,1). Corner: (1,1,1).
    
    const cubie = cubies.value.find(c => c.id === cubieId)
    const isCenter = (Math.abs(cubie.x) + Math.abs(cubie.y) + Math.abs(cubie.z)) === 1
    
    if (isCenter) {
      dragMode.value = 'view'
      document.body.style.cursor = 'move'
    } else {
      dragMode.value = 'layer'
      document.body.style.cursor = 'grab'
    }
  } else {
    dragMode.value = 'view'
    selectedCubieId.value = null
    document.body.style.cursor = 'move'
  }
}

const onMouseMove = (event) => {
  if (!isDragging.value) return
  
  if (dragMode.value === 'layer') {
    document.body.style.cursor = 'grabbing'
  }

  const deltaX = event.clientX - lastMouseX.value
  const deltaY = event.clientY - lastMouseY.value
  
  if (dragMode.value === 'view') {
    ry.value += deltaX * 0.5
    rx.value -= deltaY * 0.5
    velocity.value = 0 // Reset velocity for view drag (or track it separately if needed)
  } else if (dragMode.value === 'layer' && selectedCubieId.value !== null) {
    const totalDeltaX = event.clientX - startMouseX.value
    const totalDeltaY = event.clientY - startMouseY.value
    
    // Calculate velocity
    const now = performance.now()
    const dt = now - lastTime.value
    lastTime.value = now
    
    // We only care about velocity of rotation, so we calculate it inside updateLayerDrag?
    // Or we track mouse velocity here.
    // Let's track rotation velocity in updateLayerDrag to be accurate with axis mapping.
    updateLayerDrag(totalDeltaX, totalDeltaY, dt)
  }
  
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const updateLayerDrag = (dx, dy, dt) => {
  // Determine rotation axis and direction based on drag vector and clicked face
  const cubie = cubies.value.find(c => c.id === selectedCubieId.value)
  if (!cubie) return

  // Need to map 2D drag to 3D axis.
  // Face Normals:
  // Front: Z. Right: X. Up: Y.
  
  const face = selectedFaceNormal.value
  let axis = null
  let sign = 1
  
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const isHorizontal = absDx > absDy
  
  // Logic:
  if (face === 'front' || face === 'back') {
    if (isHorizontal) axis = 'y'; else axis = 'x';
  } else if (face === 'right' || face === 'left') {
    if (isHorizontal) axis = 'y'; else axis = 'z';
  } else if (face === 'up' || face === 'down') {
    if (isHorizontal) axis = 'y'; 
    else axis = 'x';
  }
  
  if (!axis) return
  
  // Determine layer index
  let index = 0
  if (axis === 'x') index = cubie.x
  if (axis === 'y') index = cubie.y
  if (axis === 'z') index = cubie.z
  
  activeLayer.value = { axis, index }
  
  // Determine Sign (Visual mapping)
  const delta = isHorizontal ? dx : dy
  const baseSign = isHorizontal ? 1 : -1
  
  const newRotation = delta * baseSign * 0.5
  
  // Calculate velocity (deg/ms)
  if (dt > 0) {
    const dRot = newRotation - layerRotation.value
    // Simple low-pass filter for smoothing
    velocity.value = 0.6 * velocity.value + 0.4 * (dRot / dt)
  }
  
  layerRotation.value = newRotation
}

const onMouseUp = async () => {
  if (!isDragging.value) return
  isDragging.value = false
  document.body.style.cursor = ''
  
  if (dragMode.value === 'layer' && activeLayer.value) {
    isSnapping.value = true
    
    // Inertia calculation
    // Project final position based on velocity
    // 200ms projection is reasonable for "throw" feel
    const projection = velocity.value * 200
    const projectedRot = layerRotation.value + projection
    
    // Snap to nearest 90 degrees
    const steps = Math.round(projectedRot / 90)
    const targetRot = steps * 90
    
    // Animation Loop
    const startRot = layerRotation.value
    const startTime = performance.now()
    const duration = 300 // ms
    
    // Ease out cubic function
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)
    
    return new Promise(resolve => {
      const animate = (time) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        const ease = easeOut(progress)
        
        layerRotation.value = startRot + (targetRot - startRot) * ease
        
        if (progress < 1) {
          rafId.value = requestAnimationFrame(animate)
        } else {
          finishRotation(steps)
          resolve()
        }
      }
      rafId.value = requestAnimationFrame(animate)
    })
  } else {
    selectedCubieId.value = null
  }
}

const finishRotation = (steps) => {
    if (steps !== 0) {
      // Update logical state
      const { axis, index } = activeLayer.value
      let layerName = null
      
      if (axis === 'x') {
        if (index === -1) layerName = 'left'
        if (index === 1) layerName = 'right'
      } else if (axis === 'y') {
        if (index === 1) layerName = 'top'
        if (index === -1) layerName = 'bottom'
      } else if (axis === 'z') {
        if (index === 1) layerName = 'front'
        if (index === -1) layerName = 'back'
      }
      
      if (layerName) {
        // Apply rotation to logical cube
        let direction = steps > 0 ? 1 : -1
        
        // Invert direction for specific layers where Visual and Logical rotations are opposite
        if (layerName === 'top' || layerName === 'back' || layerName === 'right') {
          direction = -direction
        }
        
        const count = Math.abs(steps)
        
        // 1. Update Logical State (Colors)
        for (let i = 0; i < count; i++) {
           rotateLayer(layerName, direction) 
        }
        
        // 2. Update Visual State (Cubies Position)
        // We must rotate the (x,y,z) coordinates of the cubies that were in the active layer.
        const visualSteps = steps // + means +90deg along axis
        
        // Apply N times
        const rotations = Math.abs(visualSteps)
        const sign = Math.sign(visualSteps)
        
        for (let r = 0; r < rotations; r++) {
          cubies.value.forEach(cubie => {
            // Check if cubie is in the rotating layer
            let inLayer = false
            if (axis === 'x' && cubie.x === index) inLayer = true
            if (axis === 'y' && cubie.y === index) inLayer = true
            if (axis === 'z' && cubie.z === index) inLayer = true
            
            if (inLayer) {
              const { x, y, z } = cubie
              let nx = x, ny = y, nz = z
              
              if (axis === 'x') {
                if (sign > 0) { ny = -z; nz = y; } // (x, -z, y)
                else { ny = z; nz = -y; } // (x, z, -y)
              } else if (axis === 'y') {
                if (sign > 0) { nx = z; nz = -x; } // (z, y, -x)
                else { nx = -z; nz = x; } // (-z, y, x)
              } else if (axis === 'z') {
                if (sign > 0) { nx = -y; ny = x; } // (-y, x, z)
                else { nx = y; ny = -x; } // (y, -x, z)
              }
              
              cubie.x = nx
              cubie.y = ny
              cubie.z = nz
            }
          })
        }
      }
    }
    
    activeLayer.value = null
    layerRotation.value = 0
    isSnapping.value = false
    velocity.value = 0
}

// Lifecycle
onMounted(() => {
  initCubies()
  initCube()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  if (rafId.value) cancelAnimationFrame(rafId.value)
})

// Styles
const cubeStyle = computed(() => ({
  transform: `rotateX(${rx.value}deg) rotateY(${ry.value}deg) rotateZ(${rz.value}deg)`
}))

const getCubieStyle = (cubie) => {
  // Base position
  // scale 300px total. 100px per cubie.
  // x,y,z in -1..1.
  // translate(x*100, -y*100, z*100).
  // Y is inverted in CSS (down is positive)?
  // Usually in 3D CSS:
  // X right, Y down, Z towards viewer.
  // My Grid: Y=1 is Top.
  // So Y=1 -> translateY(-100px).
  
  const tx = cubie.x * 100
  const ty = cubie.y * -100
  const tz = cubie.z * 100
  
  let transform = `translate3d(${tx}px, ${ty}px, ${tz}px)`
  
  // Apply rotation if active layer
  if (activeLayer.value) {
    const { axis, index } = activeLayer.value
    let match = false
    if (axis === 'x' && cubie.x === index) match = true
    if (axis === 'y' && cubie.y === index) match = true
    if (axis === 'z' && cubie.z === index) match = true
    
    if (match) {
      // Rotation origin is center of cube (0,0,0).
      // But we are translating the cubie.
      // To rotate around global axis, we should rotate THEN translate?
      // No, the Group rotates.
      // But here we rotate individual cubies.
      // A cubie at (100,0,0) rotating around Y axis:
      // Needs to move in arc.
      // `rotateY(angle) translate(...)` -> Rotates axis then moves.
      // Yes. `rotateY` first puts it on the rotated axis.
      // So `rotate` then `translate`.
      transform = `rotate${axis.toUpperCase()}(${layerRotation.value}deg) ${transform}`
    }
  }
  
  return { transform }
}
</script>

<template>
  <div class="scene" @mousedown="onMouseDown">
    <div class="container">
      <div class="cube-group" :style="cubeStyle">
        
        <div v-for="cubie in cubies" :key="cubie.id" class="cubie" :style="getCubieStyle(cubie)">
          <!-- Render 6 faces for each cubie -->
          <!-- Only render if color is not black? Optimization. -->
          
          <div v-for="(color, face) in getCubieFaces(cubie)" :key="face"
               class="sticker-face"
               :class="face"
               :data-cubie-id="cubie.id"
               :data-face="face"
               :style="{ backgroundColor: color }">
               <div class="sticker-border"></div>
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
}

.cube-group {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s;
}

.cubie {
  position: absolute;
  width: 100px;
  height: 100px;
  top: 100px; /* Center it: 300/2 - 100/2 = 100 */
  left: 100px;
  transform-style: preserve-3d;
}

.sticker-face {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 1px solid rgba(0,0,0,0.8); /* Plastic edge */
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  backface-visibility: hidden; /* Optimization? Or we want to see inside? */
  /* We want solid cubies. So we need backfaces or 6 faces. */
  /* We are rendering 6 faces. */
}

.sticker-border {
  width: 92%;
  height: 92%;
  border: 2px solid rgba(0,0,0,0.5);
  border-radius: 8px; /* Rounded sticker */
  background: inherit; /* Sticker color */
  /* The face bg is the plastic color (black usually). */
  /* Here we set face bg to color directly. */
  /* Let's adjust: face bg = black. sticker-border bg = color. */
}

/* Face transforms relative to Cubie Center */
.sticker-face.front { transform: rotateY(0deg) translateZ(50px); }
.sticker-face.back  { transform: rotateY(180deg) translateZ(50px); }
.sticker-face.right { transform: rotateY(90deg) translateZ(50px); }
.sticker-face.left  { transform: rotateY(-90deg) translateZ(50px); }
.sticker-face.up    { transform: rotateX(90deg) translateZ(50px); }
.sticker-face.down  { transform: rotateX(-90deg) translateZ(50px); }

</style>

