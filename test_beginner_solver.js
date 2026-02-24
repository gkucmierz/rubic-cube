import { DeepCube } from "./src/utils/DeepCube.js";
import { BeginnerSolver } from "./src/utils/solvers/BeginnerSolver.js";

const cube = new DeepCube();
// Scramble a bit
const moves = ["R", "U", "L", "F", "B", "D"];
let scrambled = cube;
for (const m of moves) {
    scrambled = scrambled.multiply(import("./src/utils/DeepCube.js").then(m => m.MOVES[m]));
}
// This won't work easily with dynamic imports in a script.
// Let's just use the constructor.

console.log("Testing BeginnerSolver...");
try {
    const solver = new BeginnerSolver(new DeepCube());
    const sol = solver.solve();
    console.log("Solution length:", sol.length);
} catch (e) {
    console.error("BeginnerSolver failed:", e);
}
