
import { Cube, FACES, COLORS } from '../src/utils/Cube.js';
import assert from 'assert';

console.log('Running Cube Matrix Rotation Tests...');

const cube = new Cube();

// Helper to check position and face
const checkCubie = (origX, origY, origZ, newX, newY, newZ, faceCheck) => {
  const cubie = cube.cubies.find(c => c.x === newX && c.y === newY && c.z === newZ);
  if (!cubie) {
    console.error(`FAIL: Cubie not found at ${newX}, ${newY}, ${newZ}`);
    return false;
  }
  
  // Verify it's the correct original cubie (tracking ID would be better, but position logic is enough if unique)
  // Let's assume we track a specific cubie.
  return true;
};

// Test 1: Z-Axis Rotation (Front Face)
// Front Face is z=1.
// Top-Left (x=-1, y=1) -> Top-Right (x=1, y=1)?
// Physical CW (Z-Axis): Up -> Right.
// Top-Middle (0, 1) -> Right-Middle (1, 0).
console.log('Test 1: Z-Axis CW (Front)');
cube.reset();
// Find Top-Middle of Front Face: (0, 1, 1). White Up, Green Front.
const topMid = cube.cubies.find(c => c.x === 0 && c.y === 1 && c.z === 1);
assert.strictEqual(topMid.faces[FACES.UP], COLORS.WHITE);
assert.strictEqual(topMid.faces[FACES.FRONT], COLORS.GREEN);

cube.rotateLayer('z', 1, -1); // CW (direction -1 in move(), but rotateLayer takes direction. Standard move F is direction -1?)
// move('F') calls rotateLayer('z', 1, -1).
// So let's test rotateLayer('z', 1, -1).

// Expect: (0, 1, 1) -> (1, 0, 1). (Right-Middle of Front).
// Faces: Old Up (White) becomes Right?
// Z-Axis CW: Up -> Right.
// So new pos should have Right=White.
// Old Front (Green) stays Front.
const newPos = cube.cubies.find(c => c.id === topMid.id);
console.log(`Moved to: (${newPos.x}, ${newPos.y}, ${newPos.z})`);
assert.strictEqual(newPos.x, 1);
assert.strictEqual(newPos.y, 0);
assert.strictEqual(newPos.z, 1);
assert.strictEqual(newPos.faces[FACES.RIGHT], COLORS.WHITE);
assert.strictEqual(newPos.faces[FACES.FRONT], COLORS.GREEN);
console.log('PASS Z-Axis CW');


// Test 2: X-Axis Rotation (Right Face)
// Right Face is x=1.
// Top-Front (1, 1, 1) -> Top-Back (1, 1, -1)?
// Physical CW (X-Axis): Up -> Front.
// Top-Middle (1, 1, 0) -> Front-Middle (1, 0, 1).
console.log('Test 2: X-Axis CW (Right)');
cube.reset();
// Find Top-Middle of Right Face: (1, 1, 0). White Up, Red Right.
const rightTop = cube.cubies.find(c => c.x === 1 && c.y === 1 && c.z === 0);

cube.rotateLayer('x', 1, -1); // CW (direction -1 for R in move()?)
// move('R') calls rotateLayer('x', 1, -1).
// So let's test -1.

// Expect: (1, 1, 0) -> (1, 0, -1).
// Faces: Old Up (White) becomes Back?
// X-Axis CW (Right Face): Up -> Back.
// So new pos should have Back=White.
// Old Right (Red) stays Right.
const newRightPos = cube.cubies.find(c => c.id === rightTop.id);
console.log(`Moved to: (${newRightPos.x}, ${newRightPos.y}, ${newRightPos.z})`);
assert.strictEqual(newRightPos.x, 1);
assert.strictEqual(newRightPos.y, 0);
assert.strictEqual(newRightPos.z, -1);
assert.strictEqual(newRightPos.faces[FACES.BACK], COLORS.WHITE);
assert.strictEqual(newRightPos.faces[FACES.RIGHT], COLORS.RED);
console.log('PASS X-Axis CW');


// Test 3: Y-Axis Rotation (Up Face)
// Up Face is y=1.
// Front-Middle (0, 1, 1) -> Left-Middle (-1, 1, 0).
// Physical CW (Y-Axis): Front -> Left.
// Wait. move('U') calls rotateLayer('y', 1, -1).
// Standard U is CW. Y-Axis direction?
// move('U'): dir = -1.
console.log('Test 3: Y-Axis CW (Up)');
cube.reset();
// Find Front-Middle of Up Face: (0, 1, 1). Green Front, White Up.
const upFront = cube.cubies.find(c => c.x === 0 && c.y === 1 && c.z === 1);

cube.rotateLayer('y', 1, -1); // CW (direction -1).

// Expect: (0, 1, 1) -> (-1, 1, 0). (Left-Middle).
// Faces: Old Front (Green) becomes Left?
// Y-Axis CW (U): Front -> Left.
// So new pos should have Left=Green.
// Old Up (White) stays Up.
const newUpPos = cube.cubies.find(c => c.id === upFront.id);
console.log(`Moved to: (${newUpPos.x}, ${newUpPos.y}, ${newUpPos.z})`);
assert.strictEqual(newUpPos.x, -1);
assert.strictEqual(newUpPos.y, 1);
assert.strictEqual(newUpPos.z, 0);
assert.strictEqual(newUpPos.faces[FACES.LEFT], COLORS.GREEN);
assert.strictEqual(newUpPos.faces[FACES.UP], COLORS.WHITE);
console.log('PASS Y-Axis CW');

