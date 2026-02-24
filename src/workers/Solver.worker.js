import { DeepCube } from "../utils/DeepCube.js";
import { KociembaSolver } from "../utils/solvers/KociembaSolver.js";
import { BeginnerSolver } from "../utils/solvers/BeginnerSolver.js";

let isKociembaReady = false;

// Defer heavy initialization to allow the worker to be responsive initially
setTimeout(() => {
  console.log("[SolverWorker] Kociemba solver initialization");
  console.time("[SolverWorker] Kociemba solver initialized");
  KociembaSolver.init();
  console.timeEnd("[SolverWorker] Kociemba solver initialized");
  isKociembaReady = true;
  postMessage({ type: "INIT_DONE" });
}, 50);

self.onmessage = (e) => {
  const { type, payload } = e.data;

  if (type === "SOLVE") {
    const { solverType, cubeState } = payload;

    if (solverType === "kociemba" && !isKociembaReady) {
      postMessage({ type: "SOLVE_ERROR", payload: "wait for initialize solver" });
      return;
    }

    try {
      // Reconstruct DeepCube state from payload
      const dc = new DeepCube(
        new Int8Array(cubeState.cp),
        new Int8Array(cubeState.co),
        new Int8Array(cubeState.ep),
        new Int8Array(cubeState.eo)
      );

      let solution = [];
      if (solverType === "kociemba") {
        const solver = new KociembaSolver(dc);
        solution = solver.solve();
      } else if (solverType === "beginner") {
        const solver = new BeginnerSolver(dc);
        solution = solver.solve();
      } else {
        throw new Error(`Unknown solver type: ${solverType}`);
      }

      postMessage({
        type: "SOLVE_RESULT",
        payload: solution,
      });
    } catch (err) {
      console.error("[SolverWorker] Solve error:", err);
      postMessage({ type: "SOLVE_ERROR", payload: err.message });
      postMessage({ type: "SOLVE_RESULT", payload: [] });
    }
  }
};
