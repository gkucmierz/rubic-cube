import { mod } from '@gkucmierz/utils';

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
