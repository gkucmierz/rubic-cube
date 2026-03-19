<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { SwitchCamera } from "lucide-vue-next";
import { drawOverlay, PROC_W, PROC_H } from "../../utils/cubeDetector.js";
import { NAVBAR_HEIGHT, FOOTER_HEIGHT } from "../../config/ui.js";

const props = defineProps({
  active: { type: Boolean, default: false },
});

const emit = defineEmits(["cube-detected", "pose-update"]);

const panelRef = ref(null);
const videoRef = ref(null);
const canvasRef = ref(null);
const stream = ref(null);
const hasMultipleCameras = ref(false);
const useFrontCamera = ref(true);
const error = ref(null);
const fps = ref(0);
const cubeDetected = ref(false);
const showInstruction = ref(true);
const confidence = ref(0);
const cvLoading = ref(false);
const cvStatus = ref('');

// Worker state
let onnxWorker = null;
let isCvReady = false;
let isDetecting = false;
let lastResult = null;

// Panel dragging, resize & UI state
const isDragging = ref(false);
const panelWidth = ref(Math.max(280, Math.min(window.innerWidth * 0.382, 800)));
const panelPos = ref({ x: window.innerWidth - panelWidth.value - 10, y: NAVBAR_HEIGHT + 10 });
const dragOffset = ref({ x: 0, y: 0 });
const panelOpacity = ref(1.0);

const clampBoundary = () => {
  const w = panelWidth.value;
  // Use exact DOM height if available, otherwise fallback to estimation
  const h = panelRef.value ? panelRef.value.offsetHeight : w * 0.75 + 41;
  // Add 10px breathing room from the bottom footer line
  const footerClearance = FOOTER_HEIGHT + 10;

  panelPos.value.x = Math.max(10, Math.min(panelPos.value.x, window.innerWidth - w - 10));
  panelPos.value.y = Math.max(NAVBAR_HEIGHT + 10, Math.min(panelPos.value.y, window.innerHeight - footerClearance - h));
};

const onDragStart = (e) => {
  if (e.target.closest('button')) return; // ignore buttons
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX - panelPos.value.x,
    y: e.clientY - panelPos.value.y
  };
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
};

const onDragMove = (e) => {
  if (!isDragging.value) return;
  panelPos.value.x = e.clientX - dragOffset.value.x;
  panelPos.value.y = e.clientY - dragOffset.value.y;
  clampBoundary();
};

const onDragEnd = () => {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
};

let resizeType = null;
let startX = 0;
let startW = 0;
let startPanelX = 0;

const onResizeStart = (e, type) => {
  e.preventDefault();
  e.stopPropagation();
  resizeType = type;
  startX = e.clientX;
  startW = panelWidth.value;
  startPanelX = panelPos.value.x;
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd);
};

const onResizeMove = (e) => {
  if (!resizeType) return;
  const dx = e.clientX - startX;
  let newW = startW;

  if (resizeType === 'br') {
    newW = startW + dx;
  } else if (resizeType === 'bl') {
    newW = startW - dx;
  }

  newW = Math.max(280, Math.min(newW, 800));

  if (resizeType === 'bl') {
    panelPos.value.x = startPanelX + (startW - newW);
  }
  panelWidth.value = newW;
  clampBoundary();
};

const onResizeEnd = () => {
  resizeType = null;
  window.removeEventListener('mousemove', onResizeMove);
  window.removeEventListener('mouseup', onResizeEnd);
};

const toggleOpacity = () => {
  panelOpacity.value = panelOpacity.value === 1.0 ? 0.6 : 1.0;
};

let animFrameId = null;
let procCanvas = null;
let procCtx = null;
let lastFrameTime = 0;
let frameCount = 0;
let fpsInterval = null;
let detectionCount = 0; // Consecutive frames with detection
const DETECTION_THRESHOLD = 5; // Frames before confirming detection

// Smoothing for pose (exponential moving average)
let smoothPose = null;
const SMOOTH_FACTOR = 0.3; // 0 = no smoothing, 1 = no memory

function smoothValue(prev, next, factor) {
  if (prev === null) return next;
  return prev + (next - prev) * factor;
}

// Create offscreen canvas for CV processing
const ensureProcCanvas = () => {
  if (!procCanvas) {
    procCanvas = document.createElement("canvas");
    procCanvas.width = PROC_W;
    procCanvas.height = PROC_H;
    procCtx = procCanvas.getContext("2d", { willReadFrequently: true });
  }
};

// Enumerate cameras
const checkCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === "videoinput");
    hasMultipleCameras.value = cameras.length > 1;
  } catch (e) {
    hasMultipleCameras.value = false;
  }
};

// Start camera stream
const startCamera = async () => {
  error.value = null;
  stopCamera();
  showInstruction.value = true;
  cubeDetected.value = false;
  detectionCount = 0;
  smoothPose = null;

  // Initialize CV worker if needed
  if (!onnxWorker) {
    isCvReady = false;
    cvLoading.value = true;
    onnxWorker = new Worker(new URL("../../workers/ONNX.worker.js", import.meta.url), { type: "module" });
    onnxWorker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'INIT_PROGRESS') {
        cvStatus.value = payload.status;
      } else if (type === 'INIT_DONE') {
        isCvReady = true;
        cvLoading.value = false;
        cvStatus.value = '';
      } else if (type === 'INIT_ERROR') {
        error.value = 'Failed to load AI Model: ' + payload.error;
        cvLoading.value = false;
      } else if (type === 'DETECT_RESULT') {
        lastResult = payload;
        isDetecting = false; // Ready for next frame
      } else if (type === 'DEBUG') {
        console.log('[Worker DEBUG]', payload);
      }
    };
    // Start ONNX model loading inside worker
    onnxWorker.postMessage({
      type: 'INIT'
    });
  } else if (isCvReady) {
    onnxWorker.postMessage({ type: 'RESET_TRACKING' });
  }

  try {
    const constraints = {
      video: {
        facingMode: useFrontCamera.value ? "user" : "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    };

    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.value = mediaStream;

    await nextTick();
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
      videoRef.value.onloadedmetadata = () => {
        startDetectionLoop();
      };
    }
  } catch (e) {
    error.value = e.message || "Camera access denied";
    if (useFrontCamera.value) {
      useFrontCamera.value = false;
      return startCamera();
    }
  }
};

// Stop camera stream
const stopCamera = () => {
  stopDetectionLoop();
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop());
    stream.value = null;
  }
};

// Toggle front/rear camera
const toggleCamera = () => {
  useFrontCamera.value = !useFrontCamera.value;
  startCamera();
};

// ── Detection loop ──────────────────────────────────────────
const startDetectionLoop = () => {
  ensureProcCanvas();
  frameCount = 0;
  lastFrameTime = performance.now();

  fpsInterval = setInterval(() => {
    const now = performance.now();
    const elapsed = (now - lastFrameTime) / 1000;
    fps.value = Math.round(frameCount / elapsed);
    frameCount = 0;
    lastFrameTime = now;
  }, 1000);

  const loop = () => {
    if (!videoRef.value || !canvasRef.value || videoRef.value.readyState < 2) {
      animFrameId = requestAnimationFrame(loop);
      return;
    }

    // Send frame to worker if ready and not busy
    if (isCvReady && !isDetecting) {
      isDetecting = true;
      const vW = videoRef.value.videoWidth;
      const vH = videoRef.value.videoHeight;
      if (vW && vH) {
        const size = Math.min(vW, vH);
        const sx = (vW - size) / 2;
        const sy = (vH - size) / 2;
        procCtx.drawImage(videoRef.value, sx, sy, size, size, 0, 0, PROC_W, PROC_H);
        const imageData = procCtx.getImageData(0, 0, PROC_W, PROC_H);

        // Send explicitly defined ArrayBuffer, transferring ownership for speed
        onnxWorker.postMessage(
          { type: 'DETECT', payload: { imageBuffer: imageData.data.buffer, width: PROC_W, height: PROC_H } },
          [imageData.data.buffer]
        );
      } else {
         isDetecting = false; // Video not ready yet
      }
    }

    // Use latest available result
    const result = lastResult;
    if (result) {

    // Track detection stability and confidence
    confidence.value = result.confidence || 0;
    if (result.detected) {
      detectionCount = Math.min(detectionCount + 1, DETECTION_THRESHOLD + 5);
      if (detectionCount >= DETECTION_THRESHOLD && !cubeDetected.value) {
        cubeDetected.value = true;
        showInstruction.value = false;
        emit("cube-detected");
      }
    } else {
      detectionCount = Math.max(0, detectionCount - 1);
      if (detectionCount === 0 && cubeDetected.value) {
        cubeDetected.value = false;
      }
    }

    // Smooth and emit pose
    if (result.pose && cubeDetected.value) {
      // Pass the raw rotation matrix — SmartCube uses SLERP for proper
      // distortion-free smoothing in quaternion space.
      // Only smooth Euler angles for display purposes.
      if (!smoothPose) {
        smoothPose = {
          yaw: result.pose.yaw,
          pitch: result.pose.pitch,
          roll: result.pose.roll,
        };
      } else {
        smoothPose.yaw = smoothValue(smoothPose.yaw, result.pose.yaw, SMOOTH_FACTOR);
        smoothPose.pitch = smoothValue(smoothPose.pitch, result.pose.pitch, SMOOTH_FACTOR);
        smoothPose.roll = smoothValue(smoothPose.roll, result.pose.roll, SMOOTH_FACTOR);
      }

      emit("pose-update", {
        yaw: smoothPose.yaw,
        pitch: smoothPose.pitch,
        roll: smoothPose.roll,
        matrix: result.pose.matrix, // Raw — SLERP handles interpolation
        rawPitch: result.pose.pitch,
        rawYaw: result.pose.yaw,
        rawRoll: result.pose.roll,
        confidence: result.confidence || 0,
        allFaceColors: result.detected ? result.allFaceColors : null
      });
    }

      // Draw overlay
      const canvas = canvasRef.value;
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas.getContext("2d");
        drawOverlay(ctx, result, canvas.width, canvas.height);
      }
    }

    frameCount++;
    animFrameId = requestAnimationFrame(loop);
  };

  animFrameId = requestAnimationFrame(loop);
};

const stopDetectionLoop = () => {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (fpsInterval) {
    clearInterval(fpsInterval);
    fpsInterval = null;
  }
};

// Watch active prop
watch(
  () => props.active,
  (active) => {
    if (active) {
      checkCameras();
      startCamera();
    } else {
      stopCamera();
    }
  }
);

onMounted(() => {
  clampBoundary();
  window.addEventListener('resize', clampBoundary);
  if (props.active) {
    checkCameras();
    startCamera();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', clampBoundary);
  stopCamera();
  if (onnxWorker) {
    onnxWorker.terminate();
    onnxWorker = null;
  }
});
</script>

<template>
  <div v-if="active"
       ref="panelRef"
       class="camera-panel glass-panel"
       :style="{
         left: panelPos.x + 'px',
         top: panelPos.y + 'px',
         width: panelWidth + 'px',
         opacity: panelOpacity
       }"
  >
    <div class="camera-header" @mousedown="onDragStart" style="cursor: move;">
      <span class="camera-title">Camera</span>
      <div class="camera-header-right">
        <span v-if="cubeDetected" class="camera-status detected">● Detected</span>
        <span v-if="confidence > 0" class="camera-confidence">{{ confidence }}%</span>
        <span class="camera-fps">{{ fps }} FPS</span>
        <button
          class="camera-toggle"
          @click="toggleOpacity"
          title="Toggle panel opacity"
        >
          <span style="font-size: 14px; font-weight: bold;">%</span>
        </button>
        <button
          v-if="hasMultipleCameras"
          class="camera-toggle"
          @click="toggleCamera"
          :title="useFrontCamera ? 'Switch to rear camera' : 'Switch to front camera'"
        >
          <SwitchCamera :size="16" />
        </button>
      </div>
    </div>

    <div class="camera-viewport">
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        class="camera-video"
      ></video>
      <canvas ref="canvasRef" class="camera-overlay"></canvas>

      <!-- AI Model loading overlay -->
      <transition name="fade">
        <div v-if="cvLoading" class="camera-instruction">
          <div class="instruction-icon">⚙️</div>
          <p class="instruction-text">{{ cvStatus || 'Loading AI Model...' }}</p>
          <p class="instruction-sub">One-time download (~9 MB)</p>
        </div>
      </transition>

      <!-- Instruction overlay -->
      <transition name="fade">
        <div v-if="showInstruction && !cvLoading" class="camera-instruction">
          <div class="instruction-icon">📷</div>
          <p class="instruction-text">Show your Rubik's Cube to the camera</p>
          <p class="instruction-sub">Hold it steady so we can detect it</p>
        </div>
      </transition>

      <div v-if="error" class="camera-error">
        <p>{{ error }}</p>
      </div>
    </div>

    <!-- Custom resize handles -->
    <div class="resize-handle bl" @mousedown="onResizeStart($event, 'bl')">
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M0,0 L0,12 L12,12 Z" fill="rgba(255,255,255,0.4)"/></svg>
    </div>
    <div class="resize-handle br" @mousedown="onResizeStart($event, 'br')">
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M12,0 L12,12 L0,12 Z" fill="rgba(255,255,255,0.4)"/></svg>
    </div>
  </div>
</template>

<style scoped>
.camera-panel {
  position: absolute;
  z-index: 2000;
  overflow: hidden;
  border-radius: 16px;
  transition: opacity 0.3s ease;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  width: 20px;
  height: 20px;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.resize-handle.bl {
  left: 0;
  cursor: sw-resize;
  justify-content: flex-start;
}
.resize-handle.br {
  right: 0;
  cursor: se-resize;
  justify-content: flex-end;
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--glass-border);
}

.camera-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.camera-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-strong);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.camera-status {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.camera-status.detected {
  color: #00ff88;
  background: rgba(0, 255, 136, 0.15);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(0, 255, 136, 0.3); }
  50% { box-shadow: 0 0 12px rgba(0, 255, 136, 0.5); }
}

.camera-fps {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  font-family: monospace;
}

.camera-confidence {
  font-size: 0.7rem;
  font-weight: 600;
  color: #00ff88;
  font-family: monospace;
}

.camera-toggle {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-strong);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s ease;
  outline: none;
}

.camera-toggle:focus, .camera-toggle:active {
  outline: none;
  box-shadow: none;
}

.camera-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
}

.camera-viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #000;
  overflow: hidden;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Show the full frame to allow letterboxing */
  background: #000;
}

.camera-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.camera-instruction {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  pointer-events: none;
  text-align: center;
  padding: 0 20px;
  box-sizing: border-box;
}

.instruction-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.instruction-text {
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.instruction-sub {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  margin: 4px 0 0;
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.camera-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
}
</style>
