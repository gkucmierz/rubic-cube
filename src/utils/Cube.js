// Enum for colors/faces
export const COLORS = {
  WHITE: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3,
  GREEN: 4,
  BLUE: 5,
};

// Faces mapping
export const FACES = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  FRONT: 'front',
  BACK: 'back',
};

// Initial state: Solved cube
const INITIAL_STATE = {
  [FACES.UP]: Array(3).fill().map(() => Array(3).fill(COLORS.WHITE)),
  [FACES.DOWN]: Array(3).fill().map(() => Array(3).fill(COLORS.YELLOW)),
  [FACES.LEFT]: Array(3).fill().map(() => Array(3).fill(COLORS.ORANGE)),
  [FACES.RIGHT]: Array(3).fill().map(() => Array(3).fill(COLORS.RED)),
  [FACES.FRONT]: Array(3).fill().map(() => Array(3).fill(COLORS.GREEN)),
  [FACES.BACK]: Array(3).fill().map(() => Array(3).fill(COLORS.BLUE)),
};

export class Cube {
  constructor() {
    this.reset();
  }

  reset() {
    // Deep copy initial state
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  // Rotate a 3x3 matrix 90 degrees clockwise
  _rotateMatrixCW(matrix) {
    const N = matrix.length;
    const result = Array(N).fill().map(() => Array(N).fill(null));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        result[j][N - 1 - i] = matrix[i][j];
      }
    }
    return result;
  }

  // Rotate a 3x3 matrix 90 degrees counter-clockwise
  _rotateMatrixCCW(matrix) {
    const N = matrix.length;
    const result = Array(N).fill().map(() => Array(N).fill(null));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        result[N - 1 - j][i] = matrix[i][j];
      }
    }
    return result;
  }

  // Rotate a face (layer)
  // direction: 1 (CW), -1 (CCW)
  rotate(face, direction = 1) {
    const s = this.state;
    
    // 1. Rotate the face matrix itself
    if (direction === 1) {
      s[face] = this._rotateMatrixCW(s[face]);
    } else {
      s[face] = this._rotateMatrixCCW(s[face]);
    }

    // 2. Rotate adjacent strips
    // We need to define the cycle of adjacent faces and their specific rows/cols.
    // Order is critical. For CW rotation:
    // Front: Up(row2) -> Right(col0) -> Down(row0) -> Left(col2) -> Up...
    // Note: Orientation matters.
    // Up: row2 (bottom row) usually corresponds to Front top row.
    // Right: col0 (left col) corresponds to Front right col.
    // Down: row0 (top row) corresponds to Front bottom row.
    // Left: col2 (right col) corresponds to Front left col.
    
    // Let's implement generic cycle logic.
    // A cycle is an array of 4 segments: { face, type: 'row'|'col', index, reverse: bool }
    
    let cycle = [];
    
    switch (face) {
      case FACES.FRONT:
        cycle = [
          { face: FACES.UP, type: 'row', index: 2 },          // Bottom row of Up
          { face: FACES.RIGHT, type: 'col', index: 0 },       // Left col of Right
          { face: FACES.DOWN, type: 'row', index: 0 }, // Top row of Down (reversed relative to Up in standard net? No, standard is consistent)
          // Wait. Standard net: Up row 2 is adjacent to Front row 0.
          // Right col 0 is adjacent to Front col 2.
          // Down row 0 is adjacent to Front row 2.
          // Left col 2 is adjacent to Front col 0.
          
          // Let's trace a sticker moving CW on Front face (e.g. top-right corner).
          // It moves to bottom-right.
          // An edge piece at Top (Up[2][1]) moves to Right (Right[1][0]).
          // Right[1][0] moves to Bottom (Down[0][1]).
          // Down[0][1] moves to Left (Left[1][2]).
          // Left[1][2] moves to Top (Up[2][1]).
          
          // So the cycle is Up -> Right -> Down -> Left.
          // Up[2] (row) -> Right[col 0] -> Down[0] (row) -> Left[col 2].
          // Direction:
          // Up[2] (left-to-right) maps to Right[col 0] (top-to-bottom)?
          // Up[2][0] (L) -> Right[0][0] (T).
          // Up[2][2] (R) -> Right[2][0] (B).
          // So Up row matches Right col.
          // Right col (top-to-bottom) matches Down row (right-to-left? or left-to-right?)
          // Right[2][0] (B) -> Down[0][2] (R).
          // Right[0][0] (T) -> Down[0][0] (L).
          // So Right col matches Down row REVERSED.
          
          // Let's verify standard notation.
          // F moves U -> R -> D -> L.
          // U[2][0,1,2] -> R[0,1,2][0]
          // R[0,1,2][0] -> D[0][2,1,0] (Reversed)
          // D[0][2,1,0] -> L[2,1,0][2] (Reversed col)
          // L[2,1,0][2] -> U[2][0,1,2]
          
          // To simplify, let's just extract values, shift them, and put them back.
          
          { face: FACES.UP, type: 'row', index: 2, reverse: false },
          { face: FACES.RIGHT, type: 'col', index: 0, reverse: false },
          { face: FACES.DOWN, type: 'row', index: 0, reverse: true }, // Reversed
          { face: FACES.LEFT, type: 'col', index: 2, reverse: true }  // Reversed col (bottom-to-top)
        ]; // Wait, Left col 2 is Right side of Left face.
           // Standard Left face: col 2 is adjacent to Front col 0.
           // So yes.
        break;
        
      case FACES.BACK:
        // Inverse of Front logic essentially, but on the other side.
        // Back is adjacent to Up, Left, Down, Right.
        // Cycle: Up -> Left -> Down -> Right.
        // Up[0] (top row) -> Left[col 0] (left col)
        // Left[col 0] -> Down[2] (bottom row)
        // Down[2] -> Right[col 2] (right col)
        // Right[col 2] -> Up[0]
        
        // Orientation:
        // Up[0][2] (R) -> Left[0][0] (T).
        // Up[0][0] (L) -> Left[2][0] (B).
        // So Up row (reversed) -> Left col (normal).
        // Or Up row (normal) -> Left col (reversed).
        // Let's look at net.
        // Back is "behind".
        // Up[0] is adjacent to Back[0].
        // If we rotate Back CW (looking from back):
        // Up[0] moves to Left[col 0].
        // Up[0][0] (Top-Left of Up) is Back-Left corner.
        // It moves to Left[2][0] (Bottom-Left of Left, which is Back-Bottom corner).
        // So Up[0][0] -> Left[2][0].
        // Up[0][2] -> Left[0][0].
        // So Up row (normal) -> Left col (reversed).
        
        cycle = [
          { face: FACES.UP, type: 'row', index: 0, reverse: false }, // we handle reverse logic in extraction
          { face: FACES.LEFT, type: 'col', index: 0, reverse: false },
          { face: FACES.DOWN, type: 'row', index: 2, reverse: false },
          { face: FACES.RIGHT, type: 'col', index: 2, reverse: false }
        ];
        // Let's re-verify orientations.
        // B CW:
        // U[0][0..2] -> L[2..0][0] (Left col, bottom-to-top)
        // L[2..0][0] -> D[2][0..2] (Bottom row, left-to-right)
        // D[2][0..2] -> R[0..2][2] (Right col, top-to-bottom)
        // R[0..2][2] -> U[0][0..2] (Top row, left-to-right? No, R[0][2] is Top-Right of Right, which is Back-Top corner. U[0][2] is Top-Right of Up, which is Back-Right corner.)
        // Matches.
        
        // So:
        // U[0] -> L[col 0] (Reverse)
        // L[col 0] (Reverse) -> D[2] (Normal)
        // D[2] (Normal) -> R[col 2] (Normal)
        // R[col 2] (Normal) -> U[0] (Normal?? No, R[0][2] -> U[0][0]??)
        // R[0][2] (Top-Right of Right) -> U[0][0] (Top-Left of Up).
        // Yes.
        
        cycle = [
            { face: FACES.UP, type: 'row', index: 0, reverse: true }, // Logic to be applied
            { face: FACES.LEFT, type: 'col', index: 0, reverse: false }, // Wait, if I reverse input, output is reversed?
            { face: FACES.DOWN, type: 'row', index: 2, reverse: false },
            { face: FACES.RIGHT, type: 'col', index: 2, reverse: false }
        ];
        // Wait, cycle definitions are tricky.
        // Let's implement a robust `getSegment` and `setSegment` that handles reversal.
        // And we just define: Segment A moves to Segment B.
        // If Segment A is [1,2,3], Segment B becomes [1,2,3].
        // If the geometric mapping requires [3,2,1], we mark it.
        
        // Back CW:
        // U[0] (0,1,2) -> L[col 0] (2,1,0) (Top-to-bottom? No. U[0][0] is Top-Left. L[col 0][0] is Top-Left.
        // U[0][0] is Back-Left corner.
        // L[col 0][0] is Back-Top corner.
        // L[col 0][2] is Back-Bottom corner.
        // Back CW: Top-Left corner moves to Top-Right? No.
        // Back CW (looking from back) is CCW looking from front.
        // Top-Left (U[0][2] in Front view?) No.
        // U[0][0] is "Back Left".
        // Rotating Back CW: Back-Left moves to Back-Top? No, Back-Left moves to Back-Right (if 180).
        // Back-Left (U[0][0]) moves to Back-Bottom (L[col 0][2]).
        // So U[0][0] -> L[2][0].
        // U[0][1] -> L[1][0].
        // U[0][2] -> L[0][0].
        // So U[0] -> L[col 0] (Reverse).
        
        // L[2][0] -> D[2][2].
        // L[1][0] -> D[2][1].
        // L[0][0] -> D[2][0].
        // So L[col 0] (Reverse) -> D[2] (Reverse).
        // Or simply L[col 0] (Normal 0->2) maps to D[2] (Normal 0->2)?
        // L[0][0] -> D[2][0]. L[2][0] -> D[2][2].
        // Yes, Normal maps to Normal.
        
        // D[2][0] -> R[0][2].
        // D[2][2] -> R[2][2].
        // So D[2] -> R[col 2] (Normal).
        
        // R[0][2] -> U[0][0].
        // R[2][2] -> U[0][2].
        // So R[col 2] -> U[0] (Normal).
        
        // So cycle:
        // U[0] (Reverse) -> L[col 0].
        // L[col 0] -> D[2].
        // D[2] -> R[col 2].
        // R[col 2] -> U[0] (Reverse).
        
        // Let's refine.
        // "A moves to B" means B takes A's values.
        // So L[col 0] takes U[0] (Reversed).
        // D[2] takes L[col 0].
        // R[col 2] takes D[2].
        // U[0] takes R[col 2] (Reversed? No).
        
        // Let's restart Back Cycle.
        // U[0] values: [a, b, c].
        // L[col 0] becomes [c, b, a].
        // D[2] becomes [c, b, a] (from L's new values? No, from L's old values).
        // Let's trace values.
        // U_old -> L_new (Reversed).
        // L_old -> D_new.
        // D_old -> R_new.
        // R_old -> U_new (Reversed).
        
        // So cycle array:
        // { face: UP, ... }, { face: LEFT, ... }, { face: DOWN, ... }, { face: RIGHT, ... }
        // U -> L (Rev), L -> D, D -> R, R -> U (Rev).
        // Wait, if R -> U is Rev, then U_new = R_old (Rev).
        // R_old[0] -> U_new[2]. R_old[2] -> U_new[0].
        // R[0][2] (Back-Top-Right) -> U[0][0] (Back-Top-Left). Yes.
        
        cycle = [
            { face: FACES.UP, type: 'row', index: 0 },
            { face: FACES.LEFT, type: 'col', index: 0 },
            { face: FACES.DOWN, type: 'row', index: 2 },
            { face: FACES.RIGHT, type: 'col', index: 2 }
        ];
        // Modifiers for mapping:
        // U -> L: Reverse.
        // L -> D: Normal.
        // D -> R: Normal.
        // R -> U: Reverse.
        break;
        
      case FACES.UP:
        // Up CW:
        // Back[0] -> Right[0] -> Front[0] -> Left[0] -> Back[0].
        // B[0] (L-to-R) -> R[0] (L-to-R).
        // B[0][0] (Back-Top-Right looking from front? No. Back[0][0] is Top-Right of Back Face (looking from back).
        // In standard net, Back[0][0] is adjacent to Left[0][0]?
        // Standard net:
        //      U
        //    L F R B
        //      D
        // U is adjacent to L, F, R, B.
        // U Top edge (row 0) -> B Top edge (row 0).
        // U Bottom edge (row 2) -> F Top edge (row 0).
        // U Left edge (col 0) -> L Top edge (row 0).
        // U Right edge (col 2) -> R Top edge (row 0).
        
        // Rotation U CW:
        // F[0] -> L[0].
        // L[0] -> B[0].
        // B[0] -> R[0].
        // R[0] -> F[0].
        
        // Orientation:
        // F[0] (L-to-R) -> L[0] (L-to-R).
        // F[0][0] (Front-Top-Left) -> L[0][0] (Left-Top-Left). Yes.
        // So all are normal.
        
        cycle = [
            { face: FACES.FRONT, type: 'row', index: 0 },
            { face: FACES.LEFT, type: 'row', index: 0 },
            { face: FACES.BACK, type: 'row', index: 0 },
            { face: FACES.RIGHT, type: 'row', index: 0 }
        ];
        // All Normal.
        break;

      case FACES.DOWN:
        // Down CW:
        // F[2] -> R[2] -> B[2] -> L[2] -> F[2].
        // F[2][0] (Front-Bottom-Left) -> R[2][0] (Right-Bottom-Left). Yes.
        
        cycle = [
            { face: FACES.FRONT, type: 'row', index: 2 },
            { face: FACES.RIGHT, type: 'row', index: 2 },
            { face: FACES.BACK, type: 'row', index: 2 },
            { face: FACES.LEFT, type: 'row', index: 2 }
        ];
        // All Normal.
        break;
        
      case FACES.LEFT:
        // Left CW:
        // U[col 0] -> F[col 0] -> D[col 0] -> B[col 2] (Reverse) -> U...
        // U[0][0] (Back-Left) -> F[0][0] (Front-Left). Yes.
        // F[0][0] -> D[0][0] (Front-Left). Yes.
        // D[0][0] -> B[2][2] (Back-Left). (D is bottom, B is back).
        // D[2][0] (Back-Left) -> B[0][2] (Back-Left).
        // So D[col 0] (Normal) -> B[col 2] (Reverse).
        // B[col 2] (Reverse) -> U[col 0] (Normal).
        
        cycle = [
            { face: FACES.UP, type: 'col', index: 0 },
            { face: FACES.FRONT, type: 'col', index: 0 },
            { face: FACES.DOWN, type: 'col', index: 0 },
            { face: FACES.BACK, type: 'col', index: 2 } // Reverse mapping logic needed
        ];
        // U -> F: Normal.
        // F -> D: Normal.
        // D -> B: Reverse. (D[0][0] -> B[2][2], D[2][0] -> B[0][2])
        // B -> U: Reverse. (B[2][2] -> U[0][0], B[0][2] -> U[2][0])
        break;
        
      case FACES.RIGHT:
        // Right CW:
        // U[col 2] -> B[col 0] (Reverse) -> D[col 2] -> F[col 2] -> U...
        // U[2][2] (Front-Right) -> B[0][0] (Front-Right? No. B[0][0] is Back-Top-Right).
        // U[2][2] is Top-Right corner of Up. That's Front-Right corner.
        // B[0][0] is Top-Right corner of Back (looking from back). Which is Top-Left looking from front.
        // Wait. Right CW moves Front to Up? No.
        // Right CW moves Front-Right to Top-Right? No.
        // Right CW moves Front-Right to Up-Right? No.
        // Right CW moves Up-Right to Back-Right? No.
        // Right CW moves Up-Right to Back-Left (on the net).
        // U[col 2] -> B[col 0] (Reversed).
        // B[col 0] (Reversed) -> D[col 2].
        // D[col 2] -> F[col 2].
        // F[col 2] -> U[col 2].
        
        cycle = [
            { face: FACES.UP, type: 'col', index: 2 },
            { face: FACES.BACK, type: 'col', index: 0 },
            { face: FACES.DOWN, type: 'col', index: 2 },
            { face: FACES.FRONT, type: 'col', index: 2 }
        ];
        // U -> B: Reverse.
        // B -> D: Reverse.
        // D -> F: Normal.
        // F -> U: Normal.
        break;
    }

    if (direction === -1) {
      // Reverse cycle order
      // A -> B -> C -> D  ==>  D -> C -> B -> A
      // But we also need to invert the mapping logic?
      // A -> B (Normal) becomes B -> A (Normal).
      // A -> B (Reverse) becomes B -> A (Reverse).
      // Yes, reversibility is symmetric.
      cycle.reverse();
    }
    
    this._applyCycle(cycle, direction, face);
  }

  _getSegment(face, type, index) {
    const s = this.state[face];
    if (type === 'row') {
      return [...s[index]];
    } else {
      return s.map(row => row[index]);
    }
  }

  _setSegment(face, type, index, values) {
    const s = this.state[face];
    if (type === 'row') {
      s[index] = [...values];
    } else {
      for (let i = 0; i < 3; i++) {
        s[i][index] = values[i];
      }
    }
  }

  _applyCycle(cycle, direction, faceName) {
    // Cycle is an array of segment definitions.
    // Values move: cycle[0] -> cycle[1] -> cycle[2] -> cycle[3] -> cycle[0].
    
    // We need to handle the specific "Reverse" mappings derived earlier.
    // Since logic is complex, I will implement specific mappings for each face in the switch above?
    // Or use a generalized "transform" property in cycle.
    
    // Let's refine the cycle definition to include `transform` which says how Current maps to Next.
    // transform: 'normal' | 'reverse'.
    
    // Re-deriving transforms for CW:
    // FRONT: U->R (N), R->D (R), D->L (N), L->U (N)?
    // U[2] (L-R) -> R[col 0] (T-B). N.
    // R[col 0] (T-B) -> D[0] (L-R). R[0][0]->D[0][0]? R[0][0] is Top-Left of Right (Front-Top). D[0][0] is Top-Left of Down (Front-Left).
    // R[0][0] should move to D[0][2]?
    // R[0][0] (Front-Top-Right corner) moves to D[0][2] (Front-Bottom-Right corner)?
    // Front CW: Top-Right (U[2][2]) -> Bottom-Right (R[2][0]?)
    // U[2][2] -> R[0][0]? No.
    // U[2][2] is Front-Right corner of Top face.
    // R[0][0] is Top-Left corner of Right face (adjacent to Front-Top-Right).
    // Yes, U[2][2] moves to R[0][0].
    // So U[2] (L-R) -> R[col 0] (T-B).
    // U[2][0] -> R[0][0]? No. U[2][0] is Front-Left. R[0][0] is Front-Right.
    // U[2][0] moves to R[2][0]? No.
    // U[2][0] moves to... Front CW. Front-Top-Left moves to Front-Top-Right.
    // U[2][0] is adjacent to Front-Top-Left.
    // It moves to position adjacent to Front-Top-Right.
    // Which is R[0][0].
    // So U[2][0] -> R[0][0].
    // U[2][2] -> R[2][0].
    // So U[2] (0..2) maps to R[col 0] (0..2). Normal.
    
    // R[col 0] -> D[row 0].
    // R[0][0] (Front-Top-Right) moves to D[0][2] (Front-Bottom-Right).
    // R[2][0] (Front-Bottom-Right) moves to D[0][0] (Front-Bottom-Left).
    // So R[col 0] (0..2) maps to D[row 0] (2..0). REVERSE.
    
    // D[row 0] -> L[col 2].
    // D[0][2] -> L[2][2]?
    // D[0][2] (Front-Bottom-Right) -> L[2][2] (Front-Bottom-Left).
    // D[0][0] (Front-Bottom-Left) -> L[0][2] (Front-Top-Left).
    // So D[row 0] (2..0) maps to L[col 2] (2..0). Normal (relative to reversed input).
    // Or: D[0] (0..2) maps to L[col 2] (0..2)?
    // D[0][0] -> L[0][2].
    // D[0][2] -> L[2][2].
    // So D[row 0] (0..2) maps to L[col 2] (0..2). Normal.
    
    // L[col 2] -> U[row 2].
    // L[0][2] (Front-Top-Left) -> U[2][0] (Front-Top-Left).
    // L[2][2] -> U[2][2].
    // Normal.
    
    // Summary Front CW:
    // U -> R (N)
    // R -> D (R)
    // D -> L (N)
    // L -> U (N)
    // Wait, D -> L logic check:
    // D[0][0] -> L[0][2].
    // D[0][2] -> L[2][2].
    // So D(0..2) -> L(0..2). Normal.
    // But D receives R reversed.
    // So R(0..2) -> D(2..0).
    // D(2..0) is [D[0][2], D[0][1], D[0][0]].
    // These move to L.
    // D[0][2] -> L[2][2].
    // D[0][0] -> L[0][2].
    // So values at D[2..0] move to L[2..0].
    // Matches.
    
    // To implement this generically:
    // We need to define `reverse` for each step.
    
    // Let's hardcode the logic per face to avoid bugs in generic solver.
    
    const values = cycle.map(c => this._getSegment(c.face, c.type, c.index));
    const newValues = [];
    
    if (faceName === FACES.FRONT) {
      if (direction === 1) {
        // U -> R (N), R -> D (R), D -> L (N), L -> U (N)
        // Order in cycle: U, R, D, L.
        // U gets L (N).
        // R gets U (N).
        // D gets R (R).
        // L gets D (N)? No.
        // Check L -> U.
        // L[0][2] -> U[2][0]. L[2][2] -> U[2][2].
        // L(0..2) -> U(0..2). Normal.
        
        // Wait, cycle is A->B->C->D.
        // B gets A.
        // R gets U. (N)
        // D gets R. (R)
        // L gets D. (N)?
        // D[0][0] -> L[0][2]. D[0][2] -> L[2][2].
        // D(0..2) -> L(0..2). Normal.
        // But D holds Reversed R.
        // So R(0..2) -> D(2..0).
        // D(2..0) -> L(2..0).
        // L(2..0) -> U(2..0)?
        // L[2][2] -> U[2][2]. L[0][2] -> U[2][0].
        // Yes.
        
        // So transforms:
        // U -> R: N
        // R -> D: R
        // D -> L: N
        // L -> U: N
        
        newValues[0] = values[3]; // U gets L
        newValues[1] = values[0]; // R gets U
        newValues[2] = values[1].reverse(); // D gets R (Reversed)
        newValues[3] = values[2]; // L gets D
      } else {
        // CCW
        // U gets R.
        // R gets D (R).
        // D gets L.
        // L gets U.
        // Check U <- R.
        // U[2][0] <- R[0][0]? No.
        // U[2][0] (Front-Top-Left) gets R[0][0] (Front-Top-Right)? No.
        // U[2][0] gets L[0][2].
        // U[2][2] gets R[0][0]?
        // U[2][2] moves to L[0][2].
        // So U gets R?
        // U[2][2] gets R[0][0]? No, R[0][0] moves to D[0][2].
        // U[2][2] gets L[2][2]? No.
        
        // CCW is reverse of CW.
        // U -> L -> D -> R -> U.
        // U gets R (from CW logic: L->U. So U->L).
        // Wait.
        // CW: U->R.
        // CCW: R->U.
        // So U gets R.
        // U[2][0] gets R[0][0]?
        // U[2][0] (Left) gets R[0][0] (Right)? No.
        // U[2][0] gets R[?].
        // Front CCW.
        // Top-Left (U[2][0]) moves to Left-Bottom (L[2][2]).
        // Top-Right (U[2][2]) moves to Left-Top (L[0][2]).
        
        // Let's rely on standard: CCW is just inverse of CW.
        // If CW: A->B. CCW: B->A.
        // A_new = B_old.
        // U_new = R_old.
        // Check transform: U -> R was Normal. So R -> U should be Normal?
        // U[2][0] -> R[0][0].
        // So R[0][0] -> U[2][0].
        // R[0][0] (Top) -> U[2][0] (Left).
        // R[2][0] (Bottom) -> U[2][2] (Right).
        // So R(0..2) -> U(0..2). Normal.
        
        // R_new = D_old.
        // R -> D was Reverse. So D -> R should be Reverse.
        // D(0..2) -> R(2..0).
        
        // D_new = L_old.
        // D -> L was Normal.
        
        // L_new = U_old.
        // L -> U was Normal.
        
        newValues[0] = values[1]; // U gets R
        newValues[1] = values[2].reverse(); // R gets D (Reversed)
        newValues[2] = values[3]; // D gets L
        newValues[3] = values[0]; // L gets U
      }
    } else if (faceName === FACES.BACK) {
      if (direction === 1) {
        // CW: U(0) -> L(0) -> D(2) -> R(2) -> U(0)
        // U->L: R
        // L->D: N
        // D->R: N
        // R->U: R
        
        // U gets R (R).
        // L gets U (R).
        // D gets L (N).
        // R gets D (N).
        
        newValues[0] = values[3].reverse(); // U gets R (Rev)
        newValues[1] = values[0].reverse(); // L gets U (Rev)
        newValues[2] = values[1]; // D gets L
        newValues[3] = values[2]; // R gets D
      } else {
        // CCW: U gets L (R). L gets D (N). D gets R (N). R gets U (R).
        // Wait, inverse.
        // U -> L was R. So L -> U is R.
        // So U gets L (R).
        // L -> D was N. So D -> L is N.
        // L gets D (N).
        // D -> R was N.
        // D gets R (N).
        // R -> U was R.
        // R gets U (R).
        
        newValues[0] = values[1].reverse(); // U gets L (Rev)
        newValues[1] = values[2]; // L gets D
        newValues[2] = values[3]; // D gets R
        newValues[3] = values[0].reverse(); // R gets U (Rev)
      }
    } else if (faceName === FACES.UP) {
      if (direction === 1) {
        // F -> L -> B -> R -> F. (All Normal)
        // F gets R.
        // L gets F.
        // B gets L.
        // R gets B.
        newValues[0] = values[3];
        newValues[1] = values[0];
        newValues[2] = values[1];
        newValues[3] = values[2];
      } else {
        // F gets L.
        newValues[0] = values[1];
        newValues[1] = values[2];
        newValues[2] = values[3];
        newValues[3] = values[0];
      }
    } else if (faceName === FACES.DOWN) {
      if (direction === 1) {
        // F -> R -> B -> L -> F. (All Normal)
        // F gets L.
        newValues[0] = values[3];
        newValues[1] = values[0];
        newValues[2] = values[1];
        newValues[3] = values[2];
      } else {
        // F gets R.
        newValues[0] = values[1];
        newValues[1] = values[2];
        newValues[2] = values[3];
        newValues[3] = values[0];
      }
    } else if (faceName === FACES.LEFT) {
      if (direction === 1) {
        // U -> F -> D -> B -> U
        // U->F: N
        // F->D: N
        // D->B: R
        // B->U: R
        
        // U gets B (R)
        // F gets U (N)
        // D gets F (N)
        // B gets D (R)
        
        newValues[0] = values[3].reverse();
        newValues[1] = values[0];
        newValues[2] = values[1];
        newValues[3] = values[2].reverse();
      } else {
        // U gets F (N)
        // F gets D (N)
        // D gets B (R)
        // B gets U (R)
        
        newValues[0] = values[1];
        newValues[1] = values[2];
        newValues[2] = values[3].reverse();
        newValues[3] = values[0].reverse();
      }
    } else if (faceName === FACES.RIGHT) {
      if (direction === 1) {
        // U -> B -> D -> F -> U
        // U->B: R
        // B->D: R
        // D->F: N
        // F->U: N
        
        // U gets F (N)
        // B gets U (R)
        // D gets B (R)
        // F gets D (N)
        
        newValues[0] = values[3];
        newValues[1] = values[0].reverse();
        newValues[2] = values[1].reverse();
        newValues[3] = values[2];
      } else {
        // U gets B (R)
        // B gets D (R)
        // D gets F (N)
        // F gets U (N)
        
        newValues[0] = values[1].reverse();
        newValues[1] = values[2].reverse();
        newValues[2] = values[3];
        newValues[3] = values[0];
      }
    }

    // Apply new values
    cycle.forEach((c, i) => {
      this._setSegment(c.face, c.type, c.index, newValues[i]);
    });
  }
}
