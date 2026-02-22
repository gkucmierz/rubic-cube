
import { CubeModel, FACES, COLORS } from '../src/utils/CubeModel.js';

console.log('Running CubeModel Rotation Logic Tests...');

const cube1 = new CubeModel();
const cube2 = new CubeModel();

const compareCubes = (c1, c2, message) => {
  const s1 = c1.toString();
  const s2 = c2.toString();
  if (s1 === s2) {
    console.log(`✅ PASS: ${message}`);
    return true;
  } else {
    console.error(`❌ FAIL: ${message}`);
    console.log('Expected (Standard Move):');
    console.log(s2);
    console.log('Actual (Layer Rotation):');
    console.log(s1);
    return false;
  }
};

// Test 1: Top Layer (y=1) CW vs U
cube1.reset();
cube2.reset();
console.log('Testing Top Layer CW vs U...');
cube1.rotateLayer('y', 1, 1); // Top CW
cube2.applyMove('U');
compareCubes(cube1, cube2, "Top Layer CW matches U");

// Test 2: Bottom Layer (y=-1) CW vs D
cube1.reset();
cube2.reset();
console.log('Testing Bottom Layer CW vs D...');
cube1.rotateLayer('y', -1, -1); // Bottom CW (CW around -Y is CCW around Y)
cube2.applyMove('D');
compareCubes(cube1, cube2, "Bottom Layer CW matches D");

// Test 3: Left Layer (x=-1) CW vs L
cube1.reset();
cube2.reset();
console.log('Testing Left Layer CW vs L...');
cube1.rotateLayer('x', -1, -1); // Left CW (CW around -X is CCW around X)
cube2.applyMove('L');
compareCubes(cube1, cube2, "Left Layer CW matches L");

// Test 4: Right Layer (x=1) CW vs R
cube1.reset();
cube2.reset();
console.log('Testing Right Layer CW vs R...');
cube1.rotateLayer('x', 1, 1); // Right CW
cube2.applyMove('R');
compareCubes(cube1, cube2, "Right Layer CW matches R");

// Test 5: Front Layer (z=1) CW vs F
cube1.reset();
cube2.reset();
console.log('Testing Front Layer CW vs F...');
cube1.rotateLayer('z', 1, 1); // Front CW
cube2.applyMove('F');
compareCubes(cube1, cube2, "Front Layer CW matches F");

// Test 6: Back Layer (z=-1) CW vs B
cube1.reset();
cube2.reset();
console.log('Testing Back Layer CW vs B...');
cube1.rotateLayer('z', -1, -1); // Back CW (CW around -Z is CCW around Z)
cube2.applyMove('B');
compareCubes(cube1, cube2, "Back Layer CW matches B");

