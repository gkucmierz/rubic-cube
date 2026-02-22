<script setup>
const currentYear = new Date().getFullYear();
const version = __APP_VERSION__;
</script>

<template>
  <footer class="app-footer glass-panel">
    <div class="footer-content">
      <p>&copy; {{ currentYear }} Rubic Cube. Wersja {{ version }}</p>
      <div class="social-links">
        <!-- Placeholder for social links if needed -->
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  width: 100%;
  padding: 0 20px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 10;
  /* Glass panel styles handle background/border/shadow */
  border-radius: 0; /* Full width bar usually square corners or specific radius */
  border-left: none;
  border-right: none;
  border-bottom: none;
  color: var(--text-muted);
  box-sizing: border-box;
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

p {
  font-size: 0.8rem;
  letter-spacing: 0.5px;
  margin: 0;
}
</style>
