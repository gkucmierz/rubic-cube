// Corner indices
export const CORNERS = {
  URF: 0,
  UFL: 1,
  ULB: 2,
  UBR: 3,
  DFR: 4,
  DLF: 5,
  DBL: 6,
  DRB: 7,
};

// Edge indices
export const EDGES = {
  UR: 0,
  UF: 1,
  UL: 2,
  UB: 3,
  DR: 4,
  DF: 5,
  DL: 6,
  DB: 7,
  FR: 8,
  FL: 9,
  BL: 10,
  BR: 11,
};

export class DeepCube {
  constructor(cp, co, ep, eo) {
    if (cp && co && ep && eo) {
      this.cp = [...cp];
      this.co = [...co];
      this.ep = [...ep];
      this.eo = [...eo];
    } else {
      // Solved identity state
      this.cp = [0, 1, 2, 3, 4, 5, 6, 7];
      this.co = [0, 0, 0, 0, 0, 0, 0, 0];
      this.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      this.eo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }

  // Multiply (apply) another cube state to this one.
  multiply(b) {
    const cp = new Array(8);
    const co = new Array(8);
    const ep = new Array(12);
    const eo = new Array(12);

    // Corners
    for (let i = 0; i < 8; i++) {
      cp[i] = this.cp[b.cp[i]];
      co[i] = (this.co[b.cp[i]] + b.co[i]) % 3;
    }

    // Edges
    for (let i = 0; i < 12; i++) {
      ep[i] = this.ep[b.ep[i]];
      eo[i] = (this.eo[b.ep[i]] + b.eo[i]) % 2;
    }

    return new DeepCube(cp, co, ep, eo);
  }

  clone() {
    return new DeepCube(this.cp, this.co, this.ep, this.eo);
  }

  // Checks if the mathematical state is solvable/possible
  isValid() {
    // 1. Edge parity must equal corner parity
    let edgeParity = 0;
    for (let i = 11; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        if (this.ep[j] > this.ep[i]) edgeParity++;
      }
    }

    let cornerParity = 0;
    for (let i = 7; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        if (this.cp[j] > this.cp[i]) cornerParity++;
      }
    }
    if (edgeParity % 2 !== cornerParity % 2) return false;

    // 2. Edge orientations must sum to even
    let eoSum = this.eo.reduce((a, b) => a + b, 0);
    if (eoSum % 2 !== 0) return false;

    // 3. Corner orientations must be divisible by 3
    let coSum = this.co.reduce((a, b) => a + b, 0);
    if (coSum % 3 !== 0) return false;

    return true;
  }

  isSolved() {
    // Check if permutations are identity and orientations are zero
    for (let i = 0; i < 8; i++) {
      if (this.cp[i] !== i || this.co[i] !== 0) return false;
    }
    for (let i = 0; i < 12; i++) {
      if (this.ep[i] !== i || this.eo[i] !== 0) return false;
    }
    return true;
  }

  static fromCubies(cubies) {
    const c2f = {
      white: "U",
      yellow: "D",
      orange: "L",
      red: "R",
      green: "F",
      blue: "B",
    };

    const getCubie = (x, y, z) =>
      cubies.find((c) => c.x === x && c.y === y && c.z === z);

    const baseC = [
      ["U", "R", "F"],
      ["U", "F", "L"],
      ["U", "L", "B"],
      ["U", "B", "R"],
      ["D", "F", "R"],
      ["D", "L", "F"],
      ["D", "B", "L"],
      ["D", "R", "B"],
    ];

    const slotC = [
      { x: 1, y: 1, z: 1, faces: ["up", "right", "front"] }, // 0: URF
      { x: -1, y: 1, z: 1, faces: ["up", "front", "left"] }, // 1: UFL
      { x: -1, y: 1, z: -1, faces: ["up", "left", "back"] }, // 2: ULB
      { x: 1, y: 1, z: -1, faces: ["up", "back", "right"] }, // 3: UBR
      { x: 1, y: -1, z: 1, faces: ["down", "front", "right"] }, // 4: DFR
      { x: -1, y: -1, z: 1, faces: ["down", "left", "front"] }, // 5: DLF
      { x: -1, y: -1, z: -1, faces: ["down", "back", "left"] }, // 6: DBL
      { x: 1, y: -1, z: -1, faces: ["down", "right", "back"] }, // 7: DRB
    ];

    let cp = [],
      co = [];
    for (let i = 0; i < 8; i++) {
      let slot = slotC[i];
      let c = getCubie(slot.x, slot.y, slot.z);
      let colors = [
        c2f[c.faces[slot.faces[0]]],
        c2f[c.faces[slot.faces[1]]],
        c2f[c.faces[slot.faces[2]]],
      ];
      let perm = baseC.findIndex(
        (bc) =>
          colors.includes(bc[0]) &&
          colors.includes(bc[1]) &&
          colors.includes(bc[2]),
      );
      cp[i] = perm;
      co[i] = colors.indexOf(baseC[perm][0]);
    }

    const baseE = [
      ["U", "R"],
      ["U", "F"],
      ["U", "L"],
      ["U", "B"],
      ["D", "R"],
      ["D", "F"],
      ["D", "L"],
      ["D", "B"],
      ["F", "R"],
      ["F", "L"],
      ["B", "L"],
      ["B", "R"],
    ];

    const slotE = [
      { x: 1, y: 1, z: 0, faces: ["up", "right"] },
      { x: 0, y: 1, z: 1, faces: ["up", "front"] },
      { x: -1, y: 1, z: 0, faces: ["up", "left"] },
      { x: 0, y: 1, z: -1, faces: ["up", "back"] },
      { x: 1, y: -1, z: 0, faces: ["down", "right"] },
      { x: 0, y: -1, z: 1, faces: ["down", "front"] },
      { x: -1, y: -1, z: 0, faces: ["down", "left"] },
      { x: 0, y: -1, z: -1, faces: ["down", "back"] },
      { x: 1, y: 0, z: 1, faces: ["front", "right"] },
      { x: -1, y: 0, z: 1, faces: ["front", "left"] },
      { x: -1, y: 0, z: -1, faces: ["back", "left"] },
      { x: 1, y: 0, z: -1, faces: ["back", "right"] },
    ];

    let ep = [],
      eo = [];
    for (let i = 0; i < 12; i++) {
      let slot = slotE[i];
      let c = getCubie(slot.x, slot.y, slot.z);
      let colors = [c2f[c.faces[slot.faces[0]]], c2f[c.faces[slot.faces[1]]]];
      let perm = baseE.findIndex(
        (be) => colors.includes(be[0]) && colors.includes(be[1]),
      );
      ep[i] = perm;
      eo[i] = colors.indexOf(baseE[perm][0]);
    }

    return new DeepCube(cp, co, ep, eo);
  }
}

// ----------------------------------------------------------------------------
// BASE MOVES DEFINITIONS
// Represents the effect of 90-degree clockwise faces on the solved state.
// ----------------------------------------------------------------------------

export const MOVES = {};

// U (Up Face Clockwise)
MOVES["U"] = new DeepCube(
  [
    CORNERS.UBR,
    CORNERS.URF,
    CORNERS.UFL,
    CORNERS.ULB,
    CORNERS.DFR,
    CORNERS.DLF,
    CORNERS.DBL,
    CORNERS.DRB,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [
    EDGES.UB,
    EDGES.UR,
    EDGES.UF,
    EDGES.UL,
    EDGES.DR,
    EDGES.DF,
    EDGES.DL,
    EDGES.DB,
    EDGES.FR,
    EDGES.FL,
    EDGES.BL,
    EDGES.BR,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
);

// R (Right Face Clockwise)
MOVES["R"] = new DeepCube(
  [
    CORNERS.DFR,
    CORNERS.UFL,
    CORNERS.ULB,
    CORNERS.URF,
    CORNERS.DRB,
    CORNERS.DLF,
    CORNERS.DBL,
    CORNERS.UBR,
  ],
  [2, 0, 0, 1, 1, 0, 0, 2],
  [
    EDGES.FR,
    EDGES.UF,
    EDGES.UL,
    EDGES.UB,
    EDGES.BR,
    EDGES.DF,
    EDGES.DL,
    EDGES.DB,
    EDGES.DR,
    EDGES.FL,
    EDGES.BL,
    EDGES.UR,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
);

// F (Front Face Clockwise)
MOVES["F"] = new DeepCube(
  [
    CORNERS.UFL,
    CORNERS.DLF,
    CORNERS.ULB,
    CORNERS.UBR,
    CORNERS.URF,
    CORNERS.DFR,
    CORNERS.DBL,
    CORNERS.DRB,
  ],
  [1, 2, 0, 0, 2, 1, 0, 0],
  [
    EDGES.UR,
    EDGES.FL,
    EDGES.UL,
    EDGES.UB,
    EDGES.DR,
    EDGES.FR,
    EDGES.DL,
    EDGES.DB,
    EDGES.UF,
    EDGES.DF,
    EDGES.BL,
    EDGES.BR,
  ],
  [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
);

// D (Down Face Clockwise)
MOVES["D"] = new DeepCube(
  [
    CORNERS.URF,
    CORNERS.UFL,
    CORNERS.ULB,
    CORNERS.UBR,
    CORNERS.DLF,
    CORNERS.DBL,
    CORNERS.DRB,
    CORNERS.DFR,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [
    EDGES.UR,
    EDGES.UF,
    EDGES.UL,
    EDGES.UB,
    EDGES.DF,
    EDGES.DL,
    EDGES.DB,
    EDGES.DR,
    EDGES.FR,
    EDGES.FL,
    EDGES.BL,
    EDGES.BR,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
);

// L (Left Face Clockwise)
MOVES["L"] = new DeepCube(
  [
    CORNERS.URF,
    CORNERS.ULB,
    CORNERS.DBL,
    CORNERS.UBR,
    CORNERS.DFR,
    CORNERS.UFL,
    CORNERS.DLF,
    CORNERS.DRB,
  ],
  [0, 1, 2, 0, 0, 2, 1, 0],
  [
    EDGES.UR,
    EDGES.UF,
    EDGES.BL,
    EDGES.UB,
    EDGES.DR,
    EDGES.DF,
    EDGES.FL,
    EDGES.DB,
    EDGES.FR,
    EDGES.UL,
    EDGES.DL,
    EDGES.BR,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
);

// B (Back Face Clockwise)
MOVES["B"] = new DeepCube(
  [
    CORNERS.URF,
    CORNERS.UFL,
    CORNERS.UBR,
    CORNERS.DRB,
    CORNERS.DFR,
    CORNERS.DLF,
    CORNERS.ULB,
    CORNERS.DBL,
  ],
  [0, 0, 1, 2, 0, 0, 2, 1],
  [
    EDGES.UR,
    EDGES.UF,
    EDGES.UL,
    EDGES.BR,
    EDGES.DR,
    EDGES.DF,
    EDGES.DL,
    EDGES.BL,
    EDGES.FR,
    EDGES.FL,
    EDGES.UB,
    EDGES.DB,
  ],
  [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
);

// Generate inverses and 180s
const faces = ["U", "R", "F", "D", "L", "B"];
faces.forEach((f) => {
  const m1 = MOVES[f];
  const m2 = m1.multiply(m1);
  const m3 = m2.multiply(m1);

  MOVES[f + "2"] = m2;
  MOVES[f + "'"] = m3;
});
