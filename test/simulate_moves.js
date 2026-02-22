
import { Cube, FACES, COLORS } from '../src/utils/Cube.js';

// Helper to print face
const printFace = (matrix, name) => {
  console.log(`--- ${name} ---`);
  matrix.forEach(row => console.log(row.map(c => c ? c[0].toUpperCase() : '-').join(' ')));
};

// Helper to check if a face matches expected color (center color)
const checkFaceColor = (matrix, expectedColor) => {
  return matrix.every(row => row.every(c => c === expectedColor));
};

console.log("=== RUBIK'S CUBE SIMULATION & DIAGNOSTIC ===");

const cube = new Cube();

// 1. Initial State Check
console.log("\n1. Checking Initial State...");
let state = cube.getState();
const isSolved = 
  checkFaceColor(state[FACES.UP], COLORS.WHITE) &&
  checkFaceColor(state[FACES.DOWN], COLORS.YELLOW) &&
  checkFaceColor(state[FACES.FRONT], COLORS.GREEN) &&
  checkFaceColor(state[FACES.BACK], COLORS.BLUE) &&
  checkFaceColor(state[FACES.LEFT], COLORS.ORANGE) &&
  checkFaceColor(state[FACES.RIGHT], COLORS.RED);

if (isSolved) {
  console.log("✅ Initial state is SOLVED.");
} else {
  console.error("❌ Initial state is BROKEN.");
  process.exit(1);
}

// 2. Simulate Move: Front Face Drag Down
// Visual: Drag Down on Front Face (Left Layer).
// Axis: X. Index: -1 (Left).
// Physical expectation: The Left slice moves "towards the user" (if looking from top) or "down" (if looking from front).
// Standard Notation: L (Left CW).
// L move: Top -> Front -> Down -> Back -> Top.
// Let's verify what L does.
// Standard L: Front gets Top color.
// If I drag Left Layer DOWN on Front face, the Front face pieces move DOWN.
// So Front gets Top pieces.
// So Drag Down = L = Front gets Top.

console.log("\n2. Simulating: Left Layer (x=-1) Rotation (L-like move)...");
// We need to find which 'direction' in our engine corresponds to L.
// Our engine: rotateLayer('x', -1, direction).

// Try direction = 1
console.log("-> Applying rotateLayer('x', -1, 1)...");
cube.rotateLayer('x', -1, 1);
state = cube.getState();

// Check result on Left Column of Front Face
// Front is Green. Top is White.
// If L (Drag Down): Front-Left-Col should be White.
const frontLeftCol = [state[FACES.FRONT][0][0], state[FACES.FRONT][1][0], state[FACES.FRONT][2][0]];
console.log("Front Left Column colors:", frontLeftCol);

if (frontLeftCol.every(c => c === COLORS.WHITE)) {
  console.log("✅ Result: Front got White (Top). This matches 'Drag Down' (L move).");
  console.log("=> CONCLUSION: direction=1 corresponds to Drag Down (L).");
} else if (frontLeftCol.every(c => c === COLORS.YELLOW)) {
  console.log("⚠️ Result: Front got Yellow (Down). This matches 'Drag Up' (L' move).");
  console.log("=> CONCLUSION: direction=1 corresponds to Drag Up (L').");
} else {
  console.error("❌ Unexpected colors:", frontLeftCol);
}

// Reset for next test
cube.reset();

// 3. Simulate Move: Front Face Drag Right
// Visual: Drag Right on Front Face (Top Layer).
// Axis: Y. Index: 1 (Top).
// Physical expectation: Top slice moves Right.
// Standard Notation: U' (Up CCW) ? No.
// If I hold cube, drag Top Layer to Right.
// Front face pieces move to Right face.
// Standard U (CW): Front -> Left.
// So Drag Right is U' (CCW).
// Let's verify.
// Drag Right: Front -> Right.

console.log("\n3. Simulating: Top Layer (y=1) Rotation...");
// Try direction = 1
console.log("-> Applying rotateLayer('y', 1, 1)...");
cube.rotateLayer('y', 1, 1);
state = cube.getState();

// Check result on Top Row of Front Face
// Front is Green. Left is Orange. Right is Red.
// If Drag Right: Front-Top-Row should be Orange? No.
// Drag Right: The pieces move Right. So Front REPLACES Right?
// Or Front GETS Left?
// Visually: The face moves Right. So the Green pieces go to Right face.
// And Front face gets Left (Orange) pieces.
// So Front-Top-Row should be Orange.

const frontTopRow = state[FACES.FRONT][0];
console.log("Front Top Row colors:", frontTopRow);

if (frontTopRow.every(c => c === COLORS.ORANGE)) {
  console.log("✅ Result: Front got Orange (Left). This matches 'Drag Right'.");
  console.log("=> CONCLUSION: direction=1 corresponds to Drag Right.");
} else if (frontTopRow.every(c => c === COLORS.RED)) {
  console.log("⚠️ Result: Front got Red (Right). This matches 'Drag Left'.");
  console.log("=> CONCLUSION: direction=1 corresponds to Drag Left.");
} else {
  console.error("❌ Unexpected colors:", frontTopRow);
}

console.log("\n=== END SIMULATION ===");
