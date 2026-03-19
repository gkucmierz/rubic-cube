<script setup>
import { computed } from "vue";
import { REAR_FACE_DISTANCE } from "../../config/settings.js";

const props = defineProps({
  cubies: { type: Array, required: true },
  viewMatrix: { type: Array, required: true },
  FACES: { type: Object, required: true },
  SCALE: { type: Number, default: 100 },
  activeLayer: { type: Object, default: null },
  currentLayerRotation: { type: Number, default: 0 },
  animateLayers: { type: Boolean, default: false },
  scanMode: { type: Boolean, default: false },
  scannedColors: { type: Object, default: () => ({}) },
});

// Face definitions with logical normals and grid axes
const FACE_DEFS = computed(() => {
  const F = props.FACES;
  return [
    { face: F.FRONT, normal: [0, 0, 1], gridU: [1, 0, 0], gridV: [0, 1, 0], faceKey: 'front', id: 1 },
    { face: F.BACK, normal: [0, 0, -1], gridU: [-1, 0, 0], gridV: [0, 1, 0], faceKey: 'back', id: 2 },
    { face: F.RIGHT, normal: [1, 0, 0], gridU: [0, 0, -1], gridV: [0, 1, 0], faceKey: 'right', id: 3 },
    { face: F.LEFT, normal: [-1, 0, 0], gridU: [0, 0, 1], gridV: [0, 1, 0], faceKey: 'left', id: 4 },
    { face: F.UP, normal: [0, 1, 0], gridU: [1, 0, 0], gridV: [0, 0, -1], faceKey: 'up', id: 5 },
    { face: F.DOWN, normal: [0, -1, 0], gridU: [1, 0, 0], gridV: [0, 0, 1], faceKey: 'down', id: 6 },
  ];
});

// Which faces are hidden (for static cells)
const hiddenFaceKeys = computed(() => {
  const m = props.viewMatrix;
  const keys = new Set();
  for (const fd of FACE_DEFS.value) {
    const [nx, ny, nz] = fd.normal;
    const tz = nx * m[2] + (-ny) * m[6] + nz * m[10];
    if (tz < 0) keys.add(fd.faceKey);
  }
  return keys;
});

// Orientation: cells face INWARD (toward cube center)
// Combined with backface-visibility: hidden, this means:
// - hidden face cells: front faces camera → visible
// - visible face cells: front faces away → invisible
// - rotating cells crossing the plane: naturally swap visibility
const inwardRotation = (nx, ny, nz) => {
  if (nx === 1) return 'rotateY(-90deg)';
  if (nx === -1) return 'rotateY(90deg)';
  if (ny === 1) return 'rotateX(-90deg)';
  if (ny === -1) return 'rotateX(90deg)';
  if (nz === -1) return ''; // front faces +Z (toward camera)
  return 'rotateY(180deg)'; // nz === 1: flip to face -Z (toward center)
};

// Build cells for one face
const buildFaceCells = (fd, S, dist, al, rot, isRotatingOnly) => {
  const [nx, ny, nz] = fd.normal;
  const [gu, gv] = [fd.gridU, fd.gridV];
  const orient = inwardRotation(nx, ny, nz);
  const d = S * 1.5 + dist;
  const cells = [];

  const faceCubies = props.cubies.filter((c) => {
    if (nx !== 0) return c.x === nx;
    if (ny !== 0) return c.y === ny;
    if (nz !== 0) return c.z === nz;
    return false;
  });

  for (let v = 1; v >= -1; v--) {
    for (let u = -1; u <= 1; u++) {
      const cx = nx * Math.max(Math.abs(nx), 0) || u * gu[0] + v * gv[0];
      const cy = ny * Math.max(Math.abs(ny), 0) || u * gu[1] + v * gv[1];
      const cz = nz * Math.max(Math.abs(nz), 0) || u * gu[2] + v * gv[2];

      const inLayer = al && (
        (al.axis === 'x' && cx === al.index) ||
        (al.axis === 'y' && cy === al.index) ||
        (al.axis === 'z' && cz === al.index)
      );

      // Skip: if isRotatingOnly, only include rotating cells
      // If not isRotatingOnly (hidden face), include non-rotating cells
      if (isRotatingOnly && !inLayer) continue;
      if (!isRotatingOnly && inLayer && props.animateLayers) continue;

      const cubie = faceCubies.find(
        (c) => c.x === cx && c.y === cy && c.z === cz
      );

      let color = 'black';
      let confidence = null;
      if (props.scanMode) {
        if (cubie && props.scannedColors[`${cubie.id}:${fd.faceKey}`]) {
          color = props.scannedColors[`${cubie.id}:${fd.faceKey}`].color;
          confidence = props.scannedColors[`${cubie.id}:${fd.faceKey}`].confidence;
        } else {
          color = 'white';
        }
      } else {
        color = cubie ? cubie.faces[fd.faceKey] || 'black' : 'black';
      }

      // 3D position
      const posX = nx * d + u * gu[0] * S + v * gv[0] * S;
      const posY = ny * d + u * gu[1] * S + v * gv[1] * S;
      const posZ = nz * d + u * gu[2] * S + v * gv[2] * S;

      let transform = `translate3d(${posX}px, ${-posY}px, ${posZ}px) ${orient}`;

      // Rotating cells: prepend rotation around scene center (only in advanced mode)
      if (props.animateLayers && inLayer && rot !== 0) {
        let rotPre = '';
        if (al.axis === 'x') rotPre = `rotateX(${-rot}deg)`;
        else if (al.axis === 'y') rotPre = `rotateY(${rot}deg)`;
        else if (al.axis === 'z') rotPre = `rotateZ(${-rot}deg)`;
        transform = `${rotPre} ${transform}`;
      }

      const cellIndex = (1 - v) * 3 + (u + 2);

      cells.push({
        key: `${fd.faceKey}-${u}-${v}`,
        color,
        confidence,
        transform,
        cellIndex
      });
    }
  }
  return cells;
};

// All cells to render
const allCells = computed(() => {
  const S = props.SCALE;
  const dist = REAR_FACE_DISTANCE * S * 3;
  const al = props.activeLayer;
  const rot = props.currentLayerRotation;
  const cells = [];

  for (const fd of FACE_DEFS.value) {
    const isHidden = hiddenFaceKeys.value.has(fd.faceKey);

    if (isHidden) {
      // Hidden face: render non-rotating cells (static projections)
      cells.push(...buildFaceCells(fd, S, dist, al, rot, false));
    }

    // ALL faces: render rotating-layer cells (they swap via backface-visibility)
    if (props.animateLayers && al && rot !== 0) {
      cells.push(...buildFaceCells(fd, S, dist, al, rot, true));
    }
  }

  return cells;
});
</script>

<template>
  <div class="face-projections-root">
    <div
      v-for="cell in allCells"
      :key="cell.key"
      class="proj-cell"
      :class="cell.color"
      :style="{ transform: cell.transform }"
    >
      <span class="proj-confidence" v-if="scanMode && cell.confidence">
        {{ cell.confidence }}%
      </span>
      <span class="proj-center-id" v-if="scanMode">
        {{ cell.cellIndex }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.proj-confidence {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  font-family: monospace;
  font-weight: 800;
  color: #000;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
  z-index: 2;
  pointer-events: none;
}

.proj-center-id {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 20px;
  font-family: sans-serif;
  font-weight: 900;
  color: #000;
  opacity: 0.5;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
  z-index: 1;
  pointer-events: none;
}

.face-projections-root {
  position: absolute;
  transform-style: preserve-3d;
}

.proj-cell {
  position: absolute;
  width: 100px;
  height: 100px;
  margin-left: -50px;
  margin-top: -50px;
  box-sizing: border-box;
  background: #000;
  border: 1px solid #000;
  backface-visibility: hidden;
}

.proj-cell::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border-radius: 8px;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3);
}

/* Colors - use global design system variables */
.proj-cell.white::after { background: var(--sticker-white); }
.proj-cell.yellow::after { background: var(--sticker-yellow); }
.proj-cell.green::after { background: var(--sticker-green); }
.proj-cell.blue::after { background: var(--sticker-blue); }
.proj-cell.orange::after { background: var(--sticker-orange); }
.proj-cell.red::after { background: var(--sticker-red); }
.proj-cell.black::after { display: none; }
</style>
