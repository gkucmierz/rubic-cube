
// Enum for colors
export const COLORS = {
  WHITE: 'white',
  YELLOW: 'yellow',
  ORANGE: 'orange',
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue',
  BLACK: 'black'
};

// Faces enum
export const FACES = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  FRONT: 'front',
  BACK: 'back',
};

class Cubie {
  constructor(id, x, y, z) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.z = z;
    this.faces = {
      [FACES.UP]: COLORS.BLACK,
      [FACES.DOWN]: COLORS.BLACK,
      [FACES.LEFT]: COLORS.BLACK,
      [FACES.RIGHT]: COLORS.BLACK,
      [FACES.FRONT]: COLORS.BLACK,
      [FACES.BACK]: COLORS.BLACK,
    };

    // Assign initial colors based on position (Solved State)
    if (y === 1) this.faces[FACES.UP] = COLORS.WHITE;
    if (y === -1) this.faces[FACES.DOWN] = COLORS.YELLOW;
    if (x === -1) this.faces[FACES.LEFT] = COLORS.ORANGE;
    if (x === 1) this.faces[FACES.RIGHT] = COLORS.RED;
    if (z === 1) this.faces[FACES.FRONT] = COLORS.GREEN;
    if (z === -1) this.faces[FACES.BACK] = COLORS.BLUE;
  }
}

export class Cube {
  constructor() {
    this.cubies = [];
    this.reset();
  }

  reset() {
    this.cubies = [];
    let id = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          this.cubies.push(new Cubie(id++, x, y, z));
        }
      }
    }
  }

  // Perform a standard move (U, D, L, R, F, B, M, E, S, x, y, z)
  // Modifier: ' (prime) or 2 (double)
  move(moveStr) {
    let move = moveStr[0];
    let modifier = moveStr.length > 1 ? moveStr[1] : '';

    let direction = 1; // CW
    let times = 1;

    if (modifier === "'") {
      direction = -1;
    } else if (modifier === '2') {
      times = 2;
    }

    // Standard Notation Mapping to (axis, index, direction)
    // Note: Direction 1 in rotateLayer is "Positive Axis Rotation".
    // We need to map Standard CW to Axis Direction.

    // U (Up): y=1. Top face CW.
    // Looking from Top (y+), CW is Rotation around Y (-). Wait.
    // Right Hand Rule on Y axis: Thumb up, fingers curl CCW.
    // So Positive Y Rotation is CCW from Top.
    // So U (CW) is Negative Y Rotation.
    // Let's verify _rotateCubiePosition for 'y'.
    // dir > 0 (Pos): nx = z, nz = -x. (z, -x).
    // (1,0) -> (0,-1). Right -> Back.
    // Top View: Right is 3 o'clock. Back is 12 o'clock? No, Back is Up.
    // Top View:
    //      B (z=-1)
    // L(x=-1)     R(x=1)
    //      F (z=1)
    // Right (x=1) -> Back (z=-1).
    // This is CCW.
    // So `direction > 0` (Positive Y) is CCW from Top.
    // Standard U is CW. So U is `direction = -1`.

    // D (Down): y=-1. Bottom face CW.
    // Looking from Bottom (y-), CW.
    // If I look from bottom, Y axis points away.
    // Positive Y is CCW from Top -> CW from Bottom?
    // Let's check.
    // Pos Y: Right -> Back.
    // Bottom View: Right is Right. Back is "Down"?
    // It's confusing.
    // Let's use simple logic: D moves same direction as U' (visually from side?). No.
    // U and D turn "same way" if you hold cube? No, opposite layers turn opposite relative to axis.
    // D (CW) matches Y (Pos) ?
    // Let's check movement of Front face on D.
    // D moves Front -> Right.
    // Y (Pos) moves Front (z=1) -> Right (x=1)?
    // Pos Y: (0, 1) -> (1, 0). z=1 -> x=1.
    // Yes. Front -> Right.
    // So D (CW) = Y (Pos). `direction = 1`.

    // L (Left): x=-1. Left face CW.
    // L moves Front -> Down.
    // X (Pos) moves Front (z=1) -> Up (y=1)?
    // _rotateCubiePosition 'x':
    // dir > 0: ny = -z. z=1 -> y=-1 (Down).
    // So X (Pos) moves Front -> Down.
    // So L (CW) = X (Pos). `direction = 1`.

    // R (Right): x=1. Right face CW.
    // R moves Front -> Up.
    // X (Pos) moves Front -> Down.
    // So R (CW) = X (Neg). `direction = -1`.

    // F (Front): z=1. Front face CW.
    // F moves Up -> Right.
    // Z (Pos) moves Up (y=1) -> Left (x=-1)?
    // _rotateCubiePosition 'z':
    // dir > 0: nx = -y. y=1 -> x=-1 (Left).
    // So Z (Pos) moves Up -> Left.
    // F (CW) moves Up -> Right.
    // So F (CW) = Z (Neg). `direction = -1`.
    // Wait. My `rotateLayer` logic for Z was flipped in previous turn to match Visual.
    // Let's re-read `_rotateCubieFaces` for Z.
    // dir > 0 (CCW in Math/Pos): Left <- Up. Up moves to Left.
    // So Pos Z moves Up to Left.
    // F (CW) needs Up to Right.
    // So F (CW) is Neg Z. `direction = -1`.

    // B (Back): z=-1. Back face CW.
    // B moves Up -> Left.
    // Z (Pos) moves Up -> Left.
    // So B (CW) = Z (Pos). `direction = 1`.

    const layerOps = [];

    switch (move) {
      case 'U': layerOps.push({ axis: 'y', index: 1, dir: -1 }); break;
      case 'D': layerOps.push({ axis: 'y', index: -1, dir: 1 }); break;
      case 'L': layerOps.push({ axis: 'x', index: -1, dir: 1 }); break;
      case 'R': layerOps.push({ axis: 'x', index: 1, dir: -1 }); break;
      case 'F': layerOps.push({ axis: 'z', index: 1, dir: -1 }); break;
      case 'B': layerOps.push({ axis: 'z', index: -1, dir: 1 }); break;

      // Slices
      case 'M': // Middle (between L and R), follows L direction
        layerOps.push({ axis: 'x', index: 0, dir: 1 }); break;
      case 'E': // Equator (between U and D), follows D direction
        layerOps.push({ axis: 'y', index: 0, dir: 1 }); break;
      case 'S': // Standing (between F and B), follows F direction
        layerOps.push({ axis: 'z', index: 0, dir: -1 }); break;

      // Whole Cube Rotations
      case 'x': // Follows R
        layerOps.push({ axis: 'x', index: -1, dir: -1 });
        layerOps.push({ axis: 'x', index: 0, dir: -1 });
        layerOps.push({ axis: 'x', index: 1, dir: -1 });
        break;
      case 'y': // Follows U
        layerOps.push({ axis: 'y', index: -1, dir: -1 });
        layerOps.push({ axis: 'y', index: 0, dir: -1 });
        layerOps.push({ axis: 'y', index: 1, dir: -1 });
        break;
      case 'z': // Follows F
        layerOps.push({ axis: 'z', index: -1, dir: -1 });
        layerOps.push({ axis: 'z', index: 0, dir: -1 });
        layerOps.push({ axis: 'z', index: 1, dir: -1 });
        break;
    }

    // Apply operations
    for (let i = 0; i < times; i++) {
      layerOps.forEach(op => {
        this.rotateLayer(op.axis, op.index, op.dir * direction);
      });
    }
  }

  // Rotate a layer
  // axis: 'x', 'y', 'z'
  // Helper: Rotate a 2D matrix
  // direction: 1 (CW), -1 (CCW)
  _rotateMatrix(matrix, direction) {
    const N = matrix.length;
    // Transpose
    for (let i = 0; i < N; i++) {
      for (let j = i; j < N; j++) {
        [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
      }
    }

    // Reverse Rows (for CW) or Columns (for CCW)
    if (direction > 0) {
      // CW: Reverse each row
      matrix.forEach(row => row.reverse());
    } else {
      // CCW: Reverse columns (or Reverse rows before transpose? No.)
      // Transpose + Reverse Rows = CW.
      // Transpose + Reverse Cols = CCW?
      // Let's check:
      // [1 2] T [1 3] RevCol [3 1] -> CCW?
      // [3 4]   [2 4]        [4 2]
      // 1 (0,0) -> (0,1). (Top-Left -> Top-Right). This is CW.
      // Wait.
      // CW: (x,y) -> (y, -x).
      // (0,0) -> (0, 0).
      // (1,0) -> (0, -1).

      // Let's stick to standard:
      // CW: Transpose -> Reverse Rows.
      // CCW: Reverse Rows -> Transpose.

      // Since I already transposed:
      // To get CCW from Transpose:
      // [1 2] T [1 3]
      // [3 4]   [2 4]
      // Target CCW:
      // [2 4]
      // [1 3]
      // This is reversing columns of Transpose.
      // Or reversing rows of original, then transpose.

      // Since I modify in place and already transposed:
      // I need to reverse columns.
      // Alternatively, re-implement:

      // Undo transpose for CCW case and do correct order?
      // No, let's just reverse columns.
       for (let i = 0; i < N; i++) {
         for (let j = 0; j < N / 2; j++) {
           [matrix[j][i], matrix[N - 1 - j][i]] = [matrix[N - 1 - j][i], matrix[j][i]];
         }
       }
    }
  }

  // index: -1, 0, 1
  // direction: 1 (Positive Axis), -1 (Negative Axis)
  rotateLayer(axis, index, direction) {
    // 1. Select cubies in the layer
    const layerCubies = this.cubies.filter(c => c[axis] === index);

    // 2. Map cubies to 3x3 Matrix based on Axis View
    // We need a consistent mapping from (u, v) -> Matrix[row][col]
    // such that RotateMatrix(CW) corresponds to Physical CW Rotation.

    // Grid coordinates:
    // Row: 0..2, Col: 0..2

    // Mapping function: returns {row, col} for a cubie
    // Inverse function: updates cubie coordinates from {row, col}

    let mapToGrid, updateFromGrid;

    if (axis === 'z') {
      // Front (z=1): X=Right, Y=Up.
      // Matrix: Row 0 is Top (y=1). Col 0 is Left (x=-1).
      mapToGrid = (c) => ({ row: 1 - c.y, col: c.x + 1 });
      updateFromGrid = (c, row, col) => { c.y = 1 - row; c.x = col - 1; };
    } else if (axis === 'x') {
      // Right (x=1): Y=Up, Z=Back?
      // CW Rotation around X (Right face):
      // Up -> Front -> Down -> Back.
      // Matrix: Row 0 is Top (y=1).
      // Col 0 is Front (z=1)?
      // If Col 0 is Front, Col 2 is Back (z=-1).
      // Let's check CW:
      // Top (y=1) -> Front (z=1).
      // Matrix (0, ?) -> (?, 0).
      // (0, 1) [Top-Center] -> (1, 0) [Front-Center].
      // Row 0 -> Col 0. (Transpose).
      // Then Reverse Rows?
      // (0, 1) -> (1, 0).
      // (0, 0) [Top-Front] -> (0, 0) [Front-Top]? No.
      // Top-Front (y=1, z=1).
      // Rot X CW: (y, z) -> (-z, y).
      // (1, 1) -> (-1, 1). (Back-Top).
      // Wait.
      // Rot X CW:
      // Y->Z->-Y->-Z.
      // Up(y=1) -> Front(z=1)? No.
      // Standard Axis Rotation (Right Hand Rule):
      // Thumb +X. Fingers Y -> Z.
      // So Y axis moves towards Z axis.
      // (0, 1, 0) -> (0, 0, 1).
      // Up -> Front.
      // So Top (y=1) moves to Front (z=1).

      // Let's map:
      // Row 0 (Top, y=1). Row 2 (Bottom, y=-1).
      // Col 0 (Front, z=1). Col 2 (Back, z=-1).
      mapToGrid = (c) => ({ row: 1 - c.y, col: 1 - c.z });
      updateFromGrid = (c, row, col) => { c.y = 1 - row; c.z = 1 - col; };
    } else if (axis === 'y') {
      // Up (y=1): Z=Back, X=Right.
      // Rot Y CW:
      // Z -> X.
      // Back (z=-1) -> Right (x=1).
      // Matrix: Row 0 (Back, z=-1). Row 2 (Front, z=1).
      // Col 0 (Left, x=-1). Col 2 (Right, x=1).
      mapToGrid = (c) => ({ row: c.z + 1, col: c.x + 1 });
      updateFromGrid = (c, row, col) => { c.z = row - 1; c.x = col - 1; };
    }

    // 3. Create Matrix
    const matrix = Array(3).fill(null).map(() => Array(3).fill(null));
    layerCubies.forEach(c => {
      const { row, col } = mapToGrid(c);
      matrix[row][col] = c;
    });

    // 4. Rotate Matrix
    // Note: Direction 1 is Physical CW (CCW in Math).
    // Mapping analysis shows that for all axes (X, Y, Z),
    // Physical CW corresponds to Matrix CW.
    // However, rotateLayer receives direction -1 for CW (from move() notation).
    // _rotateMatrix expects direction 1 for CW.
    // So we must invert the direction for all axes.

    const matrixDirection = -direction;
    this._rotateMatrix(matrix, matrixDirection);

    // 5. Update Cubie Coordinates
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cubie = matrix[r][c];
        if (cubie) {
          updateFromGrid(cubie, r, c);
        }
      }
    }

    // 6. Rotate Faces of each cubie
    layerCubies.forEach(cubie => {
      this._rotateCubieFaces(cubie, axis, direction);
    });
  }

  _rotateCubieFaces(cubie, axis, direction) {
    const f = { ...cubie.faces };

    // Helper to swap faces
    // We map: newFace <- oldFace

    // Axis X Rotation (Right/Left)
    // CW (dir > 0): Up -> Front -> Down -> Back -> Up
    if (axis === 'x') {
      if (direction > 0) {
        // Corrected cycle for +X rotation:
        // Up face moves to Front face
        // Front face moves to Down face
        // Down face moves to Back face
        // Back face moves to Up face
        cubie.faces[FACES.FRONT] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.FRONT];
        cubie.faces[FACES.BACK] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.BACK];
      } else {
        // Reverse cycle for -X
        cubie.faces[FACES.UP] = f[FACES.FRONT];
        cubie.faces[FACES.FRONT] = f[FACES.DOWN];
        cubie.faces[FACES.DOWN] = f[FACES.BACK];
        cubie.faces[FACES.BACK] = f[FACES.UP];
      }
    }

    // Axis Y Rotation (Up/Down)
    // CW (dir > 0): Front -> Right -> Back -> Left -> Front
    // Front -> Right, Right -> Back, Back -> Left, Left -> Front
    if (axis === 'y') {
      if (direction > 0) {
        cubie.faces[FACES.RIGHT] = f[FACES.FRONT];
        cubie.faces[FACES.BACK] = f[FACES.RIGHT];
        cubie.faces[FACES.LEFT] = f[FACES.BACK];
        cubie.faces[FACES.FRONT] = f[FACES.LEFT];
      } else {
        cubie.faces[FACES.LEFT] = f[FACES.FRONT];
        cubie.faces[FACES.BACK] = f[FACES.LEFT];
        cubie.faces[FACES.RIGHT] = f[FACES.BACK];
        cubie.faces[FACES.FRONT] = f[FACES.RIGHT];
      }
    }

    // Axis Z Rotation (Front/Back)
    // CW (dir > 0) in Math is CCW visually: Top -> Left -> Bottom -> Right -> Top
    if (axis === 'z') {
      if (direction > 0) {
        // CCW
        cubie.faces[FACES.LEFT] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.LEFT];
        cubie.faces[FACES.RIGHT] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.RIGHT];
      } else {
        // CW
        cubie.faces[FACES.RIGHT] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.RIGHT];
        cubie.faces[FACES.LEFT] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.LEFT];
      }
    }
  }

  // Get current state as standard 6-face matrices (for display/export)
  getState() {
    const state = {
      [FACES.UP]: [[],[],[]],
      [FACES.DOWN]: [[],[],[]],
      [FACES.LEFT]: [[],[],[]],
      [FACES.RIGHT]: [[],[],[]],
      [FACES.FRONT]: [[],[],[]],
      [FACES.BACK]: [[],[],[]]
    };

    this.cubies.forEach(c => {
      // Map x,y,z to matrix indices

      // UP: y=1. row = z (-1->0, 0->1, 1->2)?
      // In `CubeCSS` I reversed this logic to match `Cube.js`.
      // Let's stick to standard visual mapping.
      // UP Face (Top View):
      // Row 0 is Back (z=-1). Row 2 is Front (z=1).
      // Col 0 is Left (x=-1). Col 2 is Right (x=1).
      if (c.y === 1) {
        const row = c.z + 1;
        const col = c.x + 1;
        state[FACES.UP][row][col] = c.faces[FACES.UP];
      }

      // DOWN Face (Bottom View):
      // Usually "unfolded". Top of Down face is Front (z=1).
      // Row 0 is Front (z=1). Row 2 is Back (z=-1).
      // Col 0 is Left (x=-1). Col 2 is Right (x=1).
      if (c.y === -1) {
        const row = 1 - c.z;
        const col = c.x + 1;
        state[FACES.DOWN][row][col] = c.faces[FACES.DOWN];
      }

      // FRONT Face (z=1):
      // Row 0 is Top (y=1). Row 2 is Bottom (y=-1).
      // Col 0 is Left (x=-1). Col 2 is Right (x=1).
      if (c.z === 1) {
        const row = 1 - c.y;
        const col = c.x + 1;
        state[FACES.FRONT][row][col] = c.faces[FACES.FRONT];
      }

      // BACK Face (z=-1):
      // Viewed from Back.
      // Row 0 is Top (y=1).
      // Col 0 is Right (x=1) (Viewer's Left). Col 2 is Left (x=-1).
      if (c.z === -1) {
        const row = 1 - c.y;
        const col = 1 - c.x;
        state[FACES.BACK][row][col] = c.faces[FACES.BACK];
      }

      // LEFT Face (x=-1):
      // Viewed from Left.
      // Row 0 is Top (y=1).
      // Col 0 is Back (z=-1). Col 2 is Front (z=1).
      if (c.x === -1) {
        const row = 1 - c.y;
        const col = c.z + 1;
        state[FACES.LEFT][row][col] = c.faces[FACES.LEFT];
      }

      // RIGHT Face (x=1):
      // Viewed from Right.
      // Row 0 is Top (y=1).
      // Col 0 is Front (z=1). Col 2 is Back (z=-1).
      if (c.x === 1) {
        const row = 1 - c.y;
        const col = 1 - c.z;
        state[FACES.RIGHT][row][col] = c.faces[FACES.RIGHT];
      }
    });

    return state;
  }
}
