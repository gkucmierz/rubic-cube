import { ref } from 'vue';

let initialShowProjections = false;
try {
  const stored = localStorage.getItem('showProjections');
  if (stored !== null) {
    initialShowProjections = stored === 'true';
  }
} catch (e) {}

const showProjections = ref(initialShowProjections);

export function useSettings() {
  const toggleProjections = () => {
    showProjections.value = !showProjections.value;
    try {
      localStorage.setItem('showProjections', String(showProjections.value));
    } catch (e) {}
  };

  return {
    showProjections,
    toggleProjections
  };
}
