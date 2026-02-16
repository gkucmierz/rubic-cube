
import { Cube, FACES, COLORS } from '../src/utils/Cube.js';
import assert from 'assert';

console.log('Running Cube Logic Tests...');

const cube = new Cube();

// Helper to check a specific face color at a position
const checkFace = (x, y, z, face, expectedColor, message) => {
  const cubie = cube.cubies.find(c => c.x === x && c.y === y && c.z === z);
  if (!cubie) {
    console.error(`Cubie not found at ${x}, ${y}, ${z}`);
    return false;
  }
  const color = cubie.faces[face];
  if (color !== expectedColor) {
    console.error(`FAIL: ${message}. Expected ${expectedColor} at ${face} of (${x},${y},${z}), got ${color}`);
    return false;
  }
  return true;
};

// Test 1: Initial State
console.log('Test 1: Initial State');
// Top-Front-Right corner (1, 1, 1) should have Up=White, Front=Green, Right=Red
checkFace(1, 1, 1, FACES.UP, COLORS.WHITE, 'Initial Top-Right-Front UP');
checkFace(1, 1, 1, FACES.FRONT, COLORS.GREEN, 'Initial Top-Right-Front FRONT');
checkFace(1, 1, 1, FACES.RIGHT, COLORS.RED, 'Initial Top-Right-Front RIGHT');

// Test 2: Rotate Right Face (R) -> Axis X, index 1, direction -1 (based on previous mapping)
// Wait, let's test `rotateLayer` directly first with axis 'x'.
// Axis X Positive Rotation (direction 1).
// Up (y=1) -> Front (z=1).
// The cubie at (1, 1, 1) (Top-Front-Right)
// Should move to (1, 0, 1)? No.
// (x, y, z) -> (x, -z, y).
// (1, 1, 1) -> (1, -1, 1). (Bottom-Front-Right).
// Let's trace the color.
// The White color was on UP.
// The cubie moves to Bottom-Front.
// The UP face of the cubie now points FRONT.
// So the cubie at (1, -1, 1) should have FRONT = WHITE.

console.log('Test 2: Rotate X Axis +90 (Right Layer)');
cube.rotateLayer('x', 1, 1);

// Cubie originally at (1, 1, 1) [White Up] moves to (1, -1, 1).
// Check (1, -1, 1).
// Its Front face should be White.
const result1 = checkFace(1, -1, 1, FACES.FRONT, COLORS.WHITE, 'After X+90: Old Up(White) should be on Front');

// Cubie originally at (1, 1, -1) [Blue Back, White Up] (Top-Back-Right)
// (1, 1, -1) -> (1, 1, 1). (Top-Front-Right).
// Wait. ny = -z = -(-1) = 1. nz = y = 1.
// So Top-Back moves to Top-Front.
// Its UP face (White) moves to FRONT?
// No. The rotation is around X.
// Top-Back (y=1, z=-1).
// Rot +90 X: y->z, z->-y ? No.
// ny = -z = 1. nz = y = 1.
// New pos: (1, 1, 1).
// The cubie moves from Top-Back to Top-Front.
// Its Up face (White) stays Up?
// No, the cubie rotates.
// Up face rotates to Front?
// Rotation around X axis.
// Top (Y+) rotates to Front (Z+)?
// Yes.
// So the cubie at (1, 1, 1) (new position) should have FRONT = WHITE.
const result2 = checkFace(1, 1, 1, FACES.FRONT, COLORS.WHITE, 'After X+90: Old Top-Back Up(White) should be on Front');

if (result1 && result2) {
    console.log('PASS: X Axis Rotation Logic seems correct (if fixed)');
} else {
    console.log('FAIL: X Axis Rotation Logic is broken');
}

// Reset for Y test
cube.reset();
console.log('Test 3: Rotate Y Axis +90 (Top Layer)');
// Top Layer (y=1).
// Rotate Y+ (direction 1).
// Front (z=1) -> Right (x=1).
// Cubie at (0, 1, 1) (Front-Top-Center) [Green Front, White Up].
// Moves to (1, 1, 0) (Right-Top-Center).
// Its Front Face (Green) should move to Right Face.
cube.rotateLayer('y', 1, 1);
const resultY = checkFace(1, 1, 0, FACES.RIGHT, COLORS.GREEN, 'After Y+90: Old Front(Green) should be on Right');

if (resultY) {
    console.log('PASS: Y Axis Rotation Logic seems correct');
} else {
    console.log('FAIL: Y Axis Rotation Logic is broken');
}

