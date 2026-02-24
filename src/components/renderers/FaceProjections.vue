<script setup>
import { computed } from "vue";
import { REAR_FACE_DISTANCE } from "../../config/settings.js";

const props = defineProps({
  cubies: { type: Array, required: true },
  viewMatrix: { type: Array, required: true },
  FACES: { type: Object, required: true },
  SCALE: { type: Number, default: 100 },
});

// The 6 face definitions with logical-space normals and grid axes
const FACE_DEFS = computed(() => {
  const F = props.FACES;
  return [
    { face: F.FRONT, normal: [0, 0, 1], gridU: [1, 0, 0], gridV: [0, 1, 0], faceKey: 'front' },
    { face: F.BACK, normal: [0, 0, -1], gridU: [-1, 0, 0], gridV: [0, 1, 0], faceKey: 'back' },
    { face: F.RIGHT, normal: [1, 0, 0], gridU: [0, 0, -1], gridV: [0, 1, 0], faceKey: 'right' },
    { face: F.LEFT, normal: [-1, 0, 0], gridU: [0, 0, 1], gridV: [0, 1, 0], faceKey: 'left' },
    { face: F.UP, normal: [0, 1, 0], gridU: [1, 0, 0], gridV: [0, 0, -1], faceKey: 'up' },
    { face: F.DOWN, normal: [0, -1, 0], gridU: [1, 0, 0], gridV: [0, 0, 1], faceKey: 'down' },
  ];
});

// Determine which 3 faces are hidden (transformed normal Z < 0 in CSS space)
const hiddenFaces = computed(() => {
  const m = props.viewMatrix;
  return FACE_DEFS.value.filter((fd) => {
    const [nx, ny, nz] = fd.normal;
    // viewMatrix is in CSS space where Y is inverted, so negate ny
    const cssNy = -ny;
    const tz = nx * m[2] + cssNy * m[6] + nz * m[10];
    return tz < 0; // Pointing away from camera = hidden
  });
});

// For each hidden face, extract the 3x3 grid of sticker colors and 3D transform
const faceGrids = computed(() => {
  const S = props.SCALE;
  const dist = REAR_FACE_DISTANCE * S * 3; // distance in px (cube width = 3*SCALE)

  return hiddenFaces.value.map((fd) => {
    const [nx, ny, nz] = fd.normal;

    // Get the 9 cubies on this face
    const faceCubies = props.cubies.filter((c) => {
      if (nx !== 0) return c.x === nx;
      if (ny !== 0) return c.y === ny;
      if (nz !== 0) return c.z === nz;
      return false;
    });

    // Build 3x3 grid: map cubie positions to grid cells
    const [gu, gv] = [fd.gridU, fd.gridV];
    const cells = [];
    for (let v = 1; v >= -1; v--) { // top to bottom
      for (let u = -1; u <= 1; u++) { // left to right
        const cx = nx * Math.max(Math.abs(nx), 0) || u * gu[0] + v * gv[0];
        const cy = ny * Math.max(Math.abs(ny), 0) || u * gu[1] + v * gv[1];
        const cz = nz * Math.max(Math.abs(nz), 0) || u * gu[2] + v * gv[2];

        const cubie = faceCubies.find(
          (c) => c.x === cx && c.y === cy && c.z === cz
        );
        const color = cubie ? cubie.faces[fd.faceKey] || 'black' : 'black';
        cells.push(color);
      }
    }

    // Position: ALONG the normal direction (behind the cube from camera's perspective)
    const d = S * 1.5 + dist;
    const offsetX = nx * d;
    const cssY = -ny * d; // Logical Y → CSS Y (inverted)
    const offsetZ = nz * d;

    let transform = `translate3d(${offsetX}px, ${cssY}px, ${offsetZ}px)`;

    // Rotate panel to face OUTWARD from cube center
    if (nx === 1) transform += ' rotateY(90deg)';
    else if (nx === -1) transform += ' rotateY(-90deg)';
    else if (ny === 1) transform += ' rotateX(90deg)';
    else if (ny === -1) transform += ' rotateX(-90deg)';
    else if (nz === -1) transform += ' rotateY(180deg)';
    // nz === 1: default orientation (front faces +z)

    return {
      faceKey: fd.faceKey,
      cells,
      transform,
    };
  });
});
</script>

<template>
  <div
    v-for="grid in faceGrids"
    :key="grid.faceKey"
    class="face-projection"
    :style="{ transform: grid.transform }"
  >
    <div
      v-for="(color, idx) in grid.cells"
      :key="idx"
      class="proj-cell"
      :class="color"
    ></div>
  </div>
</template>

<style scoped>
.face-projection {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 300px;
  height: 300px;
  /* Center the grid on its position */
  margin-left: -150px;
  margin-top: -150px;
}

.proj-cell {
  box-sizing: border-box;
  background: #000;
  border: 1px solid #000;
  position: relative;
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
