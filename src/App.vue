<script setup>
import Main from './components/Main.vue'
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <NavBar />
  
  <main class="app-content">
    <Main />
  </main>

  <Footer />
</template>

<style scoped>
.app-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 2rem 0;
  position: relative;
  z-index: 1;
}
</style>
