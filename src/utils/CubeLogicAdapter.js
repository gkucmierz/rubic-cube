import { DeepCube, MOVES } from './DeepCube.js';
import { CubeModel } from './CubeModel.js';

export class RubiksJSModel {
  constructor() {
    this.state = new DeepCube();
    this.visual = new CubeModel();
  }

  reset() {
    this.state = new DeepCube();
    this.visual = new CubeModel();
  }

  rotateLayer(axis, index, dir, steps = 1) {
    let move = '';
    if (axis === 'y') {
      if (index === 1) move = dir === 1 ? "U'" : "U";
      else if (index === -1) move = dir === -1 ? "D'" : "D";
    } else if (axis === 'x') {
      if (index === 1) move = dir === 1 ? "R'" : "R";
      else if (index === -1) move = dir === -1 ? "L'" : "L";
    } else if (axis === 'z') {
      if (index === 1) move = dir === 1 ? "F'" : "F";
      else if (index === -1) move = dir === -1 ? "B'" : "B";
    }

    if (move) {
      for (let i = 0; i < steps; i++) {
        try {
          this.state = this.state.multiply(MOVES[move]);
        } catch (e) {
          console.error('[RubiksJSModel] Failed to apply move:', move, e);
        }
        this.visual.rotateLayer(axis, index, dir);
      }
    }
  }

  applyTurn(move) {
    if (!move) return;
    try {
      this.state = this.state.multiply(MOVES[move]);
    } catch (e) {
      console.error('[RubiksJSModel] Failed to apply direct move:', move, e);
    }
    this.visual.applyMove(move);
  }

  rotateSlice(axis, direction, steps = 1) {
    // A middle slice rotation (M, E, S) logically translates to rotating
    // the two intersecting outer layers in the opposite direction, while
    // the centers (the core abstract frame) remain perfectly stationary.
    // The frontend simultaneously handles rotating the camera to complete the illusion.
    this.rotateLayer(axis, 1, -direction, steps);
    this.rotateLayer(axis, -1, -direction, steps);
  }

  toCubies() {
    return this.visual.toCubies();
  }

  validate() {
    const valid = this.state.isValid();
    return { valid, errors: valid ? [] : ['Invalid cube configuration (Parity or Orientation rules violated)'] };
  }
}

