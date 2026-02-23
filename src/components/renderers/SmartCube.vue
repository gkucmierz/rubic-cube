<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useCube } from '../../composables/useCube'
import { useSettings } from '../../composables/useSettings'
import { LAYER_ANIMATION_DURATION } from '../../config/animationSettings'

const { cubies, initCube, rotateLayer, turn, FACES } = useCube()
const { isCubeTranslucent } = useSettings()

// --- Visual State ---
const rx = ref(-25)
const ry = ref(45)
const rz = ref(0)
const SCALE = 100
const GAP = 0
const MIN_MOVES_COLUMN_GAP = 6
const movesColumnGap = ref(MIN_MOVES_COLUMN_GAP)

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
const pendingLogicalUpdate = ref(false)
const currentMoveId = ref(null)

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

  let x1 = v.x * Math.cos(radZ) - v.y * Math.sin(radZ)
  let y1 = v.x * Math.sin(radZ) + v.y * Math.cos(radZ)
  let z1 = v.z

  let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY)
  let y2 = y1
  let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY)

  let x3 = x2
  let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX)

  return { x: x3, y: y3 }
}

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

  const start = currentLayerRotation.value
  const startTime = performance.now()
  const duration = LAYER_ANIMATION_DURATION

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

const finishMove = (steps, directionOverride = null) => {
  if (steps !== 0 && activeLayer.value) {
    const { axis, index } = activeLayer.value
    const count = Math.abs(steps)
    const direction = directionOverride !== null ? directionOverride : (steps > 0 ? 1 : -1)

    pendingLogicalUpdate.value = true
    for (let i = 0; i < count; i++) {
      rotateLayer(axis, index, direction)
    }
  }
}

const movesHistory = ref([])
const movesHistoryEl = ref(null)
const samplePillEl = ref(null)
const movesPerRow = ref(0)

const displayMoves = computed(() => {
  const list = movesHistory.value.slice()

  moveQueue.forEach((q, idx) => {
    const stepsMod = ((q.steps % 4) + 4) % 4
    if (stepsMod === 0) return

    let modifier = ''
    if (stepsMod === 1) modifier = "'"
    else if (stepsMod === 2) modifier = '2'
    else if (stepsMod === 3) modifier = ''

    const baseLabel = q.displayBase || q.base
    const label = baseLabel + (modifier === "'" ? "'" : modifier === '2' ? '2' : '')

    list.push({
      id: `q-${idx}`,
      label,
      status: 'pending'
    })
  })

  return list
})

const moveRows = computed(() => {
  const perRow = movesPerRow.value || displayMoves.value.length || 1
  const rows = []
  const all = displayMoves.value
  for (let i = 0; i < all.length; i += perRow) {
    rows.push(all.slice(i, i + perRow))
  }
  return rows
})

const copyQueueToClipboard = async () => {
  if (!displayMoves.value.length) return
  const text = displayMoves.value.map(m => m.label).join(' ')
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(textarea)
      }
    }
  } catch (e) {
  }
}

const setSamplePill = (el) => {
  if (el && !samplePillEl.value) {
    samplePillEl.value = el
  }
}

const recalcMovesLayout = () => {
  const container = movesHistoryEl.value
  const pill = samplePillEl.value
  if (!container || !pill) return

  const containerWidth = container.clientWidth
  const pillWidth = pill.offsetWidth
  if (pillWidth <= 0) return

  const totalWidth = (cols) => {
    if (cols <= 0) return 0
    if (cols === 1) return pillWidth
    return cols * pillWidth + (cols - 1) * MIN_MOVES_COLUMN_GAP
  }

  let cols = Math.floor((containerWidth + MIN_MOVES_COLUMN_GAP) / (pillWidth + MIN_MOVES_COLUMN_GAP))
  if (cols < 1) cols = 1
  while (cols > 1 && totalWidth(cols) > containerWidth) {
    cols -= 1
  }

  let gap = 0
  if (cols > 1) {
    gap = (containerWidth - cols * pillWidth) / (cols - 1)
  }

  movesPerRow.value = cols
  movesColumnGap.value = gap
}

const resetQueue = () => {
  moveQueue.length = 0
  movesHistory.value = []
  currentMoveId.value = null
  nextTick(recalcMovesLayout)
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

const getProjectionStyle = () => ({})

const moveQueue = []

const dequeueMove = () => {
  while (moveQueue.length) {
    const next = moveQueue.shift()
    const stepsMod = ((next.steps % 4) + 4) % 4
    if (stepsMod === 0) continue

    let modifier = ''
    if (stepsMod === 1) modifier = "'"       // +90 (logical +1)
    else if (stepsMod === 2) modifier = '2'  // 180 (logical -2)
    else if (stepsMod === 3) modifier = ''   // -90 (logical -1)

    return { base: next.base, modifier, displayBase: next.displayBase }
  }
  return null
}

const processNextMove = () => {
  if (isAnimating.value || activeLayer.value) return
  const next = dequeueMove()
  if (!next) return

  const baseLabel = next.displayBase || next.base
  const label = baseLabel + (next.modifier === "'" ? "'" : next.modifier === '2' ? '2' : '')
  const id = movesHistory.value.length
  movesHistory.value.push({ id, label, status: 'in_progress' })
  currentMoveId.value = id

  animateProgrammaticMove(next.base, next.modifier)
}

const animateProgrammaticMove = (base, modifier) => {
  if (isAnimating.value || activeLayer.value) return

  // Map base move to axis/index (same warstwa jak przy dragowaniu)
  let axis = 'y'
  let index = 1
  if (base === 'U') {
    axis = 'y'; index = 1
  } else if (base === 'D') {
    axis = 'y'; index = -1
  } else if (base === 'L') {
    axis = 'x'; index = -1
  } else if (base === 'R') {
    axis = 'x'; index = 1
  } else if (base === 'F') {
    axis = 'z'; index = 1
  } else if (base === 'B') {
    axis = 'z'; index = -1
  }

  // Kierunek zgodny z RubiksJSModel.rotateLayer:
  // dir === 1 -> ruch z apostrofem, dir === -1 -> ruch podstawowy (bez apostrofu)
  const count = modifier === '2' ? 2 : 1
  const direction = modifier === "'" ? 1 : -1

  activeLayer.value = {
    axis,
    index,
    tangent: { x: 1, y: 0 }
  }
  currentLayerRotation.value = 0
  isAnimating.value = true

  const logicalSteps = direction * count
  let visualSteps = logicalSteps
  if (axis === 'z') visualSteps = -visualSteps
  if (base === 'U' || base === 'D') visualSteps = -visualSteps
  const target = visualSteps * 90
  const start = 0
  const startTime = performance.now()
  const duration = LAYER_ANIMATION_DURATION * count

  const animate = (time) => {
    const p = Math.min((time - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - p, 3)
    currentLayerRotation.value = start + (target - start) * ease

    if (p < 1) {
      requestAnimationFrame(animate)
    } else {
      pendingLogicalUpdate.value = true
      for (let i = 0; i < count; i += 1) {
        rotateLayer(axis, index, direction)
      }
    }
  }

  requestAnimationFrame(animate)
}

const MOVE_MAP = {
  'U':       { base: 'U', modifier: '' },
  'U-prime': { base: 'U', modifier: "'" },
  'U2':      { base: 'U', modifier: '2' },

  'D':       { base: 'D', modifier: "'" },
  'D-prime': { base: 'D', modifier: '' },
  'D2':      { base: 'D', modifier: '2' },

  'L':       { base: 'B', modifier: "'" },
  'L-prime': { base: 'B', modifier: '' },
  'L2':      { base: 'B', modifier: '2' },

  'R':       { base: 'F', modifier: '' },
  'R-prime': { base: 'F', modifier: "'" },
  'R2':      { base: 'F', modifier: '2' },

  'F':       { base: 'L', modifier: "'" },
  'F-prime': { base: 'L', modifier: '' },
  'F2':      { base: 'L', modifier: '2' },

  'B':       { base: 'R', modifier: '' },
  'B-prime': { base: 'R', modifier: "'" },
  'B2':      { base: 'R', modifier: '2' }
}

const applyMove = (move) => {
  const mapping = MOVE_MAP[move]
  if (!mapping) return

  let delta = 0
  if (mapping.modifier === "'") delta = 1          // logical +1
  else if (mapping.modifier === '') delta = -1     // logical -1
  else if (mapping.modifier === '2') delta = -2    // logical -2

  const displayBase = move[0]

  const last = moveQueue[moveQueue.length - 1]
  if (last && last.base === mapping.base && last.displayBase === displayBase) {
    last.steps += delta
  } else {
    moveQueue.push({ base: mapping.base, displayBase, steps: delta })
  }

  processNextMove()
}

const allMoves = Object.keys(MOVE_MAP)

const scramble = () => {
  for (let i = 0; i < 30; i += 1) {
    const move = allMoves[Math.floor(Math.random() * allMoves.length)]
    applyMove(move)
  }
}

watch(cubies, () => {
  if (!pendingLogicalUpdate.value) return
  pendingLogicalUpdate.value = false

  if (currentMoveId.value !== null) {
    const idx = movesHistory.value.findIndex(m => m.id === currentMoveId.value)
    if (idx !== -1) {
      movesHistory.value[idx] = {
        ...movesHistory.value[idx],
        status: 'done'
      }
    }
    currentMoveId.value = null
  }

  activeLayer.value = null
  currentLayerRotation.value = 0
  isAnimating.value = false
  selectedCubie.value = null
  selectedFace.value = null
  processNextMove()
})

onMounted(() => {
  initCube()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('resize', recalcMovesLayout)
  nextTick(recalcMovesLayout)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('resize', recalcMovesLayout)
})

watch(displayMoves, () => {
  nextTick(recalcMovesLayout)
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
               :style="{ opacity: isCubeTranslucent ? 0.3 : 1 }"
               :data-id="c.id"
               :data-face="face">
          </div>

        </div>
      </div>
    </div>

    <div class="controls controls-left">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('U')">U</button>
        <button class="btn-neon move-btn" @click="applyMove('D')">D</button>
        <button class="btn-neon move-btn" @click="applyMove('L')">L</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('U-prime')">U'</button>
        <button class="btn-neon move-btn" @click="applyMove('D-prime')">D'</button>
        <button class="btn-neon move-btn" @click="applyMove('L-prime')">L'</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('U2')">U2</button>
        <button class="btn-neon move-btn" @click="applyMove('D2')">D2</button>
        <button class="btn-neon move-btn" @click="applyMove('L2')">L2</button>
      </div>
    </div>

    <div class="controls controls-right">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('R')">R</button>
        <button class="btn-neon move-btn" @click="applyMove('F')">F</button>
        <button class="btn-neon move-btn" @click="applyMove('B')">B</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('R-prime')">R'</button>
        <button class="btn-neon move-btn" @click="applyMove('F-prime')">F'</button>
        <button class="btn-neon move-btn" @click="applyMove('B-prime')">B'</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="applyMove('R2')">R2</button>
        <button class="btn-neon move-btn" @click="applyMove('F2')">F2</button>
        <button class="btn-neon move-btn" @click="applyMove('B2')">B2</button>
      </div>
    </div>

    <button class="btn-neon move-btn scramble-btn" @click="scramble">
      Scramble
    </button>

    <div class="moves-history">
      <div class="moves-inner" ref="movesHistoryEl">
        <div
          v-for="(row, rowIndex) in moveRows"
          :key="rowIndex"
          class="moves-row"
          :style="{ columnGap: movesColumnGap + 'px' }"
        >
          <span
            v-for="(m, idx) in row"
            :key="m.id"
            class="move-pill"
            :class="{
              'move-pill-active': m.status === 'in_progress',
              'move-pill-pending': m.status === 'pending'
            }"
            :ref="rowIndex === 0 && idx === 0 ? setSamplePill : null"
          >
            {{ m.label }}
          </span>
        </div>
      </div>
      <div v-if="displayMoves.length" class="moves-actions">
        <button class="queue-action" @click="copyQueueToClipboard">copy</button>
        <button class="queue-action" @click="resetQueue">reset</button>
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

.moves-history {
  position: absolute;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: calc(100vw - 360px);
  overflow-x: hidden;
  padding: 12px 12px 26px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.moves-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.moves-row {
  display: flex;
}

.move-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.8rem;
  color: #fff;
  white-space: nowrap;
}

.move-pill-active {
  background: #ffd500;
  color: #000;
  border-color: #ffd500;
}

.move-pill-pending {
  opacity: 0.4;
}

.moves-actions {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 0px;
}

.queue-action {
  border: none;
  background: transparent;
  padding: 6px 6px;
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.moves-history::after {
  content: none;
}

.queue-action:focus {
  outline: none;
  box-shadow: none;
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
