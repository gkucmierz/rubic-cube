<script setup>
import { onMounted, ref, watch, onBeforeUnmount } from 'vue';
import { useCube } from '../../composables/useCube';
import * as THREE from 'three';

const { cubies, initCube } = useCube();
const containerRef = ref(null);
const canvasRef = ref(null);
const chaosElements = ref([]);
const pendingOcclusion = ref(null);

// UI Controls State
const showUI = ref(!window.location.search.includes('mode=generator') && window.location.pathname === '/generate');
const controls = ref({
  pitch: 20,
  yaw: -30,
  roll: 0,
  x: 0,
  y: 0,
  scale: 1.0,
  bgHue1: 120,
  bgSat1: 70,
  bgLight1: 50,
  bgHue2: 300,
  bgSat2: 70,
  bgLight2: 50,
  bgAngle: 135,
  isGradient: false,
  noise: 0,
  ambient: 0.8,
  dirIntensity: 1.2,
  dirAngle: 45, // in degrees
  isStickerless: false,
  whiteBorders: false,
  isScrambled: false,
  chaos: false,
  occlusion: false
});

const COLOR_MAP = {
  white: 0xffffff,
  yellow: 0xffd500,
  red: 0xb90000,
  orange: 0xff5900,
  blue: 0x0045ad,
  green: 0x009b48,
  black: 0x050505
};

// Global References for Three.js
let scene, camera, renderer, cubeGroup, occlusionGroup;
let ambientLight, dirLight;
let stickerlessMode = false;
let animationId;
let onWindowResizeHandler; // To store the function reference for removal

// --- 3D / Background Sync Functions (Defined BEFORE API to avoid ReferenceError) ---
const update3DPose = () => {
  if (!cubeGroup) return;
  const { pitch, yaw, roll } = controls.value;
  cubeGroup.rotation.set(
    pitch * Math.PI / 180,
    yaw * Math.PI / 180,
    roll * Math.PI / 180,
    'YXZ'
  );
  if (occlusionGroup) {
    occlusionGroup.rotation.copy(cubeGroup.rotation);
  }
};

const update3DPosition = () => {
  if (!cubeGroup) return;
  cubeGroup.position.set(controls.value.x, controls.value.y, 0);
  cubeGroup.scale.setScalar(controls.value.scale);

  if (occlusionGroup) {
    occlusionGroup.position.copy(cubeGroup.position);
    occlusionGroup.scale.copy(cubeGroup.scale);
  }
};

const updateBackground = () => {
  if (!containerRef.value) return;
  const { bgHue1, bgSat1, bgLight1, bgHue2, bgSat2, bgLight2, bgAngle, isGradient } = controls.value;
  if (isGradient) {
    containerRef.value.style.background = `linear-gradient(${bgAngle}deg, hsl(${bgHue1}, ${bgSat1}%, ${bgLight1}%), hsl(${bgHue2}, ${bgSat2}%, ${bgLight2}%))`;
  } else {
    containerRef.value.style.background = `hsl(${bgHue1}, ${bgSat1}%, ${bgLight1}%)`;
  }
};

const updateLights = () => {
  if (ambientLight) ambientLight.intensity = controls.value.ambient;
  if (dirLight) {
    const angle = controls.value.dirAngle * Math.PI / 180;
    dirLight.position.set(
      Math.sin(angle) * 5,
      Math.cos(angle) * 5,
      5
    );
    dirLight.intensity = controls.value.dirIntensity;
  }
};

const applyScramble = () => {
  if (!cubeGroup) return;
  const allColors = ['white', 'yellow', 'green', 'blue', 'orange', 'red'];
  cubeGroup.children.forEach(cubieMesh => {
    const c = cubies.value.find(cubie => cubie.id === cubieMesh.userData.id);
    if (!c) return;
    const isCenter = (Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z)) === 1;

    Object.entries(cubieMesh.userData.stickers).forEach(([face, stickerMesh]) => {
      if (c.faces[face] && c.faces[face] !== 'black') {
        if (isCenter) {
          const originalColor = c.faces[face];
          stickerMesh.material.color.setHex(COLOR_MAP[originalColor] || COLOR_MAP.black);
        } else {
          const randomColor = allColors[Math.floor(Math.random() * allColors.length)];
          stickerMesh.material.color.setHex(COLOR_MAP[randomColor]);
        }
      }
    });
  });
};

const resetToOriginalColors = () => {
  if (!cubeGroup) return;
  cubeGroup.children.forEach(cubieMesh => {
    const c = cubies.value.find(cubie => cubie.id === cubieMesh.userData.id);
    if (!c) return;
    Object.entries(cubieMesh.userData.stickers).forEach(([face, stickerMesh]) => {
      const originalColor = c.faces[face] || 'black';
      stickerMesh.material.color.setHex(COLOR_MAP[originalColor] || COLOR_MAP.black);
    });
  });
};

const updateStyle = () => {
  if (!cubeGroup) return;
  const isStickerless = controls.value.isStickerless;
  const borderHex = controls.value.whiteBorders ? 0xeeeeee : 0x111111;

  cubeGroup.children.forEach(cubieMesh => {
    // 1. Update Core/Border Color
    const core = cubieMesh.children[0];
    if (core && core.material) {
      core.material.color.setHex(borderHex);
      core.visible = !isStickerless; // Hide core in stickerless if you want, but usually stickerless just expands stickers
    }

    // 2. Update Sticker Scale (Stickerless look)
    Object.values(cubieMesh.userData.stickers).forEach(sticker => {
      if (isStickerless) {
        sticker.scale.set(1.1, 1.1, 1.0);
      } else {
        sticker.scale.set(1.0, 1.0, 1.0);
      }
    });
  });
};

const noiseIntensity = ref(0);
const randomNoiseFreq = ref(0.65);

// --- Helpers for Chaos Mode (Text & Emojis) ---
const getRandomEmoji = () => {
  const ranges = [
    [0x1F600, 0x1F64F], // Emoticons
    [0x1F300, 0x1F5FF], // Misc Symbols & Pictographs
    [0x1F680, 0x1F6FF], // Transport & Map
    [0x1F900, 0x1F9FF], // Supplemental
    [0x2700, 0x27BF],   // Dingbats
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const code = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  return String.fromCodePoint(code);
};

const getRandomString = () => {
  const len = 1 + Math.floor(Math.random() * 8);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let res = "";
  for (let i = 0; i < len; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
};

const buildMeshes = (cubiesData) => {
  if (!cubeGroup || cubiesData.length === 0) return;
  if (cubeGroup.children.length > 0) return; // already built

  const CUBIE_SIZE = 1;
  const STICKER_SIZE = 0.9;
  const STICKER_OFFSET = 0.501;

  const baseGeometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.1 });

  cubiesData.forEach(c => {
    const cubieMesh = new THREE.Group();
    cubieMesh.position.set(c.x, c.y, c.z);

    const core = new THREE.Mesh(baseGeometry, baseMaterial);
    core.castShadow = true;
    core.receiveShadow = true;
    cubieMesh.add(core);

    cubieMesh.userData.id = c.id;
    cubieMesh.userData.stickers = {};

    const directions = ['front', 'back', 'up', 'down', 'right', 'left'];

    directions.forEach(faceName => {
      const colorName = c.faces[faceName] || 'black';
      const material = new THREE.MeshStandardMaterial({
        color: COLOR_MAP[colorName] || COLOR_MAP.black,
        roughness: 0.3,
        metalness: 0.05,
      });
      const stickerGeometry = new THREE.BoxGeometry(STICKER_SIZE, STICKER_SIZE, 0.1);
      const sticker = new THREE.Mesh(stickerGeometry, material);

      switch (faceName) {
        case 'front':  sticker.position.z = STICKER_OFFSET; break;
        case 'back':   sticker.position.z = -STICKER_OFFSET; sticker.rotation.y = Math.PI; break;
        case 'up':     sticker.position.y = STICKER_OFFSET; sticker.rotation.x = -Math.PI / 2; break;
        case 'down':   sticker.position.y = -STICKER_OFFSET; sticker.rotation.x = Math.PI / 2; break;
        case 'right':  sticker.position.x = STICKER_OFFSET; sticker.rotation.y = Math.PI / 2; break;
        case 'left':   sticker.position.x = -STICKER_OFFSET; sticker.rotation.y = -Math.PI / 2; break;
      }

      sticker.receiveShadow = true;
      cubieMesh.userData.stickers[faceName] = sticker;
      cubieMesh.add(sticker);
    });

    cubeGroup.add(cubieMesh);
  });

  if (window.cubeApi) window.cubeApi.setPose(20, -30, 0);
};

// Expose API for Puppeteer
if (typeof window !== 'undefined') {
  window.cubeApi = {
    setVisible: (visible) => {
      if (cubeGroup) cubeGroup.visible = visible;
    },
    setPose: (pitch, yaw, roll) => {
      if (!cubeGroup) return;
      controls.value.pitch = pitch;
      controls.value.yaw = yaw;
      controls.value.roll = roll;
      update3DPose();
    },
    setPosition: (x, y, scale) => {
      if (!cubeGroup) return;
      controls.value.x = x;
      controls.value.y = y;
      controls.value.scale = scale;
      update3DPosition();
    },
    setLight: (ambientIntensity, dirAngle, dirIntensity) => {
      if (ambientLight) ambientLight.intensity = ambientIntensity;
      if (!dirLight) return;
      dirLight.position.set(
        Math.sin(dirAngle) * 5,
        Math.cos(dirAngle) * 5,
        5
      );
      dirLight.intensity = dirIntensity;
    },
    setBackground: (style) => {
      if (containerRef.value) {
        containerRef.value.style.background = style;
      }
    },
    scrambleColors: applyScramble,
    setColors: (colorMap) => {
      if (!cubeGroup) return;
      cubeGroup.children.forEach(cubieMesh => {
        const id = cubieMesh.userData.id;
        Object.entries(cubieMesh.userData.stickers).forEach(([face, stickerMesh]) => {
          const key = `${id}:${face}`;
          if (colorMap[key]) {
            const newColor = COLOR_MAP[colorMap[key]] || COLOR_MAP.black;
            stickerMesh.material.color.setHex(newColor);
          }
        });
      });
    },
    setStickerless: (isStickerless) => {
      if (!cubeGroup) return;
      stickerlessMode = isStickerless;
      cubeGroup.children.forEach(cubieMesh => {
        cubieMesh.children[0].visible = !isStickerless;
        Object.values(cubieMesh.userData.stickers).forEach(sticker => {
          if (isStickerless) {
            sticker.scale.set(1.1, 1.1, 1.0);
          } else {
            sticker.scale.set(1.0, 1.0, 1.0);
          }
        });
      });
    },
    setNoise: (intensity) => {
      noiseIntensity.value = intensity;
    },
    setChaos: (elements) => {
      chaosElements.value = elements || [];
    },
    setOcclusion: (config) => {
      if (!occlusionGroup) {
        pendingOcclusion.value = config;
        return;
      }
      // Clear previous occlusion
      while(occlusionGroup.children.length > 0) {
        const obj = occlusionGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        occlusionGroup.remove(obj);
      }

      if (!config || !config.enabled) {
        return;
      }
      const count = config.count || 0;
      for (let i = 0; i < count; i++) {
        // --- Thinner Fingers (0.1 rad) for 224x224 viewport ---
        const geometry = new THREE.CapsuleGeometry(0.1, 2.2, 4, 8);
        const skinTones = [0xdbac98, 0x8d5524, 0xbb906e, 0xffdbac];
        const material = new THREE.MeshBasicMaterial({
          color: skinTones[Math.floor(Math.random() * skinTones.length)],
          transparent: true,
          opacity: 1.0
        });
        const finger = new THREE.Mesh(geometry, material);

        // --- Precision Edge-Centric Placement ---
        // Cube bounds in local space are approx [-1.5, 1.5]
        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        const edgePos = 1.6; // Slightly outside the main face
        const spread = 2.0;

        if (side === 0) { x = (Math.random() - 0.5) * spread; y = edgePos; } // top
        else if (side === 1) { x = (Math.random() - 0.5) * spread; y = -edgePos; } // bottom
        else if (side === 2) { x = -edgePos; y = (Math.random() - 0.5) * spread; } // left
        else { x = edgePos; y = (Math.random() - 0.5) * spread; } // right

        // Move slightly towards center to "bite" the edge
        x *= 0.95;
        y *= 0.95;

        // --- FIXED Z-DEPTH ---
        // Cube front face is at local Z=1.5.
        // We need fingers to be CLEARLY in front regardless of scale.
        const z = 2.0 + Math.random() * 0.8;
        finger.position.set(x, y, z);

        // Point finger towards the center with slight jitter
        finger.lookAt(0, 0, 0);
        finger.rotation.x += (Math.random() - 0.5) * 0.3;
        finger.rotation.y += (Math.random() - 0.5) * 0.3;

        occlusionGroup.add(finger);
      }
    }
  };
}

// Sync controls...
watch(() => controls.value.noise, (val) => {
  noiseIntensity.value = val;
});
watch(() => controls.value.pitch, update3DPose);
watch(() => controls.value.yaw, update3DPose);
watch(() => controls.value.roll, update3DPose);
watch(() => controls.value.x, update3DPosition);
watch(() => controls.value.y, update3DPosition);
watch(() => controls.value.scale, update3DPosition);
watch(() => controls.value.bgHue1, updateBackground);
watch(() => controls.value.bgSat1, updateBackground);
watch(() => controls.value.bgLight1, updateBackground);
watch(() => controls.value.bgHue2, updateBackground);
watch(() => controls.value.bgSat2, updateBackground);
watch(() => controls.value.bgLight2, updateBackground);
watch(() => controls.value.bgAngle, updateBackground);
watch(() => controls.value.isGradient, updateBackground);
watch(() => controls.value.ambient, updateLights);
watch(() => controls.value.dirIntensity, updateLights);
watch(() => controls.value.dirAngle, updateLights);
watch(() => controls.value.isStickerless, updateStyle);
watch(() => controls.value.whiteBorders, updateStyle);
watch(() => controls.value.isScrambled, (val) => {
  if (val) applyScramble();
  else resetToOriginalColors();
});
watch(() => controls.value.chaos, (val) => {
  if (val) {
    const fixedTexts = ["CUBE", "RUBIK", "3x3", "AI", "CNN", "DET", "0101"];
    const els = Array.from({ length: 30 }, () => {
      let txt = "";
      const rand = Math.random();
      if (rand < 0.3) txt = fixedTexts[Math.floor(Math.random() * fixedTexts.length)];
      else if (rand < 0.6) txt = getRandomString();
      else txt = getRandomEmoji();

      return {
        text: txt,
        lx: Math.random() * 100,
        ly: Math.random() * 100,
        size: 3 + Math.floor(Math.random() * 8), // 3-11 vmin
        rot: Math.random() * 360,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        opacity: 0.4 + Math.random() * 0.4
      };
    });
    window.cubeApi.setChaos(els);
  } else {
    window.cubeApi.setChaos([]);
  }
});
watch(() => controls.value.occlusion, (val) => {
  window.cubeApi.setOcclusion({ enabled: val, count: 2 });
});

onMounted(() => {
  initCube();

  // Setup WebGL Scene
  scene = new THREE.Scene();
  // REMOVED scene.background = new THREE.Color(...) to allow CSS backgrounds to show through alpha

  // Setup Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 8;

  // Setup Renderer with ALPHA support
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: true
  });
  renderer.setClearColor(0x000000, 0); // Transparent background

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Add Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 5, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Re-map internal cubies to 3D Meshes
  cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  occlusionGroup = new THREE.Group();
  scene.add(occlusionGroup);

  if (pendingOcclusion.value) {
    window.cubeApi.setOcclusion(pendingOcclusion.value);
    pendingOcclusion.value = null;
  }

  // Watch for Web Worker to send the actual 27 cubies
  watch(cubies, (newCubies) => {
    if (newCubies && newCubies.length === 27) {
      buildMeshes(newCubies);
    }
  }, { immediate: true });

  // Handle Resize
  onWindowResizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onWindowResizeHandler);

  // Render Loop
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  animate();
});

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
  if (onWindowResizeHandler) window.removeEventListener('resize', onWindowResizeHandler);
});
</script>

<template>
  <div class="generator-container" ref="containerRef">
    <!-- Random background elements for Domain Randomization -->
    <div class="chaos-overlay">
      <div
        v-for="(el, idx) in chaosElements"
        :key="idx"
        class="chaos-el"
        :style="{
          left: el.lx + '%',
          top: el.ly + '%',
          fontSize: el.size + 'vmin',
          transform: `rotate(${el.rot}deg)`,
          color: el.color,
          opacity: el.opacity
        }"
      >{{ el.text }}</div>
    </div>

    <canvas
      ref="canvasRef"
      :style="{ filter: noiseIntensity > 0 ? `url(#noiseFilter) contrast(1.1)` : 'none' }"
    ></canvas>

    <!-- Visual guide for the crop area -->
    <div v-if="showUI" class="crop-guide"></div>

    <!-- Interactive Debug UI (Hidden during generate.js run) -->
    <div v-if="showUI" class="controls-overlay">
      <h3>Generator Debugger <small style="font-size: 10px; color: #ff00ff;">v2.1</small></h3>

      <div class="control-group">
        <label>Rotation (Pitch / Yaw / Roll)</label>
        <div class="slider-row">
          <div class="row"><span class="sublabel">P:</span><input type="range" v-model.number="controls.pitch" min="-90" max="90"></div>
          <div class="row"><span class="sublabel">Y:</span><input type="range" v-model.number="controls.yaw" min="-180" max="180"></div>
          <div class="row"><span class="sublabel">R:</span><input type="range" v-model.number="controls.roll" min="-180" max="180"></div>
        </div>
        <div class="val-display">{{controls.pitch}}° | {{controls.yaw}}° | {{controls.roll}}°</div>
      </div>

      <div class="control-group">
        <label>Position (X / Y / Scale)</label>
        <div class="slider-row">
          <div class="row"><span class="sublabel">X:</span><input type="range" v-model.number="controls.x" min="-1.5" max="1.5" step="0.1"></div>
          <div class="row"><span class="sublabel">Y:</span><input type="range" v-model.number="controls.y" min="-1.5" max="1.5" step="0.1"></div>
          <div class="row"><span class="sublabel">S:</span><input type="range" v-model.number="controls.scale" min="0.8" max="1.3" step="0.05"></div>
        </div>
        <div class="val-display">X: {{controls.x}} | Y: {{controls.y}} | S: {{controls.scale}}x</div>
      </div>

      <div class="control-group">
        <label>Background</label>
        <div class="row" style="margin-bottom: 5px;">
          <label class="clickable-row"><input type="checkbox" v-model="controls.isGradient"> Gradient</label>
        </div>
        <div v-if="controls.isGradient" class="row" style="margin-bottom: 15px;">
          <span class="sublabel">∠:</span><input type="range" v-model.number="controls.bgAngle" min="0" max="360" title="Gradient Angle">
        </div>

        <div class="color-section">
          <div class="section-tag" :style="{ background: `hsl(${controls.bgHue1}, ${controls.bgSat1}%, ${controls.bgLight1}%)` }">Color 1</div>
          <div class="slider-row" style="margin-bottom: 10px;">
            <div class="row"><span class="sublabel">H:</span><input type="range" v-model.number="controls.bgHue1" min="0" max="360"></div>
            <div class="row"><span class="sublabel">S:</span><input type="range" v-model.number="controls.bgSat1" min="0" max="100"></div>
            <div class="row"><span class="sublabel">L:</span><input type="range" v-model.number="controls.bgLight1" min="0" max="100"></div>
          </div>
        </div>

        <div v-if="controls.isGradient" class="color-section">
          <div class="section-tag" :style="{ background: `hsl(${controls.bgHue2}, ${controls.bgSat2}%, ${controls.bgLight2}%)` }">Color 2</div>
          <div class="slider-row">
            <div class="row"><span class="sublabel">H:</span><input type="range" v-model.number="controls.bgHue2" min="0" max="360"></div>
            <div class="row"><span class="sublabel">S:</span><input type="range" v-model.number="controls.bgSat2" min="0" max="100"></div>
            <div class="row"><span class="sublabel">L:</span><input type="range" v-model.number="controls.bgLight2" min="0" max="100"></div>
          </div>
        </div>
      </div>

      <div class="control-group">
        <label>Light (Ambient / Dir / Angle)</label>
        <div class="slider-row">
          <div class="row"><span class="sublabel">A:</span><input type="range" v-model.number="controls.ambient" min="0" max="2" step="0.1"></div>
          <div class="row"><span class="sublabel">D:</span><input type="range" v-model.number="controls.dirIntensity" min="0" max="3" step="0.1"></div>
          <div class="row"><span class="sublabel">∠:</span><input type="range" v-model.number="controls.dirAngle" min="0" max="360" step="5"></div>
        </div>
      </div>

      <div class="control-group">
        <label>Style</label>
        <div class="row">
          <label class="clickable-row"><input type="checkbox" v-model="controls.isStickerless"> Stickerless</label>
        </div>
        <div class="row">
          <label class="clickable-row"><input type="checkbox" v-model="controls.whiteBorders"> White Borders</label>
        </div>
        <div class="row">
          <label class="clickable-row"><input type="checkbox" v-model="controls.isScrambled"> Scrambled</label>
        </div>
        <div class="row" style="margin-top: 10px; color: #ff00ff;">
          <label class="clickable-row">
            <input type="checkbox" v-model="controls.chaos"> Chaos Mode
          </label>
        </div>
        <div class="row" style="color: #ff00ff;">
          <label class="clickable-row">
            <input type="checkbox" v-model="controls.occlusion"> Occlusion (Fingers)
          </label>
        </div>
      </div>

      <div class="control-group">
        <label>Noise (Intensity)</label>
        <input type="range" v-model.number="controls.noise" min="0" max="1" step="0.05">
        <div class="val-display">{{(controls.noise * 100).toFixed(0)}}%</div>
      </div>

      <div class="hint">Use <code>?mode=generator</code> to hide this UI</div>
    </div>

    <!-- Noise filter for ML training variety -->
    <svg style="position: absolute; width: 0; height: 0;">
      <filter id="noiseFilter">
        <feTurbulence
          type="fractalNoise"
          :baseFrequency="randomNoiseFreq"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" :slope="noiseIntensity" />
        </feComponentTransfer>
        <feBlend in="SourceGraphic" mode="overlay" />
      </filter>
    </svg>
  </div>
</template>

<style scoped>
.generator-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chaos-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100vmin;
  height: 100vmin;
  pointer-events: none;
  overflow: hidden;
  z-index: 1; /* BEHIND the canvas */
  opacity: 1 !important;
  visibility: visible !important;
}

.chaos-el {
  position: absolute;
  font-weight: 800;
  white-space: nowrap;
  text-shadow: 0 0 10px rgba(0,0,0,1);
  opacity: 1 !important;
}

canvas {
  display: block;
  outline: none;
  width: 100%;
  height: 100%;
  position: absolute; /* Changed from relative */
  top: 0;
  left: 0;
  z-index: 999; /* HUGE GAP to ensure it's on top of chaos-overlay (z-index 1) */
  background: transparent !important;
}

.crop-guide {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100vmin;
  height: 100vmin;
  border: 2px solid #00ff88;
  pointer-events: none;
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.7);
  z-index: 5;
  box-sizing: border-box;
}

.crop-guide::after {
  content: "CROP AREA (SQUARE 1:1)";
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 10px;
  color: #00ff88;
  font-weight: bold;
  background: rgba(0,0,0,0.5);
  padding: 2px 4px;
}

.controls-overlay {
  position: absolute;
  right: 20px;
  top: 20px;
  width: 300px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(15px);
  color: white;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'Inter', sans-serif;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  scrollbar-width: thin;
  scrollbar-color: #00ff88 transparent;
  z-index: 10000;
}

.controls-overlay h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #00ff88;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-row input[type="range"] {
  width: 100%;
  cursor: pointer;
}

.val-display {
  font-size: 11px;
  font-family: monospace;
  margin-top: 2px;
  margin-bottom: 10px;
  color: #00ff88;
  text-align: right;
  background: rgba(0,255,136,0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.sublabel {
  font-size: 10px;
  color: #00ff88;
  font-weight: bold;
  width: 15px;
  flex-shrink: 0;
}

.color-section {
  border-left: 2px solid #333;
  padding-left: 10px;
  margin-bottom: 15px;
}

.section-tag {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 8px;
  display: inline-block;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  border: 1px solid rgba(255,255,255,0.2);
}

.hint {
  font-size: 10px;
  color: #666;
  border-top: 1px solid #333;
  padding-top: 10px;
  margin-top: 5px;
}

code {
  background: #222;
  padding: 2px 4px;
  border-radius: 4px;
}
.clickable-row {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
</style>
