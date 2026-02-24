<script setup>
import { Sun, Moon, Grid2x2, Layers } from "lucide-vue-next";
import { ref, onMounted } from "vue";
import { useSettings } from "../composables/useSettings";

const { isCubeTranslucent, toggleCubeTranslucent, showFaceProjections, toggleFaceProjections } = useSettings();
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
      <!-- Cube Opacity Toggle -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="toggleCubeTranslucent"
        :title="
          isCubeTranslucent
            ? 'Wyłącz przezroczystość kostki'
            : 'Włącz przezroczystość kostki'
        "
        :class="{ active: isCubeTranslucent }"
      >
        <Grid2x2 :size="20" />
      </button>

      <!-- Face Projections Toggle -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="toggleFaceProjections"
        :title="
          showFaceProjections
            ? 'Ukryj podgląd tylnych ścian'
            : 'Pokaż podgląd tylnych ścian'
        "
        :class="{ active: showFaceProjections }"
      >
        <Layers :size="20" />
      </button>

      <!-- Theme Toggle -->
      <button
        class="btn-neon nav-btn icon-only"
        @click="toggleTheme"
        :title="isDark ? 'Przełącz na jasny' : 'Przełącz na ciemny'"
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
  height: 70px;
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
