const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const NUM_SAMPLES = 100_000;
const NUM_WORKERS = 12; // Increased for better throughput
const OUTPUT_DIR = path.join(__dirname, 'dataset');
const LABELS_FILE = path.join(OUTPUT_DIR, 'labels.jsonl');
const STATS_FILE = path.join(OUTPUT_DIR, 'stats.txt');

const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

if (isMainThread) {
  main().catch(console.error);
} else {
  workerTask(workerData).catch(err => {
    console.error(`Worker error:`, err);
    process.exit(1);
  });
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log(`Starting PARALLEL generation: ${NUM_SAMPLES} samples | ${NUM_WORKERS} workers`);
  console.log('='.repeat(50) + '\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Clear old labels and stats
  if (fs.existsSync(LABELS_FILE)) fs.unlinkSync(LABELS_FILE);
  if (fs.existsSync(STATS_FILE)) fs.unlinkSync(STATS_FILE);

  // NOTE: We don't delete the whole OUTPUT_DIR images because there might be 100k of them
  // and it takes forever on some filesystems. But we should warn the user.
  console.log(`Target directory: ${OUTPUT_DIR}`);
  console.log(`Existing images will be overwritten by globalIdx.`);

  const samplesPerWorker = Math.floor(NUM_SAMPLES / NUM_WORKERS);
  const workerPromises = [];
  const workerInstances = [];

  let totalPixelSum = [0, 0, 0];
  let totalPixelSqSum = [0, 0, 0];
  let totalPixels = 0;

  for (let i = 0; i < NUM_WORKERS; i++) {
    const startIdx = i * samplesPerWorker;
    const count = (i === NUM_WORKERS - 1) ? (NUM_SAMPLES - startIdx) : samplesPerWorker;

    const worker = new Worker(__filename, {
      workerData: { workerId: i, startIdx, count, outputDir: OUTPUT_DIR }
    });
    workerInstances.push(worker);

    workerPromises.push(new Promise((resolve) => {
      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          // Optional: aggregate progress
        } else if (msg.type === 'done') {
          // Accumulate stats
          totalPixelSum[0] += msg.stats.sum[0];
          totalPixelSum[1] += msg.stats.sum[1];
          totalPixelSum[2] += msg.stats.sum[2];
          totalPixelSqSum[0] += msg.stats.sqSum[0];
          totalPixelSqSum[1] += msg.stats.sqSum[1];
          totalPixelSqSum[2] += msg.stats.sqSum[2];
          totalPixels += msg.stats.n;
          resolve();
        }
      });
    }));
  }

  process.on('SIGINT', () => {
    console.log('\n[Main] Caught interrupt signal (Ctrl+C). Terminating workers...');
    for (const w of workerInstances) {
      w.postMessage({ type: 'STOP' });
    }
    // Allow some time for graceful browser close
    setTimeout(() => {
      console.log('[Main] Forced exit.');
      process.exit(0);
    }, 1000); // 1s is enough
  });

  await Promise.all(workerPromises);

  // Final stats calculation
  const mean = totalPixelSum.map(s => s / totalPixels);
  const variance = totalPixelSqSum.map((sq, i) => (sq / totalPixels) - (mean[i] ** 2));
  const std = variance.map(v => Math.sqrt(Math.max(0, v)));

  const statsOutput = `Dataset Statistics (Calculated over ${NUM_SAMPLES} samples):
Mean RGB: [${mean.map(m => (m / 255).toFixed(4)).join(', ')}]
Std RGB:  [${std.map(s => (s / 255).toFixed(4)).join(', ')}]
(Normalized to 0-1 range for PyTorch transforms.Normalize)`;

  console.log('\n' + '='.repeat(50));
  console.log(statsOutput);
  console.log('='.repeat(50) + '\n');

  fs.writeFileSync(STATS_FILE, statsOutput);

  // Merge labels
  console.log('Merging labels...');
  for (let i = 0; i < NUM_WORKERS; i++) {
    const workerLabelsFile = path.join(OUTPUT_DIR, `labels_worker_${i}.jsonl`);
    if (fs.existsSync(workerLabelsFile)) {
      const content = fs.readFileSync(workerLabelsFile, 'utf8');
      fs.appendFileSync(LABELS_FILE, content);
      fs.unlinkSync(workerLabelsFile);
    }
  }

  console.log('Dataset generation complete!');
}

async function workerTask({ workerId, startIdx, count, outputDir }) {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 224, height: 224 }
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 224, height: 224 });

  // Disable HMR/WS
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() === 'websocket') req.abort();
    else req.continue();
  });

  // No console proxy to keep output clean
  /*
  page.on('console', msg => {
    console.log(`[Browser Worker ${workerId}] ${msg.text()}`);
  });
  */

  const uniqueUrl = `http://localhost:5173/generate?mode=generator&seed=${Math.random()}&t=${Date.now()}`;
  await page.goto(uniqueUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });

  // Wait for the API to be exposed by the Vue component
  try {
    await page.waitForFunction(() => window.cubeApi !== undefined, { timeout: 30000 });
    console.log(`[Worker ${workerId}] Cube API is ready.`);
  } catch (err) {
    console.error(`[Worker ${workerId}] Cube API failed to load in 30s!`);
    throw err;
  }

  let isStopping = false;
  parentPort.on('message', async (msg) => {
    if (msg.type === 'STOP') {
      console.log(`[Worker ${workerId}] Received stop signal.`);
      isStopping = true;
    }
  });

  // Initialize browser-side stats
  await page.evaluate(() => {
    window.pixelStats = {
      sum: [0, 0, 0],
      sqSum: [0, 0, 0],
      n: 0
    };

    window.updateStats = () => {
      const glCanvas = document.querySelector('canvas');
      if (!glCanvas) return;

      if (!window.proxyCanvas) {
        window.proxyCanvas = document.createElement('canvas');
        window.proxyCanvas.width = glCanvas.width;
        window.proxyCanvas.height = glCanvas.height;
        window.proxyCtx = window.proxyCanvas.getContext('2d', { willReadFrequently: true });
      }

      const ctx = window.proxyCtx;
      ctx.drawImage(glCanvas, 0, 0);
      const imgData = ctx.getImageData(0, 0, glCanvas.width, glCanvas.height).data;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];

        window.pixelStats.sum[0] += r;
        window.pixelStats.sum[1] += g;
        window.pixelStats.sum[2] += b;
        window.pixelStats.sqSum[0] += r * r;
        window.pixelStats.sqSum[1] += g * g;
        window.pixelStats.sqSum[2] += b * b;
        window.pixelStats.n++;
      }
    };
  });

  const workerLabelsFile = path.join(outputDir, `labels_worker_${workerId}.jsonl`);
  const stickerlessModes = [true, false];

  for (let i = 0; i < count; i++) {
    if (isStopping) {
      console.log(`[Worker ${workerId}] Stopping loop at ${i}/${count}`);
      break;
    }
    const globalIdx = startIdx + i;
    const detected = Math.random() < 0.3 ? 0 : 1;
    const pitch = randomRange(-60, 60);
    const yaw = randomRange(-60, 60);
    const roll = randomRange(-45, 45);
    const x = randomRange(-1.5, 1.5);
    const y = randomRange(-1.5, 1.5);
    const scale = randomRange(0.8, 1.3);

    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 100);
    const l = Math.floor(Math.random() * 80) + 10;
    const bgColor = `hsl(${h}, ${s}%, ${l}%)`;
    const useGradient = Math.random() < 0.5;
    const h2 = (h + 180) % 360;
    const bgStyle = useGradient
      ? `linear-gradient(${Math.random() * 360}deg, hsl(${h}, ${s}%, ${l}%), hsl(${h2}, ${s}%, ${l}%))`
      : bgColor;

    const stickerless = randomChoice(stickerlessModes);
    const ambientIntensity = randomRange(0.3, 1.1);
    const lightAngle = randomRange(0, Math.PI * 2);
    const lightIntensity = randomRange(0.5, 2.0);
    const noise = Math.random() < 0.7 ? randomRange(0.05, 0.4) : 0;

    // --- Domain Randomization: Chaos Overlay (Background) ---
    let chaos = [];
    if (Math.random() > 0.1) { // INCREASED: 90% chance
      const fixedTexts = ["CUBE", "RUBIK", "3x3", "AI", "CNN", "DET", "0101"];
      const emojiRanges = [
        [0x1F600, 0x1F64F], [0x1F300, 0x1F5FF],
        [0x1F680, 0x1F6FF], [0x1F900, 0x1F9FF], [0x2700, 0x27BF]
      ];
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

      const chaosCount = 20 + Math.floor(Math.random() * 30);
      chaos = Array.from({ length: chaosCount }, () => {
        let txt = "";
        const r = Math.random();
        if (r < 0.3) {
          txt = fixedTexts[Math.floor(Math.random() * fixedTexts.length)];
        } else if (r < 0.6) {
          const sLen = 1 + Math.floor(Math.random() * 8);
          for (let k = 0; k < sLen; k++) txt += chars[Math.floor(Math.random() * chars.length)];
        } else {
          const rng = emojiRanges[Math.floor(Math.random() * emojiRanges.length)];
          const cp = Math.floor(Math.random() * (rng[1] - rng[0] + 1)) + rng[0];
          txt = String.fromCodePoint(cp);
        }

        return {
          text: txt,
          lx: Math.random() * 100,
          ly: Math.random() * 100,
          size: 10 + Math.floor(Math.random() * 120),
          rot: Math.random() * 360,
          color: `hsl(${Math.random() * 360}, 80%, 60%)`,
          opacity: 0.15 + Math.random() * 0.45,
          blur: Math.random() * 1.5
        };
      });
    }

    // --- Synthetic Occlusion: Fingers (Edge-Centric) ---
    let occlusion = { enabled: false };
    if (Math.random() > 0.25) { // INCREASED: 75% chance
      occlusion = {
        enabled: true,
        count: 1 + Math.floor(Math.random() * 4),
        color: Math.random() > 0.5 ? '#dbac98' : (Math.random() > 0.5 ? '#8d5524' : '#e0ac69')
      };
    }

    await page.evaluate(async (p, yaw_val, r, tx, ty, tscale, b, sl, amb, la, li, vis, n, ch, occ) => {
      if (window.cubeApi) {
        window.cubeApi.setVisible(vis === 1);
        if (window.cubeApi.setNoise) window.cubeApi.setNoise(n);
        if (window.cubeApi.setChaos) window.cubeApi.setChaos(ch);
        if (window.cubeApi.setOcclusion) window.cubeApi.setOcclusion(occ);

        if (vis === 1) {
          window.cubeApi.setPose(p, yaw_val, r);
          if (window.cubeApi.setPosition) window.cubeApi.setPosition(tx, ty, tscale);
          window.cubeApi.setStickerless(sl);
          window.cubeApi.scrambleColors();
        }
        window.cubeApi.setBackground(b);
        window.cubeApi.setLight(amb, la, li);
      }

      // Wait for 100ms to ensure Vue DOM update + Three.js render
      // Using setTimeout because requestAnimationFrame can be tricky in headless/parallel
      await new Promise(res => setTimeout(res, 100));

      if (window.updateStats) window.updateStats();
    }, pitch, yaw, roll, x, y, scale, bgStyle, stickerless, ambientIntensity, lightAngle, lightIntensity, detected, noise, chaos, occlusion);

    const filename = `frame_${String(globalIdx).padStart(5, '0')}.jpg`;
    const filepath = path.join(outputDir, filename);
    try {
      await page.screenshot({ path: filepath, type: 'jpeg', quality: 90 });

      // Verification: ensure file exists before adding to labels
      if (fs.existsSync(filepath)) {
        const annotation = {
          image: filename,
          pose: { pitch, yaw, roll, x, y, scale },
          detected,
          stickerless,
          bg: bgStyle
        };
        fs.appendFileSync(workerLabelsFile, JSON.stringify(annotation) + '\n');
      } else {
        console.error(`Worker ${workerId}: [WARNING] Screenshot missing after save: ${filename}`);
      }
    } catch (err) {
      console.error(`Worker ${workerId}: [ERROR] Screenshot failed for ${filename}:`, err.message);
    }

    if (i % 50 === 0 && workerId === 0) {
      console.log(`Worker 0: progress ${i}/${count}...`);
    }
  }

  const finalStats = isStopping ? { sum: [0, 0, 0], sqSum: [0, 0, 0], n: 0 } : await page.evaluate(() => window.pixelStats);
  parentPort.postMessage({ type: 'done', stats: finalStats });
  await browser.close();
  process.exit(0);
}
