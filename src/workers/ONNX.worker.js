import * as ort from 'onnxruntime-web';

const PROC_W = 224;
const PROC_H = 224;

let session = null;
let isInitialized = false;

// We simulate temporal tracking state to match old CameraPanel API
let trackState = {
  framesSinceDetection: 0,
  isTracking: false,
  lastConfidence: 0,
  smoothPose: null
};

// ── Message handler ─────────────────────────────────────────
self.onmessage = async function (e) {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    initONNX();
  } else if (type === 'DETECT') {
    if (!isInitialized || !session) {
      self.postMessage({ type: 'DETECT_RESULT', payload: emptyResult() });
      return;
    }
    const result = await detectFrame(payload.imageBuffer, payload.width, payload.height);
    self.postMessage({ type: 'DETECT_RESULT', payload: result });
  } else if (type === 'RESET_TRACKING') {
    trackState.framesSinceDetection = 0;
    trackState.isTracking = false;
    trackState.lastConfidence = 0;
  }
};

// ── INIT ONNX ───────────────────────────────────────────────
async function initONNX() {
  self.postMessage({ type: 'INIT_PROGRESS', payload: { status: 'Downloading 13MB MobileNetV2 ONNX Model...' } });

  try {
    // 🚨 [EXCEPTION AUTHORIZED BY USER] 🚨
    // Fetch WASM binaries from official CDN to bypass Vite 6 bundler restrictions on Worker .mjs 
    // WARNING: This breaks the offline-first zero-trust rule (#4), but is permitted for the active prototype phase.
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/';
    ort.env.wasm.numThreads = 1; // Block ONNX from trying to spin up sub-workers (which breaks Vite)
    ort.env.wasm.proxy = false; // Disable any worker proxying attempts
    ort.env.webgl.pack = false; // Disable WebGL packing

    // We fetch from the public directory
    session = await ort.InferenceSession.create('/cube_pose_tracker.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: 1
    });
    isInitialized = true;
    self.postMessage({ type: 'INIT_DONE' });
  } catch (err) {
    self.postMessage({ type: 'INIT_ERROR', payload: { error: err.message } });
    console.error("ONNX Init Error:", err);
  }
}

// ── EMPTY RESULT ────────────────────────────────────────────
function emptyResult() {
  return {
    detected: false, confidence: 0, quad: null, pose: null,
    colorClusters: 0, stickerCount: 0,
    stickers: [], bestCluster: null, colors: null,
    isTracking: false, roi: null, w: PROC_W, h: PROC_H,
    allFaceColors: {}
  };
}

// ── MAIN DETECTION PIPELINE ─────────────────────────────────
async function detectFrame(imageBuffer, width, height) {
  const data = new Uint8ClampedArray(imageBuffer);

  // 1. Prepare ONNX Input Tensor (1x3x224x224 Float32Array)
  const inputData = new Float32Array(3 * 224 * 224);

  // Cube-specific normalizations (calculated over 100k generated samples)
  const mean = [0.3496, 0.2955, 0.1898];
  const std = [0.3102, 0.2397, 0.2422];

  for (let i = 0; i < 224 * 224; i++) {
    const r = data[i * 4 + 0] / 255.0;
    const g = data[i * 4 + 1] / 255.0;
    const b = data[i * 4 + 2] / 255.0;

    inputData[i] = (r - mean[0]) / std[0];                   // R channel
    inputData[224 * 224 + i] = (g - mean[1]) / std[1];       // G channel
    inputData[2 * 224 * 224 + i] = (b - mean[2]) / std[2];   // B channel
  }

  const tensor = new ort.Tensor('float32', inputData, [1, 3, 224, 224]);

  // 2. Run Inference
  let outputData;
  try {
    const results = await session.run({ input: tensor });
    // PyTorch export might name the output something else than 'output'.
    // We grab the first output tensor in the results object dynamically.
    const outputTensor = Object.values(results)[0];
    outputData = outputTensor.data;
  } catch (e) {
    console.error("ONNX Inference Error:", e);
    return emptyResult();
  }

  // 3. Parse Pose Outputs (Pitch, Yaw, Roll generated logically scaled [-1, 1] over 180 degrees)
  // The Neural Network outputs very small values (~0.065) when the real-world angle is 45 degrees.
  // This is likely due to the bounding box cropping of the face versus the 50 FOV trained camera.
  // Use 1.0 if training on 40k samples with 1:1 labels
  // Output indices:
  const txRaw = outputData[3] * 2.0;
  const tyRaw = outputData[4] * 2.0;
  const tscaleRaw = outputData[5] + 1.0;
  const detLogit = outputData[6];

  let pitchRaw = outputData[0] * 180.0;
  let yawRaw = outputData[1] * 180.0;
  let rollRaw = outputData[2] * 180.0;

  // --- Temporal Smoothing (EMA) to stop jumping AR ---
  let pitch, yaw, roll, tx, ty, tscale;
  if (!trackState.smoothPose) {
    trackState.smoothPose = { pitch: pitchRaw, yaw: yawRaw, roll: rollRaw, tx: txRaw, ty: tyRaw, tscale: tscaleRaw };
  } else {
    // 30% new frame, 70% history
    const alpha = 0.3;
    trackState.smoothPose.pitch = trackState.smoothPose.pitch * (1 - alpha) + pitchRaw * alpha;
    trackState.smoothPose.yaw = trackState.smoothPose.yaw * (1 - alpha) + yawRaw * alpha;
    trackState.smoothPose.roll = trackState.smoothPose.roll * (1 - alpha) + rollRaw * alpha;
    trackState.smoothPose.tx = trackState.smoothPose.tx * (1 - alpha) + txRaw * alpha;
    trackState.smoothPose.ty = trackState.smoothPose.ty * (1 - alpha) + tyRaw * alpha;
    trackState.smoothPose.tscale = trackState.smoothPose.tscale * (1 - alpha) + tscaleRaw * alpha;
  }

  pitch = trackState.smoothPose.pitch;
  yaw = trackState.smoothPose.yaw;
  roll = trackState.smoothPose.roll;
  tx = trackState.smoothPose.tx;
  ty = trackState.smoothPose.ty;
  tscale = trackState.smoothPose.tscale;

  // Matrix math depends on radians
  const ex = pitch * Math.PI / 180;
  const ey = yaw * Math.PI / 180;
  const ez = roll * Math.PI / 180;

  const cx = Math.cos(ex), sx = Math.sin(ex);
  const cy = Math.cos(ey), sy = Math.sin(ey);
  const cz = Math.cos(ez), sz = Math.sin(ez);

  const m11 = cy * cz + sy * sx * sz;
  const m12 = cy * -sz + sy * sx * cz;
  const m13 = sy * cx;
  const m21 = cx * sz;
  const m22 = cx * cz;
  const m23 = -sx;
  const m31 = -sy * cz + cy * sx * sz;
  const m32 = -sy * -sz + cy * sx * cz;
  const m33 = cy * cx;

  const matrix = [
    m11, m21, m31, 0,
    m12, m22, m32, 0,
    m13, m23, m33, 0,
    0, 0, 0, 1
  ];

  const detProb = 1.0 / (1.0 + Math.exp(-detLogit));
  const pose = { pitch, yaw, roll, x: tx, y: ty, scale: tscale, matrix, raw: Array.from(outputData), detProb };

  // Sample colors for ALL 6 faces using 3D perspective projection
  const faces = {
    front: [0, 0, 1], back: [0, 0, -1],
    up: [0, 1, 0], down: [0, -1, 0],
    right: [1, 0, 0], left: [-1, 0, 0]
  };

  const allFaceColors = {};
  for (const [name, normal] of Object.entries(faces)) {
    allFaceColors[name] = extractColorsSimulated(data, width, height, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale, normal);
  }

  // --- Detection Logic and Multi-Factor Confidence ---
  // Neural Network probability (already calculated above for pose)

  // Find which face is most visible and what is the max sticker count
  let maxValidStickers = 0;
  let bestFaceName = 'front';
  let bestFaceZ = -1.0;
  let maxClusters = 0;

  for (const [name, colors] of Object.entries(allFaceColors)) {
    const validColors = colors.filter(c => c !== '?');
    const validCount = validColors.length;
    const clusters = new Set(validColors).size;

    if (validCount > maxValidStickers) {
      maxValidStickers = validCount;
      maxClusters = clusters;
    }

    // Use projection to find best facing face for legacy fallback
    const normal = faces[name];
    const cz = normal[0] * m31 + normal[1] * m32 + normal[2] * m33;
    if (cz > bestFaceZ) {
      bestFaceZ = cz;
      bestFaceName = name;
    }
  }

  // Refined Confidence Heuristic:
  // 1. Start with NN detProb
  // 2. Multiply by sticker yield - but with a "deadzone" for low counts
  let stickerFactor = maxValidStickers / 9.0;
  if (maxValidStickers < 3) stickerFactor = 0; // Hard drop for noise
  else if (maxValidStickers < 5) stickerFactor *= 0.5; // Soft penalty for low confidence

  // 3. Penalty for "too few colors" on what's supposed to be a cube face
  const clusterFactor = maxClusters >= 3 ? 1.0 : (maxClusters === 0 ? 0 : 0.4);

  // Special check: If DET logit is extremely high but stickers are low, it's likely a false positive
  let sanityFactor = 1.0;
  if (detLogit > 6.0 && maxValidStickers < 5) sanityFactor = 0.2; // Even more aggressive

  let confidence = Math.round(detProb * stickerFactor * clusterFactor * sanityFactor * 100);

  // Stricter detection flag
  // Requiring at least 6 stickers and at least 3 color clusters (most cube views have 3-6 colors)
  // If we only see 1-2 colors, it's likely a face or a wall, unless the network is UNBELIEVABLY sure.
  let detected = (detLogit > 3.0 && maxValidStickers >= 6 && maxClusters >= 3) ||
    (detLogit > 10.0 && maxValidStickers >= 8 && maxClusters >= 2);

  if (!detected) {
    trackState.isTracking = false;
    trackState.smoothPose = null;
    confidence = Math.min(confidence, 10); // Low cap for non-detections
  } else {
    trackState.isTracking = true;
  }

  // Clear colors if not detected to save bandwidth and prevent jumping logic
  const colorsToReturn = detected ? allFaceColors : null;
  const legacyColors = detected ? allFaceColors[bestFaceName] : Array(9).fill('?');

  return {
    detected, confidence, quad: get2DQuad(width, height, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale), pose,
    colorClusters: maxClusters, stickerCount: maxValidStickers,
    stickers: [], bestCluster: [],
    colors: legacyColors,
    allFaceColors: colorsToReturn,
    isTracking: trackState.isTracking,
    roi: null, w: PROC_W, h: PROC_H,
  };
}

// Provide the bounding box of the cube in 2D space for the UI
function get2DQuad(w, h, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale) {
  const corners = [
    { x: -1.5, y: 1.5, z: 1.5 }, // TL
    { x: 1.5, y: 1.5, z: 1.5 },  // TR
    { x: 1.5, y: -1.5, z: 1.5 }, // BR
    { x: -1.5, y: -1.5, z: 1.5 } // BL
  ];
  return corners.map(pt => projectPoint(pt.x, pt.y, pt.z, w, h, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale));
}

// Math to exact match WebGL's camera projection
function projectPoint(x, y, z_cube, w, h, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale) {
  // Apply Object Scaling
  x *= tscale;
  y *= tscale;
  z_cube *= tscale;

  // Apply Rotation
  const rx = m11 * x + m12 * y + m13 * z_cube;
  const ry = m21 * x + m22 * y + m23 * z_cube;
  const rz = m31 * x + m32 * y + m33 * z_cube;

  // Apply camera translation and Generator distance
  const cam_rx = rx + tx;
  const cam_ry = ry + ty;
  const z_cam = rz - 8.0;

  // Projection f = 1 / Math.tan( (50/2) * Math.PI / 180 )
  // ThreeJS Perspective Camera uses Vertical FOV for scaling Y, Aspect for X.
  const f = 1 / Math.tan((50 / 2) * (Math.PI / 180));
  const aspect_ratio = w / h;

  const ndc_y = (cam_ry * f) / -z_cam;
  const ndc_x = ((cam_rx * f) / aspect_ratio) / -z_cam;

  return {
    x: (ndc_x + 1) * w / 2, // Standard unmirrored X (positive is right)
    y: (-ndc_y + 1) * h / 2  // Screen Y is inverted (positive is down)
  };
}

// Fast Color Classifier
const classifyColor = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * (((b - r) / d) + 2);
    else if (max === b) h = 60 * (((r - g) / d) + 4);
  }
  if (h < 0) h += 360;

  // Convert standard HSV (0-360) to OpenCV HSV thresholds (0-180, 0-255, 0-255)
  const cvH = h / 2;
  const cvS = s * 255;
  const cvV = v;

  if (cvV < 40) return '?'; // Too dark
  if (cvS < 50) return 'W'; // Stricter White (higher saturation threshold)

  if (cvH < 7 || cvH > 170) return 'R';
  if (cvH >= 7 && cvH < 22) return 'O';
  if (cvH >= 22 && cvH < 45) return 'Y';
  if (cvH >= 45 && cvH < 85) return 'G';
  if (cvH >= 85 && cvH < 133) return 'B';
  return '?';
};

// Direct extraction using Matrix math with Area Sampling
function extractColorsSimulated(data, w, h_img, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale, faceNormal) {
  const [nx, ny, nz] = faceNormal;
  const extracted = [];

  // Define grid axes based on face normal
  let gu, gv;
  if (nx !== 0) { gu = [0, 0, -nx]; gv = [0, 1, 0]; }
  else if (ny !== 0) { gu = [1, 0, 0]; gv = [0, 0, -ny]; }
  else { gu = [nz, 0, 0]; gv = [0, 1, 0]; }

  // Each sticker has a size of ~0.9.
  // We want to sample the inner 50% of that area for robustness.
  const sampleOffsets = [-0.225, 0, 0.225];

  for (let row = 1; row >= -1; row--) {
    for (let col = -1; col <= 1; col++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      // Sample a grid of points within the sticker's 3D area
      for (let s_y of sampleOffsets) {
        for (let s_x of sampleOffsets) {
          // Absolute 3D point for this sticker sample
          const ax = nx * 1.5 + (col + s_x) * gu[0] + (row + s_y) * gv[0];
          const ay = ny * 1.5 + (col + s_x) * gu[1] + (row + s_y) * gv[1];
          const az = nz * 1.5 + (col + s_x) * gu[2] + (row + s_y) * gv[2];

          const pt = projectPoint(ax, ay, az, w, h_img, m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tscale);

          const ix = Math.max(0, Math.min(w - 1, Math.floor(pt.x)));
          const iy = Math.max(0, Math.min(h_img - 1, Math.floor(pt.y)));
          const idx = (iy * w + ix) * 4;

          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }

      extracted.push(classifyColor(rSum / count, gSum / count, bSum / count));
    }
  }
  return extracted;
}
