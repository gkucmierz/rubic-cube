import { DeepCube, MOVES } from "../src/utils/DeepCube.js";
import { KociembaSolver } from "../src/utils/solvers/KociembaSolver.js";

let cube = new DeepCube();

const faceletStart = new KociembaSolver(cube).toFaceletString();
console.log("Solved Facelet:");
console.log(faceletStart);

cube = cube.multiply(MOVES["R"]);
const solverR = new KociembaSolver(cube);
const faceletR = solverR.toFaceletString();
console.log("Facelet after R:");
console.log(faceletR);

["U", "D", "R", "L", "F", "B"].forEach((m) => {
  let c = new DeepCube().multiply(MOVES[m]);
  let solver = new KociembaSolver(c);
  try {
    console.log(`Solution for ${m}:`, solver.solve().join(" "));
  } catch (e) {
    console.log(`Error on ${m}:`, e.message);
  }
});
