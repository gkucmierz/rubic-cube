import { DeepCube, MOVES } from '../src/utils/DeepCube.js';
let cube = new DeepCube();
const apply = (str) => { str.split(' ').filter(x => x).forEach(m => cube = cube.multiply(MOVES[m])); };

apply("R' F R' B2 R F' R' B2 R2");
console.log(`cp after A-perm:`, cube.cp.slice(0, 4));
// We want to see which two corners are swapped.
// Solved is 0,1,2,3.
// If it prints 0,1,3,2, then 2 and 3 are swapped (Back corners).
