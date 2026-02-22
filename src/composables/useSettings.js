import { ref } from 'vue';

let initialShowProjections = false;
try {
  const stored = localStorage.getItem('showProjections');
  if (stored !== null) {
    initialShowProjections = stored === 'true';
  }
} catch (e) {}

const showProjections = ref(initialShowProjections);

let initialCubeTranslucent = false;
try {
  const stored = localStorage.getItem('cubeTranslucent');
  if (stored !== null) {
    initialCubeTranslucent = stored === 'true';
  }
} catch (e) {}

const isCubeTranslucent = ref(initialCubeTranslucent);

export function useSettings() {
  const toggleProjections = () => {
    showProjections.value = !showProjections.value;
    try {
      localStorage.setItem('showProjections', String(showProjections.value));
    } catch (e) {}
  };

  const toggleCubeTranslucent = () => {
    isCubeTranslucent.value = !isCubeTranslucent.value;
    try {
      localStorage.setItem('cubeTranslucent', String(isCubeTranslucent.value));
    } catch (e) {}
  };

  return {
    showProjections,
    toggleProjections,
    isCubeTranslucent,
    toggleCubeTranslucent
  };
}
