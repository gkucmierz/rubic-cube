<script setup>
import SmartCube from './components/renderers/SmartCube.vue'
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <NavBar />
  <div class="app-content">
    <SmartCube />
  </div>
  <Footer />
</template>

<style scoped>
.app-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0;
  position: relative;
  z-index: 1;
  user-select: none;
  -webkit-user-select: none;
}
</style>
