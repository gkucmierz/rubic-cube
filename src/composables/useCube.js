
import { ref, computed } from 'vue';
import { COLORS, FACES } from '../utils/CubeModel';

// Singleton worker
const worker = new Worker(new URL('../workers/Cube.worker.js', import.meta.url), { type: 'module' });

// Reactive state
const cubies = ref([]);
const isReady = ref(false);
const validationResult = ref(null);

worker.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === 'STATE_UPDATE') {
    cubies.value = payload.cubies;
    isReady.value = true;
  } else if (type === 'VALIDATION_RESULT') {
    validationResult.value = payload;
  } else if (type === 'ERROR') {
    console.error('Worker Error:', payload);
  }
};

// Init worker
worker.postMessage({ type: 'INIT' });

export function useCube() {

  const initCube = () => {
    worker.postMessage({ type: 'RESET' });
  };

  const rotateLayer = (axis, index, direction) => {
    worker.postMessage({ type: 'ROTATE_LAYER', payload: { axis, index, direction } });
  };

  const validate = () => {
    worker.postMessage({ type: 'VALIDATE' });
  };

  return {
    cubies: computed(() => cubies.value),
    isReady: computed(() => isReady.value),
    validationResult: computed(() => validationResult.value),
    initCube,
    rotateLayer,
    validate,
    COLORS,
    FACES
  };
}
