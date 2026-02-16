import { ref, computed } from 'vue';
import { Cube, COLORS, FACES } from '../utils/Cube';

export function useCube() {
  const cube = ref(new Cube());
  
  // Make cubies reactive so Vue tracks changes
  // We can just expose the cube instance, but better to expose reactive properties
  // Since `cube` is a ref, `cube.value.cubies` is not deeply reactive by default unless `cube.value` is reactive.
  // But `ref` wraps the object. If we mutate properties of the object, it might not trigger.
  // Let's rely on triggering updates manually or creating a new instance on reset.
  // For rotation, we will force update.
  
  const cubies = computed(() => cube.value.cubies);

  // Compute the 6-face state matrix for display/debug
  const cubeState = computed(() => cube.value.getState());

  const initCube = () => {
    cube.value.reset();
    triggerUpdate();
  };

  const triggerUpdate = () => {
    // Force Vue to notice change
    cube.value = Object.assign(Object.create(Object.getPrototypeOf(cube.value)), cube.value);
  };

  const rotateLayer = (axis, index, direction) => {
    cube.value.rotateLayer(axis, index, direction);
    triggerUpdate();
  };
  
  return {
    cube,
    cubies,
    cubeState,
    initCube,
    rotateLayer,
    COLORS,
    FACES
  };
}
