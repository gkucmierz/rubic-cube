import { DeepCube, MOVES } from '../src/utils/DeepCube.js';

let cube = new DeepCube();
const apply = (str) => {
    str.split(' ').forEach(m => {
        cube = cube.multiply(MOVES[m]);
    });
};

apply("R U R'");
console.log("Piece 4 (R U R') is at position:", cube.cp.indexOf(4), "Orientation:", cube.co[cube.cp.indexOf(4)]);

cube = new DeepCube();
apply("R U' R' U R U2 R'");
console.log("Piece 4 (Up-face extraction) position:", cube.cp.indexOf(4), "Orientation:", cube.co[cube.cp.indexOf(4)]);

cube = new DeepCube();
apply("R U R'"); // insert front facing
console.log("Piece 4 (Front-face extraction) position:", cube.cp.indexOf(4), "Orientation:", cube.co[cube.cp.indexOf(4)]);

cube = new DeepCube();
apply("F' U' F"); // insert left facing
console.log("Piece 4 (Side-face extraction) position:", cube.cp.indexOf(4), "Orientation:", cube.co[cube.cp.indexOf(4)]);

