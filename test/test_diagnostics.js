import { DeepCube, MOVES } from '../src/utils/DeepCube.js';
import { BeginnerSolver } from '../src/utils/solvers/BeginnerSolver.js';

const allMoves = Object.keys(MOVES);
const getRandomScramble = (length = 20) => {
    let s = [];
    for (let i = 0; i < length; i++) s.push(allMoves[Math.floor(Math.random() * allMoves.length)]);
    return s.join(' ');
};

let cube = new DeepCube();
const scramble = getRandomScramble();
scramble.split(' ').forEach(move => cube = cube.multiply(MOVES[move]));

const solver = new BeginnerSolver(cube);
solver.solve();

console.log("Check Cross:");
for (let i of [4, 5, 6, 7]) console.log(`Edge ${i}: ep=${solver.cube.ep.indexOf(i)} eo=${solver.cube.eo[solver.cube.ep.indexOf(i)]}`);

console.log("Check F2L Corners:");
for (let i of [4, 5, 6, 7]) console.log(`Corner ${i}: cp=${solver.cube.cp.indexOf(i)} co=${solver.cube.co[solver.cube.cp.indexOf(i)]}`);

console.log("Check F2L Edges:");
for (let i of [8, 9, 10, 11]) console.log(`Edge ${i}: ep=${solver.cube.ep.indexOf(i)} eo=${solver.cube.eo[solver.cube.ep.indexOf(i)]}`);

console.log("Check OLL:");
console.log(`co:`, solver.cube.co.slice(0, 4));
console.log(`eo:`, solver.cube.eo.slice(0, 4));

console.log("Check PLL:");
console.log(`cp:`, solver.cube.cp.slice(0, 4));
console.log(`ep:`, solver.cube.ep.slice(0, 4));

