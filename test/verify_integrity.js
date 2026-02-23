import { DeepCube, MOVES } from "../src/utils/DeepCube.js";

function runStressTest(iterations) {
  console.log(`Starting DeepCube Stress Test (${iterations} moves)...`);

  let cube = new DeepCube(); // Solved

  const moveNames = Object.keys(MOVES);
  const startTime = Date.now();

  for (let i = 1; i <= iterations; i++) {
    const randomMove = moveNames[Math.floor(Math.random() * moveNames.length)];
    cube = cube.multiply(MOVES[randomMove]);

    if (!cube.isValid()) {
      console.error(`\n❌ INVALID STATE DETECTED AT MOVE ${i}!`);
      console.error(`Move applied: ${randomMove}`);
      console.error(`CP:`, cube.cp);
      console.error(`CO:`, cube.co);
      console.error(`EP:`, cube.ep);
      console.error(`EO:`, cube.eo);
      process.exit(1);
    }

    if (i % 100000 === 0) {
      process.stdout.write(
        `\r✅ ${i} moves verified (${((i / iterations) * 100).toFixed(0)}%)`,
      );
    }
  }

  const duration = Date.now() - startTime;
  console.log(
    `\n🎉 Success! Mathematical integrity held over ${iterations} random moves.`,
  );
  console.log(
    `⏱️  Time taken: ${duration} ms (${(iterations / (duration / 1000)).toFixed(0)} moves/sec)`,
  );
}

runStressTest(1000000);
