
import { reactive, watch } from 'vue'

const settings = reactive({
  viewRotation: {
    invertX: false, // Inverts Up/Down view rotation
    invertY: false,  // Inverts Left/Right view rotation (Drag Right -> Increase Angle -> Rotate Right)
    speed: 0.5
  },
  dragMapping: {
    // Multipliers for drag direction on faces
    front: { x: 1, y: -1 }, // Changed x to 1
    back: { x: 1, y: 1 },
    right: { x: -1, y: 1 },
    left: { x: -1, y: -1 },
    up: { x: 1, y: 1 },
    down: { x: -1, y: -1 }
  },
  physics: {
    enabled: true,
    tension: 200,
    friction: 10 // Not currently used but good for future
  }
})

// Persist to localStorage for convenience during reload
const STORAGE_KEY = 'rubik-debug-settings-v2' // Changed key to force reset settings

try {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    // Merge deeply? For now just top level sections
    Object.assign(settings.viewRotation, parsed.viewRotation)
    Object.assign(settings.dragMapping, parsed.dragMapping)
    Object.assign(settings.physics, parsed.physics)
  }
} catch (e) {
  console.warn('Failed to load debug settings', e)
}

watch(settings, (newSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
}, { deep: true })

export function useDebug() {
  return {
    settings
  }
}
