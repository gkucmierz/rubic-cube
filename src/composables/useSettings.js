import { ref } from "vue";

let initialCubeTranslucent = false;
try {
  const stored = localStorage.getItem("cubeTranslucent");
  if (stored !== null) {
    initialCubeTranslucent = stored === "true";
  }
} catch (e) { }

const isCubeTranslucent = ref(initialCubeTranslucent);

export function useSettings() {
  const toggleCubeTranslucent = () => {
    isCubeTranslucent.value = !isCubeTranslucent.value;
    try {
      localStorage.setItem("cubeTranslucent", String(isCubeTranslucent.value));
    } catch (e) { }
  };

  return {
    isCubeTranslucent,
    toggleCubeTranslucent,
  };
}
