<script setup>
import { Sun, Moon, Grid2x2, Layers, Layers2, LayersPlus, Scan } from "lucide-vue-next";
import { ref, onMounted, computed } from "vue";
import { useSettings } from "../composables/useSettings";
import { NAVBAR_HEIGHT } from "../config/ui.js";

const { isCubeTranslucent, toggleCubeTranslucent, projectionMode, cycleProjectionMode, scanMode, toggleScanMode } = useSettings();
const isDark = ref(true);

const setTheme = (dark) => {
  isDark.value = dark;
  const theme = dark ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
};

const toggleTheme = () => {
  setTheme(!isDark.value);
};

const projectionTitle = computed(() => {
  if (projectionMode.value === 0) return 'Show rear face projections';
  if (projectionMode.value === 1) return 'Enable animated projections';
  return 'Disable projections';
});

onMounted(() => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    setTheme(savedTheme === "dark");
  } else {
    setTheme(true);
  }
});
</script>

<template>
  <nav class="navbar glass-panel">
    <div class="logo-container">
      <span class="logo-text">Rubic Cube</span>
    </div>

    <div class="nav-container">
      <!-- Scan Mode Toggle -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="toggleScanMode"
        :title="scanMode ? 'Exit scan mode' : 'Scan physical cube'"
        :class="{ active: scanMode }"
      >
        <Scan :size="20" />
      </button>

      <!-- Cube Opacity Toggle -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="toggleCubeTranslucent"
        :title="
          isCubeTranslucent
            ? 'Disable cube transparency'
            : 'Enable cube transparency'
        "
        :class="{ active: isCubeTranslucent }"
      >
        <Grid2x2 :size="20" />
      </button>

      <!-- Face Projections Toggle (3-state) -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="cycleProjectionMode"
        :title="projectionTitle"
        :class="{ active: projectionMode > 0 }"
      >
        <Layers2 v-if="projectionMode === 0" :size="20" />
        <Layers v-else-if="projectionMode === 1" :size="20" />
        <LayersPlus v-else :size="20" />
      </button>

      <!-- Theme Toggle -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="toggleTheme"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
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
  height: v-bind('NAVBAR_HEIGHT + "px"');
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

.nav-btn:hover,
.nav-btn.active {
  background: rgba(255, 255, 255, 0.2);
}

.nav-btn.active {
  color: var(--color-primary);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}
</style>
