<script setup>
import { computed } from "vue";

const props = defineProps({
  start: {
    type: Object,
    required: true, // {x, y, z}
  },
  end: {
    type: Object,
    required: true, // {x, y, z}
  },
  color: {
    type: String,
    default: "var(--text-color, #fff)",
  },
  thickness: {
    type: Number,
    default: 1,
  },
});

const style = computed(() => {
  const dx = props.end.x - props.start.x;
  const dy = props.end.y - props.start.y;
  const dz = props.end.z - props.start.z;

  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (length === 0) return {};

  const midX = (props.start.x + props.end.x) / 2;
  const midY = (props.start.y + props.end.y) / 2;
  const midZ = (props.start.z + props.end.z) / 2;

  // Rotation
  // Yaw (around Y axis)
  const yaw = Math.atan2(dz, dx);
  // Pitch (around Z axis)
  const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

  return {
    width: `${length}px`,
    height: `${props.thickness}px`,
    backgroundColor: props.color,
    position: "absolute",
    top: "0",
    left: "0",
    transformOrigin: "center center",
    transform: `translate3d(${midX}px, ${midY}px, ${midZ}px) rotateY(${-yaw}rad) rotateZ(${pitch}rad) translate(-50%, -50%)`,
    opacity: 0.3, // Delicate
    pointerEvents: "none",
  };
});
</script>

<template>
  <div class="line-3d" :style="style"></div>
</template>
