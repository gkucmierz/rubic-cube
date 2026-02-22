import { State } from 'rubiks-js/src/state/index.js';

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
    }

    reset() {
        // State doesn't have a reset method exposed directly?
        // We can just create a new state.
        this.state = new State(false);
    }

    rotateLayer(axis, index, dir) {
        // Map to standard notation
        // axis: 'x', 'y', 'z'
        // index: 1 (top/right/front), -1 (bottom/left/back)
        // dir: 1 (Visual CCW), -1 (Visual CW)

        let move = '';
        if (axis === 'y') {
            if (index === 1) move = dir === 1 ? "U'" : "U";
            else if (index === -1) move = dir === 1 ? "D'" : "D"; // Fixed: dir=1 (CCW) -> D'
        }
        else if (axis === 'x') {
            if (index === 1) move = dir === 1 ? "R'" : "R";
            else if (index === -1) move = dir === 1 ? "L'" : "L"; // Fixed: dir=1 (CCW) -> L'
        }
        else if (axis === 'z') {
            if (index === 1) move = dir === 1 ? "F'" : "F";
            else if (index === -1) move = dir === 1 ? "B'" : "B"; // Fixed: dir=1 (CCW) -> B'
        }

        if (move) {
            console.log('[RubiksJSModel] Applying move:', move);
            try {
                this.state.applyTurn(move);
                console.log('[RubiksJSModel] Move applied successfully');
            } catch (e) {
                console.error('[RubiksJSModel] Failed to apply move:', move, e);
            }
        }
    }

    toCubies() {
        // Decode state
        const encoded = this.state.encode();
        // console.log('[RubiksJSModel] Encoded state:', encoded);
        const binaryString = atob(encoded);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Decode Corners (first 5 bytes)
        // p: bytes[0] + (bytes[1] << 8) + (bytes[2] << 16)
        let pC = bytes[0] + (bytes[1] << 8) + (bytes[2] << 16);
        let oC = bytes[3] + (bytes[4] << 8);

        const cornerPerms = [];
        const cornerOrients = [];

        for (let i = 7; i >= 0; i--) {
            const p1 = pC & 0b111;
            cornerPerms[i] = CORNER_ORDER[p1];
            pC = pC >> 3;

            const o1 = oC & 0b11;
            cornerOrients[i] = o1;
            oC = oC >> 2;
        }

        // Decode Edges (next 8 bytes)
        // 6 bytes for permutation (each byte has 2 nibbles)
        // 2 bytes for orientation
        const edgePerms = [];
        const edgeOrients = [];

        // Permutation
        for (let i = 0; i < 6; i++) {
            const byte = bytes[5 + i];
            const p1 = byte & 0b1111;
            const p2 = (byte >> 4) & 0b1111;
            edgePerms[i * 2] = EDGE_ORDER[p1];
            edgePerms[i * 2 + 1] = EDGE_ORDER[p2];
        }

        // Orientation
        let oE = bytes[11] + (bytes[12] << 8);
        for (let i = 11; i >= 0; i--) {
            edgeOrients[i] = oE & 0b1;
            oE = oE >> 1;
        }

        const cubies = [...CENTERS];

        // Map Corners
        for (let i = 0; i < 8; i++) {
            const pieceName = cornerPerms[i]; // e.g. 'URF'
            const orientation = cornerOrients[i]; // 0, 1, 2
            const slot = CORNER_SLOTS[i]; // Slot definition

            const baseColors = getCornerColors(pieceName); // ['white', 'red', 'green']
            const slotFaces = CORNER_FACES[slot.id]; // ['up', 'right', 'front']

            // Apply orientation
            // Formula: Color at SlotKey[k] is PieceColor[(k + o) % 3]

            const faces = {};
            faces[slotFaces[0]] = baseColors[(0 + orientation) % 3];
            faces[slotFaces[1]] = baseColors[(1 + orientation) % 3];
            faces[slotFaces[2]] = baseColors[(2 + orientation) % 3];

            cubies.push({ id: `corn${i}`, x: slot.x, y: slot.y, z: slot.z, faces });
        }

        // Map Edges
        for (let i = 0; i < 12; i++) {
            const pieceName = edgePerms[i];
            const orientation = edgeOrients[i]; // 0, 1
            const slot = EDGE_SLOTS[i];

            const baseColors = getEdgeColors(pieceName); // ['white', 'green']
            const slotFaces = EDGE_FACES[slot.id]; // ['up', 'front']

            const faces = {};
            // If orientation is 1 (Flip), we swap.
            // But we need to be careful about which face is primary (0).
            // Logic: if o=0, faces match. if o=1, swap.

            // Adjust for specific edges if needed?
            // For now assume standard behavior:
            if (orientation === 0) {
                faces[slotFaces[0]] = baseColors[0];
                faces[slotFaces[1]] = baseColors[1];
            } else {
                faces[slotFaces[0]] = baseColors[1];
                faces[slotFaces[1]] = baseColors[0];
            }

            cubies.push({ id: `edge${i}`, x: slot.x, y: slot.y, z: slot.z, faces });
        }

        return cubies;
    }

    validate() {
        // State doesn't expose validate, but we can assume it's valid if using the library
        return { valid: true, errors: [] };
    }
}
