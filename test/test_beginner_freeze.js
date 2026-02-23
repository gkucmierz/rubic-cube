import { DeepCube, MOVES } from '../src/utils/DeepCube.js';
import { BeginnerSolver } from '../src/utils/solvers/BeginnerSolver.js';

let cube = new DeepCube();
const scramble = "R U R' U' R' F R2 U' R' U' R U R' F'"; // T-perm
scramble.split(' ').forEach(move => {
  cube = cube.multiply(MOVES[move]);
});

console.log('Testing BeginnerSolver with T-perm...');
const solver = new BeginnerSolver(cube);

// Add some logging to the solver's methods to trace execution
const originalApply = solver.apply.bind(solver);
solver.apply = (moveStr) => {
  // console.log('Applying:', moveStr);
  originalApply(moveStr);
};

try {
  const solution = solver.solve();
  console.log('Solution found:', solution.join(' '));
} catch (e) {
  console.error('Error during solve:', e);
}
