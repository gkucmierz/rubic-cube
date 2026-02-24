<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";

const props = defineProps({
  moves: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["reset", "copy", "add-moves", "open-add-modal"]);

const MIN_MOVES_COLUMN_GAP = 6;

const movesHistoryEl = ref(null);
const samplePillEl = ref(null);
const movesPerRow = ref(0);
const movesColumnGap = ref(MIN_MOVES_COLUMN_GAP);

const displayMoves = computed(() => props.moves || []);

const moveRows = computed(() => {
  const perRow = movesPerRow.value || displayMoves.value.length || 1;
  const rows = [];
  const all = displayMoves.value;
  for (let i = 0; i < all.length; i += perRow) {
    rows.push(all.slice(i, i + perRow));
  }
  return rows;
});

const hasMoves = computed(() => displayMoves.value.length > 0);

const copyQueueToClipboard = () => {
  emit("copy");
};

const resetQueue = () => {
  emit("reset");
};

const setSamplePill = (el) => {
  if (el && !samplePillEl.value) {
    samplePillEl.value = el;
  }
};

const recalcMovesLayout = () => {
  const container = movesHistoryEl.value;
  const pill = samplePillEl.value;
  if (!container || !pill) return;

  const containerWidth = container.clientWidth;
  const pillWidth = pill.offsetWidth;
  if (pillWidth <= 0) return;

  const totalWidth = (cols) => {
    if (cols <= 0) return 0;
    if (cols === 1) return pillWidth;
    return cols * pillWidth + (cols - 1) * MIN_MOVES_COLUMN_GAP;
  };

  let cols = Math.floor(
    (containerWidth + MIN_MOVES_COLUMN_GAP) /
      (pillWidth + MIN_MOVES_COLUMN_GAP),
  );
  if (cols < 1) cols = 1;
  while (cols > 1 && totalWidth(cols) > containerWidth) {
    cols -= 1;
  }

  let gap = 0;
  if (cols > 1) {
    gap = (containerWidth - cols * pillWidth) / (cols - 1);
  }

  movesPerRow.value = cols;
  movesColumnGap.value = gap;
};

const openAddModal = () => {
  emit("open-add-modal");
};

watch(displayMoves, () => {
  nextTick(recalcMovesLayout);
});

onMounted(() => {
  window.addEventListener("resize", recalcMovesLayout);
  nextTick(recalcMovesLayout);
});

onUnmounted(() => {
  window.removeEventListener("resize", recalcMovesLayout);
});
</script>

<template>
  <div class="moves-history">
    <div class="moves-inner" ref="movesHistoryEl">
      <div
        v-for="(row, rowIndex) in moveRows"
        :key="rowIndex"
        class="moves-row"
        :style="{ columnGap: movesColumnGap + 'px' }"
      >
        <span
          v-for="(m, idx) in row"
          :key="m.id"
          class="move-pill"
          :class="{
            'move-pill-active': m.status === 'in_progress',
            'move-pill-pending': m.status === 'pending',
          }"
          :ref="rowIndex === 0 && idx === 0 ? setSamplePill : null"
        >
          {{ m.label }}
        </span>
      </div>
    </div>
    <div class="moves-actions">
      <button class="queue-action" @click="openAddModal">add</button>
      <button
        class="queue-action"
        :class="{ 'queue-action-disabled': !hasMoves }"
        :disabled="!hasMoves"
        @click="copyQueueToClipboard"
      >
        copy
      </button>
      <button
        class="queue-action"
        :class="{ 'queue-action-disabled': !hasMoves }"
        :disabled="!hasMoves"
        @click="resetQueue"
      >
        reset
      </button>
    </div>
  </div>
</template>

<style scoped>
.moves-history {
  position: absolute;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: calc(100vw - 360px);
  overflow-x: hidden;
  padding: 12px 12px 26px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.moves-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.moves-row {
  display: flex;
}

.move-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  min-width: 16px;
  min-height: 24px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.8rem;
  color: #fff;
  white-space: nowrap;
}

.move-pill-active {
  background: #ffd500;
  color: #000;
  border-color: #ffd500;
}

.move-pill-pending {
  opacity: 0.4;
}

.moves-actions {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 0px;
}

.queue-action {
  border: none;
  background: transparent;
  padding: 6px 6px;
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.queue-action-disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.moves-history::after {
  content: none;
}

.queue-action:focus {
  outline: none;
  box-shadow: none;
}
</style>
