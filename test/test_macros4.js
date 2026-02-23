import { DeepCube, MOVES } from '../src/utils/DeepCube.js';

let cube = new DeepCube();
const apply = (str) => { str.split(' ').forEach(m => { cube = cube.multiply(MOVES[m]); }); };

const check = (name, alg, expectedPos, expectedOri) => {
    cube = new DeepCube();
    apply(alg); // reverse of extraction
    let p5 = cube.cp.indexOf(5); let o5 = cube.co[p5];
    console.log(`${name}: pos 5 is ${p5} (expected ${expectedPos}), ori ${o5} (expected ${expectedOri})`);
};

// DLF (5) Target UFL (1)
check("F' U' F reverse", "F' U F", 1, 2); // if reverse puts it at pos 1 ori 2, then if at pos 1 ori 2 use F' U' F!
check("L U L' reverse", "L U' L'", 1, 1);
check("L' U' L reverse", "L' U L", 1, 1); // wait, L' moves DLF to UBL(2)? Let's find out!

// Check extraction from 5
cube = new DeepCube(); apply("L U L'");
console.log("Extract DLF (5) with L U L' gives pos:", cube.cp.indexOf(5), "ori:", cube.co[cube.cp.indexOf(5)]);
cube = new DeepCube(); apply("F' U' F");
console.log("Extract DLF (5) with F' U' F gives pos:", cube.cp.indexOf(5), "ori:", cube.co[cube.cp.indexOf(5)]);
