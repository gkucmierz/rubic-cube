import { ref } from 'vue';

const RENDERERS = {
  CSS: 'CSS',
  SVG: 'SVG',
  CANVAS: 'Canvas'
};

const activeRenderer = ref(RENDERERS.CSS);

export function useRenderer() {
  const setRenderer = (renderer) => {
    if (Object.values(RENDERERS).includes(renderer)) {
      activeRenderer.value = renderer;
    }
  };

  return {
    activeRenderer,
    setRenderer,
    RENDERERS
  };
}
