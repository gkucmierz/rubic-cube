import { DeepCube } from '../src/utils/DeepCube.js';

console.log('🔥 Starting DeepCube Integrity Verification (1,000,000 Moves) 🔥');

const cube = new DeepCube();
const MOVES = ["U", "D", "L", "R", "F", "B", "U'", "D'", "L'", "R'", "F'", "B'", "U2", "D2", "L2", "R2", "F2", "B2"];
const ITERATIONS = 1000000;
const CHECK_INTERVAL = 100000;

const startTime = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
    const move = MOVES[Math.floor(Math.random() * MOVES.length)];
    cube.move(move);

    // Check integrity
    const result = cube.validate();
    if (!result.valid) {
        console.error(`❌ CRITICAL FAILURE at iteration ${i} after move ${move}`);
        console.error(result.errors);
        console.error('State Dump:', {
            cp: cube.cp,
            co: cube.co,
            ep: cube.ep,
            eo: cube.eo
        });
        process.exit(1);
    }

    if ((i + 1) % CHECK_INTERVAL === 0) {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ ${i + 1} moves verified... (Time: ${elapsed}s)`);
    }
}

const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
console.log(`\n🎉 SUCCESS! Verified 1,000,000 moves without logical corruption.`);
console.log(`Total Time: ${totalTime}s`);
console.log(`Moves per second: ${Math.round(ITERATIONS / totalTime)}`);
