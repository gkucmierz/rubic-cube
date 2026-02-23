import { DeepCube, MOVES } from '../src/utils/DeepCube.js';

let cube;
const apply = (str) => {
    str.split(' ').forEach(m => {
        cube = cube.multiply(MOVES[m]);
    });
};

const check = (name, alg, initPos, initOri) => {
    cube = new DeepCube();
    apply(alg);
    // We applied alg to a SOLVED cube.
    // The piece that WAS at 4 (DFR) is now at some position P with orientation O.
    // To solve it, we would need to reverse the alg.
    // So if we find a piece at P with orientation O, we apply the reverse alg!
    console.log(`${name}: Extraction piece 4 is at pos ${cube.cp.indexOf(4)} ori ${cube.co[cube.cp.indexOf(4)]}`);
};

check("R U R'", "R U R'");
check("R U' R'", "R U' R'");
check("F' U' F", "F' U' F");
check("R U2 R' U' R U R'", "R U' R' U R U2 R'");

