<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCube } from '../../composables/useCube'
import { useSettings } from '../../composables/useSettings'
import Line3D from '../common/Line3D.vue'

const { cubies, initCube, rotateLayer, turn, FACES } = useCube()
const { showProjections, isCubeTranslucent } = useSettings()

// --- Visual State ---
const rx = ref(-25) // Initial View Rotation X
const ry = ref(45)  // Initial View Rotation Y
const rz = ref(0)
const SCALE = 100 // Size of one cubie in px
const GAP = 0     // Gap between cubies

// --- Interaction State ---
const isDragging = ref(false)
const dragMode = ref('view') // 'view' or 'layer'
const startX = ref(0)
const startY = ref(0)
const lastX = ref(0)
const lastY = ref(0)
const velocity = ref(0)

// Layer Interaction
const selectedCubie = ref(null) // { id, x, y, z } static snapshot at start of drag
const selectedFace = ref(null)  // 'front', 'up', etc.
const activeLayer = ref(null)   // { axis, index, tangent, direction }
const currentLayerRotation = ref(0) // Visual rotation in degrees
const isAnimating = ref(false)

// --- Constants & Helpers ---

const getFaceNormal = (face) => {
  const map = {
    [FACES.FRONT]: { x: 0, y: 0, z: 1 },
    [FACES.BACK]:  { x: 0, y: 0, z: -1 },
    [FACES.RIGHT]: { x: 1, y: 0, z: 0 },
    [FACES.LEFT]:  { x: -1, y: 0, z: 0 },
    [FACES.UP]:    { x: 0, y: 1, z: 0 },
    [FACES.DOWN]:  { x: 0, y: -1, z: 0 },
  }
  return map[face] || { x: 0, y: 0, z: 1 }
}

const getAllowedAxes = (face) => {
  // Logic: Which axes can this face physically move along?
  switch(face) {
    case FACES.FRONT: case FACES.BACK: return ['x', 'y']
    case FACES.RIGHT: case FACES.LEFT: return ['z', 'y']
    case FACES.UP:    case FACES.DOWN: return ['x', 'z']
  }
  return []
}

const getAxisVector = (axis) => {
  if (axis === 'x') return { x: 1, y: 0, z: 0 }
  if (axis === 'y') return { x: 0, y: 1, z: 0 }
  if (axis === 'z') return { x: 0, y: 0, z: 1 }
  return { x: 0, y: 0, z: 0 }
}

// Cross Product: a x b
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
})

// Project 3D vector to 2D screen space based on current view (rx, ry, rz)
const project = (v) => {
  const radX = rx.value * Math.PI / 180
  const radY = ry.value * Math.PI / 180
  const radZ = rz.value * Math.PI / 180

  // 1. Rotate Z
  let x1 = v.x * Math.cos(radZ) - v.y * Math.sin(radZ)
  let y1 = v.x * Math.sin(radZ) + v.y * Math.cos(radZ)
  let z1 = v.z

  // 2. Rotate Y
  let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY)
  let y2 = y1
  let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY)

  // 3. Rotate X
  let x3 = x2
  let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX)
  // let z3 = ... (depth not needed for projection vector direction)

  return { x: x3, y: y3 }
}

const projectedCubies = computed(() => {
  // Filter cubies for each face based on logical coordinates
  // x: -1 (Left), 1 (Right)
  // y: -1 (Down/Bottom), 1 (Up/Top)
  // z: -1 (Back), 1 (Front)

  const left = cubies.value.filter(c => Math.round(c.x) === -1)
  const back = cubies.value.filter(c => Math.round(c.z) === -1)
  const down = cubies.value.filter(c => Math.round(c.y) === -1)

  return { left, back, down }
})

const projectionTransforms = {
  left: { tx: -350, ty: 0, tz: 0, ry: -90 },
  back: { tx: 0, ty: -200, tz: -350, ry: 0 },
  down: { tx: 0, ty: 350, tz: 0, rx: 90 }
}

const projectionLines = computed(() => {
  const lines = []

  // Helper to transform point
  const transformPoint = (p, transform) => {
    let x = p.x, y = p.y, z = p.z

    // Rotate
    if (transform.ry) {
      const rad = transform.ry * Math.PI / 180
      const x0 = x, z0 = z
      x = x0 * Math.cos(rad) + z0 * Math.sin(rad)
      z = -x0 * Math.sin(rad) + z0 * Math.cos(rad)
    }
    if (transform.rx) {
      const rad = transform.rx * Math.PI / 180
      const y0 = y, z0 = z
      y = y0 * Math.cos(rad) - z0 * Math.sin(rad)
      z = y0 * Math.sin(rad) + z0 * Math.cos(rad)
    }

    // Translate
    x += transform.tx || 0
    y += transform.ty || 0
    z += transform.tz || 0

    return { x, y, z }
  }

  const S = 150 // Half size

  // 1. Left Projection
  {
    const t = projectionTransforms.left
    // Start: Left Face corners (x = -S)
    const start = [
      { x: -S, y: -S, z: -S }, { x: -S, y: -S, z: S },
      { x: -S, y: S, z: -S }, { x: -S, y: S, z: S }
    ]
    const end = start.map(p => transformPoint(p, t))
    start.forEach((p, i) => lines.push({ start: p, end: end[i] }))
  }

  // 2. Back Projection
  {
    const t = projectionTransforms.back
    // Start: Back Face corners (z = -S)
    const start = [
      { x: -S, y: -S, z: -S }, { x: S, y: -S, z: -S },
      { x: -S, y: S, z: -S }, { x: S, y: S, z: -S }
    ]
    const end = start.map(p => transformPoint(p, t))
    start.forEach((p, i) => lines.push({ start: p, end: end[i] }))
  }

  // 3. Down Projection (Down Face)
  {
    const t = projectionTransforms.down
    // Start: Down Face corners (y = -S)
    const start = [
      { x: -S, y: -S, z: -S }, { x: S, y: -S, z: -S },
      { x: -S, y: -S, z: S }, { x: S, y: -S, z: S }
    ]
    const end = start.map(p => transformPoint(p, t))
    start.forEach((p, i) => lines.push({ start: p, end: end[i] }))
  }

  return lines
})

// --- Interaction Logic ---

const onMouseDown = (e) => {
  if (isAnimating.value) return

  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  lastX.value = e.clientX
  lastY.value = e.clientY
  velocity.value = 0

  const target = e.target.closest('.sticker')
  if (target) {
    const id = parseInt(target.dataset.id)
    const face = target.dataset.face
    const cubie = cubies.value.find(c => c.id === id)

    selectedCubie.value = { ...cubie } // Snapshot position
    selectedFace.value = face

    // Check if center piece (has 2 zero coordinates)
    // Centers have sum of absolute coords = 1
    // Core (0,0,0) has sum = 0
    const absSum = Math.abs(cubie.x) + Math.abs(cubie.y) + Math.abs(cubie.z)
    const isCenterOrCore = absSum <= 1

    // Mechanical Realism:
    // Centers are "Stiff" (part of the core frame). Dragging them rotates the View.
    // Corners/Edges are "Moving Parts". Dragging them rotates the Layer.
    dragMode.value = isCenterOrCore ? 'view' : 'layer'
  } else {
    dragMode.value = 'view'
    selectedCubie.value = null
  }
}

const onMouseMove = (e) => {
  if (!isDragging.value) return

  const dx = e.clientX - lastX.value
  const dy = e.clientY - lastY.value

  if (dragMode.value === 'view') {
    ry.value += dx * 0.5
    rx.value += dy * 0.5
  } else if (dragMode.value === 'layer' && selectedCubie.value) {
    const totalDx = e.clientX - startX.value
    const totalDy = e.clientY - startY.value

    handleLayerDrag(totalDx, totalDy, dx, dy)
  }

  lastX.value = e.clientX
  lastY.value = e.clientY
}

const handleLayerDrag = (totalDx, totalDy, dx, dy) => {
  // If we haven't locked an axis yet
  if (!activeLayer.value) {
    if (Math.sqrt(totalDx**2 + totalDy**2) < 5) return // Threshold

    const faceNormal = getFaceNormal(selectedFace.value)
    const axes = getAllowedAxes(selectedFace.value)

    let best = null
    let maxDot = 0

    // Analyze candidates
    axes.forEach(axis => {
      // Tangent = Axis x Normal
      // This is the 3D direction of motion for Positive Rotation around this Axis
      const t3D = cross(getAxisVector(axis), faceNormal)
      const t2D = project(t3D)
      const len = Math.sqrt(t2D.x**2 + t2D.y**2)

      if (len > 0.1) {
        const nx = t2D.x / len
        const ny = t2D.y / len

        // Compare with mouse drag direction
        const mouseLen = Math.sqrt(totalDx**2 + totalDy**2)
        const mx = totalDx / mouseLen
        const my = totalDy / mouseLen

        const dot = Math.abs(mx * nx + my * ny)

        if (dot > maxDot) {
          maxDot = dot
          best = { axis, tangent: { x: nx, y: ny } }
        }
      }
    })

    if (best && maxDot > 0.5) {
      // Lock Axis
      let index = 0
      if (best.axis === 'x') index = selectedCubie.value.x
      if (best.axis === 'y') index = selectedCubie.value.y
      if (best.axis === 'z') index = selectedCubie.value.z

      activeLayer.value = {
        axis: best.axis,
        index,
        tangent: best.tangent
      }
    } else {
      // Fallback: if drag doesn't match a layer axis, maybe user wants to rotate view?
      // Only switch if drag is significant
      if (Math.sqrt(totalDx**2 + totalDy**2) > 20) {
         // Keep layer mode but maybe relax?
         // No, sticky mode is better.
      }
    }
  }

  // If we have an active layer, update rotation
  if (activeLayer.value) {
    const { x, y } = activeLayer.value.tangent
    // Project delta onto key
    const val = dx * x + dy * y
    // Scale factor
    currentLayerRotation.value += val * 0.6
  }
}

const onMouseUp = () => {
  isDragging.value = false

  if (activeLayer.value) {
    snapRotation()
  }
}

const snapRotation = () => {
  isAnimating.value = true

  // Determine nearest 90 deg
  const target = Math.round(currentLayerRotation.value / 90) * 90
  const steps = Math.round(currentLayerRotation.value / 90)

  // Animation loop
  const start = currentLayerRotation.value
  const startTime = performance.now()
  const duration = 200

  const animate = (time) => {
    const p = Math.min((time - startTime) / duration, 1)
    // Ease out
    const ease = 1 - Math.pow(1 - p, 3)

    currentLayerRotation.value = start + (target - start) * ease

    if (p < 1) {
      requestAnimationFrame(animate)
    } else {
      // Animation done
      finishMove(steps)
    }
  }
  requestAnimationFrame(animate)
}

const finishMove = (steps) => {
  if (steps !== 0 && activeLayer.value) {
    const { axis, index } = activeLayer.value
    // Logic Call
    const count = Math.abs(steps)
    const direction = steps > 0 ? 1 : -1

    for (let i = 0; i < count; i++) {
      rotateLayer(axis, index, direction)
    }
  }

  // Reset
  activeLayer.value = null
  currentLayerRotation.value = 0
  isAnimating.value = false
  selectedCubie.value = null
  selectedFace.value = null
}

const getCubieStyle = (c) => {
  // Base Position
  const x = c.x * (SCALE + GAP)
  const y = c.y * -(SCALE + GAP) // Y is up in logic, down in CSS
  const z = c.z * (SCALE + GAP)

  let transform = `translate3d(${x}px, ${y}px, ${z}px)`

  // Apply Active Layer Rotation
  if (activeLayer.value) {
    const { axis, index } = activeLayer.value
    let match = false
    // Match based on CURRENT LOGICAL POSITION
    if (axis === 'x' && c.x === index) match = true
    if (axis === 'y' && c.y === index) match = true
    if (axis === 'z' && c.z === index) match = true

    if (match) {
      // Rotation Group around Center (0,0,0)
      let rot = currentLayerRotation.value

      // Axis mapping for CSS
      // If we rotate a group around center, we want standard rotation.
      // Logic Z=1 (Front). CSS +Z is Front.
      // Logic Y=1 (Up). CSS -Y is Up.
      // Logic X=1 (Right). CSS +X is Right.

      // Rotations:
      // CSS rotateX: + is Top->Back.
      // CSS rotateY: + is Right->Back (Spin Right).
      // CSS rotateZ: + is Top->Right (Clockwise).

      if (axis === 'x') transform = `rotateX(${-rot}deg) ` + transform
      if (axis === 'y') transform = `rotateY(${-rot}deg) ` + transform
      if (axis === 'z') transform = `rotateZ(${rot}deg) ` + transform
    }
  }

  return { transform }
}

const getProjectionStyle = (c, face) => {
  let col = 0
  let row = 0

  if (face === FACES.LEFT) {
    col = 1 - c.z
    row = 1 - c.y
  } else if (face === FACES.BACK) {
    col = 1 - c.x
    row = 1 - c.y
  } else if (face === FACES.DOWN) {
    col = c.x + 1
    row = 1 - c.z
  }

  const x = (col - 1) * SCALE
  const y = (row - 1) * SCALE

  return { transform: `translate3d(${x}px, ${y}px, 0px)` }
}

const applyMove = (move) => {
  let base = move
  let isPrime = false
  let turns = 1

  if (move.endsWith('2')) {
    turns = 2
    base = move[0]
  } else if (move.endsWith('-prime')) {
    isPrime = true
    base = move[0]
  }

  const notation = isPrime ? `${base}'` : base

  for (let i = 0; i < turns; i += 1) {
    turn(notation)
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
  // Clean up any potential animation frames? rafId is local to snapRotation, but harmless.
})

</script>

<template>
  <div class="smart-cube-container">
    <div class="scene" :style="{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }">
      <div class="cube">
        <div v-for="c in cubies" :key="c.id"
             class="cubie"
             :style="getCubieStyle(c)"
             :data-cubie-id="c.id">

          <div v-for="(color, face) in c.faces" :key="face"
               class="sticker"
               :class="[face, color]"
               :style="{ opacity: isCubeTranslucent ? 0.5 : 1 }"
               :data-id="c.id"
               :data-face="face">
          </div>

        </div>
      </div>
      <!-- Projections of Hidden Faces -->
      <div v-if="showProjections" class="projections">
        <!-- Guide Lines -->
        <Line3D v-for="(line, i) in projectionLines" :key="'line-'+i"
          :start="line.start" :end="line.end"
          :color="'var(--text-strong)'"
          :thickness="1" />

        <!-- Left Face Projection -->
        <div class="projection-group left-projection">
          <div v-for="c in projectedCubies.left" :key="c.id"
               class="cubie-placeholder"
               :style="getProjectionStyle(c, FACES.LEFT)">
            <div class="sticker" :class="c.faces.left"></div>
          </div>
        </div>

        <!-- Back Face Projection -->
        <div class="projection-group back-projection">
          <div v-for="c in projectedCubies.back" :key="c.id"
               class="cubie-placeholder"
               :style="getProjectionStyle(c, FACES.BACK)">
            <div class="sticker" :class="c.faces.back"></div>
          </div>
        </div>

        <!-- Down Face Projection (Exploded View) -->
        <div class="projection-group down-projection">
          <div v-for="c in projectedCubies.down" :key="c.id"
               class="cubie-placeholder"
               :style="getProjectionStyle(c, FACES.DOWN)">
            <div class="sticker" :class="c.faces.down"></div>
          </div>
        </div>
      </div>

    </div>

    <div class="controls">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('U')">U</button>
        <button class="btn-neon move-btn" @click="applyMove('U-prime')">U'</button>
        <button class="btn-neon move-btn" @click="applyMove('U2')">U2</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('L')">L</button>
        <button class="btn-neon move-btn" @click="applyMove('L-prime')">L'</button>
        <button class="btn-neon move-btn" @click="applyMove('L2')">L2</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('F')">F</button>
        <button class="btn-neon move-btn" @click="applyMove('F-prime')">F'</button>
        <button class="btn-neon move-btn" @click="applyMove('F2')">F2</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smart-cube-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: transparent; /* Use global background */
  perspective: 1000px;
}

.scene {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

.cube {
  position: relative;
  transform-style: preserve-3d;
}

.cubie {
  position: absolute;
  width: 100px;
  height: 100px;
  margin-left: -50px;
  margin-top: -50px;
  transform-style: preserve-3d;
}

.controls {
  position: absolute;
  top: 96px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
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

/* Projection Styles */
.projections {
  position: absolute;
  top: 0; left: 0;
  width: 0; height: 0;
  pointer-events: none; /* Let clicks pass through to the cube */
  transform-style: preserve-3d;
}

/*
  Positioning relative to center (0,0,0).
  Cube size is approx 300px (3 * 100px).
  Projections are "exploded" views floating around the cube.
*/

/* Projection Groups - Exploded View Containers */
.projection-group {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  pointer-events: none;
}

.cubie-placeholder {
  position: absolute;
  width: 100px;
  height: 100px;
  top: 0;
  left: 0;
  margin-top: -50px;
  margin-left: -50px;
  transform-style: preserve-3d;
}

.left-projection {
  transform: translateX(-350px) translateY(0) translateZ(0) rotateY(-90deg);
}

.back-projection {
  transform: translateX(0) translateY(-200px) translateZ(-350px) rotateY(0deg);
}

.down-projection {
  transform: translateX(0) translateY(350px) translateZ(0) rotateX(90deg);
}


.sticker {
  position: absolute;
  width: 100px;
  height: 100px;
  top: 0;
  left: 0;
  box-sizing: border-box;
  background-color: #000; /* Black plastic base */
  border: 1px solid #000; /* Ensure edge is solid */
  box-shadow: 0 0 0 1px #000; /* External bleed to cover sub-pixel gaps */
  border-radius: 2px; /* Minimal rounding for plastic edges, practically square */
  backface-visibility: hidden; /* Hide inside faces */
}

/* Pseudo-element for the colored sticker part */
.sticker::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border-radius: 8px; /* Rounded sticker */
  box-shadow: inset 0 0 5px rgba(0,0,0,0.3); /* Inner depth */
  z-index: 1;
}

/* Sticker Positions relative to Cubie Center */
.sticker.up    { transform: rotateX(90deg) translateZ(50px); }
.sticker.down  { transform: rotateX(-90deg) translateZ(50px); }
.sticker.front { transform: translateZ(50px); }
.sticker.back  { transform: rotateY(180deg) translateZ(50px); }
.sticker.left  { transform: rotateY(-90deg) translateZ(50px); }
.sticker.right { transform: rotateY(90deg) translateZ(50px); }

/* Colors - apply to the pseudo-element */
.white::after  { background: #E0E0E0; }
.yellow::after { background: #FFD500; }
.green::after  { background: #009E60; }
.blue::after   { background: #0051BA; }
.orange::after { background: #FF5800; }
.red::after    { background: #C41E3A; }

/* Black internal faces - no sticker needed */
.black  {
  background: #050505;
  border: 1px solid #000;
  border-radius: 0;
  display: block;
  box-shadow: 0 0 0 1px #000; /* Fill gaps between internal faces */
}
.black::after {
  display: none;
}

</style>
