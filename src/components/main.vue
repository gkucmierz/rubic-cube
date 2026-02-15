<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const rx = ref(25)
const ry = ref(25)
const rz = ref(0)

const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

const onMouseDown = (event) => {
  isDragging.value = true
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const onMouseMove = (event) => {
  if (!isDragging.value) return
  
  const deltaX = event.clientX - lastMouseX.value
  const deltaY = event.clientY - lastMouseY.value
  
  ry.value += deltaX * 0.5
  rx.value -= deltaY * 0.5
  
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const onMouseUp = () => {
  isDragging.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

const cubeStyle = computed(() => ({
  transform: `rotateX(${rx.value}deg) rotateY(${ry.value}deg) rotateZ(${rz.value}deg)`
}))
</script>

<template>
  <div class="wrapper">
    <div class="container" @mousedown="onMouseDown">
      <div class="cube" :style="cubeStyle">
        <div class="face top">
          <div class="stickers">
            <div class="sticker" v-for="i in 9" :key="'t'+i"></div>
          </div>
        </div>
        <div class="face bottom">
          <div class="stickers">
            <div class="sticker" v-for="i in 9" :key="'b'+i"></div>
          </div>
        </div>
        <div class="face left">
          <div class="stickers">
            <div class="sticker" v-for="i in 9" :key="'l'+i"></div>
          </div>
        </div>
        <div class="face right">
          <div class="stickers">
            <div class="sticker" v-for="i in 9" :key="'r'+i"></div>
          </div>
        </div>
        <div class="face front">
          <div class="stickers">
            <div class="sticker" v-for="i in 9" :key="'f'+i"></div>
          </div>
        </div>
        <div class="face back">
          <div class="stickers">
            <div class="sticker" v-for="i in 9" :key="'k'+i"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.container {
  width: 300px;
  height: 300px;
  perspective: 900px;
  margin: 90px auto;
  cursor: grab;
  user-select: none;
}

.container:active {
  cursor: grabbing;
}

.cube {
  position: relative;
  width: 300px;
  height: 300px;
  transform-style: preserve-3d;
}

.face {
  width: 300px;
  height: 300px;
  background: #000;
  padding: 9px;
  box-sizing: border-box;
  position: absolute;
  opacity: 0.9;
}

.stickers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 9px;
  width: 100%;
  height: 100%;
}

.sticker {
  width: 100%;
  height: 100%;
  background: var(--sticker-color);
  border-radius: 9px;
}

.top { --sticker-color: #ffffff; }
.bottom { --sticker-color: #ffd500; }
.front { --sticker-color: #0051ba; }
.back { --sticker-color: #009e60; }
.left { --sticker-color: #c41e3a; }
.right { --sticker-color: #ff5800; }

.front {
  transform: translateZ(150px);
}

.back {
  transform: translateZ(-150px) rotateY(180deg);
}

.left {
  transform: translateX(-150px) rotateY(-90deg);
}

.right {
  transform: translateX(150px) rotateY(90deg);
}

.top {
  transform: translateY(-150px) rotateX(90deg);
}

.bottom {
  transform: translateY(150px) rotateX(-90deg);
}

</style>
