import { DeepCube, MOVES } from "../src/utils/DeepCube.js";
import { BeginnerSolver } from "../src/utils/solvers/BeginnerSolver.js";

const allMoves = Object.keys(MOVES);

const getRandomScramble = (length = 20) => {
  let s = [];
  for (let i = 0; i < length; i++)
    s.push(allMoves[Math.floor(Math.random() * allMoves.length)]);
  return s.join(" ");
};

for (let i = 1; i <= 20; i++) {
  let cube = new DeepCube();
  const scramble = getRandomScramble();
  scramble.split(" ").forEach((move) => (cube = cube.multiply(MOVES[move])));

  const startTime = Date.now();
  const solver = new BeginnerSolver(cube);
  try {
    const solution = solver.solve();
    const elapsedTime = Date.now() - startTime;
    console.log(
      `Test ${i}: Solved in ${elapsedTime}ms. Solution length: ${solution.length}`,
    );

    // Verify it actually solved it
    let testCube = cube.clone();
    solution.forEach((m) => (testCube = testCube.multiply(MOVES[m])));
    if (!solver.isSolvedState(testCube)) {
      console.error(
        `ERROR: Test ${i} failed to fully solve the cube mathematically!`,
      );
      process.exit(1);
    }
  } catch (e) {
    console.error(`ERROR: Test ${i} threw an exception:`, e);
    process.exit(1);
  }
}
console.log("All 20 tests passed flawlessly!");
