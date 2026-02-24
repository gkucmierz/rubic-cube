import { ref, computed } from "vue";
import { COLORS, FACES } from "../utils/CubeModel";

// Singleton logic worker
const worker = new Worker(
  new URL("../workers/Cube.worker.js", import.meta.url),
  { type: "module" },
);

// Singleton solver worker
const solverWorker = new Worker(
  new URL("../workers/Solver.worker.js", import.meta.url),
  { type: "module" },
);

// Reactive state
const cubies = ref([]);
const deepCubeState = ref(null);
const isReady = ref(false);
const isSolverReady = ref(false);
const validationResult = ref(null);
const solveResult = ref(null);
const solveError = ref(null);

worker.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === "STATE_UPDATE") {
    cubies.value = payload.cubies;
    deepCubeState.value = payload.deepCubeState;
    isReady.value = true;
  } else if (type === "VALIDATION_RESULT") {
    validationResult.value = payload;
  } else if (type === "SOLVE_RESULT") {
    solveResult.value = payload;
  } else if (type === "ERROR") {
    console.error("Logic Worker Error:", payload);
  }
};

solverWorker.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === "SOLVE_RESULT") {
    solveResult.value = payload;
  } else if (type === "SOLVE_ERROR") {
    // Error doesn't necessarily block execution, it just provides UI feedback
    solveError.value = payload;
  } else if (type === "INIT_DONE") {
    isSolverReady.value = true;
  } else if (type === "ERROR") {
    console.error("Solver Worker Error:", payload);
  }
};

// Init worker
worker.postMessage({ type: "INIT" });

export function useCube() {
  const initCube = () => {
    worker.postMessage({ type: "RESET" });
  };

  const rotateLayer = (axis, index, direction, steps = 1) => {
    worker.postMessage({
      type: "ROTATE_LAYER",
      payload: { axis, index, direction, steps },
    });
  };

  const rotateSlice = (axis, direction, steps = 1) => {
    worker.postMessage({
      type: "ROTATE_SLICE",
      payload: { axis, direction, steps },
    });
  };

  const turn = (move) => {
    worker.postMessage({ type: "TURN", payload: { move } });
  };

  const validate = () => {
    worker.postMessage({ type: "VALIDATE" });
  };

  const solve = (solverType, cubeState) => {
    solveResult.value = null;
    solveError.value = null;
    solverWorker.postMessage({
      type: "SOLVE",
      payload: { solverType, cubeState },
    });
  };

  return {
    cubies: computed(() => cubies.value),
    deepCubeState: computed(() => deepCubeState.value),
    isReady: computed(() => isReady.value),
    isSolverReady: computed(() => isSolverReady.value),
    validationResult: computed(() => validationResult.value),
    solveResult: computed(() => solveResult.value),
    solveError: computed(() => solveError.value),
    initCube,
    rotateLayer,
    rotateSlice,
    turn,
    validate,
    solve,
    COLORS,
    FACES,
  };
}
