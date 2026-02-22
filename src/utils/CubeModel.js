/**
 * Dedicated 3x3x3 Rubik's Cube Model
 *
 * Representation:
 * A collection of 27 Cubie objects, each with position (x, y, z) and face colors.
 * Coordinate System:
 * x: Left (-1) to Right (1)
 * y: Bottom (-1) to Top (1)
 * z: Back (-1) to Front (1)
 *
 * This logical model maintains the state of the cube and handles rotations.
 */

export const COLORS = {
  WHITE: 'white',
  YELLOW: 'yellow',
  ORANGE: 'orange',
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue',
  BLACK: 'black'
};

export const FACES = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  FRONT: 'front',
  BACK: 'back',
};

// Standard Face Colors (Solved State)
const SOLVED_COLORS = {
  [FACES.UP]: COLORS.WHITE,
  [FACES.DOWN]: COLORS.YELLOW,
  [FACES.LEFT]: COLORS.ORANGE,
  [FACES.RIGHT]: COLORS.RED,
  [FACES.FRONT]: COLORS.GREEN,
  [FACES.BACK]: COLORS.BLUE,
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
    this.initColors();
  }

  // Set initial colors based on position in solved state
  initColors() {
    if (this.y === 1) this.faces[FACES.UP] = SOLVED_COLORS[FACES.UP];
    if (this.y === -1) this.faces[FACES.DOWN] = SOLVED_COLORS[FACES.DOWN];
    if (this.x === -1) this.faces[FACES.LEFT] = SOLVED_COLORS[FACES.LEFT];
    if (this.x === 1) this.faces[FACES.RIGHT] = SOLVED_COLORS[FACES.RIGHT];
    if (this.z === 1) this.faces[FACES.FRONT] = SOLVED_COLORS[FACES.FRONT];
    if (this.z === -1) this.faces[FACES.BACK] = SOLVED_COLORS[FACES.BACK];
  }
}

export class CubeModel {
  constructor() {
    this.size = 3;
    this.cubies = [];
    this.init();
  }

  init() {
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

  reset() {
    this.init();
  }

  /**
   * Rotates a layer around an axis.
   * @param {string} axis - 'x', 'y', 'z'
   * @param {number} index - -1 (Left/Bottom/Back), 0 (Middle), 1 (Right/Top/Front)
   * @param {number} direction - 1 (CW), -1 (CCW) relative to axis positive direction
   */
  rotateLayer(axis, index, direction) {
    // Determine the relevant cubies in the slice
    const slice = this.cubies.filter(c => c[axis] === index);

    // Coordinate rotation (Matrix Logic)
    // 90 deg CW rotation formulas:
    // X-Axis: (y, z) -> (-z, y)
    // Y-Axis: (x, z) -> (z, -x)
    // Z-Axis: (x, y) -> (-y, x)
    // Note: direction 1 is usually CCW in math (right hand rule around axis).
    // Let's verify standard:
    // Right Hand Rule with Thumb along Axis: Fingers curl in Positive Rotation direction.
    // X (Right): Curl from Y (Up) to Z (Front). (0,1,0)->(0,0,1).
    // y' = -z, z' = y?
    // Let's check (0,1): y=1, z=0 -> y'=0, z'=1. Correct.

    // So if direction is 1 (Positive/CW around axis):
    // X: y' = -z, z' = y
    // Y: z' = -x, x' = z
    // Z: x' = -y, y' = x

    // If direction is -1: Inverse.

    slice.forEach(cubie => {
      this._rotateCubieCoordinates(cubie, axis, direction);
      this._rotateCubieFaces(cubie, axis, direction);
    });
  }

  _rotateCubieCoordinates(cubie, axis, direction) {
    const { x, y, z } = cubie;

    if (axis === 'x') {
      if (direction === 1) {
        cubie.y = -z;
        cubie.z = y;
      } else {
        cubie.y = z;
        cubie.z = -y;
      }
    } else if (axis === 'y') {
      if (direction === 1) {
        cubie.z = -x;
        cubie.x = z;
      } else {
        cubie.z = x;
        cubie.x = -z;
      }
    } else if (axis === 'z') {
      if (direction === 1) { // CW
        cubie.x = -y;
        cubie.y = x;
      } else { // CCW
        cubie.x = y;
        cubie.y = -x;
      }
    }
  }

  _rotateCubieFaces(cubie, axis, direction) {
    // When a cubie rotates, its faces move to new positions.
    // We swap the COLORS on the faces.
    // Example: Rotate X (Roll Forward). Up Face becomes Front Face.
    // So new Front Color = old Up Color.
    // cubie.faces[FRONT] = old_faces[UP]

    const f = { ...cubie.faces };

    if (axis === 'x') {
      if (direction === 1) { // Up -> Front -> Down -> Back -> Up
        cubie.faces[FACES.FRONT] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.FRONT];
        cubie.faces[FACES.BACK] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.BACK];
        // Left/Right unchanged in position, but might rotate? No, faces are solid colors.
      } else { // Up -> Back -> Down -> Front -> Up
        cubie.faces[FACES.BACK] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.BACK];
        cubie.faces[FACES.FRONT] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.FRONT];
      }
    } else if (axis === 'y') {
      if (direction === 1) { // Front -> Right -> Back -> Left -> Front
        cubie.faces[FACES.RIGHT] = f[FACES.FRONT];
        cubie.faces[FACES.BACK] = f[FACES.RIGHT];
        cubie.faces[FACES.LEFT] = f[FACES.BACK];
        cubie.faces[FACES.FRONT] = f[FACES.LEFT];
      } else { // Front -> Left -> Back -> Right -> Front
        cubie.faces[FACES.LEFT] = f[FACES.FRONT];
        cubie.faces[FACES.BACK] = f[FACES.LEFT];
        cubie.faces[FACES.RIGHT] = f[FACES.BACK];
        cubie.faces[FACES.FRONT] = f[FACES.RIGHT];
      }
    } else if (axis === 'z') {
      if (direction === 1) { // Up -> Right -> Down -> Left -> Up (CW)
        cubie.faces[FACES.RIGHT] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.RIGHT];
        cubie.faces[FACES.LEFT] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.LEFT];
      } else { // Up -> Left -> Down -> Right -> Up (CCW)
        cubie.faces[FACES.LEFT] = f[FACES.UP];
        cubie.faces[FACES.DOWN] = f[FACES.LEFT];
        cubie.faces[FACES.RIGHT] = f[FACES.DOWN];
        cubie.faces[FACES.UP] = f[FACES.RIGHT];
      }
    }
  }

  toCubies() {
    // Return copy of state for rendering
    // CubeCSS expects array of objects with x, y, z, faces
    return this.cubies.map(c => ({
      id: c.id,
      x: c.x,
      y: c.y,
      z: c.z,
      faces: { ...c.faces }
    }));
  }

  /**
   * Applies a standard Rubik's Cube move
   * @param {string} move - e.g. "U", "R'", "F2"
   */
  applyMove(move) {
    const base = move[0];
    const modifier = move.substring(1);
    let direction = -1; // Standard CW is -1 for U, L, F, B? Let's check.
    // Direction Mapping based on rotateLayer Math:
    // X(1) = CW (Up->Front)
    // Y(1) = CW (Right->Front)
    // Z(1) = CCW (Right->Up)

    // R (CW around X): 1
    // L (CW around -X): -1
    // U (CW around Y): 1
    // D (CW around -Y): -1
    // F (CW around Z): -1 (since Z(1) is CCW)
    // B (CW around -Z): 1 (since Z(1) is CW around -Z)

    switch (base) {
      case 'U': direction = 1; break;
      case 'D': direction = -1; break;
      case 'L': direction = -1; break;
      case 'R': direction = 1; break;
      case 'F': direction = -1; break;
      case 'B': direction = 1; break;
    }

    if (modifier === "'") direction *= -1;
    if (modifier === '2') {
      // 2 moves. Direction doesn't matter for 180, but let's keep it.
      // We will call rotateLayer twice.
    }

    const count = modifier === '2' ? 2 : 1;

    for (let i = 0; i < count; i++) {
      switch (base) {
        case 'U': this.rotateLayer('y', 1, direction); break;
        case 'D': this.rotateLayer('y', -1, direction); break;
        case 'L': this.rotateLayer('x', -1, direction); break;
        case 'R': this.rotateLayer('x', 1, direction); break;
        case 'F': this.rotateLayer('z', 1, direction); break;
        case 'B': this.rotateLayer('z', -1, direction); break;
      }
    }
  }

  // Debug printer for tests
  toString() {
    let out = "Cube State (3x3x3):\n";
    // We can print faces.
    // Order: U, D, F, B, L, R
    const printFace = (face, name) => {
      out += `Face ${name}:\n`;
      // Grid 3x3.
      // U: y=1. x from -1 to 1. z from -1 to 1.
      // Coordinate mapping depends on face.
      // Let's iterate standard grid rows/cols.
      for (let r = 0; r < 3; r++) {
        let rowStr = "";
        for (let c = 0; c < 3; c++) {
          let cubie;
          // Map r,c to x,y,z based on face
          if (face === FACES.UP) { // y=1. r=0->z=-1 (Back), r=2->z=1 (Front). c=0->x=-1 (Left).
            // Standard U face view: Top Left is Back Left (-1, 1, -1).
            // Row 0 (Top of U face) is Back.
            // Row 2 (Bottom of U face) is Front.
            cubie = this.cubies.find(cu => cu.y === 1 && cu.x === (c - 1) && cu.z === (r - 1)); // Wait.
            // Back is z=-1. Front is z=1.
            // Visual Top of U face is Back (z=-1).
            // Visual Bottom of U face is Front (z=1).
            cubie = this.cubies.find(cu => cu.y === 1 && cu.x === (c - 1) && cu.z === (r - 1 - 2 * r)); // Complicated.
            // Let's just find by strict coordinates
            // r=0 -> z=-1. r=1 -> z=0. r=2 -> z=1.
            // c=0 -> x=-1. c=1 -> x=0. c=2 -> x=1.
            cubie = this.cubies.find(cu => cu.y === 1 && cu.x === (c - 1) && cu.z === (r - 1));
          }
          else if (face === FACES.DOWN) cubie = this.cubies.find(cu => cu.y === -1 && cu.x === (c - 1) && cu.z === (1 - r)); // Down View?
          else if (face === FACES.FRONT) cubie = this.cubies.find(cu => cu.z === 1 && cu.x === (c - 1) && cu.y === (1 - r));
          else if (face === FACES.BACK) cubie = this.cubies.find(cu => cu.z === -1 && cu.x === (1 - c) && cu.y === (1 - r));
          else if (face === FACES.LEFT) cubie = this.cubies.find(cu => cu.x === -1 && cu.z === (1 - c) && cu.y === (1 - r)); // Left view z order?
          else if (face === FACES.RIGHT) cubie = this.cubies.find(cu => cu.x === 1 && cu.z === (c - 1) && cu.y === (1 - r));

          if (cubie) {
            rowStr += cubie.faces[face][0].toUpperCase() + " ";
          } else {
            rowStr += "? ";
          }
        }
        out += rowStr + "\n";
      }
      out += "\n";
    };

    printFace(FACES.UP, 'U');
    printFace(FACES.DOWN, 'D');
    printFace(FACES.FRONT, 'F');
    printFace(FACES.BACK, 'B');
    printFace(FACES.LEFT, 'L');
    printFace(FACES.RIGHT, 'R');
    return out;
  }
  scramble(n = 20) {
    const axes = ['x', 'y', 'z'];
    const indices = [-1, 1]; // Usually rotate outer layers for scramble
    // Actually, scrambling usually involves random face moves (U, D, L, R, F, B)
    // U: y=1, dir -1 (Standard CW)
    // D: y=-1, dir 1
    // L: x=-1, dir -1
    // R: x=1, dir 1
    // F: z=1, dir 1
    // B: z=-1, dir -1

    // We can just generate random rotateLayer calls

    for (let i = 0; i < n; i++) {
      const axis = axes[Math.floor(Math.random() * axes.length)];
      // Allow middle layer? Standard Scramble usually doesnt.
      const index = indices[Math.floor(Math.random() * indices.length)];
      const dir = Math.random() > 0.5 ? 1 : -1;
      this.rotateLayer(axis, index, dir);
    }
  }
}
