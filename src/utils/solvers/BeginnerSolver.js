import { DeepCube, MOVES } from "../DeepCube.js";

export class BeginnerSolver {
  constructor(cube) {
    this.cube = cube.clone();
    this.solution = [];
  }

  apply(moveStr) {
    const moveArr = moveStr.split(" ").filter((m) => m);
    for (const m of moveArr) {
      if (!MOVES[m]) throw new Error(`Invalid move: ${m}`);
      this.solution.push(m);
      this.cube = this.cube.multiply(MOVES[m]);
    }
  }

  solve() {
    this.solution = [];

    // Safety check - is it already solved?
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

    // Optional: align U face
    this.alignUFace();

    // Collapse redundant moves like U U -> U2, R R' -> nothing
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

  // Generalized Depth-Limited Search for localized piece-by-piece goals
  solveGoal(condition, maxDepth, allowedMoves = Object.keys(MOVES)) {
    if (condition(this.cube)) return true;

    const opposing = { U: "D", D: "U", L: "R", R: "L", F: "B", B: "F" };

    const dfs = (node, depth, lastMove) => {
      if (depth === 0) return condition(node) ? [] : null;
      const lastFace = lastMove ? lastMove[0] : null;

      for (let m of allowedMoves) {
        const face = m[0];
        if (face === lastFace) continue;
        if (opposing[face] === lastFace && face > lastFace) continue;

        const nextNode = node.multiply(MOVES[m]);
        if (depth === 1) {
          if (condition(nextNode)) return [m];
        } else {
          const path = dfs(nextNode, depth - 1, m);
          if (path) return [m, ...path];
        }
      }
      return null;
    };

    for (let d = 1; d <= maxDepth; d++) {
      const res = dfs(this.cube, d, "");
      if (res) {
        res.forEach((m) => this.apply(m));
        return true;
      }
    }
    return false;
  }

  solveCross() {
    // White Cross on D face
    // Edge Pieces: DF(5), DR(4), DB(7), DL(6)
    const targets = [5, 4, 7, 6];
    for (let i = 0; i < targets.length; i++) {
      const goal = (state) => {
        for (let j = 0; j <= i; j++) {
          const t = targets[j];
          if (state.ep[t] !== t || state.eo[t] !== 0) return false;
        }
        return true;
      };
      if (!this.solveGoal(goal, 7)) throw new Error("Failed Cross depth 7");
    }
  }

  solveF2LCorners() {
    // DFR(4), DRB(7), DBL(6), DLF(5)
    const corners = [4, 7, 6, 5];
    for (let i = 0; i < corners.length; i++) {
      const goal = (state) => {
        // Must preserve cross
        if (state.ep[5] !== 5 || state.eo[5] !== 0) return false;
        if (state.ep[4] !== 4 || state.eo[4] !== 0) return false;
        if (state.ep[7] !== 7 || state.eo[7] !== 0) return false;
        if (state.ep[6] !== 6 || state.eo[6] !== 0) return false;

        // Must preserve prior corners
        for (let j = 0; j <= i; j++) {
          const c = corners[j];
          if (state.cp[c] !== c || state.co[c] !== 0) return false;
        }
        return true;
      };
      if (!this.solveGoal(goal, 8))
        throw new Error("Failed F2L Corners depth 8");
    }
  }

  solveF2LEdges() {
    // FR(8), BR(11), BL(10), FL(9)
    const edges = [8, 11, 10, 9];
    const allowed = [
      "U",
      "U'",
      "U2",
      "R",
      "R'",
      "R2",
      "F",
      "F'",
      "F2",
      "L",
      "L'",
      "L2",
      "B",
      "B'",
      "B2",
    ]; // Avoid D moves

    for (let i = 0; i < edges.length; i++) {
      const goal = (state) => {
        // Preserve cross
        if (state.ep[5] !== 5 || state.eo[5] !== 0) return false;
        if (state.ep[4] !== 4 || state.eo[4] !== 0) return false;
        if (state.ep[7] !== 7 || state.eo[7] !== 0) return false;
        if (state.ep[6] !== 6 || state.eo[6] !== 0) return false;
        // Preserve all D corners
        if (state.cp[4] !== 4 || state.co[4] !== 0) return false;
        if (state.cp[7] !== 7 || state.co[7] !== 0) return false;
        if (state.cp[6] !== 6 || state.co[6] !== 0) return false;
        if (state.cp[5] !== 5 || state.co[5] !== 0) return false;

        // Preserve prior edges
        for (let j = 0; j <= i; j++) {
          const e = edges[j];
          if (state.ep[e] !== e || state.eo[e] !== 0) return false;
        }
        return true;
      };
      // Depth 10 is needed for inserting edge from bad positions
      if (!this.solveGoal(goal, 10, allowed))
        throw new Error("Failed F2L Edges depth 10");
    }
  }

  // --- BEGIN CFOP LAST LAYER MACROS ---
  solveYellowCross() {
    // Find yellow cross edges: UR(0), UF(1), UL(2), UB(3)
    // They just need orientation eo=0.
    const getOrientedCount = () =>
      [0, 1, 2, 3].filter((i) => this.cube.eo[i] === 0).length;

    let safetyCount = 0;
    while (getOrientedCount() < 4 && safetyCount++ < 10) {
      const oriented = [0, 1, 2, 3].filter((i) => this.cube.eo[i] === 0);

      if (oriented.length === 0) {
        this.apply("F R U R' U' F'");
      } else if (oriented.length === 2) {
        // Line (opposite) or L-shape (adjacent)
        const [a, b] = oriented;
        if (Math.abs(a - b) === 2) {
          // Line geometry (UR and UL, or UF and UB)
          // To apply F R U R' U' F', the line must be horizontal.
          // If line is UR(0) and UL(2), it's horizontal from F perspective.
          if (a === 0 && b === 2) {
            this.apply("F R U R' U' F'");
          } else {
            this.apply("U"); // turn line so it is UR/UL
            this.apply("F R U R' U' F'");
          }
        } else {
          // L-shape geometry
          // Macro: F U R U' R' F' requires L to be at Back and Left (UB=3, UL=2)
          if (oriented.includes(3) && oriented.includes(2)) {
            this.apply("F U R U' R' F'");
          } else {
            this.apply("U");
          }
        }
      }
    }
  }

  orientYellowCorners() {
    // Sune / Antisune to orient yellow corners (co=0)
    // OLL for corners alone using the repetitive beginner algorithm (R' D' R D)
    // Position the unsolved corner at URF (0) and repeat R' D' R D until co[0] === 0

    let safetyCount = 0;
    while (safetyCount++ < 20) {
      let solvedCount = [0, 1, 2, 3].filter(
        (i) => this.cube.co[i] === 0,
      ).length;
      if (solvedCount === 4) break;

      if (this.cube.co[0] === 0) {
        this.apply("U"); // Next
      } else {
        // Apply R' D' R D twice (1 cycle)
        this.apply("R' D' R D R' D' R D");
      }
    }
  }

  permuteYellowCorners() {
    // Beginner method: look for "headlights" (two corners on the same face with the same color targeting that face).
    // Mathematically: two adjacent U corners whose permutation matches their distance.
    // E.g., URF(0) and UBR(3). If their permuted values are also adjacent, they are headlights.

    const hasHeadlightsOnBack = () => {
      // Back corners are ULB(2) and UBR(3)
      // To be headlights on the back, they must belong to the same face in their solved state.
      // Wait, comparing corner colors mathematically:
      // In a solved cube, the U face has 4 corners: 0, 1, 2, 3.
      // The distance between cp[2] and cp[3] modulo 4 should be exactly 1 or 3 (adjacent).
      // Actually, if they are correctly relative to EACH OTHER:
      return (
        (this.cube.cp[2] - this.cube.cp[3] + 4) % 4 === 3 ||
        (this.cube.cp[2] - this.cube.cp[3] + 4) % 4 === 1
      );
    };

    // Simplified: Just keep applying the A-perm (headlight creator) until all 4 corners are relatively solved.
    let safetyCount = 0;
    while (safetyCount++ < 10) {
      // Check if corners are relatively solved (i.e. 0->1->2->3 in order)
      let c0 = this.cube.cp[0],
        c1 = this.cube.cp[1],
        c2 = this.cube.cp[2],
        c3 = this.cube.cp[3];
      if (
        (c1 - c0 + 4) % 4 === 1 &&
        (c2 - c1 + 4) % 4 === 1 &&
        (c3 - c2 + 4) % 4 === 1
      ) {
        break; // All corners are cyclically ordered
      }

      // If Back corners are cyclically ordered (Headlights on Back)
      if ((c2 - c3 + 4) % 4 === 1 || (c3 - c2 + 4) % 4 === 3) {
        // Wait, order must be 3->0->1->2. So ULB(2) should be next after UBR(3).
        // If cp[2] comes immediately after cp[3] cyclically:
        if ((this.cube.cp[2] - this.cube.cp[3] + 4) % 4 === 1) {
          this.apply("R' F R' B2 R F' R' B2 R2");
        } else {
          this.apply("U");
        }
      } else {
        // Find ANY headlights and put them on the back
        if ((c1 - c2 + 4) % 4 === 1) {
          this.apply("U");
          continue;
        }
        if ((c0 - c1 + 4) % 4 === 1) {
          this.apply("U2");
          continue;
        }
        if ((c3 - c0 + 4) % 4 === 1) {
          this.apply("U'");
          continue;
        }

        // No headlights at all (diagonal swap), just apply the alg anywhere
        this.apply("R' F R' B2 R F' R' B2 R2");
      }
    }
  }

  permuteYellowEdges() {
    // Corners are properly ordered now. We just need to align them to the centers first.
    while (this.cube.cp[0] !== 0) {
      this.apply("U");
    }

    // Now corners are 100% solved. Check edges.
    let safetyCount = 0;
    while (safetyCount++ < 10) {
      if (
        this.cube.ep[0] === 0 &&
        this.cube.ep[1] === 1 &&
        this.cube.ep[2] === 2 &&
        this.cube.ep[3] === 3
      ) {
        break; // fully solved!
      }

      // Check if one edge is solved. If so, put it at the BACK (UB=3)
      if (this.cube.ep[3] === 3) {
        // Apply U-perm
        this.apply("R U' R U R U R U' R' U' R2");
      } else if (this.cube.ep[0] === 0) {
        this.apply("U"); // turn whole cube or just U... wait, standard alg rotates U.
        // To keep corners solved but move edges, we'd have to do y rotations.
        // Let's just use the U-perm and see if it solves.
        // If UR(0) is solved, we want it at UB(3). So we do a U move, apply alg, do U'.
        // Wait, applying U moves the corners! We can't do that.
        // Standard solving often uses `y` cube rotations. Since our model only supports face moves,
        // we can use the transposed algorithms.
        // Alg for solved Right(0): F U' F U F U F U' F' U' F2
        this.apply("F U' F U F U F U' F' U' F2");
      } else if (this.cube.ep[1] === 1) {
        this.apply("L U' L U L U L U' L' U' L2");
      } else if (this.cube.ep[2] === 2) {
        this.apply("B U' B U B U B U' B' U' B2");
      } else {
        // No edges solved. Apply U-perm from anywhere.
        this.apply("R U' R U R U R U' R' U' R2");
      }
    }
  }

  alignUFace() {
    while (this.cube.cp[0] !== 0) {
      this.apply("U");
    }
  }

  optimizeSolution() {
    // A quick pass to cancel out redundant moves like U U' -> nothing, U U -> U2, U2 U -> U'
    let stable = false;
    while (!stable) {
      stable = true;
      for (let i = 0; i < this.solution.length - 1; i++) {
        const a = this.solution[i];
        const b = this.solution[i + 1];

        if (a[0] === b[0]) {
          // Same face! Let's sum the rotation.
          const val = (m) => (m.includes("'") ? -1 : m.includes("2") ? 2 : 1);
          let sum = (val(a) + val(b)) % 4;
          if (sum < 0) sum += 4; // normalize to positive

          this.solution.splice(i, 2); // remove both

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
