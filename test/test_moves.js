import { DeepCube, MOVES } from '../src/utils/DeepCube.js';

let cube = new DeepCube(); 
const apply = (str) => {
  str.split(' ').forEach(m => {
    cube = cube.multiply(MOVES[m]);
  });
};

// We want to verify `R U R'` extracts piece 4 (DFR) to U layer.
apply("R U R'");
console.log("Piece 4 is at position:", cube.cp.indexOf(4), "Orientation:", cube.co[cube.cp.indexOf(4)]);

cube = new DeepCube();
// What if piece 4 is at URF (position 0)? We want to insert it to DFR (position 4).
// If Yellow is UP, co=0.
// Let's create a state where DFR is at URF with co=0. 
// We can do this by applying R U2 R' U' R U R' IN REVERSE to extract it.
// Reverse of R U2 R' U' R U R' is: R U' R' U R U2 R'
apply("R U' R' U R U2 R'");
console.log("Extraction -> Piece 4 position:", cube.cp.indexOf(4), "Orientation:", cube.co[cube.cp.indexOf(4)]);

