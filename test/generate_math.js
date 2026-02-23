const C = ["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"];
const E = [
  "UR",
  "UF",
  "UL",
  "UB",
  "DR",
  "DF",
  "DL",
  "DB",
  "FR",
  "FL",
  "BL",
  "BR",
];

// Define physical coordinates for all 6 center stickers
const faces = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

// 8 corners, each with 3 stickers
// URF corner has stickers pointing U, R, F
const cornerStickers = [
  ["U", "R", "F"],
  ["U", "F", "L"],
  ["U", "L", "B"],
  ["U", "B", "R"],
  ["D", "F", "R"],
  ["D", "L", "F"],
  ["D", "B", "L"],
  ["D", "R", "B"],
];

// 12 edges, each with 2 stickers
const edgeStickers = [
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

// Rotate a 3D vector around an axis by 90 deg clockwise looking at the face
function rotate(vec, axis) {
  let [x, y, z] = vec;
  // Holding the face and turning clockwise:
  // U (Y+): Back(-Z) -> Right(+X) -> Front(+Z) -> Left(-X) -> Back(-Z)
  //         So X becomes Z, Z becomes -X
  // Let's test UBR (X=1, Z=-1).
  // Clockwise: UBR(TopRight) -> URF(BottomRight) -> UFL(BottomLeft) -> ULB(TopLeft).
  // UBR (1,-1) -> URF (1,1). We need X'=1, Z'=1 from X=1, Z=-1.
  // Formula for X'=1, Z'=1: X' = -Z, Z' = X.
  // Let's try URF(1,1) -> UFL(-1,1): X' = -1, Z' = 1. matches X'=-Z, Z'=X.
  // So U is [-z, y, x]
  // D (Y-): Looking from bottom: Front(+Z) -> Right(+X) -> Back(-Z) -> Left(-X)
  //         So Front(Z=1) -> Right(X=1). Z'= -X? Yes. X'=Z.
  //         So D is [z, y, -x]
  // R (X+): Up(+Y) -> Back(-Z) -> Down(-Y) -> Front(+Z)
  //         So Up(Y=1) -> Back(Z=-1). Y'= -Z? Yes. Z'=Y.
  //         So R is [x, -z, y]
  // L (X-): Up(+Y) -> Front(+Z) -> Down(-Y) -> Back(-Z)
  //         So Up(Y=1) -> Front(Z=1). Y'= Z. Z'= -Y.
  //         So L is [x, z, -y]
  // F (Z+): Up(+Y) -> Right(+X) -> Down(-Y) -> Left(-X)
  //         So Up(Y=1) -> Right(X=1). X'=Y. Y'=-X.
  //         So F is [y, -x, z]
  // B (Z-): Up(+Y) -> Left(-X) -> Down(-Y) -> Right(+X)
  //         So Up(Y=1) -> Left(X=-1). X'=-Y. Y'=X.
  //         So B is [-y, x, z]

  if (axis === "U") return [-z, y, x];
  if (axis === "D") return [z, y, -x];
  if (axis === "R") return [x, z, -y];
  if (axis === "L") return [x, -z, y];
  if (axis === "F") return [y, -x, z];
  if (axis === "B") return [-y, x, z];
}

// Map a rotated vector back to a face name
function vecToFace(vec) {
  for (let f in faces) {
    if (
      faces[f][0] === vec[0] &&
      faces[f][1] === vec[1] &&
      faces[f][2] === vec[2]
    )
      return f;
  }
}

function generateMove(axis) {
  let cp = [],
    co = [],
    ep = [],
    eo = [];

  // CORNERS
  for (let c = 0; c < 8; c++) {
    if (!cornerStickers[c].includes(axis)) {
      cp[c] = c;
      co[c] = 0;
      continue;
    }

    let pos = [0, 0, 0];
    cornerStickers[c].forEach((f) => {
      pos[0] += faces[f][0];
      pos[1] += faces[f][1];
      pos[2] += faces[f][2];
    });
    let newPos = rotate(pos, axis);

    let targetC = -1;
    for (let i = 0; i < 8; i++) {
      let p2 = [0, 0, 0];
      cornerStickers[i].forEach((f) => {
        p2[0] += faces[f][0];
        p2[1] += faces[f][1];
        p2[2] += faces[f][2];
      });
      if (p2[0] === newPos[0] && p2[1] === newPos[1] && p2[2] === newPos[2])
        targetC = i;
    }

    cp[targetC] = c;

    let rotatedStickers = cornerStickers[c].map((f) =>
      vecToFace(rotate(faces[f], axis)),
    );
    let ori = cornerStickers[targetC].indexOf(rotatedStickers[0]);
    co[targetC] = ori;
  }

  // EDGES
  for (let e = 0; e < 12; e++) {
    if (!edgeStickers[e].includes(axis)) {
      ep[e] = e;
      eo[e] = 0;
      continue;
    }

    let pos = [0, 0, 0];
    edgeStickers[e].forEach((f) => {
      pos[0] += faces[f][0];
      pos[1] += faces[f][1];
      pos[2] += faces[f][2];
    });
    let newPos = rotate(pos, axis);

    let targetE = -1;
    for (let i = 0; i < 12; i++) {
      let p2 = [0, 0, 0];
      edgeStickers[i].forEach((f) => {
        p2[0] += faces[f][0];
        p2[1] += faces[f][1];
        p2[2] += faces[f][2];
      });
      if (p2[0] === newPos[0] && p2[1] === newPos[1] && p2[2] === newPos[2])
        targetE = i;
    }

    ep[targetE] = e;

    let rotatedStickers = edgeStickers[e].map((f) =>
      vecToFace(rotate(faces[f], axis)),
    );
    let primarySticker = rotatedStickers[0];
    let ori = primarySticker === edgeStickers[targetE][0] ? 0 : 1;
    eo[targetE] = ori;
  }

  return { cp, co, ep, eo };
}

const moves = ["U", "R", "F", "D", "L", "B"];
moves.forEach((m) => {
  const res = generateMove(m);
  console.log(`MOVES['${m}'] = new DeepCube(
  [${res.cp.map((e) => `CORNERS.${C[e]}`).join(", ")}],
  [${res.co.join(", ")}],
  [${res.ep.map((e) => `EDGES.${E[e]}`).join(", ")}],
  [${res.eo.join(", ")}]
)`);
});
