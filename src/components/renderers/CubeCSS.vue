<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCube } from '../../composables/useCube'

const { cubies, initCube, rotateLayer, FACES } = useCube()

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
const activeLayer = ref(null) // { axis: 'x'|'y'|'z', index: -1|0|1, dragVector: {x,y,sign} }
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
    const speed = 0.5

    // Standard rotation controls
    ry.value += deltaX * speed
    rx.value += deltaY * speed

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

// Allowed Rotation Axes for each Face
// We don't prefer specific signs here. We just define WHICH axes are available.
const getFaceAxes = (face) => {
  switch(face) {
    case FACES.FRONT:
    case FACES.BACK:
      return ['x', 'y'] // Can rotate around X or Y
    case FACES.RIGHT:
    case FACES.LEFT:
      return ['z', 'y'] // Can rotate around Z or Y
    case FACES.UP:
    case FACES.DOWN:
      return ['x', 'z'] // Can rotate around X or Z
  }
  return []
}

// Map face names to their normal vectors (approximate, for cross product)
const getFaceNormal = (face) => {
  switch(face) {
    case FACES.FRONT: return { x: 0, y: 0, z: 1 }
    case FACES.BACK:  return { x: 0, y: 0, z: -1 }
    case FACES.RIGHT: return { x: 1, y: 0, z: 0 }
    case FACES.LEFT:  return { x: -1, y: 0, z: 0 }
    case FACES.UP:    return { x: 0, y: 1, z: 0 }
    case FACES.DOWN:  return { x: 0, y: -1, z: 0 }
  }
  return { x: 0, y: 0, z: 1 }
}

const getAxisVector = (axis) => {
  if (axis === 'x') return { x: 1, y: 0, z: 0 }
  if (axis === 'y') return { x: 0, y: 1, z: 0 }
  if (axis === 'z') return { x: 0, y: 0, z: 1 }
  return { x: 0, y: 0, z: 0 }
}

const crossProduct = (a, b) => {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}

const updateLayerDrag = (dx, dy, dt) => {
  const cubie = cubies.value.find(c => c.id === selectedCubieId.value)
  if (!cubie) return

  let axis = null
  let index = 0
  let tangent2D = null

  if (activeLayer.value) {
    // If already locked, stick to it
    axis = activeLayer.value.axis
    index = activeLayer.value.index
    tangent2D = activeLayer.value.tangent2D
  } else {
    // Threshold to prevent jitter
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return

    const face = selectedFaceNormal.value
    const allowedAxes = getFaceAxes(face)
    const normal = getFaceNormal(face)

    // Evaluate both candidates
    let bestMatch = null
    let maxDot = -1

    allowedAxes.forEach(ax => {
      // 1. Calculate 3D Tangent for Positive Rotation
      // Tangent = Axis x Normal
      // This vector represents the direction the face moves in 3D when rotated positively.
      const axisVec = getAxisVector(ax)
      const tangent3D = crossProduct(axisVec, normal)

      // 2. Project to Screen
      const t2D = projectVector(tangent3D)
      const tLen = Math.sqrt(t2D.x * t2D.x + t2D.y * t2D.y)

      // Normalize
      if (tLen > 0.1) { // Avoid singular projections (edge-on)
         const nx = t2D.x / tLen
         const ny = t2D.y / tLen

         // 3. Compare with Mouse Drag
         const mouseLen = Math.sqrt(dx*dx + dy*dy)
         const mx = dx / mouseLen
         const my = dy / mouseLen

         const dot = Math.abs(mx * nx + my * ny)

         if (dot > maxDot) {
           maxDot = dot
           bestMatch = { axis: ax, t2D: { x: nx, y: ny } }
         }
      }
    })

    if (!bestMatch || maxDot < 0.5) return

    axis = bestMatch.axis
    // Determine index based on cubie position
    if (axis === 'x') index = cubie.x
    if (axis === 'y') index = cubie.y
    if (axis === 'z') index = cubie.z

    tangent2D = bestMatch.t2D
    activeLayer.value = { axis, index, tangent2D }
  }

  // Calculate rotation amount
  // Dot product of Drag with Tangent gives amount of motion in Tangent direction
  const { x: tx, y: ty } = activeLayer.value.tangent2D
  const moveAmount = dx * tx + dy * ty

  // Logic:
  // If moveAmount is Positive, it means Drag aligns with Tangent.
  // Tangent was calculated for Positive Rotation Gradient.
  // So Positive Move -> Positive Rotation.
  // Scale factor: 0.5 deg per pixel
  const newRotation = moveAmount * 0.5

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
      // We pass direction to rotateLayer.
      // Logic expects: direction 1 = +90 deg rotation.

      // User Report Analysis:
      // User dragged Down -> Front Face Moved Up.
      // Drag Down (dy > 0) -> moveAmount < 0 (since Up vector is -Y).
      // newRotation < 0.
      // steps < 0.
      // Current Logic: steps > 0 ? 1 : -1 -> direction = -1.
      // Result: -X Rotation (CCW). Front -> Up.
      // This MATCHES the user report (Front moved Up).
      // User EXPECTED: Front -> Down (+X Rotation).
      // So when steps < 0, we WANT direction = 1.
      // Therefore: direction = steps > 0 ? -1 : 1.

      // Let's implement this inversion.
      // With corrected geometric mappings, Positive Steps should mean Positive Direction.
      const direction = steps > 0 ? 1 : -1

      const count = Math.abs(steps)

      for (let i = 0; i < count; i++) {
         rotateLayer(axis, index, direction)
      }
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
    // Note: Cubie coordinates (x, y, z) are updated AFTER rotation finishes.
    // During drag, we match based on current static coordinates.
    if (axis === 'x' && cubie.x === index) match = true
    if (axis === 'y' && cubie.y === index) match = true
    if (axis === 'z' && cubie.z === index) match = true

    if (match) {
      // Apply rotation transform
      // Important: The rotation must be applied BEFORE translation to rotate around the center of the group?
      // No, each cubie rotates around the group center (0,0,0).
      // CSS transforms are applied from right to left (in string) or inside out.
      // translate() moves it to position. rotate() rotates it in place?
      // No.
      // If we want to rotate a group of cubies around the cube center:
      // We should apply rotation to a parent wrapper OR:
      // rotate(angle) translate(x, y, z).
      // Because rotate() rotates the coordinate system.
      // So translate() will move it along the rotated axes.

      // Currently: `rotate${axis}(...) ${transform}`
      // transform is `translate3d(...)`
      // So: rotate(...) translate(...)
      // This means: Rotate the world, THEN translate along rotated axes.
      // Example: Rotate Y 90. X axis becomes Z.
      // Translate (100, 0, 0) moves along new X (which was Z).
      // So (100, 0, 0) becomes (0, 0, -100) physically?
      // Yes, this is correct for rotating around the center!

      // Wait.
      // Let's check the bug description:
      // "face tych elementów stają się czarne"
      // Black faces are faces that are usually hidden (internal faces).
      // If a face becomes black, it means we are seeing an internal face.
      // Or a face that is not rendered?
      // In our model, all 6 faces are rendered, but initialized to BLACK.
      // Only outer faces are colored.

      // If I rotate Top Layer 90 deg.
      // The side stickers of the Top Layer should move to new positions.
      // If I see Black, it means I am seeing a face that has COLOR.BLACK.
      // This happens if a Cubie rotates in a way that exposes its internal face,
      // BUT the logical color update hasn't happened yet?
      // Or the logical color update happened, but the visual rotation is wrong?

      // During Drag:
      // We rotate the layer visually. The logic (colors) is NOT updated yet.
      // So the cubie retains its original colors.
      // We are just spinning the visual representation.
      // If I spin Top Layer 90 deg.
      // Front-Top-Right cubie (Green Front, Red Right, White Up).
      // Rotates around Y.
      // It moves to Back-Top-Right position visually.
      // Its Front Face (Green) rotates to become Right Face?
      // Visual Rotation Y 90 deg (CW):
      // Front Face (Normal Z) -> Right Face (Normal X).
      // So Green Face is now pointing Right.
      // This is correct.

      // "po kolejnym obrocie... dopiero są prawidłowe"
      // This suggests that the first update cycle fails to sync visuals and logic.

      // Let's look at `getCubieStyle`.
      // It uses `cubie.x`, `cubie.y`, `cubie.z`.
      // These are updated in `finishRotation` -> `rotateLayer`.

      // If I rotate 90 deg.
      // `finishRotation` updates `cubie.x/y/z` and `cubie.faces`.
      // AND sets `activeLayer = null`.
      // So `getCubieStyle` removes the `rotate(...)` part.
      // And uses new `translate(...)` based on new x/y/z.

      // If the visual rotation was 90 deg.
      // The cubie is physically at rotation 90.
      // Then we remove rotation, but snap translation to new spot.
      // BUT what about the rotation of the cubie itself?
      // A cubie that moved from Front to Right has rotated 90 deg around Y.
      // If we just translate it to the Right position, it will be oriented as if it was always there?
      // No.
      // If we simply translate it to (1, 1, -1), it has default orientation.
      // But the piece that was at (1, 1, 1) needs to be rotated 90 deg Y to fit into (1, 1, -1) correctly?
      // Actually, in our model, `_rotateCubieFaces` swaps the colors on the faces.
      // So we don't need to permanently rotate the cubie object (CSS rotate).
      // We just move it to new (x,y,z) and swap its face colors so that "Front" face has the color that should be on Front.

      // Example:
      // Cubie A at Front. Front=Green.
      // Move to Right.
      // New Position: Right.
      // We swap colors: Now Right Face of Cubie A gets Green.
      // We render Cubie A at Right Position.
      // Since it is at Right, its Right Face is pointing Right.
      // And it has Green.
      // So user sees Green on Right.
      // Correct.

      // So why Black?
      // If I see Black, it means I am seeing a face that has Black color.
      // Maybe I am seeing the Back Face of the cubie (which is Black)?
      // If `_rotateCubieFaces` swapped colors incorrectly?
      // Or if `_rotateMatrix` moved cubie to wrong spot?

      // User says: "1 obrót ... czarne ... kolejny ... prawidłowe".
      // Maybe the color swap logic is still inverted or wrong?

      // Let's re-verify `_rotateCubieFaces` for Y-axis.
      // Y CW (1):
      // Right <- Front
      // Back <- Right
      // Left <- Back
      // Front <- Left

      // If I have Front=Green.
      // After swap: Right=Green. Front=Orange (was Left).
      // Cubie moves from Front to Right.
      // At Right position:
      // I see Right Face (Green) and Front Face (Orange).
      // Wait. At Right position (x=1), the outer faces are Right, Up, Front/Back.
      // If I am looking at the cube from Front-Right.
      // I see the Right face of the cubie at Right.
      // It has Green. Correct.

      // BUT what if `_rotateMatrix` direction was different from `_rotateCubieFaces`?
      // I fixed that in previous step (passed `matrixDirection`).

      // Let's look at `matrixDirection`.
      // `rotateLayer` calls `_rotateMatrix` with `-direction`.
      // And `_rotateCubieFaces` with `-direction`.

      // `rotateLayer` is called with `direction` calculated in `finishRotation`.
      // `const direction = steps > 0 ? -1 : 1`
      // Steps > 0 means Visual Drag was Positive (Right/Down).
      // Visual Positive Drag -> Logical Negative Direction?
      // Why?
      // Visual Drag Right on Front Face -> Rotate Y Negative (CW looking from top?).
      // Let's check `ROTATION_MAPPING`.
      // Front Drag X (Right) -> `sign: 1` (was -1, changed to 1).
      // `sign: 1`.
      // `steps > 0`.
      // `direction = -1`.
      // `matrixDirection = -(-1) = 1`.

      // `_rotateMatrix` (1) -> CW.
      // Front (0,1) -> Right (1,0).
      // Correct.

      // `_rotateCubieFaces` (1) -> CW.
      // Right <- Front.
      // Green (Front) moves to Right Face.
      // Correct.

      // So logic seems consistent.

      // Why Black?
      // Maybe the "Black" is because I am seeing the INSIDE faces of the cubie?
      // If the cubie didn't move to the new position, but colors rotated?
      // No, `_rotateMatrix` moves it.

      // Wait. `transform = rotate(..) translate(..)`.
      // This rotates the cubie around the center.
      // If I rotate 90 deg Y.
      // The cubie visually rotates 90 deg Y.
      // Its Front Face is now facing Right.
      // Its Right Face is now facing Back.
      // Its Back Face is now facing Left.
      // Its Left Face is now facing Front.

      // If the drag is "snapped" (visual only).
      // We see the rotated cubie.
      // Front Face (Green) is facing Right.
      // Left Face (Black, internal) is facing Front?
      // If the cubie was at Front-Center (0, 0, 1).
      // Left Face is internal (Black).
      // Rotate 90 Y.
      // Cubie is at Right-Center (1, 0, 0).
      // Left Face (Black) is facing Front.
      // So at (1, 0, 0), the Front-facing side is Black.
      // User sees Black.

      // AHA!
      // When we rely on `_rotateCubieFaces` (swapping colors on faces),
      // we assume the cubie is NOT rotated in 3D space permanently.
      // We assume it is axis-aligned in its new position.

      // BUT `activeLayer` logic applies `rotate` transform.
      // When `finishRotation` happens:
      // 1. Logic updates (pos + colors).
      // 2. `activeLayer` becomes null.
      // 3. `getCubieStyle` removes `rotate`.
      // 4. Cubie snaps to new pos (axis-aligned).

      // So it should work.
      // UNLESS `activeLayer` is NOT null for a frame?
      // Or if `finishRotation` happens, but Vue hasn't updated DOM yet?

      // User says: "przy 1 obrocie... stają się czarne... po kolejnym... prawidłowe".
      // This implies the state AFTER the first rotation is wrong.
      // "Face tych elementów stają się czarne".

      // If I rotate Front->Right.
      // New Pos: Right.
      // New Colors: Right=Green.
      // If I render this axis-aligned:
      // Right Face (Green) points Right.
      // Front Face (Orange) points Front.
      // I should see Green on Right, Orange on Front.

      // If user sees Black.
      // Maybe `_rotateCubieFaces` is putting Black on the visible faces?
      // Example: `cubie.faces[FRONT] = f[LEFT]`.
      // If `f[LEFT]` was Black (internal).
      // Then New Front is Black.
      // If the cubie is at Right position.
      // Its Front face is visible?
      // Yes, Right-Center cubie has visible Front face.
      // (1, 0, 0). Front (z=1) is neighbor to Front-Center.
      // Wait.
      // (1, 0, 0) is Right-Center.
      // Its Front face (z+) touches Front-Right-Center (1, 0, 1).
      // So its Front face is INTERNAL.
      // So it SHOULD be Black.

      // Wait.
      // Front-Center (0, 0, 1).
      // Visible: Front.
      // Move to Right-Center (1, 0, 0).
      // Visible: Right.
      // Front face becomes Internal.
      // Right face becomes Visible.

      // Logic:
      // `cubie.faces[RIGHT] = f[FRONT]` (Green).
      // `cubie.faces[FRONT] = f[LEFT]` (Black).
      // So at Right-Center:
      // Right Face is Green. (Visible).
      // Front Face is Black. (Internal).
      // This is correct!

      // So why does user complain?
      // "widze czerwona linie zamist pomaranczowej".
      // "Red instead of Orange".
      // "Green instead of Blue".

      // This sounds like 180 degree error.
      // Or seeing the OPPOSITE face.

      // Let's look at `_rotateCubieFaces` again.
      // Maybe I swapped the cycle?
      // Y CW (1):
      // Right <- Front
      // Back <- Right
      // Left <- Back
      // Front <- Left

      // If I am at Front (Green).
      // Move to Right.
      // I want my Green color to be on the Right Face.
      // My code: `cubie.faces[RIGHT] = f[FRONT]`.
      // This puts Green on Right Face.
      // Correct.

      // But maybe `matrixDirection` is wrong?
      // If `matrixDirection` was -1 (CCW).
      // Y CCW:
      // Left <- Front (Green).
      // Front <- Right.
      // Right <- Back.
      // Back <- Left.

      // So New Left = Green.
      // New Right = Blue (Back).

      // If I moved physically to Right (CW).
      // But colors updated CCW.
      // At Right Pos:
      // I have Blue on Right Face.
      // User expects Green.
      // "Green instead of Blue" -> User sees Green, expects Blue?
      // User says: "zielona zamiast niebieskiej".
      // "Green instead of Blue".
      // Means they see Green, but expected Blue.
      // If they see Green on Right (my code result).
      // Why would they expect Blue?
      // Maybe they rotated the other way?

      // "obracam gorna czesz kostki w prawo, obraca sie prawidlowo w prawo"
      // Top layer Right (CW).
      // Front (Green) -> Right.
      // Expect Green on Right.

      // If user sees Green on Right, that is correct.
      // Wait. "widze czerwona linie zamist pomaranczowej".
      // Red (Right) instead of Orange (Left).
      // "i zielona zamiast niebieskiej".
      // Green (Front) instead of Blue (Back).

      // If they see Red/Green.
      // And expected Orange/Blue.
      // That means they see Front/Right.
      // But expected Back/Left.
      // This means they are looking at the WRONG SIDE of the cube?
      // Or the cube rotated 180 degrees?

      // OR:
      // The faces are rendered Inside-Out?
      // CSS `backface-visibility`.
      // If I see the "inside" of the Back face, it might look like Front face?
      // But we have solid cube.

      // Let's check `rotateLayer` call in `finishRotation`.
      // `direction = steps > 0 ? -1 : 1`.
      // If `steps` = -1 (CCW drag).
      // `direction` = 1.
      // `rotateLayer(axis, index, 1)`.
      // `matrixDirection = -1`. (CCW).
      // `_rotateMatrix(-1)`.
      // `_rotateCubieFaces(-1)`.

      // Wait.
      // If Drag is CCW (Left).
      // Visual: Rotates Left.
      // Logic: Should rotate Left.
      // `_rotateMatrix(-1)` is CCW.
      // So this path is consistent.

      // What if `steps` calculation is wrong?
      // `steps = Math.round(projectedRot / 90)`.
      // `projectedRot` comes from drag.

      // Let's assume the issue is specifically about "Black faces".
      // "face tych elementów stają się czarne".
      // This happens if I see a face that is Black.

      // Hypothesis:
      // We are updating the Logic (colors), but the Visual Rotation (CSS) is NOT resetting properly or is interacting weirdly?
      // `layerRotation.value = 0` at the end.
      // This snaps the visual rotation back to 0.
      // So we see the axis-aligned cubie with new colors.

      // What if `activeLayer` is cleared BEFORE `layerRotation` is applied?
      // `activeLayer.value = null`
      // `getCubieStyle` sees null.
      // Returns `transform` without rotation.
      // So it jumps to new `x,y,z` (updated in logic) without rotation.
      // This is correct.

      // But what if `activeLayer` is cleared, but Vue hasn't updated the DOM yet?
      // Vue updates are async.
      // But we change reactive state.

      // Let's look at `rotateLayer` again.
      // Is it possible that `_rotateCubieFaces` is NOT copying the object correctly?
      // `const f = { ...cubie.faces };`
      // This creates a shallow copy of the faces object.
      // Then we mutate `cubie.faces`.
      // This should be fine.

      // Is it possible that `FACES` constants are messed up?
      // No.

      // Is it possible that `matrixDirection` logic is STILL wrong?
      // I changed `rotateLayer` to use `matrixDirection` for faces too.
      // `matrixDirection = -direction`.

      // Let's trace Y CW (direction=1).
      // `matrixDirection` = -1.
      // `_rotateMatrix(-1)` -> CCW Matrix Rotation.
      // (0, 1) -> (0, 0)?
      // CCW Matrix:
      // Row 0 -> Col 0 (reversed).
      // (0, 0) -> (2, 0).
      // (0, 1) -> (1, 0).
      // (0, 2) -> (0, 0).

      // (0, 1) [Back-Center] -> (1, 0) [Right-Center].
      // Back -> Right.
      // This is CW Physical Rotation!
      // Back (Top View 12 o'clock) -> Right (3 o'clock).
      // Yes.

      // `_rotateCubieFaces(-1)` -> CCW.
      // Left <- Front.
      // Front <- Right.
      // Right <- Back.
      // Back <- Left.

      // If I move Back (Blue) to Right.
      // New Pos: Right.
      // New Colors: Right Face gets Back Color (Blue).
      // `cubie.faces[RIGHT] = f[BACK]`.
      // My code for `direction < 0` (else block):
      // `cubie.faces[RIGHT] = f[BACK]`.
      // This matches!

      // So `matrixDirection = -direction` is CORRECT for both matrix and faces.

      // So why did the user see errors?
      // Maybe I didn't save the file?
      // Or maybe the user is reporting based on PREVIOUS version behavior?
      // "dobrze, ale nie wiem dlaczego...".
      // "Okay, but I don't know why...".
      // This sounds like they are still seeing it.

      // Wait!
      // In `CubeCSS.vue`:
      // `getCubieStyle` uses `cubie.x/y/z` * 100.
      // And `translate3d(tx, ty, tz)`.
      // Note the `ty = cubie.y * -100`.
      // Y-axis is inverted in CSS translation!
      // (CSS Y is Down, Logic Y is Up).

      // If `_rotateMatrix` assumes Logic Y (Up).
      // `rotateLayer('z')` (Front Face).
      // `mapToGrid` uses `1 - c.y` (Row).
      // Logic Y=1 -> Row 0.
      // Logic Y=-1 -> Row 2.
      // This maps Logic Grid to Matrix Row/Col.

      // If I rotate Matrix CW.
      // (0,0) -> (0,2).
      // Top-Left -> Top-Right.
      // Logic: (-1, 1) -> (1, 1).
      // Physical: Left-Up -> Right-Up.
      // This is CW.

      // So `_rotateMatrix(1)` is CW.
      // But I am calling it with `-1`?

      // `rotateLayer('z', 1, direction=1)`. (CW move).
      // `matrixDirection = -1`.
      // `_rotateMatrix(-1)`. (CCW).
      // (0,0) -> (2,0).
      // Top-Left -> Bottom-Left.
      // Logic: (-1, 1) -> (-1, -1).
      // Physical: Left-Up -> Left-Down.
      // This is CCW!

      // So `matrixDirection = -direction` makes it CCW when we want CW?
      // Why did I think `_rotateMatrix` CW corresponds to Physical CW?
      // Let's re-read my comment in `Cube.js`:
      // "Note: Direction 1 is Physical CW (CCW in Math)."
      // "Mapping analysis shows that for all axes (X, Y, Z), Physical CW corresponds to Matrix CW."

      // If Physical CW = Matrix CW.
      // Then if `direction=1` (Physical CW), we should use `matrixDirection=1` (Matrix CW).
      // BUT I set `matrixDirection = -direction`.
      // Why?
      // "However, rotateLayer receives direction -1 for CW (from move() notation)."

      // Ah! `Cube.js` `move()` method passes `-1` for CW moves like `U`.
      // `case 'U': layerOps.push({ axis: 'y', index: 1, dir: -1 });`
      // So `direction` is `-1` for CW.
      // So `matrixDirection = -(-1) = 1`.
      // So `_rotateMatrix(1)`.

      // BUT `CubeCSS.vue` passes `direction` based on drag steps.
      // `const direction = steps > 0 ? -1 : 1`.
      // If drag is Positive (Right/Down). `steps > 0`.
      // `direction = -1`.
      // `rotateLayer` called with `-1`.
      // `matrixDirection = 1`.
      // `_rotateMatrix(1)` (CW).

      // So drag Right -> Matrix CW.
      // Is drag Right visually CW?
      // Front Face. Drag Right (X+).
      // Rotates around Y.
      // Front -> Right.
      // This is Y-axis CW (looking from Top? No, Y-axis points Up).
      // Right-Hand Rule on Y (Up).
      // Thumb Up. Fingers CCW (Right->Front->Left->Back).
      // So Front -> Right is CW around NEGATIVE Y?
      // Or Front -> Right is CCW around Positive Y?
      // Front (z=1) -> Right (x=1).
      // (0, 0, 1) -> (1, 0, 0).
      // Y-rotation matrix:
      // cos -sin
      // sin cos
      // If angle 90.
      // x' = 0 - 1 = -1.
      // z' = 0 + 0 = 0.
      // (0,1) -> (-1,0). (Front -> Left).
      // So +90 deg Y rotation moves Front to Left.

      // So Front -> Right is -90 deg Y rotation.
      // Which is CW if you look from Bottom.
      // Or CCW if you look from Top.

      // `CubeCSS` mapping:
      // Front: `rotAxis: 'y'`, `sign: 1` (was -1, changed to 1).
      // Drag X+ (Right). `steps > 0`.
      // `direction = -1`.
      // `rotateLayer('y', ...)`?
      // Wait. Front Face drag rotates Y axis?
      // Yes.
      // `rotateLayer` called with `-1`.
      // `matrixDirection = 1`.
      // `_rotateMatrix(1)`.
      // `_rotateCubieFaces(1)`.

      // `_rotateCubieFaces(1)` for Y axis:
      // Right <- Front.
      // So Front (Green) -> Right Face.
      // This moves Green color to Right Face.

      // `_rotateMatrix(1)` for Y axis:
      // Matrix (CW).
      // (0,1) [Back] -> (1,2) [Right]? No.
      // (0,0) -> (0,2).
      // Back-Left -> Back-Right.
      // This is rotation around Y?
      // `mapToGrid` for Y:
      // Row = z+1. Col = x+1.
      // Back (z=-1) -> Row 0.
      // Front (z=1) -> Row 2.
      // Left (x=-1) -> Col 0.
      // Right (x=1) -> Col 2.

      // Matrix CW:
      // (0,0) -> (0,2).
      // Back-Left -> Back-Right.
      // (-1, -1) -> (1, -1).
      // Left -> Right (at Back).
      // This is Front -> Right -> Back -> Left motion?
      // No.
      // Back-Left -> Back-Right -> Front-Right -> Front-Left -> Back-Left.
      // This is CW rotation around center.

      // So Matrix CW = Physical CW around Y-axis (looking from Top).
      // Wait. Looking from Top, CW is Left->Back->Right->Front.
      // Back-Left is Top-Left corner.
      // Moves to Back-Right (Top-Right).
      // Yes.

      // So `_rotateMatrix(1)` is CW around Y (Top View).
      // But Front -> Right is CCW around Y (Top View).
      // Front (Bottom of grid) -> Right (Right of grid).
      // (2, 1) -> (1, 2).
      // Bottom-Center -> Right-Center.
      // This is CCW on the grid!
      // (0,0 is Top-Left).

      // Matrix CW rotates (0,1) [Top-Center] -> (1,2) [Right-Center].
      // (0,1) is Back.
      // Back -> Right.
      // Front is (2,1).
      // (2,1) -> (1,0) [Left-Center].
      // Front -> Left.

      // So `_rotateMatrix(1)` moves Front to Left.
      // `_rotateCubieFaces(1)` moves Front to Right.

      // CONTRADICTION!
      // `_rotateMatrix(1)` moves Front -> Left.
      // `_rotateCubieFaces(1)` moves Front -> Right.

      // So Position rotates one way, Colors rotate other way.
      // THIS IS THE BLACK FACE CAUSE.
      // The cubie moves to Left (with Front color on Right face).
      // So at Left position, we show Right face (which has Front color).
      // The Left face (which should be visible) has Back color?
      // It's a mess.

      // FIX:
      // `_rotateCubieFaces` direction logic must match `_rotateMatrix`.
      // If `_rotateMatrix(1)` moves Front -> Left.
      // Then `_rotateCubieFaces(1)` should move Front Color to Left Face.

      // Let's check `_rotateCubieFaces(1)` for Y:
      // `cubie.faces[RIGHT] = f[FACES.FRONT]`.
      // Front -> Right.

      // So `_rotateCubieFaces(1)` is CW (Front->Right).
      // `_rotateMatrix(1)` is CW (Front->Left? Wait).
      // In a grid (0,0 at top-left):
      // CW rotation: Top -> Right -> Bottom -> Left -> Top.
      // Row 0 -> Col Last.
      // Back (Row 0) -> Right (Col 2).
      // Back -> Right.
      // Front (Row 2) -> Left (Col 0).
      // Front -> Left.

      // So Matrix CW moves Back->Right, Front->Left.
      // Face CW moves Front->Right.

      // They are OPPOSITE!
      // Matrix CW (on grid) != Face CW (on cube standard).

      // We need to invert `matrixDirection` for Y axis?
      // Or invert `faceDirection`?

      // If I want Front -> Right move (Standard CW?).
      // That is Matrix CCW?
      // Matrix CCW:
      // Top (Row 0) -> Left (Col 0).
      // Back -> Left.
      // Bottom (Row 2) -> Right (Col 2).
      // Front -> Right.

      // So Matrix CCW moves Front -> Right.
      // So we need `_rotateMatrix(-1)` to move Front -> Right.

      // And we need `_rotateCubieFaces(1)` to move Front -> Right.

      // So for Y axis: `matrixDirection` should be `-faceDirection`.

      // Let's check other axes.

      // Z Axis (Front Face).
      // Map: Row = 1-y. Col = x+1.
      // y=1 (Up) -> Row 0.
      // y=-1 (Down) -> Row 2.
      // x=-1 (Left) -> Col 0.
      // x=1 (Right) -> Col 2.

      // Matrix CW:
      // Top (Row 0) -> Right (Col 2).
      // Up -> Right.

      // Face CW (Z):
      // Up -> Right.
      // `_rotateCubieFaces(1)` Z:
      // `if (direction > 0)`:
      // `cubie.faces[LEFT] = f[UP]`.
      // Up -> Left.
      // Wait. My code says:
      // `// CCW`
      // `cubie.faces[LEFT] = f[UP]`.
      // `else`: (CW)
      // `cubie.faces[RIGHT] = f[UP]`.

      // So `_rotateCubieFaces(1)` does Up -> Left (CCW).
      // `_rotateCubieFaces(-1)` does Up -> Right (CW).

      // Matrix CW (1) does Up -> Right.

      // So for Z axis:
      // Matrix(1) = Up->Right.
      // Face(-1) = Up->Right.

      // So `matrixDirection` should be `-faceDirection`.

      // X Axis (Right Face).
      // Map: Row = 1-y. Col = 1-z.
      // y=1 (Up) -> Row 0.
      // z=1 (Front) -> Col 0.
      // z=-1 (Back) -> Col 2.

      // Matrix CW:
      // Top (Row 0) -> Right (Col 2).
      // Up -> Back.

      // Face CW (X):
      // Up -> Front -> Down -> Back.
      // `_rotateCubieFaces(1)` X:
      // `cubie.faces[FRONT] = f[UP]`.
      // Up -> Front.

      // Matrix CW moves Up -> Back.
      // Face CW moves Up -> Front.
      // Opposite!

      // Matrix CCW:
      // Top (Row 0) -> Left (Col 0).
      // Up -> Front.

      // So Matrix CCW (-1) moves Up -> Front.
      // Face CW (1) moves Up -> Front.

      // So for X axis: `matrixDirection` should be `-faceDirection`.

      // CONCLUSION:
      // For ALL axes (X, Y, Z), `matrixDirection` must be opposite to `faceDirection` (if faceDirection follows my code's CW definition).

      // Current Code:
      // `matrixDirection = -direction`.
      // `_rotateMatrix(matrixDirection)`.
      // `_rotateCubieFaces(matrixDirection)`.

      // So `matrix` and `faces` get SAME direction (inverted).
      // But we just proved they need OPPOSITE directions relative to each other!

      // If `faceDirection` is `d`.
      // `matrixDirection` should be `-d`.

      // So:
      // `_rotateMatrix(-d)`.
      // `_rotateCubieFaces(d)`.

      // In my code `direction` IS `d` (passed from `rotateLayer`).
      // So I should use:
      // `_rotateMatrix(-direction)`.
      // `_rotateCubieFaces(direction)`.

      // Let's verify Y again with this plan.
      // `direction = 1`. (Face CW).
      // `_rotateCubieFaces(1)`: Front -> Right.
      // `_rotateMatrix(-1)`: Front -> Right.
      // MATCH!

      // Let's verify Z with this plan.
      // `direction = -1` (Face CW, per my code's Z logic where -1 is CW).
      // `_rotateCubieFaces(-1)`: Up -> Right.
      // `_rotateMatrix(1)`: Up -> Right.
      // MATCH!

      // Let's verify X with this plan.
      // `direction = 1` (Face CW).
      // `_rotateCubieFaces(1)`: Up -> Front.
      // `_rotateMatrix(-1)`: Up -> Front.
      // MATCH!

      // SO:
      // 1. Calculate `matrixDirection = -direction`.
      // 2. Call `_rotateMatrix(matrixDirection)`.
      // 3. Call `_rotateCubieFaces(direction)`. (ORIGINAL DIRECTION).

      // I mistakenly changed step 3 to use `matrixDirection` in the previous turn.
      // That made them same direction, which caused the mismatch.

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
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle, #222 0%, #111 100%);
  overflow: visible; /* Allow cube to rotate outside bounds */
}

.container {
  width: 0; /* Zero width to center rotation origin */
  height: 0;
  perspective: 1200px;
  pointer-events: auto;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cube-group {
  width: 0;
  height: 0;
  position: absolute;
  transform-style: preserve-3d;
  transition: transform 0.1s;
  will-change: transform;
}

.cubie {
  position: absolute;
  width: 100px;
  height: 100px;
  /* Centering logic:
     If origin is (0,0), and we want cubie (0,0,0) to be at center.
     Cubie is 100x100. Center is 50,50.
     So we offset by -50.
  */
  margin-top: -50px;
  margin-left: -50px;
  transform-style: preserve-3d;
}

.sticker-face {
  position: absolute;
  width: 98px;
  height: 98px;
  top: 1px;
  left: 1px;
  border: 1px solid rgba(0,0,0,0.5);
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  backface-visibility: hidden;
  opacity: 1;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.4); /* Sharper shadow */
}

.sticker-border {
  width: 92%;
  height: 92%;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px; /* Slightly less rounded */
  background: inherit;
}

/* Face transforms */
.sticker-face.front { transform: rotateY(0deg) translateZ(50px); }
.sticker-face.back  { transform: rotateY(180deg) translateZ(50px); }
.sticker-face.right { transform: rotateY(90deg) translateZ(50px); }
.sticker-face.left  { transform: rotateY(-90deg) translateZ(50px); }
.sticker-face.up    { transform: rotateX(90deg) translateZ(50px); }
.sticker-face.down  { transform: rotateX(-90deg) translateZ(50px); }
</style>
