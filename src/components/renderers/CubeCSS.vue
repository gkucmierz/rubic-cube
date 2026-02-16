<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCube } from '../../composables/useCube'
import { useDebug } from '../../composables/useDebug'
import { useInteractionLogger } from '../../composables/useInteractionLogger'

const { cubies, initCube, rotateLayer, FACES } = useCube()
const { settings: debugSettings } = useDebug()
const { addLog } = useInteractionLogger()

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

    const cubie = cubies.value.find(c => c.id === cubieId)
    const isCenter = (Math.abs(cubie.x) + Math.abs(cubie.y) + Math.abs(cubie.z)) === 1

    if (isCenter) {
      dragMode.value = 'view'
      document.body.style.cursor = 'move'
      addLog('drag-start', { mode: 'view', cubieId, face: faceName })
    } else {
      dragMode.value = 'layer'
      document.body.style.cursor = 'grab'
      addLog('drag-start', { mode: 'layer', cubieId, face: faceName })
    }
  } else {
    dragMode.value = 'view'
    selectedCubieId.value = null
    document.body.style.cursor = 'move'
    addLog('drag-start', { mode: 'view', target: 'background' })
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
    const s = debugSettings.viewRotation
    const speed = s.speed || 0.5

    // Use debug settings for direction
    ry.value += deltaX * speed * (s.invertY ? -1 : 1)
    rx.value += deltaY * speed * (s.invertX ? -1 : 1)

    velocity.value = 0
  } else if (dragMode.value === 'layer' && selectedCubieId.value !== null) {
    const totalDeltaX = event.clientX - startMouseX.value
    const totalDeltaY = event.clientY - startMouseY.value

    const now = performance.now()
    const dt = now - lastTime.value
    lastTime.value = now

    updateLayerDrag(totalDeltaX, totalDeltaY, dt)
  }

  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const getRotationMapping = (face) => {
  const m = debugSettings.dragMapping[face]
  // Default structure but with signs from debug settings
  const defaults = {
    [FACES.FRONT]: [
      { axis: 'x', rotAxis: 'y', sign: m ? m.x : -1 },
      { axis: 'y', rotAxis: 'x', sign: m ? m.y : -1 }
    ],
    [FACES.BACK]: [
      { axis: 'x', rotAxis: 'y', sign: m ? m.x : 1 },
      { axis: 'y', rotAxis: 'x', sign: m ? m.y : 1 }
    ],
    [FACES.RIGHT]: [
      { axis: 'z', rotAxis: 'y', sign: m ? m.x : -1 },
      { axis: 'y', rotAxis: 'z', sign: m ? m.y : 1 }
    ],
    [FACES.LEFT]: [
      { axis: 'z', rotAxis: 'y', sign: m ? m.x : -1 },
      { axis: 'y', rotAxis: 'z', sign: m ? m.y : -1 }
    ],
    [FACES.UP]: [
      { axis: 'x', rotAxis: 'z', sign: m ? m.x : 1 },
      { axis: 'z', rotAxis: 'x', sign: m ? m.y : 1 }
    ],
    [FACES.DOWN]: [
      { axis: 'x', rotAxis: 'z', sign: m ? m.x : -1 },
      { axis: 'z', rotAxis: 'x', sign: m ? m.y : -1 }
    ]
  }
  return defaults[face]
}

const ROTATION_MAPPING = {
  // Kept for reference or initial state if needed, but we use getRotationMapping now
}

// Helper to project 3D vector to 2D screen space based on current view rotation
const projectVector = (vector) => {
  const radX = rx.value * Math.PI / 180
  const radY = ry.value * Math.PI / 180
  const radZ = rz.value * Math.PI / 180

  const { x, y, z } = vector

  // v1 = Rz * v
  let x1 = x * Math.cos(radZ) - y * Math.sin(radZ)
  let y1 = x * Math.sin(radZ) + y * Math.cos(radZ)
  let z1 = z

  // v2 = Ry * v1
  let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY)
  let y2 = y1
  let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY)

  // v3 = Rx * v2
  let x3 = x2
  let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX)
  let z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX)

  return { x: x3, y: y3 }
}

const updateLayerDrag = (dx, dy, dt) => {
  const cubie = cubies.value.find(c => c.id === selectedCubieId.value)
  if (!cubie) return

  let axis = null
  let index = 0
  let dragVector = null

  if (activeLayer.value) {
    axis = activeLayer.value.axis
    index = activeLayer.value.index
    dragVector = activeLayer.value.dragVector
  } else {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return

    const face = selectedFaceNormal.value
    // Use dynamic mapping from debug settings if available, else fallback to constant
    // But better to make ROTATION_MAPPING computed or access directly

    const mapping = getRotationMapping(face)

    if (!mapping) return

    // Create basis vectors for the two possible tangent axes
    const vectors = mapping.map(m => {
      const v = { x: 0, y: 0, z: 0 }
      v[m.axis] = 1
      return { ...m, vector: v }
    })

    // Project them to screen space
    const projected = vectors.map(v => {
      const p = projectVector(v.vector)
      const len = Math.sqrt(p.x * p.x + p.y * p.y)
      return { ...v, px: p.x, py: p.y, len }
    })

    const mouseLen = Math.sqrt(dx * dx + dy * dy)
    if (mouseLen === 0) return

    const ndx = dx / mouseLen
    const ndy = dy / mouseLen

    let bestMatch = null
    let maxDot = -1

    projected.forEach(p => {
      if (p.len < 0.1) return

      const npx = p.px / p.len
      const npy = p.py / p.len

      const dot = Math.abs(ndx * npx + ndy * npy)
      if (dot > maxDot) {
        maxDot = dot
        bestMatch = p
      }
    })

    if (!bestMatch) return

    axis = bestMatch.rotAxis

    if (axis === 'x') index = cubie.x
    if (axis === 'y') index = cubie.y
    if (axis === 'z') index = cubie.z

    dragVector = { x: bestMatch.px, y: bestMatch.py, sign: bestMatch.sign }

    activeLayer.value = { axis, index, dragVector }
    addLog('layer-select', { axis, index, vector: dragVector, face: selectedFaceNormal.value })
  }

  const { x: vx, y: vy, sign } = activeLayer.value.dragVector
  const vLen = Math.sqrt(vx * vx + vy * vy)
  if (vLen === 0) return

  const nvx = vx / vLen
  const nvy = vy / vLen

  const moveAmount = dx * nvx + dy * nvy
  const newRotation = moveAmount * sign * 0.5

  if (dt > 0) {
    const dRot = newRotation - layerRotation.value
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

    const projection = velocity.value * 200
    const projectedRot = layerRotation.value + projection
    const steps = Math.round(projectedRot / 90)
    const targetRot = steps * 90

    const startRot = layerRotation.value
    const startTime = performance.now()
    const duration = 300

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
      const { axis, index } = activeLayer.value

      // Calculate logical direction
      // We found that Visual Rotation direction is inverted relative to Logical Rotation direction
      // for all axes due to coordinate system differences (Y-down vs Y-up).
      // Visual Positive -> Logical Negative.
      const direction = steps > 0 ? -1 : 1
      const count = Math.abs(steps)

      for (let i = 0; i < count; i++) {
         rotateLayer(axis, index, direction)
      }
      addLog('rotation-finish', { axis, index, direction, steps, count })
    }

    activeLayer.value = null
    layerRotation.value = 0
    isSnapping.value = false
    velocity.value = 0
}

onMounted(() => {
  initCube()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  if (rafId.value) cancelAnimationFrame(rafId.value)
})

const cubeStyle = computed(() => ({
  transform: `rotateX(${rx.value}deg) rotateY(${ry.value}deg) rotateZ(${rz.value}deg)`
}))

const getCubieStyle = (cubie) => {
  const tx = cubie.x * 100
  const ty = cubie.y * -100
  const tz = cubie.z * 100

  let transform = `translate3d(${tx}px, ${ty}px, ${tz}px)`

  if (activeLayer.value) {
    const { axis, index } = activeLayer.value
    let match = false
    if (axis === 'x' && cubie.x === index) match = true
    if (axis === 'y' && cubie.y === index) match = true
    if (axis === 'z' && cubie.z === index) match = true

    if (match) {
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
          <div v-for="(color, face) in cubie.faces" :key="face"
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
}

.sticker-border {
  width: 92%;
  height: 92%;
  border: 2px solid rgba(0,0,0,0.5);
  border-radius: 8px; /* Rounded sticker */
  background: inherit; /* Sticker color */
}

/* Face transforms relative to Cubie Center */
.sticker-face.front { transform: rotateY(0deg) translateZ(50px); }
.sticker-face.back  { transform: rotateY(180deg) translateZ(50px); }
.sticker-face.right { transform: rotateY(90deg) translateZ(50px); }
.sticker-face.left  { transform: rotateY(-90deg) translateZ(50px); }
.sticker-face.up    { transform: rotateX(90deg) translateZ(50px); }
.sticker-face.down  { transform: rotateX(-90deg) translateZ(50px); }

</style>
