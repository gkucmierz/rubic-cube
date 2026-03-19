import { ref } from "vue";

let initialCubeTranslucent = false;
try {
  const stored = localStorage.getItem("cubeTranslucent");
  if (stored !== null) {
    initialCubeTranslucent = stored === "true";
  }
} catch (e) { }

// 0 = off, 1 = simple projections, 2 = advanced (animated layers)
let initialProjectionMode = 0;
try {
  const stored = localStorage.getItem("projectionMode");
  if (stored !== null) {
    initialProjectionMode = Math.min(2, Math.max(0, parseInt(stored, 10) || 0));
  }
} catch (e) { }

const isCubeTranslucent = ref(initialCubeTranslucent);
const projectionMode = ref(initialProjectionMode);
const scanMode = ref(false); // Non-persisted — always starts off

export function useSettings() {
  const toggleCubeTranslucent = () => {
    isCubeTranslucent.value = !isCubeTranslucent.value;
    try {
      localStorage.setItem("cubeTranslucent", String(isCubeTranslucent.value));
    } catch (e) { }
  };

  const cycleProjectionMode = () => {
    projectionMode.value = (projectionMode.value + 1) % 3;
    try {
      localStorage.setItem("projectionMode", String(projectionMode.value));
    } catch (e) { }
  };

  const toggleScanMode = () => {
    scanMode.value = !scanMode.value;
  };

  return {
    isCubeTranslucent,
    toggleCubeTranslucent,
    projectionMode,
    cycleProjectionMode,
    scanMode,
    toggleScanMode,
  };
}
