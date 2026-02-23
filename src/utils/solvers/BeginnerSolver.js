import { DeepCube, MOVES } from "../DeepCube.js";

export class BeginnerSolver {
  constructor(cube) {
    this.cube = cube.clone();
    this.solution = [];
  }

  apply(moveStr) {
    if (!moveStr) return;
    const moveArr = moveStr.split(" ").filter((m) => m);
    for (const m of moveArr) {
      if (!MOVES[m]) throw new Error(`Invalid move: ${m}`);
      this.solution.push(m);
      this.cube = this.cube.multiply(MOVES[m]);
    }
  }

  solve() {
    this.solution = [];
    if (this.isSolvedState(this.cube)) return [];

    console.log("Starting Cross");
    this.solveCross();
    console.log("Starting F2L Corners");
    this.solveF2LCorners();
    console.log("Starting F2L Edges");
    this.solveF2LEdges();
    console.log("Starting Yellow Cross");
    this.solveYellowCross();
    console.log("Starting Yellow OLL");
    this.orientYellowCorners();
    console.log("Starting Yellow PLL");
    this.permuteYellowCorners();
    this.permuteYellowEdges();
    this.alignUFace();

    this.optimizeSolution();
    return this.solution;
  }

  isSolvedState(state) {
    for (let i = 0; i < 8; i++)
      if (state.cp[i] !== i || state.co[i] !== 0) return false;
    for (let i = 0; i < 12; i++)
      if (state.ep[i] !== i || state.eo[i] !== 0) return false;
    return true;
  }

  testAlg(algStr, targetId, isCorner) {
    let temp = this.cube;
    const arr = algStr.split(" ").filter((m) => m);
    for (const m of arr) temp = temp.multiply(MOVES[m]);
    if (isCorner) {
      return temp.cp[targetId] === targetId && temp.co[targetId] === 0;
    } else {
      return temp.ep[targetId] === targetId && temp.eo[targetId] === 0;
    }
  }

  solveCross() {
    const targets = [
      { id: 5, up: 1, ins: ["F2", "U' R' F R", "U L F' L'"] }, // DF
      { id: 4, up: 0, ins: ["R2", "U' B' R B", "U F R' F'"] }, // DR
      { id: 7, up: 3, ins: ["B2", "U' L' B L", "U R B' R'"] }, // DB
      { id: 6, up: 2, ins: ["L2", "U' F' L F", "U B L' B'"] }, // DL
    ];

    for (let t of targets) {
      let safetyCount = 0;
      while (safetyCount++ < 15) {
        let pos = this.cube.ep.indexOf(t.id);
        if (pos === t.id && this.cube.eo[pos] === 0) break;

        if ([4, 5, 6, 7].includes(pos)) {
          if (pos === 5) this.apply("F2");
          else if (pos === 4) this.apply("R2");
          else if (pos === 7) this.apply("B2");
          else if (pos === 6) this.apply("L2");
        } else if ([8, 9, 10, 11].includes(pos)) {
          if (pos === 8) this.apply("R U R'");
          else if (pos === 9) this.apply("F U F'");
          else if (pos === 10) this.apply("L U L'");
          else if (pos === 11) this.apply("B U B'");
        } else if ([0, 1, 2, 3].includes(pos)) {
          let success = false;
          for (let u = 0; u < 4; u++) {
            for (let alg of t.ins) {
              if (this.testAlg(alg, t.id, false)) {
                this.apply(alg);
                success = true;
                break;
              }
            }
            if (success) break;
            this.apply("U");
          }
          if (success) break;
        }
      }
    }
  }

  solveF2LCorners() {
    const targets = [
      { id: 4, ext: "R U R'", ins: ["R U2 R' U' R U R'", "R U R'", "F' U' F"] },
      { id: 5, ext: "F U F'", ins: ["F U2 F' U' F U F'", "F U F'", "L' U' L"] },
      { id: 6, ext: "L U L'", ins: ["L U2 L' U' L U L'", "L U L'", "B' U' B"] },
      { id: 7, ext: "B U B'", ins: ["B U2 B' U' B U B'", "B U B'", "R' U' R"] },
    ];

    for (let t of targets) {
      let safetyCount = 0;
      while (safetyCount++ < 15) {
        let pos = this.cube.cp.indexOf(t.id);
        if (pos === t.id && this.cube.co[pos] === 0) break;

        if ([4, 5, 6, 7].includes(pos)) {
          if (pos === 4) this.apply("R U R'");
          else if (pos === 5) this.apply("F U F'");
          else if (pos === 6) this.apply("L U L'");
          else if (pos === 7) this.apply("B U B'");
        } else if ([0, 1, 2, 3].includes(pos)) {
          let success = false;
          for (let u = 0; u < 4; u++) {
            for (let alg of t.ins) {
              if (this.testAlg(alg, t.id, true)) {
                this.apply(alg);
                success = true;
                break;
              }
            }
            if (success) break;
            this.apply("U");
          }
          if (success) break;
        }
      }
    }
  }

  solveF2LEdges() {
    const targets = [
      {
        id: 8,
        ext: "R U R'",
        ins: ["U R U' R' U' F' U F", "U' F' U F U R U' R'"],
      },
      {
        id: 9,
        ext: "F U F'",
        ins: ["U' L' U L U F U' F'", "U F U' F' U' L' U L"],
      },
      {
        id: 10,
        ext: "L U L'",
        ins: ["U L U' L' U' B' U B", "U' B' U B U L U' L'"],
      },
      {
        id: 11,
        ext: "B U B'",
        ins: ["U B U' B' U' R' U R", "U' R' U R U B U' B'"],
      },
    ];

    for (let t of targets) {
      let safetyCount = 0;
      while (safetyCount++ < 15) {
        let pos = this.cube.ep.indexOf(t.id);
        if (pos === t.id && this.cube.eo[pos] === 0) break;

        if ([8, 9, 10, 11].includes(pos)) {
          if (pos === 8)
            this.apply("R U R' U' F' U' F"); // Extract standard way
          else if (pos === 9) this.apply("F U F' U' L' U' L");
          else if (pos === 10) this.apply("L U L' U' B' U' B");
          else if (pos === 11) this.apply("B U B' U' R' U' R");
        } else if ([0, 1, 2, 3].includes(pos)) {
          let success = false;
          for (let u = 0; u < 4; u++) {
            for (let alg of t.ins) {
              if (this.testAlg(alg, t.id, false)) {
                this.apply(alg);
                success = true;
                break;
              }
            }
            if (success) break;
            this.apply("U");
          }
          if (success) break;
        }
      }
    }
  }

  solveYellowCross() {
    const getOrientedCount = () =>
      [0, 1, 2, 3].filter((i) => this.cube.eo[i] === 0).length;
    let safetyCount = 0;
    while (getOrientedCount() < 4 && safetyCount++ < 10) {
      const oriented = [0, 1, 2, 3].filter((i) => this.cube.eo[i] === 0);
      if (oriented.length === 0) {
        this.apply("F R U R' U' F'");
      } else if (oriented.length === 2) {
        const [a, b] = oriented;
        if (Math.abs(a - b) === 2 || (a === 0 && b === 3)) {
          // Line or L-shape handling simplified
          let succ = false;
          for (let u = 0; u < 4; u++) {
            let tmp = this.cube.clone();
            let p1 = (temp) => {
              let c = temp.clone();
              "F R U R' U' F'"
                .split(" ")
                .filter((x) => x)
                .forEach((m) => (c = c.multiply(MOVES[m])));
              return c;
            };
            let p2 = (temp) => {
              let c = temp.clone();
              "F U R U' R' F'"
                .split(" ")
                .filter((x) => x)
                .forEach((m) => (c = c.multiply(MOVES[m])));
              return c;
            };
            if ([0, 1, 2, 3].filter((i) => p1(tmp).eo[i] === 0).length === 4) {
              this.apply("F R U R' U' F'");
              succ = true;
              break;
            }
            if ([0, 1, 2, 3].filter((i) => p2(tmp).eo[i] === 0).length === 4) {
              this.apply("F U R U' R' F'");
              succ = true;
              break;
            }
            this.apply("U");
          }
          if (!succ) this.apply("F R U R' U' F'"); // fallback
        } else {
          this.apply("U");
        }
      }
    }
  }

  orientYellowCorners() {
    let safetyCount = 0;
    while (safetyCount++ < 25) {
      if ([0, 1, 2, 3].filter((i) => this.cube.co[i] === 0).length === 4) break;
      if (this.cube.co[0] === 0) this.apply("U");
      else this.apply("R' D' R D R' D' R D");
    }
  }

  permuteYellowCorners() {
    let safetyCount = 0;
    while (safetyCount++ < 15) {
      let c0 = this.cube.cp[0],
        c1 = this.cube.cp[1],
        c2 = this.cube.cp[2],
        c3 = this.cube.cp[3];
      if (
        (c1 - c0 + 4) % 4 === 1 &&
        (c2 - c1 + 4) % 4 === 1 &&
        (c3 - c2 + 4) % 4 === 1
      )
        break;

      let succ = false;
      for (let u = 0; u < 4; u++) {
        for (let alg of [
          "R' F R' B2 R F' R' B2 R2",
          "R B' R F2 R' B R F2 R2",
        ]) {
          let t = this.cube.clone();
          alg.split(" ").forEach((m) => (t = t.multiply(MOVES[m])));
          let tc0 = t.cp[0],
            tc1 = t.cp[1],
            tc2 = t.cp[2],
            tc3 = t.cp[3];
          if (
            (tc1 - tc0 + 4) % 4 === 1 &&
            (tc2 - tc1 + 4) % 4 === 1 &&
            (tc3 - tc2 + 4) % 4 === 1
          ) {
            this.apply(alg);
            succ = true;
            break;
          }
        }
        if (succ) break;
        this.apply("U");
      }
      if (succ) break;
      this.apply("R' F R' B2 R F' R' B2 R2");
    }
  }

  permuteYellowEdges() {
    let s = 0;
    while (this.cube.cp[0] !== 0 && s++ < 5) this.apply("U");

    let safetyCount = 0;
    while (safetyCount++ < 10) {
      if (
        this.cube.ep[0] === 0 &&
        this.cube.ep[1] === 1 &&
        this.cube.ep[2] === 2 &&
        this.cube.ep[3] === 3
      )
        break;

      let succ = false;
      const uMoves = ["", "U ", "U2 ", "U' "];
      const uMovesInv = ["", "U' ", "U2 ", "U "];

      for (let u = 0; u < 4; u++) {
        for (let baseAlg of [
          "R U' R U R U R U' R' U' R2",
          "L' U L' U' L' U' L' U L U L2",
        ]) {
          const fullAlg = uMoves[u] + baseAlg + " " + uMovesInv[u];
          let t = this.cube.clone();
          fullAlg
            .split(" ")
            .filter((x) => x)
            .forEach((m) => (t = t.multiply(MOVES[m])));
          if (
            t.ep[0] === 0 &&
            t.ep[1] === 1 &&
            t.ep[2] === 2 &&
            t.ep[3] === 3
          ) {
            this.apply(fullAlg);
            succ = true;
            break;
          }
        }
        if (succ) break;
      }
      if (succ) break;
      this.apply("R U' R U R U R U' R' U' R2"); // Fallback cycle
    }
  }

  alignUFace() {
    let s = 0;
    while (this.cube.cp[0] !== 0 && s++ < 5) this.apply("U");
  }

  optimizeSolution() {
    let stable = false;
    while (!stable) {
      stable = true;
      for (let i = 0; i < this.solution.length - 1; i++) {
        const a = this.solution[i];
        const b = this.solution[i + 1];
        if (a[0] === b[0]) {
          const val = (m) => (m.includes("'") ? -1 : m.includes("2") ? 2 : 1);
          let sum = (val(a) + val(b)) % 4;
          if (sum < 0) sum += 4;
          this.solution.splice(i, 2);
          if (sum === 1) this.solution.splice(i, 0, a[0]);
          else if (sum === 2) this.solution.splice(i, 0, a[0] + "2");
          else if (sum === 3) this.solution.splice(i, 0, a[0] + "'");
          stable = false;
          break;
        }
      }
    }
  }
}
