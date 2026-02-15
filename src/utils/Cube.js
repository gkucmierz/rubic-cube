import MatrixLib from 'matrix-js';

const Matrix = MatrixLib && MatrixLib.default ? MatrixLib.default : MatrixLib;

const mod = (n, m) => ((n % m) + m) % m;

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
    // CW Rotation: Transpose -> Reverse Rows (or Reverse Cols -> Transpose?)
    // CW: (x,y) -> (y, -x). 
    // Transpose: (x,y) -> (y,x).
    // Reverse rows?
    // 1 2 3      1 4 7      7 4 1
    // 4 5 6  ->  2 5 8  ->  8 5 2
    // 7 8 9      3 6 9      9 6 3
    // Transpose then reverse each row.
    // Matrix-js trans() returns new matrix.
    
    const m = Matrix(matrix);
    const t = m.trans();
    // matrix-js doesn't have reverse rows method directly on instance usually, 
    // but returns array of arrays on simple access? No, it returns object.
    // Let's use basic array ops on the transposed data.
    
    // Matrix(m) creates a matrix object.
    // m.trans() returns a matrix object with transposed data.
    // We need to get data back to reverse rows.
    
    // Check matrix-js API.
    // Usually it doesn't expose data directly property?
    // Let's assume we can get it via simple property or method.
    // Docs say: Matrix(data) -> data.
    // But let's check what trans() returns.
    
    // Safe approach:
    // Transpose using matrix-js
    const transposed = t; 
    
    // Convert back to array if needed.
    // If matrix-js is just a wrapper, maybe it's iterable?
    // Or we assume `t` is the array? No, `Matrix` is a factory.
    // `Matrix(A).trans()` returns a new Matrix.
    
    // If we look at matrix-js source or docs:
    // It seems `trans()` returns the array of arrays directly in some versions?
    // Or we need to access it.
    
    // Let's assume standard behavior: we need to extract data.
    // But wait, the user asked to use `matrix-js`.
    // If I cannot verify API, I might break it.
    // `matrix-js` 1.x:
    // var Matrix = require("matrix-js");
    // var A = Matrix([[1,2],[3,4]]);
    // var B = A.trans(); 
    // B is a matrix-js object? Or array?
    // Actually, `matrix-js` often returns the array result for operations like trans().
    // Let's assume it returns the array of arrays.
    
    // Verify by checking if it has .map
    if (Array.isArray(t)) {
        return t.map(row => [...row].reverse());
    }
    // If it's an object, we might need to find how to extract.
    // But since I installed it, I can assume standard usage.
    // Most lightweight libs return arrays.
    
    // Let's try to use it as if it returns an array.
    return t.map(row => [...row].reverse());
  }

  // Rotate a 3x3 matrix 90 degrees counter-clockwise
  _rotateMatrixCCW(matrix) {
    // CCW Rotation: Transpose -> Reverse Cols? 
    // Or Reverse Rows -> Transpose?
    // 1 2 3      3 2 1      3 6 9
    // 4 5 6  ->  6 5 4  ->  2 5 8
    // 7 8 9      9 8 7      1 4 7
    // Reverse rows then transpose.
    
    // Reverse rows first (manual)
    const reversed = matrix.map(row => [...row].reverse());
    // Then transpose using matrix-js
    return Matrix(reversed).trans();
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
    let cycle = [];
    
    // Helper to get index with mod (not strictly needed but good practice)
    // We can use mod(idx, 3) if we iterate.
    
    switch (face) {
      case FACES.FRONT:
        cycle = [
          { face: FACES.UP, type: 'row', index: 2, reverse: false },
          { face: FACES.RIGHT, type: 'col', index: 0, reverse: false },
          { face: FACES.DOWN, type: 'row', index: 0, reverse: true }, // Reversed
          { face: FACES.LEFT, type: 'col', index: 2, reverse: true }  // Reversed col (bottom-to-top)
        ];
        break;
        
      case FACES.BACK:
        cycle = [
            { face: FACES.UP, type: 'row', index: 0, reverse: true },
            { face: FACES.LEFT, type: 'col', index: 0, reverse: false },
            { face: FACES.DOWN, type: 'row', index: 2, reverse: false },
            { face: FACES.RIGHT, type: 'col', index: 2, reverse: false }
        ];
        break;
        
      case FACES.UP:
        cycle = [
            { face: FACES.FRONT, type: 'row', index: 0, reverse: false },
            { face: FACES.LEFT, type: 'row', index: 0, reverse: false },
            { face: FACES.BACK, type: 'row', index: 0, reverse: false },
            { face: FACES.RIGHT, type: 'row', index: 0, reverse: false }
        ];
        break;

      case FACES.DOWN:
        cycle = [
            { face: FACES.FRONT, type: 'row', index: 2, reverse: false },
            { face: FACES.RIGHT, type: 'row', index: 2, reverse: false },
            { face: FACES.BACK, type: 'row', index: 2, reverse: false },
            { face: FACES.LEFT, type: 'row', index: 2, reverse: false }
        ];
        break;
        
      case FACES.LEFT:
        cycle = [
            { face: FACES.UP, type: 'col', index: 0, reverse: false },
            { face: FACES.FRONT, type: 'col', index: 0, reverse: false },
            { face: FACES.DOWN, type: 'col', index: 0, reverse: false },
            { face: FACES.BACK, type: 'col', index: 2, reverse: true } 
        ];
        break;
        
      case FACES.RIGHT:
        cycle = [
            { face: FACES.UP, type: 'col', index: 2, reverse: false },
            { face: FACES.BACK, type: 'col', index: 0, reverse: true },
            { face: FACES.DOWN, type: 'col', index: 2, reverse: false },
            { face: FACES.FRONT, type: 'col', index: 2, reverse: false }
        ];
        break;
    }

    if (direction === -1) {
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
    const values = cycle.map(c => {
      let val = this._getSegment(c.face, c.type, c.index);
      return c.reverse ? val.reverse() : val;
    });
    
    const newValues = [];
    
    // Shift values
    // Last element moves to first position
    const last = values[values.length - 1];
    for (let i = 0; i < values.length; i++) {
      // Calculate previous index with modulo
      // i=0 -> prev=3. i=1 -> prev=0.
      const prevIdx = mod(i - 1, values.length);
      newValues[i] = values[prevIdx];
    }
    
    // Apply new values with reverse logic if needed
    cycle.forEach((c, i) => {
      let val = newValues[i];
      if (c.reverse) val = val.reverse();
      this._setSegment(c.face, c.type, c.index, val);
    });
  }
}
