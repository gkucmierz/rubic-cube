import Cube from "cubejs";

import { DeepCube, CORNERS, EDGES } from "../DeepCube.js";

export class KociembaSolver {
  static init() {
    Cube.initSolver();
  }
  constructor(cube) {
    this.cube = cube.clone();
  }

  // Convert DeepCube permutation/orientation to Kociemba facelet string
  // Kociemba format: U1..U9 R1..R9 F1..F9 D1..D9 L1..L9 B1..B9
  toFaceletString() {
    // Array of 54 characters representing the 6 faces.
    // 0..8   = U
    // 9..17  = R
    // 18..26 = F
    // 27..35 = D
    // 36..44 = L
    // 45..53 = B

    const f = new Array(54).fill(" ");

    // Centers
    f[4] = "U";
    f[13] = "R";
    f[22] = "F";
    f[31] = "D";
    f[40] = "L";
    f[49] = "B";

    // DeepCube to Kociemba mapping:
    // Corners:
    // 0: URF, 1: UFL, 2: ULB, 3: UBR, 4: DFR, 5: DLF, 6: DBL, 7: DRB
    // Edges:
    // 0: UR, 1: UF, 2: UL, 3: UB, 4: DR, 5: DF, 6: DL, 7: DB, 8: FR, 9: FL, 10: BL, 11: BR

    const cornerColors = [
      ["U", "R", "F"], // 0: URF
      ["U", "F", "L"], // 1: UFL
      ["U", "L", "B"], // 2: ULB
      ["U", "B", "R"], // 3: UBR
      ["D", "F", "R"], // 4: DFR
      ["D", "L", "F"], // 5: DLF
      ["D", "B", "L"], // 6: DBL
      ["D", "R", "B"], // 7: DRB
    ];

    const cornerFacelets = [
      [8, 9, 20], // URF (U9, R1, F3)
      [6, 18, 38], // UFL (U7, F1, L3)
      [0, 36, 47], // ULB (U1, L1, B3)
      [2, 45, 11], // UBR (U3, B1, R3)
      [29, 26, 15], // DFR (D3, F9, R7)
      [27, 44, 24], // DLF (D1, L9, F7)
      [33, 53, 42], // DBL (D7, B9, L7)
      [35, 17, 51], // DRB (D9, R9, B7)
    ];

    for (let i = 0; i < 8; i++) {
      const perm = this.cube.cp[i];
      const ori = this.cube.co[i];

      // The physical piece at position `i` is `perm`.
      // Its colors are cornerColors[perm].
      // Because of orientation, the colors are shifted.
      // If ori=0, U/D color is on U/D face.
      // If ori=1, U/D color is twisted clockwise.
      // If ori=2, U/D color is twisted counter-clockwise.

      const c0 = cornerColors[perm][(0 - ori + 3) % 3];
      const c1 = cornerColors[perm][(1 - ori + 3) % 3];
      const c2 = cornerColors[perm][(2 - ori + 3) % 3];

      f[cornerFacelets[i][0]] = c0;
      f[cornerFacelets[i][1]] = c1;
      f[cornerFacelets[i][2]] = c2;
    }

    const edgeColors = [
      ["U", "R"], // 0: UR
      ["U", "F"], // 1: UF
      ["U", "L"], // 2: UL
      ["U", "B"], // 3: UB
      ["D", "R"], // 4: DR
      ["D", "F"], // 5: DF
      ["D", "L"], // 6: DL
      ["D", "B"], // 7: DB
      ["F", "R"], // 8: FR
      ["F", "L"], // 9: FL
      ["B", "L"], // 10: BL
      ["B", "R"], // 11: BR
    ];

    const edgeFacelets = [
      [5, 10], // UR (U6, R2)
      [7, 19], // UF (U8, F2)
      [3, 37], // UL (U4, L2)
      [1, 46], // UB (U2, B2)
      [32, 16], // DR (D6, R8)
      [28, 25], // DF (D2, F8)
      [30, 43], // DL (D4, L8)
      [34, 52], // DB (D8, B8)
      [23, 12], // FR (F6, R4)
      [21, 41], // FL (F4, L6)
      [50, 39], // BL (B6, L4)
      [48, 14], // BR (B4, R6)
    ];

    for (let i = 0; i < 12; i++) {
      const perm = this.cube.ep[i];
      const ori = this.cube.eo[i];

      const e0 = edgeColors[perm][(0 + ori) % 2];
      const e1 = edgeColors[perm][(1 + ori) % 2];

      f[edgeFacelets[i][0]] = e0;
      f[edgeFacelets[i][1]] = e1;
    }

    return f.join("");
  }

  solve() {
    const faceletStr = this.toFaceletString();
    try {
      const cube = Cube.fromString(faceletStr);
      if (cube.isSolved()) return [];
      const solution = cube.solve();
      if (!solution) return [];
      return solution.split(" ").filter((m) => m);
    } catch (e) {
      throw new Error(
        `Kociemba Solve Failed: ${e.message} \nFacelet: ${faceletStr}`,
      );
    }
  }
}
