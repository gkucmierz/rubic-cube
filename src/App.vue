<script setup>
import { ref } from "vue";
import SmartCube from "./components/renderers/SmartCube.vue";
import Generate from "./components/renderers/Generate.vue";
import NavBar from "./components/NavBar.vue";
import Footer from "./components/Footer.vue";

const isGeneratorMode = ref(window.location.pathname === '/generate');
</script>

<template>
  <template v-if="!isGeneratorMode">
    <NavBar />
    <div class="app-content">
      <SmartCube />
    </div>
    <Footer />
  </template>
  <template v-else>
    <Generate />
  </template>
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
