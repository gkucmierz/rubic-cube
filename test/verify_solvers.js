import { DeepCube, MOVES } from "../src/utils/DeepCube.js";
import { KociembaSolver } from "../src/utils/solvers/KociembaSolver.js";

function generateScramble(length = 20) {
  const moveNames = Object.keys(MOVES);
  const scramble = [];
  for (let i = 0; i < length; i++) {
    scramble.push(moveNames[Math.floor(Math.random() * moveNames.length)]);
  }
  return scramble;
}

function runSolverTests(iterations) {
  console.log(`Starting KociembaSolver tests (${iterations} scrambles)...`);
  let successCount = 0;
  let totalMoves = 0;

  for (let i = 0; i < iterations; i++) {
    let cube = new DeepCube();
    const scramble = generateScramble(30);
    scramble.forEach((m) => {
      cube = cube.multiply(MOVES[m]);
    });

    const solver = new KociembaSolver(cube);

    try {
      const solution = solver.solve();

      // Apply solution to verify
      let testCube = cube.clone();
      solution.forEach((m) => {
        if (!MOVES[m]) console.error("MISSING MOVE FROM SOLVER:", m);
        testCube = testCube.multiply(MOVES[m]);
      });

      if (testCube.isValid() && isSolvedState(testCube)) {
        successCount++;
        totalMoves += solution.length;
        if (i % 10 === 0) process.stdout.write(`\r✅ ${i} solves complete.`);
      } else {
        console.error(`\n❌ Solver failed validation on scramble ${i}!`);
        console.error(`Scramble: ${scramble.join(" ")}`);
        console.error(`Solution: ${solution.join(" ")}`);
        console.error(`CP:`, testCube.cp);
        console.error(`CO:`, testCube.co);
        console.error(`EP:`, testCube.ep);
        console.error(`EO:`, testCube.eo);
        process.exit(1);
      }
    } catch (e) {
      console.error(`\n❌ Solver threw error on scramble ${i}!`);
      console.error(`Scramble: ${scramble.join(" ")}`);
      console.error(e);
      process.exit(1);
    }
  }

  console.log(
    `\n🎉 Success! KociembaSolver solved ${successCount}/${iterations} cubes optimally.`,
  );
  console.log(
    `📊 Average shortest path: ${(totalMoves / iterations).toFixed(1)} moves.`,
  );
}

function isSolvedState(state) {
  for (let i = 0; i < 8; i++)
    if (state.cp[i] !== i || state.co[i] !== 0) return false;
  for (let i = 0; i < 12; i++)
    if (state.ep[i] !== i || state.eo[i] !== 0) return false;
  return true;
}

runSolverTests(100);
