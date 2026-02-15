import { ref, computed } from 'vue';
import { Cube, COLORS, FACES } from '../utils/Cube';

// Map natural numbers (0-5) to CSS colors
const COLOR_MAP = {
  [COLORS.WHITE]: 'white',
  [COLORS.YELLOW]: 'yellow',
  [COLORS.ORANGE]: 'orange',
  [COLORS.RED]: 'red',
  [COLORS.GREEN]: 'green',
  [COLORS.BLUE]: 'blue'
};

export function useCube() {
  const cube = ref(new Cube());
  
  // Expose state for rendering (flattened for Vue template simplicity or kept as matrix)
  // Let's expose matrix but maybe helper to flatten if needed?
  // The Cube class uses 3x3 matrices.
  // The Vue template currently iterates `cubeState.top` (array of 9).
  // We should adapt `cubeState` to match what the template expects OR update template.
  // The user asked to "Dostosować src/components/Main.vue do renderowania nowego modelu danych".
  // So we can expose the 3x3 matrices directly.
  
  const cubeState = computed(() => cube.value.state);

  const initCube = () => {
    cube.value.reset();
  };

  const rotateLayer = (layer, direction) => {
    // layer is string 'top', 'front' etc.
    // Map string to FACES constant if needed, but FACES values are 'up', 'down', etc.
    // The previous implementation used 'top', 'bottom', 'left', 'right', 'front', 'back'.
    // Cube.js uses 'up', 'down', 'left', 'right', 'front', 'back'.
    
    // Map legacy layer names to new Face names
    const layerMap = {
      'top': FACES.UP,
      'bottom': FACES.DOWN,
      'left': FACES.LEFT,
      'right': FACES.RIGHT,
      'front': FACES.FRONT,
      'back': FACES.BACK
    };
    
    const face = layerMap[layer];
    if (face) {
      cube.value.rotate(face, direction);
      // Trigger reactivity since Cube is a class and state is internal object
      // We made `cube` a ref, but mutating its internal state might not trigger update
      // unless we replace the state or use reactive().
      // `cube.value.rotate` mutates `this.state`.
      // We should probably make `cube.value.state` reactive or trigger update.
      cube.value = Object.assign(Object.create(Object.getPrototypeOf(cube.value)), cube.value);
    }
  };
  
  // Helper to get flattened array for a face (if template wants it)
  // But better to update template to use 2D loop or flatten here.
  // Let's provide a helper or just let template handle it.
  
  return {
    cubeState,
    initCube,
    rotateLayer,
    COLOR_MAP,
    FACES
  };
}
