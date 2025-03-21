<script setup>
</script>

<template>
  <div class="container">
    <div class="cube">
      <div class="face top">Top</div>
      <div class="face bottom">Bottom</div>
      <div class="face left">Left</div>
      <div class="face right">Right</div>
      <div class="face front">Front</div>
      <div class="face back">Back</div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 200px;
  height: 200px;
  perspective: 400px;
  margin: 100px;
}

.top {
  background: white;
}
.bottom {
  background: yellow;
}
.front {
  background: blue;
}
.back {
  background: green;
}
.left {
  background: red;
}
.right {
  background: orange;
}


.cube {
  position: relative;
  width: 200px;
  height: 200px;
  transform-style: preserve-3d;
}

.face {
  width: 200px;
  height: 200px;
  border: 0px solid black;
  position: absolute;
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  font-size: 2rem;
}

.cube {
  position: relative;
  width: 200px;
  height: 200px;
  transform-style: preserve-3d;
  transform: rotate3d(1, 1, 0, 45deg);
}

.front {
  transform: translateZ(100px);
}

.back {
  transform: translateZ(-100px) rotateY(180deg);
}

.left {
  transform: translateX(-100px) rotateY(-90deg);
}

.right {
  transform: translateX(100px) rotateY(90deg);
}

.top {
  transform: translateY(-100px) rotateX(90deg);
}

.bottom {
  transform: translateY(100px) rotateX(-90deg);
}

@keyframes turn {
  from { transform: rotate3d(0, 0, 0, 0); }
  to { transform: rotate3d(1, 1, 0, 360deg); }
}

.cube {
  position: relative;
  transform-style: preserve-3d;
  animation: turn 3s linear infinite;
}
</style>
