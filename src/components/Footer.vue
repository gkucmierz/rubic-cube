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
  margin-top: auto;
  background: var(--panel-bg);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--panel-border);
  box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1);
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
