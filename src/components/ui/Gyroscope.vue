<script setup>
import { computed } from 'vue';

const props = defineProps({
  pitch: { type: Number, default: 0 },
  yaw: { type: Number, default: 0 },
  roll: { type: Number, default: 0 }
});

const gimbalStyle = {
  transform: `rotateX(-20deg) rotateY(30deg)`
};

// X-axis ring rotates around X by Pitch
const ringXStyle = computed(() => ({
  transform: `rotateY(90deg) rotateZ(${-props.pitch}deg)`
}));

// Y-axis ring rotates around Y by Yaw
const ringYStyle = computed(() => ({
  transform: `rotateX(90deg) rotateZ(${-props.yaw}deg)`
}));

// Z-axis ring rotates around Z by Roll
const ringZStyle = computed(() => ({
  transform: `rotateZ(${-props.roll}deg)`
}));

// To make spheres perfect circles and always on top, we render them outside the rings.
// We apply the ring's rotation, then translate them to the edge, then inverse-rotate
// to face the camera, and finally translateZ to force them to render on top of all 3D lines.

// Gimbal inverse rotation: rotateY(-30deg) rotateX(20deg)
const sphereXStyle = computed(() => ({
  transform: `rotateY(90deg) rotateZ(${-props.pitch}deg) translateY(-52.5px) rotateZ(${props.pitch}deg) rotateY(-90deg) rotateY(-30deg) rotateX(20deg) translateZ(50px)`
}));

const sphereYStyle = computed(() => ({
  transform: `rotateX(90deg) rotateZ(${-props.yaw}deg) translateY(-52.5px) rotateZ(${props.yaw}deg) rotateX(-90deg) rotateY(-30deg) rotateX(20deg) translateZ(50px)`
}));

const sphereZStyle = computed(() => ({
  transform: `rotateZ(${-props.roll}deg) translateY(-52.5px) rotateZ(${props.roll}deg) rotateY(-30deg) rotateX(20deg) translateZ(50px)`
}));

// The target (combined) sphere shows the final orientation of the "Front" face normal vector
// It applies all 3 rotations (Yaw, Pitch, Roll in YXZ order) to a vector pointing towards Z (camera)
// Then it applies the gimbal inverse rotation to render it on our static axes.
const sphereTargetStyle = computed(() => ({
  // 1. Initial position: On the edge of the sphere, pointing right at the camera (Z axis)
  // We translate Z outwards by radius (52.5px)
  // 2. Apply Euler rotations (matched to Three.js YXZ order used in SmartCube)
  // 3. Apply gimbal inverse to match static axes perspective
  transform: `
    rotateY(${props.yaw}deg)
    rotateX(${-props.pitch}deg)
    rotateZ(${-props.roll}deg)
    translateZ(52.5px)

    rotateZ(${props.roll}deg)
    rotateX(${props.pitch}deg)
    rotateY(${-props.yaw}deg)

    rotateY(-30deg)
    rotateX(20deg)
    translateZ(50px)
  `
}));

// Format angle to fixed width with sign correctly placed
const formatAngle = (val) => {
  return `${val.toFixed(1).padStart(6, ' ')}°`;
};
</script>

<template>
  <div class="gyroscope">
    <div class="gimbal" :style="gimbalStyle">
      <!-- Fixed Axes -->
      <div class="axis axis-x"></div>
      <div class="axis axis-y"></div>
      <div class="axis axis-z"></div>

      <!-- Rings -->
      <div class="ring ring-x" :style="ringXStyle"></div>
      <div class="ring ring-y" :style="ringYStyle"></div>
      <div class="ring ring-z" :style="ringZStyle"></div>

      <!-- Free Spheres (always facing camera and on top) -->
      <div class="sphere sphere-x" :style="sphereXStyle"></div>
      <div class="sphere sphere-y" :style="sphereYStyle"></div>
      <div class="sphere sphere-z" :style="sphereZStyle"></div>

      <!-- Target Combined Sphere -->
      <div class="sphere sphere-target" :style="sphereTargetStyle"></div>
    </div>

    <div class="labels">
      <div class="row"><span class="label">Pitch:</span><span class="value">{{ formatAngle(pitch) }}</span></div>
      <div class="row"><span class="label">Yaw:</span><span class="value">{{ formatAngle(yaw) }}</span></div>
      <div class="row"><span class="label">Roll:</span><span class="value">{{ formatAngle(roll) }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.gyroscope {
  position: absolute;
  top: 80px;
  left: 20px;
  width: 150px;
  height: 150px;
  /* perspective is REMOVED to align intersections perfectly orthographically */
  pointer-events: none;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.gimbal {
  position: relative;
  width: 105px;
  height: 105px;
  transform-style: preserve-3d;
}

.axis {
  position: absolute;
}
.axis-x {
  width: 135px; height: 2px;
  background: rgba(255, 68, 68, 0.5);
  top: calc(50% - 1px); left: -15px;
}
.axis-y {
  width: 2px; height: 135px;
  background: rgba(68, 255, 68, 0.5);
  top: -15px; left: calc(50% - 1px);
}
/* Z is vertical but rotated by 90 around X. Gimbal tilt makes it look shorter, so we elongate the bounding box manually. */
.axis-z {
  width: 2px; height: 215px;
  background: rgba(68, 68, 255, 0.5);
  top: -55px; left: calc(50% - 1px);
  transform: rotateX(90deg);
}

.ring {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transform-style: preserve-3d;
  box-sizing: border-box;
  transition: transform 0.05s linear;
}

/* X-Axis (Pitch): Red */
.ring-x {
  border-color: rgba(255, 68, 68, 0.5);
}

/* Y-Axis (Yaw): Green */
.ring-y {
  border-color: rgba(68, 255, 68, 0.5);
}

/* Z-Axis (Roll): Blue */
.ring-z {
  border-color: rgba(68, 68, 255, 0.5);
}

.sphere {
  position: absolute;
  top: 50%; left: 50%;
  margin-top: -5px; margin-left: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: transform 0.05s linear;
  transform-style: preserve-3d;
  opacity: 0.85;
}

.sphere-x {
  background: radial-gradient(circle at 30% 30%, #ffaaaa, #ff0000 50%, #550000);
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
}
.sphere-y {
  background: radial-gradient(circle at 30% 30%, #aaffaa, #00ff00 50%, #005500);
  box-shadow: 0 0 8px rgba(0, 255, 0, 0.8);
}
.sphere-z {
  background: radial-gradient(circle at 30% 30%, #aaddff, #3399ff 50%, #003388);
  box-shadow: 0 0 8px rgba(50, 150, 255, 0.8);
}
.sphere-target {
  background: radial-gradient(circle at 30% 30%, #ffffaa, #ffdd00 50%, #886600);
  box-shadow: 0 0 12px rgba(255, 221, 0, 1.0);
  z-index: 10;
}

.labels {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  font-size: 11px;
  color: #fff;
  font-family: monospace;
  text-shadow: 1px 1px 3px #000;
  line-height: 1.3;
  background: rgba(0,0,0,0.5);
  border-radius: 6px;
  padding: 4px;
}

.row {
  display: flex;
}

.label {
  flex: 1;
  text-align: right;
  padding-right: 4px;
}

.value {
  flex: 1;
  text-align: left;
  white-space: pre;
}
</style>
