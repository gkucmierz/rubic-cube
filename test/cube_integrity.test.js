
import { Cube, FACES, COLORS } from '../src/utils/Cube.js';
import assert from 'assert';

console.log('Running Cube Integrity Tests...');

const cube = new Cube();

// Helper: Count colors on all faces
const countColors = () => {
  const counts = {
    [COLORS.WHITE]: 0,
    [COLORS.YELLOW]: 0,
    [COLORS.ORANGE]: 0,
    [COLORS.RED]: 0,
    [COLORS.GREEN]: 0,
    [COLORS.BLUE]: 0,
    [COLORS.BLACK]: 0 // Should be ignored or internal
  };

  cube.cubies.forEach(cubie => {
    Object.values(cubie.faces).forEach(color => {
      if (counts[color] !== undefined) {
        counts[color]++;
      }
    });
  });

  return counts;
};

// Helper: Verify solved state counts
const verifyCounts = (counts) => {
  // Each face has 9 stickers. 6 faces.
  // 9 * 6 = 54 colored stickers.
  // 27 cubies * 6 faces = 162 total faces.
  // 162 - 54 = 108 black faces (internal).
  
  assert.strictEqual(counts[COLORS.WHITE], 9, 'White count should be 9');
  assert.strictEqual(counts[COLORS.YELLOW], 9, 'Yellow count should be 9');
  assert.strictEqual(counts[COLORS.ORANGE], 9, 'Orange count should be 9');
  assert.strictEqual(counts[COLORS.RED], 9, 'Red count should be 9');
  assert.strictEqual(counts[COLORS.GREEN], 9, 'Green count should be 9');
  assert.strictEqual(counts[COLORS.BLUE], 9, 'Blue count should be 9');
};

// Helper: Verify piece integrity
// Corners: 8 corners, each has 3 colors.
// Edges: 12 edges, each has 2 colors.
// Centers: 6 centers, each has 1 color.
// Core: 1 core, 0 colors.
const verifyPieceTypes = () => {
  let corners = 0;
  let edges = 0;
  let centers = 0;
  let cores = 0;

  cube.cubies.forEach(cubie => {
    const coloredFaces = Object.values(cubie.faces).filter(c => c !== COLORS.BLACK).length;
    if (coloredFaces === 3) corners++;
    else if (coloredFaces === 2) edges++;
    else if (coloredFaces === 1) centers++;
    else if (coloredFaces === 0) cores++;
    else assert.fail(`Invalid cubie with ${coloredFaces} colors at (${cubie.x},${cubie.y},${cubie.z})`);
  });

  assert.strictEqual(corners, 8, 'Should have 8 corners');
  assert.strictEqual(edges, 12, 'Should have 12 edges');
  assert.strictEqual(centers, 6, 'Should have 6 centers');
  assert.strictEqual(cores, 1, 'Should have 1 core');
};

// Helper: Verify specific relative positions of centers (they never change relative to each other)
// Up (White) opposite Down (Yellow)
// Front (Green) opposite Back (Blue)
// Left (Orange) opposite Right (Red)
const verifyCenters = () => {
  const centers = cube.cubies.filter(c => 
    Object.values(c.faces).filter(f => f !== COLORS.BLACK).length === 1
  );
  
  // Find center by color
  const findCenter = (color) => centers.find(c => Object.values(c.faces).includes(color));
  
  const white = findCenter(COLORS.WHITE);
  const yellow = findCenter(COLORS.YELLOW);
  const green = findCenter(COLORS.GREEN);
  const blue = findCenter(COLORS.BLUE);
  const orange = findCenter(COLORS.ORANGE);
  const red = findCenter(COLORS.RED);

  // Check opposites
  // Distance between opposites should be 2 (e.g. y=1 and y=-1)
  // And they should be on same axis
  
  // Note: After rotations, x/y/z coordinates change.
  // But relative vectors should hold?
  // Actually, centers DO rotate around the core.
  // But White is always opposite Yellow.
  // So vector(White) + vector(Yellow) == (0,0,0).
  
  const checkOpposite = (c1, c2, name) => {
    assert.strictEqual(c1.x + c2.x, 0, `${name} X mismatch`);
    assert.strictEqual(c1.y + c2.y, 0, `${name} Y mismatch`);
    assert.strictEqual(c1.z + c2.z, 0, `${name} Z mismatch`);
  };

  checkOpposite(white, yellow, 'White-Yellow');
  checkOpposite(green, blue, 'Green-Blue');
  checkOpposite(orange, red, 'Orange-Red');
};


// --- Test Execution ---

// 1. Initial State
console.log('Test 1: Initial State Integrity');
verifyCounts(countColors());
verifyPieceTypes();
verifyCenters();
console.log('PASS Initial State');

// 2. Single Rotation (R)
console.log('Test 2: Single Rotation (R)');
cube.rotateLayer('x', 1, -1); // R
verifyCounts(countColors());
verifyPieceTypes();
verifyCenters();
console.log('PASS Single Rotation');

// 3. Multiple Rotations (R U R' U')
console.log('Test 3: Sexy Move (R U R\' U\')');
cube.reset();
cube.move("R");
cube.move("U");
cube.move("R'");
cube.move("U'");
verifyCounts(countColors());
verifyPieceTypes();
verifyCenters();
console.log('PASS Sexy Move');

// 4. Random Rotations (Fuzzing)
console.log('Test 4: 100 Random Moves');
cube.reset();
const axes = ['x', 'y', 'z'];
const indices = [-1, 0, 1];
const dirs = [1, -1];

for (let i = 0; i < 100; i++) {
  const axis = axes[Math.floor(Math.random() * axes.length)];
  const index = indices[Math.floor(Math.random() * indices.length)];
  const dir = dirs[Math.floor(Math.random() * dirs.length)];
  cube.rotateLayer(axis, index, dir);
}
verifyCounts(countColors());
verifyPieceTypes();
verifyCenters();
console.log('PASS 100 Random Moves');

console.log('ALL INTEGRITY TESTS PASSED');
