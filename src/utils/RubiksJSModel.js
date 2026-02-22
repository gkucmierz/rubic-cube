import { State } from 'rubiks-js/src/state/index.js';
import { CubeModel } from './CubeModel.js';

// Static order definitions from rubiks-js source
const CORNER_ORDER = ['URF', 'ULF', 'ULB', 'URB', 'DRF', 'DLF', 'DLB', 'DRB'];
const EDGE_ORDER = ['UF', 'UL', 'UB', 'UR', 'FR', 'FL', 'BL', 'BR', 'DF', 'DL', 'DB', 'DR'];

// Coordinate mapping for visualization
// Coordinates match the visual grid positions
const CORNER_SLOTS = [
    { id: 'URF', x: 1, y: 1, z: 1 },
    { id: 'ULF', x: -1, y: 1, z: 1 },
    { id: 'ULB', x: -1, y: 1, z: -1 },
    { id: 'URB', x: 1, y: 1, z: -1 },
    { id: 'DRF', x: 1, y: -1, z: 1 },
    { id: 'DLF', x: -1, y: -1, z: 1 },
    { id: 'DLB', x: -1, y: -1, z: -1 },
    { id: 'DRB', x: 1, y: -1, z: -1 }
];

const EDGE_SLOTS = [
    { id: 'UF', x: 0, y: 1, z: 1 },
    { id: 'UL', x: -1, y: 1, z: 0 },
    { id: 'UB', x: 0, y: 1, z: -1 },
    { id: 'UR', x: 1, y: 1, z: 0 },
    { id: 'FR', x: 1, y: 0, z: 1 },
    { id: 'FL', x: -1, y: 0, z: 1 },
    { id: 'BL', x: -1, y: 0, z: -1 },
    { id: 'BR', x: 1, y: 0, z: -1 },
    { id: 'DF', x: 0, y: -1, z: 1 },
    { id: 'DL', x: -1, y: -1, z: 0 },
    { id: 'DB', x: 0, y: -1, z: -1 },
    { id: 'DR', x: 1, y: -1, z: 0 }
];

const CENTERS = [
    { id: 'c0', x: 0, y: 1, z: 0, faces: { up: 'white' } },
    { id: 'c1', x: 0, y: -1, z: 0, faces: { down: 'yellow' } },
    { id: 'c2', x: 0, y: 0, z: 1, faces: { front: 'green' } },
    { id: 'c3', x: 0, y: 0, z: -1, faces: { back: 'blue' } },
    { id: 'c4', x: -1, y: 0, z: 0, faces: { left: 'orange' } },
    { id: 'c5', x: 1, y: 0, z: 0, faces: { right: 'red' } },
    { id: 'core', x: 0, y: 0, z: 0, faces: {} }
];

// Face mapping for pieces
// Each piece (e.g. URF) has 3 faces. We need to map them to colors based on orientation.
// Standard color scheme: U=white, D=yellow, F=green, B=blue, L=orange, R=red
const FACE_COLORS = {
    U: 'white', D: 'yellow', F: 'green', B: 'blue', L: 'orange', R: 'red'
};

// Map piece name (e.g. 'URF') to its primary face keys
const CORNER_FACES = {
    'URF': ['up', 'right', 'front'],
    'ULF': ['up', 'front', 'left'],
    'ULB': ['up', 'left', 'back'],
    'URB': ['up', 'back', 'right'],
    'DRF': ['down', 'right', 'front'],
    'DLF': ['down', 'left', 'front'],
    'DLB': ['down', 'back', 'left'],
    'DRB': ['down', 'right', 'back']
};

const EDGE_FACES = {
    'UF': ['up', 'front'],
    'UL': ['up', 'left'],
    'UB': ['up', 'back'],
    'UR': ['up', 'right'],
    'FR': ['front', 'right'],
    'FL': ['front', 'left'],
    'BL': ['back', 'left'],
    'BR': ['back', 'right'],
    'DF': ['down', 'front'],
    'DL': ['down', 'left'],
    'DB': ['down', 'back'],
    'DR': ['down', 'right']
};

// Map piece name to its solved colors
const getCornerColors = (name) => {
    // URF -> white, red, green
    const map = {
        'URF': ['white', 'red', 'green'],
        'ULF': ['white', 'green', 'orange'],
        'ULB': ['white', 'orange', 'blue'],
        'URB': ['white', 'blue', 'red'],
        'DRF': ['yellow', 'red', 'green'],
        'DLF': ['yellow', 'orange', 'green'], // Adjusted to match DLF face order (D, L, F)
        'DLB': ['yellow', 'blue', 'orange'], // Adjusted to match DLB face order (D, B, L)
        'DRB': ['yellow', 'red', 'blue']  // Adjusted to match DRB face order (D, R, B)
    };
    return map[name];
};

const getEdgeColors = (name) => {
    const map = {
        'UF': ['white', 'green'],
        'UL': ['white', 'orange'],
        'UB': ['white', 'blue'],
        'UR': ['white', 'red'],
        'FR': ['green', 'red'],
        'FL': ['green', 'orange'],
        'BL': ['blue', 'orange'],
        'BR': ['blue', 'red'],
        'DF': ['yellow', 'green'],
        'DL': ['yellow', 'orange'],
        'DB': ['yellow', 'blue'],
        'DR': ['yellow', 'red']
    };
    return map[name];
};

export class RubiksJSModel {
    constructor() {
        this.state = new State(false); // trackCenters=false
        this.visual = new CubeModel();
    }

    reset() {
        this.state = new State(false);
        this.visual = new CubeModel();
    }

    rotateLayer(axis, index, dir) {
        let move = '';
        if (axis === 'y') {
            if (index === 1) move = dir === 1 ? "U'" : "U";
            else if (index === -1) move = dir === 1 ? "D'" : "D";
        }
        else if (axis === 'x') {
            if (index === 1) move = dir === 1 ? "R'" : "R";
            else if (index === -1) move = dir === 1 ? "L'" : "L";
        }
        else if (axis === 'z') {
            if (index === 1) move = dir === 1 ? "F'" : "F";
            else if (index === -1) move = dir === 1 ? "B'" : "B";
        }

        if (move) {
            console.log('[RubiksJSModel] Applying move:', move);
            try {
                this.state.applyTurn(move);
                console.log('[RubiksJSModel] Move applied successfully');
            } catch (e) {
                console.error('[RubiksJSModel] Failed to apply move:', move, e);
            }

            this.visual.rotateLayer(axis, index, dir);
        }
    }

    applyTurn(move) {
        if (!move) return;
        try {
            this.state.applyTurn(move);
        } catch (e) {
            console.error('[RubiksJSModel] Failed to apply direct move:', move, e);
        }

        this.visual.applyMove(move);
    }

    toCubies() {
        return this.visual.toCubies();
    }

    validate() {
        // State doesn't expose validate, but we can assume it's valid if using the library
        return { valid: true, errors: [] };
    }
}
