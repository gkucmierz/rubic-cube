import { DeepCube, MOVES } from '../src/utils/DeepCube.js';

let cube = new DeepCube();
const apply = (str) => { str.split(' ').forEach(m => { cube = cube.multiply(MOVES[m]); }); };

cube = new DeepCube(); apply("F' U F");
console.log("F' U F reverse puts piece 4 at pos:", cube.cp.indexOf(4), "ori:", cube.co[cube.cp.indexOf(4)]);

cube = new DeepCube(); apply("U' F' U F");
console.log("U' F' U F reverse puts piece 4 at pos:", cube.cp.indexOf(4), "ori:", cube.co[cube.cp.indexOf(4)]);
