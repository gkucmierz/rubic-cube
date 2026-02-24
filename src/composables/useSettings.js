import { ref } from "vue";

let initialCubeTranslucent = false;
try {
  const stored = localStorage.getItem("cubeTranslucent");
  if (stored !== null) {
    initialCubeTranslucent = stored === "true";
  }
} catch (e) { }

let initialShowFaceProjections = false;
try {
  const stored = localStorage.getItem("showFaceProjections");
  if (stored !== null) {
    initialShowFaceProjections = stored === "true";
  }
} catch (e) { }

const isCubeTranslucent = ref(initialCubeTranslucent);
const showFaceProjections = ref(initialShowFaceProjections);

export function useSettings() {
  const toggleCubeTranslucent = () => {
    isCubeTranslucent.value = !isCubeTranslucent.value;
    try {
      localStorage.setItem("cubeTranslucent", String(isCubeTranslucent.value));
    } catch (e) { }
  };

  const toggleFaceProjections = () => {
    showFaceProjections.value = !showFaceProjections.value;
    try {
      localStorage.setItem("showFaceProjections", String(showFaceProjections.value));
    } catch (e) { }
  };

  return {
    isCubeTranslucent,
    toggleCubeTranslucent,
    showFaceProjections,
    toggleFaceProjections,
  };
}
