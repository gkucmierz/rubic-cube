<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useCube } from "../../composables/useCube";
import { useSettings } from "../../composables/useSettings";
import { LAYER_ANIMATION_DURATION } from "../../config/animationSettings";
import CubeMoveControls from "./CubeMoveControls.vue";
import MoveHistoryPanel from "./MoveHistoryPanel.vue";
import { DeepCube } from "../../utils/DeepCube.js";
import { showToast } from "../../utils/toastHelper.js";

const { cubies, initCube, rotateLayer, turn, FACES, solve, solveResult, solveError, isSolverReady } = useCube();
const { isCubeTranslucent } = useSettings();

// --- Visual State ---
// viewMatrix is a 4x4 matrix (16 floats) representing the scene rotation.
// Initial state: Tilt X by -25deg, Rotate Y by 45deg.
const identityMatrix = () => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

const rotateXMatrix = (deg) => {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ];
};

const rotateYMatrix = (deg) => {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ];
};

const multiplyMatrices = (a, b) => {
  const result = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 4; k++) {
        result[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
      }
    }
  }
  return result;
};

// Initial orientation: Tilt X, then Spin Y
const viewMatrix = ref(multiplyMatrices(rotateXMatrix(-25), rotateYMatrix(45)));
const SCALE = 100;
const GAP = 0;
const MIN_MOVES_COLUMN_GAP = 6;
const movesColumnGap = ref(MIN_MOVES_COLUMN_GAP);

// --- Interaction State ---
const isDragging = ref(false);
const dragMode = ref("view"); // 'view' or 'layer'
const startX = ref(0);
const startY = ref(0);
const lastX = ref(0);
const lastY = ref(0);
const velocity = ref(0);

// Layer Interaction
const selectedCubie = ref(null); // { id, x, y, z } static snapshot at start of drag
const selectedFace = ref(null); // 'front', 'up', etc.
const activeLayer = ref(null); // { axis, index, tangent, direction }
const currentLayerRotation = ref(0); // Visual rotation in degrees
const isAnimating = ref(false);
const pendingLogicalUpdate = ref(false);
const currentMoveId = ref(null);
const programmaticAnimation = ref(null);

const rotationDebugTarget = computed(() => {
  const anim = programmaticAnimation.value;
  if (!anim) return null;
  const angle = anim.targetRotation || 0;
  return Math.round(angle);
});

const rotationDebugCurrent = computed(() => {
  const anim = programmaticAnimation.value;
  if (!anim) return null;
  const angle = currentLayerRotation.value || 0;
  return Math.round(angle);
});

// --- Constants & Helpers ---

const getFaceNormal = (face) => {
  const map = {
    [FACES.FRONT]: { x: 0, y: 0, z: 1 },
    [FACES.BACK]: { x: 0, y: 0, z: -1 },
    [FACES.RIGHT]: { x: 1, y: 0, z: 0 },
    [FACES.LEFT]: { x: -1, y: 0, z: 0 },
    [FACES.UP]: { x: 0, y: 1, z: 0 },
    [FACES.DOWN]: { x: 0, y: -1, z: 0 },
  };
  return map[face] || { x: 0, y: 0, z: 1 };
};

const getAllowedAxes = (face) => {
  // Logic: Which axes can this face physically move along?
  switch (face) {
    case FACES.FRONT:
    case FACES.BACK:
      return ["x", "y"];
    case FACES.RIGHT:
    case FACES.LEFT:
      return ["z", "y"];
    case FACES.UP:
    case FACES.DOWN:
      return ["x", "z"];
  }
  return [];
};

const getAxisVector = (axis) => {
  if (axis === "x") return { x: 1, y: 0, z: 0 };
  if (axis === "y") return { x: 0, y: 1, z: 0 };
  if (axis === "z") return { x: 0, y: 0, z: 1 };
  return { x: 0, y: 0, z: 0 };
};

// Cross Product: a x b
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

// Project 3D vector to 2D screen space based on current viewMatrix
const project = (v) => {
  const m = viewMatrix.value;
  // Apply rotation matrix: v' = M * v
  // (Ignoring translation/w for pure rotation projection)
  const x = v.x * m[0] + v.y * m[4] + v.z * m[8];
  const y = v.x * m[1] + v.y * m[5] + v.z * m[9];
  // z ignored for 2D projection
  return { x, y };
};

// --- Interaction Logic ---

const onMouseDown = (e) => {
  if (isAnimating.value) return;

  isDragging.value = true;
  startX.value = e.clientX;
  startY.value = e.clientY;
  lastX.value = e.clientX;
  lastY.value = e.clientY;
  velocity.value = 0;

  const target = e.target.closest(".sticker");
  if (target) {
    const id = parseInt(target.dataset.id);
    const face = target.dataset.face;
    const cubie = cubies.value.find((c) => c.id === id);

    selectedCubie.value = { ...cubie }; // Snapshot position
    selectedFace.value = face;

    // Mechanical Realism Rules:
    // Centers (absSum <= 1) are "Stiff" (part of the core frame). Dragging them rotates the View.
    // Corners/Edges (absSum > 1) are "Moving Parts". Dragging them rotates the Layer.
    const absSum = Math.abs(cubie.x) + Math.abs(cubie.y) + Math.abs(cubie.z);
    dragMode.value = absSum <= 1 ? "view" : "layer";
  } else {
    dragMode.value = "view";
    selectedCubie.value = null;
  }
};

const onMouseMove = (e) => {
  if (!isDragging.value) return;

  const dx = e.clientX - lastX.value;
  const dy = e.clientY - lastY.value;

  if (dragMode.value === "view") {
    // Relative View Rotation:
    // Dragging mouse Down (positive dy) should pull the TOP of the cube towards the user.
    // In standard math, rotating a cube around World X-axis by positive angle tilts it BACK.
    // So we use -dy for the rotation angle.
    const deltaX = rotateXMatrix(-dy * 0.5);
    const deltaY = rotateYMatrix(dx * 0.5);

    // Order matters: Apply deltas on top of current orientation.
    // RotationY(dx) * RotationX(dy) * currentMatrix
    // Result: Horizontal dragging always spins around screen Y,
    // vertical dragging always tilts around screen X.
    const combinedDelta = multiplyMatrices(deltaY, deltaX);
    viewMatrix.value = multiplyMatrices(combinedDelta, viewMatrix.value);
  } else if (dragMode.value === "layer" && selectedCubie.value) {
    const totalDx = e.clientX - startX.value;
    const totalDy = e.clientY - startY.value;

    handleLayerDrag(totalDx, totalDy, dx, dy);
  }

  lastX.value = e.clientX;
  lastY.value = e.clientY;
};

const handleLayerDrag = (totalDx, totalDy, dx, dy) => {
  // If we haven't locked an axis yet
  if (!activeLayer.value) {
    if (Math.sqrt(totalDx ** 2 + totalDy ** 2) < 5) return; // Threshold

    const faceNormal = getFaceNormal(selectedFace.value);
    const axes = getAllowedAxes(selectedFace.value);

    let best = null;
    let maxDot = 0;

    // Analyze candidates
    axes.forEach((axis) => {
      // Tangent = Normal x Axis
      // This is the 3D direction of motion for Positive Rotation around this Axis
      const t3D = cross(faceNormal, getAxisVector(axis));
      const t2D = project(t3D);
      const len = Math.sqrt(t2D.x ** 2 + t2D.y ** 2);

      if (len > 0.1) {
        const nx = t2D.x / len;
        const ny = t2D.y / len;

        // Compare with mouse drag direction
        const mouseLen = Math.sqrt(totalDx ** 2 + totalDy ** 2);
        const mx = totalDx / mouseLen;
        const my = totalDy / mouseLen;

        const dot = Math.abs(mx * nx + my * ny);

        if (dot > maxDot) {
          maxDot = dot;
          best = { axis, tangent: { x: nx, y: ny } };
        }
      }
    });

    if (best && maxDot > 0.5) {
      // Lock Axis
      let index = 0;
      if (best.axis === "x") index = selectedCubie.value.x;
      if (best.axis === "y") index = selectedCubie.value.y;
      if (best.axis === "z") index = selectedCubie.value.z;

      activeLayer.value = {
        axis: best.axis,
        index,
        tangent: best.tangent,
      };
    } else {
      // Fallback: if drag doesn't match a layer axis, maybe user wants to rotate view?
      // Only switch if drag is significant
      if (Math.sqrt(totalDx ** 2 + totalDy ** 2) > 20) {
        // Keep layer mode but maybe relax?
        // No, sticky mode is better.
      }
    }
  }

  // If we have an active layer, update rotation
  if (activeLayer.value) {
    const { x, y } = activeLayer.value.tangent;
    // Project delta onto key
    const val = dx * x + dy * y;
    // Scale factor
    currentLayerRotation.value += val * 0.6;
  }
};

const onMouseUp = () => {
  if (isDragging.value && activeLayer.value) {
    snapRotation();
  }
  isDragging.value = false;
};

const snapRotation = () => {
  isAnimating.value = true;

  // Determine nearest 90 deg
  const target = Math.round(currentLayerRotation.value / 90) * 90;
  const steps = Math.round(currentLayerRotation.value / 90);

  const start = currentLayerRotation.value;
  const startTime = performance.now();
  const duration = LAYER_ANIMATION_DURATION;

  const animate = (time) => {
    const p = Math.min((time - startTime) / duration, 1);
    const ease = easeInOutCubic(p);

    currentLayerRotation.value = start + (target - start) * ease;

    if (p < 1) {
      requestAnimationFrame(animate);
    } else {
      // Animation done
      finishMove(steps);
    }
  };
  requestAnimationFrame(animate);
};

const finishMove = (steps, directionOverride = null) => {
  if (steps !== 0 && activeLayer.value) {
    const { axis, index } = activeLayer.value;
    const count = Math.abs(steps);
    const direction =
      directionOverride !== null ? directionOverride : steps > 0 ? 1 : -1;

    // LOGICAL SYNC (CRITICAL):
    // Our visual rotation signs in getCubieStyle and tangent calc are now aligned.
    // However, some axes might still be inverted based on coordinate system (Right-handed vs CSS).
    let finalDirection = direction;

    // Y-axis spin in project/matrix logic vs cubic logic often needs swap
    if (axis === "y") finalDirection *= -1;
    if (axis === "z") finalDirection *= -1;

    pendingLogicalUpdate.value = true;
    rotateLayer(axis, index, finalDirection, count);
  }
};

const movesHistory = ref([]);

const displayMoves = computed(() => {
  const list = movesHistory.value.slice();

  moveQueue.value.forEach((q, idx) => {
    const stepsMod = ((q.steps % 4) + 4) % 4;
    if (stepsMod === 0) return;

    let modifier = "";
    if (stepsMod === 1) modifier = "'";
    else if (stepsMod === 2) modifier = "2";
    else if (stepsMod === 3) modifier = "";

    const baseLabel = q.displayBase || q.base;
    const label =
      baseLabel + (modifier === "'" ? "'" : modifier === "2" ? "2" : "");

    list.push({
      id: `q-${idx}`,
      label,
      status: "pending",
    });
  });

  return list;
});

const getAxisIndexForBase = (base) => {
  if (base === "U") return { axis: "y", index: 1 };
  if (base === "D") return { axis: "y", index: -1 };
  if (base === "L") return { axis: "x", index: -1 };
  if (base === "R") return { axis: "x", index: 1 };
  if (base === "F") return { axis: "z", index: 1 };
  if (base === "B") return { axis: "z", index: -1 };
  return { axis: "y", index: 0 };
};

const getVisualFactor = (axis, base) => {
  let factor = 1;
  if (axis === "z") factor *= -1;
  if (base === "U" || base === "D") factor *= -1;
  return factor;
};

const coerceStepsToSign = (steps, sign) => {
  if (steps === 0) return 0;
  const mod = ((steps % 4) + 4) % 4;
  if (sign < 0) {
    if (mod === 1) return -3;
    if (mod === 2) return -2;
    return -1;
  }
  if (mod === 1) return 1;
  if (mod === 2) return 2;
  return 3;
};

const formatMoveLabel = (displayBase, steps) => {
  const stepsMod = ((steps % 4) + 4) % 4;
  if (stepsMod === 0) return displayBase;
  let modifier = "";
  if (stepsMod === 1) modifier = "'";
  else if (stepsMod === 2) modifier = "2";
  else if (stepsMod === 3) modifier = "";
  return displayBase + (modifier === "'" ? "'" : modifier === "2" ? "2" : "");
};

const updateCurrentMoveLabel = (displayBase, steps) => {
  if (currentMoveId.value === null) return;
  const idx = movesHistory.value.findIndex((m) => m.id === currentMoveId.value);
  if (idx === -1) return;
  movesHistory.value[idx] = {
    ...movesHistory.value[idx],
    label: formatMoveLabel(displayBase, steps),
  };
};

const copyQueueToClipboard = async () => {
  if (!displayMoves.value.length) return;
  const text = displayMoves.value.map((m) => m.label).join(" ");
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    }
  } catch (e) {}
};

const resetQueue = () => {
  moveQueue.value = [];
  movesHistory.value = [];
  currentMoveId.value = null;
};

const handleAddMoves = (text) => {
  const tokens = text.split(/\s+/).filter(Boolean);
  const moves = [];

  tokens.forEach((token) => {
    const t = token.trim();
    if (!t) return;
    const base = t[0];
    if (!"UDLRFB".includes(base)) return;
    const rest = t.slice(1);
    let key = null;
    if (rest === "") key = base;
    else if (rest === "2") key = base + "2";
    else if (rest === "'" || rest === "’") key = base + "-prime";
    if (key && MOVE_MAP[key]) {
      moves.push(key);
    }
  });

  moves.forEach((m) => applyMove(m));
};

const getCubieStyle = (c) => {
  // Base Position
  const x = c.x * (SCALE + GAP);
  const y = c.y * -(SCALE + GAP); // Y is up in logic, down in CSS
  const z = c.z * (SCALE + GAP);

  let transform = `translate3d(${x}px, ${y}px, ${z}px)`;

  // Apply Active Layer Rotation
  if (activeLayer.value) {
    const { axis, index } = activeLayer.value;
    let match = false;
    // Match based on CURRENT LOGICAL POSITION
    if (axis === "x" && c.x === index) match = true;
    if (axis === "y" && c.y === index) match = true;
    if (axis === "z" && c.z === index) match = true;

    if (match) {
      // Rotation Group around Center (0,0,0)
      let rot = currentLayerRotation.value;

      // Axis mapping for CSS
      // If we rotate a group around center, we want standard rotation.
      // Logic Z=1 (Front). CSS +Z is Front.
      // Logic Y=1 (Up). CSS -Y is Up.
      // Logic X=1 (Right). CSS +X is Right.

      // Rotations:
      // CSS rotateX: + is Top->Back. (Standard R direction)
      // CSS rotateY: + is Right->Back. (Spin Right)
      // CSS rotateZ: + is Top->Right. (Clockwise)

      // We align rot so that +90 degrees visually matches logical direction=1 (CW)
      if (axis === "x") transform = `rotateX(${rot}deg) ` + transform;
      if (axis === "y") transform = `rotateY(${rot}deg) ` + transform;
      if (axis === "z") transform = `rotateZ(${-rot}deg) ` + transform;
    }
  }

  return { transform };
};

const getProjectionStyle = () => ({});

const moveQueue = ref([]);

const dequeueMove = () => {
  while (moveQueue.value.length) {
    const next = moveQueue.value.shift();
    const stepsMod = ((next.steps % 4) + 4) % 4;
    if (stepsMod === 0) continue;

    let modifier = "";
    if (stepsMod === 1)
      modifier = "'"; // +90 (logical +1)
    else if (stepsMod === 2)
      modifier = "2"; // 180 (logical -2)
    else if (stepsMod === 3) modifier = ""; // -90 (logical -1)

    return { base: next.base, modifier, displayBase: next.displayBase };
  }
  return null;
};

const processNextMove = () => {
  if (isAnimating.value || activeLayer.value) return;
  const next = dequeueMove();
  if (!next) return;

  const baseLabel = next.displayBase || next.base;
  const label =
    baseLabel +
    (next.modifier === "'" ? "'" : next.modifier === "2" ? "2" : "");
  const id = movesHistory.value.length;
  movesHistory.value.push({ id, label, status: "in_progress" });
  currentMoveId.value = id;

  animateProgrammaticMove(next.base, next.modifier, baseLabel);
};

const easeInOutCubic = (t) => {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// Derivative of standard easeInOutCubic for instantaneous velocity calculations
const easeInOutCubicDerivative = (t) => {
  if (t < 0.5) return 12 * t * t;
  return 3 * Math.pow(-2 * t + 2, 2);
};

// Custom easing function that preserves initial velocity $v_0$
// The polynomial is $P(t) = (v_0 - 2)t^3 + (3 - 2v_0)t^2 + v_0 t$
const cubicEaseWithInitialVelocity = (t, v0) => {
  return (v0 - 2) * t * t * t + (3 - 2 * v0) * t * t + v0 * t;
};

// Derivative of the custom easing function
const cubicEaseWithInitialVelocityDerivative = (t, v0) => {
  return 3 * (v0 - 2) * t * t + 2 * (3 - 2 * v0) * t + v0;
};

const sampleProgrammaticAngle = (anim, time) => {
  const p = Math.min((time - anim.startTime) / anim.duration, 1);
  const ease =
    anim.v0 !== undefined
      ? cubicEaseWithInitialVelocity(p, anim.v0)
      : easeInOutCubic(p);
  return anim.startRotation + (anim.targetRotation - anim.startRotation) * ease;
};

// Calculate the current rotation derivative (Velocity in degrees per millisecond)
const programmaticVelocity = (anim, time) => {
  if (time >= anim.startTime + anim.duration) return 0;
  const p = Math.max(0, Math.min((time - anim.startTime) / anim.duration, 1));

  const d_ease_dp =
    anim.v0 !== undefined
      ? cubicEaseWithInitialVelocityDerivative(p, anim.v0)
      : easeInOutCubicDerivative(p);

  const totalVisualDelta = anim.targetRotation - anim.startRotation;
  // dp/dt = 1 / duration
  // d_angle/dt = (totalVisualDelta) * (d_ease_dp) * (dp/dt)
  return (totalVisualDelta * d_ease_dp) / anim.duration;
};

const stepProgrammaticAnimation = (time) => {
  const anim = programmaticAnimation.value;
  if (!anim) return;
  const nextRotation = sampleProgrammaticAngle(anim, time);
  currentLayerRotation.value = nextRotation;
  if (time - anim.startTime < anim.duration) {
    requestAnimationFrame(stepProgrammaticAnimation);
  } else {
    let steps = Math.abs(anim.logicalSteps);
    const dir = anim.logicalSteps >= 0 ? 1 : -1;

    programmaticAnimation.value = null;

    if (steps === 0) {
      // Animation directly cancelled. Manually trigger lock release instead of waiting for worker payload.
      if (currentMoveId.value !== null) {
        const idx = movesHistory.value.findIndex(
          (m) => m.id === currentMoveId.value,
        );
        if (idx !== -1) {
          movesHistory.value[idx] = {
            ...movesHistory.value[idx],
            status: "done",
          };
        }
        currentMoveId.value = null;
      }
      activeLayer.value = null;
      isAnimating.value = false;
      selectedCubie.value = null;
      selectedFace.value = null;
      processNextMove();
    } else {
      pendingLogicalUpdate.value = true;
      rotateLayer(anim.axis, anim.index, dir, steps);
    }
  }
};

const animateProgrammaticMove = (base, modifier, displayBase) => {
  if (isAnimating.value || activeLayer.value) return;

  const { axis, index } = getAxisIndexForBase(base);

  const count = modifier === "2" ? 2 : 1;
  const direction = modifier === "'" ? 1 : -1;
  const logicalSteps = direction * count;
  const visualFactor = getVisualFactor(axis, displayBase);
  const visualDelta = logicalSteps * visualFactor * 90;

  activeLayer.value = {
    axis,
    index,
    tangent: { x: 1, y: 0 },
  };
  isAnimating.value = true;

  currentLayerRotation.value = 0;
  const startRotation = 0;
  const targetRotation = visualDelta;

  programmaticAnimation.value = {
    axis,
    index,
    displayBase,
    logicalSteps,
    visualFactor,
    targetRotation,
    startRotation,
    startTime: performance.now(),
    duration:
      LAYER_ANIMATION_DURATION *
      Math.max(Math.abs(visualDelta) / 90 || 1, 0.01),
  };

  requestAnimationFrame(stepProgrammaticAnimation);
};

const MOVE_MAP = {
  U: { base: "U", modifier: "" },
  "U-prime": { base: "U", modifier: "'" },
  U2: { base: "U", modifier: "2" },

  D: { base: "D", modifier: "'" },
  "D-prime": { base: "D", modifier: "" },
  D2: { base: "D", modifier: "2" },

  L: { base: "B", modifier: "'" },
  "L-prime": { base: "B", modifier: "" },
  L2: { base: "B", modifier: "2" },

  R: { base: "F", modifier: "" },
  "R-prime": { base: "F", modifier: "'" },
  R2: { base: "F", modifier: "2" },

  F: { base: "L", modifier: "'" },
  "F-prime": { base: "L", modifier: "" },
  F2: { base: "L", modifier: "2" },

  B: { base: "R", modifier: "" },
  "B-prime": { base: "R", modifier: "'" },
  B2: { base: "R", modifier: "2" },
};

const isAddModalOpen = ref(false);
const addMovesText = ref("");

const openAddModal = () => {
  addMovesText.value = "";
  isAddModalOpen.value = true;
};

const closeAddModal = () => {
  isAddModalOpen.value = false;
};

const handleKeydown = (e) => {
  if (e.key === "Escape" && isAddModalOpen.value) {
    e.preventDefault();
    closeAddModal();
  }
};

const applyMove = (move) => {
  const mapping = MOVE_MAP[move];
  if (!mapping) return;

  let delta = 0;
  if (mapping.modifier === "'")
    delta = 1; // logical +1
  else if (mapping.modifier === "")
    delta = -1; // logical -1
  else if (mapping.modifier === "2") delta = -2; // logical -2

  const displayBase = move[0];
  const { axis, index } = getAxisIndexForBase(mapping.base);
  const visualFactor = getVisualFactor(axis, displayBase);
  const currentAnim = programmaticAnimation.value;

  if (
    currentAnim &&
    isAnimating.value &&
    activeLayer.value &&
    currentAnim.axis === axis &&
    currentAnim.index === index &&
    moveQueue.value.length === 0
  ) {
    const now = performance.now();

    const currentAngle = sampleProgrammaticAngle(currentAnim, now);
    const currentVelocity = programmaticVelocity(currentAnim, now); // degrees per ms

    currentLayerRotation.value = currentAngle;
    currentAnim.logicalSteps += delta;
    const additionalVisualDelta = delta * currentAnim.visualFactor * 90;

    // Setup new target
    currentAnim.startRotation = currentAngle;
    currentAnim.targetRotation += additionalVisualDelta;
    currentAnim.startTime = now;

    const remainingVisualDelta = currentAnim.targetRotation - currentAngle;
    // Recalculate duration based on how far we still have to go
    currentAnim.duration =
      LAYER_ANIMATION_DURATION *
      Math.max(Math.abs(remainingVisualDelta) / 90, 0.01);

    // Calculate normalized initial velocity v0
    let v0 = 0;
    if (Math.abs(remainingVisualDelta) > 0.01) {
      v0 = (currentVelocity * currentAnim.duration) / remainingVisualDelta;
    }

    currentAnim.v0 = Math.max(-3, Math.min(3, v0));

    // Format the new label instantly
    const label = formatMoveLabel(displayBase, currentAnim.logicalSteps);
    updateCurrentMoveLabel(displayBase, currentAnim.logicalSteps);

    return;
  }

  const last = moveQueue.value[moveQueue.value.length - 1];
  if (last && last.base === mapping.base && last.displayBase === displayBase) {
    last.steps += delta;
  } else {
    moveQueue.value.push({ base: mapping.base, displayBase, steps: delta });
  }

  processNextMove();
};

const allMoves = Object.keys(MOVE_MAP);

const scramble = () => {
  for (let i = 0; i < 30; i += 1) {
    const move = allMoves[Math.floor(Math.random() * allMoves.length)];
    applyMove(move);
  }
};

const handleSolve = async (solverType) => {
  if (isAnimating.value) return;

  if (solverType === "kociemba" && !isSolverReady.value) {
    showToast("wait for initialize solver", "info", {
      style: {
        background: "linear-gradient(to right, #b45309, #d97706)",
        color: "#ffffff"
      }
    });
    return;
  }

  const currentCube = DeepCube.fromCubies(cubies.value);

  if (!currentCube.isValid()) {
    console.error("Cube is physically impossible!");
    return;
  }

  // Already solved? (Identity check)
  if (currentCube.isSolved()) {
    showToast("scramble cube first", "info");
    return;
  }

  solve(solverType, {
    cp: currentCube.cp,
    co: currentCube.co,
    ep: currentCube.ep,
    eo: currentCube.eo,
  });
};

// Listen for solution from worker
watch(solveResult, (solution) => {
  if (solution && solution.length > 0) {
    const uiMoves = solution.map((m) => {
      const solverBase = m[0];
      let solverModifier = m.slice(1);

      // Topological neg-axes (D, L, B) require visually inverted dir mapping for CW/CCW
      if (["D", "L", "B"].includes(solverBase)) {
        if (solverModifier === "") solverModifier = "'";
        else if (solverModifier === "'") solverModifier = "";
      }

      for (const [uiKey, mapping] of Object.entries(MOVE_MAP)) {
        if (
          mapping.base === solverBase &&
          mapping.modifier === solverModifier
        ) {
          return uiKey;
        }
      }
      return null;
    }).filter(m => m !== null);

    uiMoves.forEach((m) => applyMove(m));
  }
});

watch(solveError, (err) => {
  if (err) {
    showToast(err, "info", {
      style: {
        background: "linear-gradient(to right, #b45309, #d97706)",
        color: "#ffffff"
      }
    });
  }
});

watch(cubies, () => {
  if (!pendingLogicalUpdate.value) return;
  pendingLogicalUpdate.value = false;

  if (currentMoveId.value !== null) {
    const idx = movesHistory.value.findIndex(
      (m) => m.id === currentMoveId.value,
    );
    if (idx !== -1) {
      movesHistory.value[idx] = {
        ...movesHistory.value[idx],
        status: "done",
      };
    }
    currentMoveId.value = null;
  }

  activeLayer.value = null;
  isAnimating.value = false;
  selectedCubie.value = null;
  selectedFace.value = null;
  processNextMove();
});

onMounted(() => {
  initCube();
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="smart-cube-container">
    <div
      class="scene"
      :style="{ transform: `matrix3d(${viewMatrix.join(',')})` }"
      @mousedown="onMouseDown"
    >
      <div class="cube">
        <div
          v-for="c in cubies"
          :key="c.id"
          class="cubie"
          :style="getCubieStyle(c)"
          :data-cubie-id="c.id"
        >
          <div
            v-for="(color, face) in c.faces"
            :key="face"
            class="sticker"
            :class="[face, color]"
            :style="{ opacity: isCubeTranslucent ? 0.3 : 1 }"
            :data-id="c.id"
            :data-face="face"
          ></div>
        </div>
      </div>
    </div>

    <CubeMoveControls
      @move="applyMove"
      @scramble="scramble"
      @solve="handleSolve"
    />

    <MoveHistoryPanel
      :moves="displayMoves"
      @reset="resetQueue"
      @copy="copyQueueToClipboard"
      @add-moves="handleAddMoves"
      @open-add-modal="openAddModal"
    />
    <div
      v-if="isAddModalOpen"
      class="moves-modal-backdrop"
      @click.self="closeAddModal"
    >
      <div class="moves-modal">
        <textarea v-model="addMovesText" class="moves-modal-textarea" />
        <div class="moves-modal-actions">
          <button
            class="btn-neon move-btn moves-modal-button"
            @click="closeAddModal"
          >
            cancel
          </button>
          <button
            class="btn-neon move-btn moves-modal-button"
            @click="handleAddMoves(addMovesText)"
          >
            add moves
          </button>
        </div>
      </div>
    </div>
    <div class="rotation-debug">
      <div class="rotation-debug-target">
        {{ rotationDebugTarget !== null ? rotationDebugTarget : "-" }}
      </div>
      <div class="rotation-debug-current">
        {{ rotationDebugCurrent !== null ? rotationDebugCurrent : "-" }}
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

.rotation-debug {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  z-index: 60;
}

.rotation-debug-target {
  font-size: 1.1rem;
  font-weight: 700;
}

.rotation-debug-current {
  font-size: 0.95rem;
  opacity: 0.8;
}

.moves-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.moves-modal {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  color: var(--text-color);
  border-radius: 10px;
  padding: 24px;
  min-width: 480px;
  max-width: 800px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
}

.moves-modal-textarea {
  width: 100%;
  min-height: 220px;
  background: var(--panel-bg);
  color: var(--text-color);
  box-sizing: border-box;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  padding: 10px;
  resize: vertical;
  font-family: inherit;
  font-size: 0.85rem;
}

.moves-modal-textarea:focus {
  outline: none;
  box-shadow: none;
}

.moves-modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.moves-modal-button {
  font-size: 0.85rem;
}

.moves-modal-button:focus {
  outline: none;
  box-shadow: none;
}

/* Projection Styles */
.projections {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
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
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border-radius: 8px; /* Rounded sticker */
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3); /* Inner depth */
  z-index: 1;
}

/* Sticker Positions relative to Cubie Center */
.sticker.up {
  transform: rotateX(90deg) translateZ(50px);
}
.sticker.down {
  transform: rotateX(-90deg) translateZ(50px);
}
.sticker.front {
  transform: translateZ(50px);
}
.sticker.back {
  transform: rotateY(180deg) translateZ(50px);
}
.sticker.left {
  transform: rotateY(-90deg) translateZ(50px);
}
.sticker.right {
  transform: rotateY(90deg) translateZ(50px);
}

/* Colors - apply to the pseudo-element */
.white::after {
  background: #e0e0e0;
}
.yellow::after {
  background: #ffd500;
}
.green::after {
  background: #009e60;
}
.blue::after {
  background: #0051ba;
}
.orange::after {
  background: #ff5800;
}
.red::after {
  background: #c41e3a;
}

/* Black internal faces - no sticker needed */
.black {
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
