<script setup>
import { Sun, Moon } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';

const isDark = ref(true);

const setTheme = (dark) => {
  isDark.value = dark;
  const theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  
  if (dark) {
    document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)');
    document.documentElement.style.setProperty('--text-color', '#ffffff');
    document.documentElement.style.setProperty('--text-strong', '#ffffff');
    document.documentElement.style.setProperty('--text-muted', 'rgba(255, 255, 255, 0.7)');
    document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.05)');
    document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    document.documentElement.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.05)');
    document.documentElement.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.1)');
    document.documentElement.style.setProperty('--cube-edge-color', '#333333');
    document.documentElement.style.setProperty('--title-gradient', 'linear-gradient(45deg, #00f2fe, #4facfe)');
  } else {
    document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)');
    document.documentElement.style.setProperty('--text-color', '#0f172a');
    document.documentElement.style.setProperty('--text-strong', '#0f172a');
    document.documentElement.style.setProperty('--text-muted', 'rgba(15, 23, 42, 0.6)');
    document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.75)');
    document.documentElement.style.setProperty('--glass-border', 'rgba(15, 23, 42, 0.12)');
    document.documentElement.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.7)');
    document.documentElement.style.setProperty('--panel-border', 'rgba(15, 23, 42, 0.12)');
    document.documentElement.style.setProperty('--cube-edge-color', '#000000');
    document.documentElement.style.setProperty('--title-gradient', 'linear-gradient(45deg, #0ea5e9, #6366f1)');
  }
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
  height: 50px;
  width: 100%;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  z-index: 100;
  margin-bottom: 0;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-color);
  text-shadow: 0 0 20px var(--title-glow);
}

.nav-container {
  display: flex;
  gap: 15px;
  align-items: center;
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--text-color);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.btn-neon {
  border: 1px solid var(--toggle-btn-border);
  box-shadow: 0 0 5px rgba(0,0,0,0.1);
}

.desktop-only {
  display: flex;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
}
</style>
