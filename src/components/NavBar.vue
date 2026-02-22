<script setup>
import { Sun, Moon } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';

const isDark = ref(true);

const setTheme = (dark) => {
  isDark.value = dark;
  const theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
};

const toggleTheme = () => {
  setTheme(!isDark.value);
};

onMounted(() => {
  setTheme(true);
});
</script>

<template>
  <nav class="navbar glass-panel">
    <div class="logo-container">
      <span class="logo-text">Rubic Cube</span>
    </div>

    <div class="nav-container">
      <!-- Theme Toggle -->
      <button class="btn-neon nav-btn icon-only" @click="toggleTheme" :title="isDark ? 'Przełącz na jasny' : 'Przełącz na ciemny'">
        <Sun v-if="isDark" :size="20" />
        <Moon v-else :size="20" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  width: 100%;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  /* Glass panel styles handle background/border/shadow */
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-right: none;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: 1px;
}

.nav-container {
  display: flex;
  gap: 15px;
  align-items: center;
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--text-strong);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
