<script setup>
import { ref, onMounted, onUnmounted } from "vue";
const emit = defineEmits(["move", "scramble", "solve"]);

const showSolveDropdown = ref(false);

const toggleDropdown = () => {
  showSolveDropdown.value = !showSolveDropdown.value;
};

const triggerSolve = (method) => {
  showSolveDropdown.value = false;
  emit("solve", method);
};

// Close dropdown when clicking outside
const closeDropdown = (e) => {
  if (!e.target.closest(".solve-dropdown-wrapper")) {
    showSolveDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", closeDropdown);
});
onUnmounted(() => {
  document.removeEventListener("click", closeDropdown);
});
</script>

<template>
  <div>
    <div class="controls controls-left">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'U')">U</button>
        <button class="btn-neon move-btn" @click="emit('move', 'D')">D</button>
        <button class="btn-neon move-btn" @click="emit('move', 'L')">L</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'U-prime')">
          U'
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'D-prime')">
          D'
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'L-prime')">
          L'
        </button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'U2')">
          U2
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'D2')">
          D2
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'L2')">
          L2
        </button>
      </div>
    </div>

    <div class="controls controls-right">
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'R')">R</button>
        <button class="btn-neon move-btn" @click="emit('move', 'F')">F</button>
        <button class="btn-neon move-btn" @click="emit('move', 'B')">B</button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'R-prime')">
          R'
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'F-prime')">
          F'
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'B-prime')">
          B'
        </button>
      </div>
      <div class="controls-row">
        <button class="btn-neon move-btn" @click="emit('move', 'R2')">
          R2
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'F2')">
          F2
        </button>
        <button class="btn-neon move-btn" @click="emit('move', 'B2')">
          B2
        </button>
      </div>
    </div>

    <div class="bottom-left-controls">
      <div class="solve-dropdown-wrapper">
        <button class="btn-neon move-btn solve-btn" @click="toggleDropdown">
          Solve ▾
        </button>
        <div v-if="showSolveDropdown" class="solve-dropdown-menu">
          <button class="dropdown-item" @click="triggerSolve('kociemba')">
            Kociemba (Optimal)
          </button>
          <button class="dropdown-item" @click="triggerSolve('beginner')">
            Beginner (Human)
          </button>
        </div>
      </div>

      <button class="btn-neon move-btn scramble-btn" @click="emit('scramble')">
        Scramble
      </button>
    </div>
  </div>
</template>

<style scoped>
.controls {
  position: absolute;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}

.controls-left {
  left: 24px;
}

.controls-right {
  right: 24px;
}

.controls-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.move-btn {
  min-width: 44px;
  height: 36px;
  font-size: 0.9rem;
  padding: 0 10px;
}

.bottom-left-controls {
  position: absolute;
  bottom: 72px;
  left: 24px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.solve-dropdown-wrapper {
  position: relative;
}

.solve-dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  background: transparent;
  color: #fff;
  border: none;
  padding: 8px 12px;
  text-align: left;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
