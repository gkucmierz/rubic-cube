/**
 * Deep Mechanical Rubik's Cube Model (Group Theory Approach)
 *
 * State Representation:
 * - Corners (0-7): Permutation (p) and Orientation (o: 0..2)
 * - Edges (0-11): Permutation (p) and Orientation (o: 0..1)
 *
 * Indexes:
 * Corners:
 * 0: URF, 1: UFL, 2: ULB, 3: UBR
 * 4: DFR, 5: DLF, 6: DBL, 7: DRB
 *
 * Edges:
 * 0: UR, 1: UF, 2: UL, 3: UB
 * 4: DR, 5: DF, 6: DL, 7: DB
 * 8: FR, 9: FL, 10: BL, 11: BR
 */

export const MOVES = {
    // Definitions of basic moves: { corners: [indices], edges: [indices], co: [deltas], eo: [deltas] }
    // Only defining Permutation Cycles and Orientation Changes.
    // Permutation: p[i] moves to p[move[i]]? Or position i takes piece from move[i]?
    // Let's use: "Piece at position i moves to position move[i]". (Isomorphism to S_n)

    // Actually, standard array rep: state.p[i] is "which piece is at position i".
    // Move M maps position i to M[i].
    // So new_state.p[M[i]] = old_state.p[i].
    // Or new_state.p[i] = old_state.p[M_inv[i]].

    // Let's stick to: "Move U moves pieces currently at indices ... to indices ..."
    // Corners: URF(0) -> UBR(3) -> ULB(2) -> UFL(1) -> URF(0) ?
    // Move U (Clockwise):
    // 0 (URF) -> 3 (UBR) ? No. U move pushes URF to position UFL?
    // Let's visualize Top Face (U):
    //      B
    //    2   3
    // L  1   0  R
    //      F
    // U (CW) turns: 0->1, 1->2, 2->3, 3->0? No.
    // U (CW) turns: Right to Front.
    // URF(0) is Front-Right. UFL(1) is Front-Left.
    // U moves Right face stuff to Front face? NO.
    // U moves Front face stuff to Left face.
    // So 0 (URF) -> 1 (UFL)? No.
    // URF is at corner of U, R, F faces.
    // After U CW, it goes to corner of U, F, L faces. (UFL).
    // So 0 -> 1.
    // 1 (UFL) -> 2 (ULB).
    // 2 (ULB) -> 3 (UBR).
    // 3 (UBR) -> 0 (URF).
    // So cycle is (0 1 2 3).
    // Permutation Table P: P[0]=1, P[1]=2, P[2]=3, P[3]=0.
    // Applied to state: "Piece at 0 goes to 1".

    // Orientations CO:
    // U moves do not change Corner Orientation (relative to U/D).
    // So co delta is 0 for all.

    // Edges U:
    // 0(UR), 1(UF), 2(UL), 3(UB).
    // U moves UR to UF? No.
    // UR is Right. UF is Front.
    // U CW moves Right to Front? No.
    // U CW moves Front to Left.
    // So UF(1) -> UL(2).
    // UL(2) -> UB(3).
    // UB(3) -> UR(0).
    // UR(0) -> UF(1).
    // Cycle: (0 1 2 3).
    // P[0]=1, etc.

    // Moves Definitions (Target Positions)
    U: {
        cp: [1, 2, 3, 0, 4, 5, 6, 7],
        co: [0, 0, 0, 0, 0, 0, 0, 0],
        ep: [1, 2, 3, 0, 4, 5, 6, 7, 8, 9, 10, 11],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    D: {
        // D (CW) looking from bottom.
        // DFR(4), DLF(5), DBL(6), DRB(7).
        // D CW moves Front to Right.
        // DFR(4) -> DRB(7).
        // DRB(7) -> DBL(6).
        // DBL(6) -> DLF(5).
        // DLF(5) -> DFR(4).
        // Cycle: (4 7 6 5). (Wait: 4->7, 7->6, 6->5, 5->4).
        // Indices: [0,1,2,3, 7,4,5,6] (Wait. 4->7 means P[4]=7? No.
        // P array usually means: P[i] is the location where piece i goes? OR where piece at i comes from?
        // Standard multiplication: (A * B)[i] = A[B[i]].
        // Let's define Move P as "Content of slot i comes from slot P[i]".
        // If 0 goes to 1. Then New[1] = Old[0].
        // So P[1] = 0.
        // In our U example: 0->1. So P[1]=0.
        // Let's verify U array [1,2,3,0...]
        // P[0]=1 (Content of 0 comes from 1?). No.
        // The previous array was [1, 2, 3, 0].
        // If it meant "0 goes to 1", then New[1] = Old[0].
        // Let's stick to: "Piece i goes to Position Move[i]".
        // Implementation: newP[Move[i]] = oldP[i].
        // U: 0->1, 1->2, 2->3, 3->0.
        // Array: [1, 2, 3, 0].
        // This matches "i goes to Move[i]".

        // D: 4->7, 7->6, 6->5, 5->4.
        // P[4]=7, P[5]=4, P[6]=5, P[7]=6.
        cp: [0, 1, 2, 3, 7, 4, 5, 6],
        co: [0, 0, 0, 0, 0, 0, 0, 0],
        // Edges: DR(4), DF(5), DL(6), DB(7).
        // D moves Front to Right.
        // DF(5) -> DR(4).
        // DR(4) -> DB(7).
        // DB(7) -> DL(6).
        // DL(6) -> DF(5).
        // Cycle: 5->4, 4->7, 7->6, 6->5.
        // P[4]=7, P[5]=4, P[6]=5, P[7]=6.
        ep: [0, 1, 2, 3, 7, 4, 5, 6, 8, 9, 10, 11],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    L: {
        // L (CW)
        // Corners: UFL(1), DLF(5), DBL(6), ULB(2).
        // L moves Up to Front.
        // UFL(1) -> DLF(5).
        // DLF(5) -> DBL(6).
        // DBL(6) -> ULB(2).
        // ULB(2) -> UFL(1).
        // Cycle: 1->5, 5->6, 6->2, 2->1.
        // P[1]=5, P[2]=1, P[5]=6, P[6]=2.
        cp: [0, 5, 1, 3, 4, 6, 2, 7],
        // Twist: L/R moves twist corners.
        // UFL(1) moves to DLF. (+1: CW). WHITE U face moves to F face (CW rotation relative to corner axis?).
        // DLF(5) moves to DBL. (-1: CCW).
        // DBL(6) moves to ULB. (+1).
        // ULB(2) moves to UFL. (-1).
        // Values: 1 -> +1, 5 -> -1, 6 -> +1, 2 -> -1.
        co: [0, 1, 2, 0, 0, 2, 1, 0], // 2 is -1 mod 3.

        // Edges: UL(2), FL(9), DL(6), BL(10).
        // U->F.
        // UL(2) -> FL(9).
        // FL(9) -> DL(6).
        // DL(6) -> BL(10).
        // BL(10) -> UL(2).
        // P[2]=9, P[6]=10, P[9]=6, P[10]=2.
        ep: [0, 1, 9, 3, 4, 5, 10, 7, 8, 6, 2, 11],
        // Orientation: L/R do NOT flip edges in standard U/D rep.
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    R: {
        // R (CW)
        // Corners: URF(0), UBR(3), DRB(7), DFR(4).
        // R moves Up to Back.
        // URF(0) -> UBR(3).
        // UBR(3) -> DRB(7).
        // DRB(7) -> DFR(4).
        // DFR(4) -> URF(0).
        // Cycle: 0->3, 3->7, 7->4, 4->0.
        // P[0]=3, P[3]=7, P[4]=0, P[7]=4.
        cp: [3, 1, 2, 7, 0, 5, 6, 4],
        // Twist:
        // URF(0) -> UBR. (-1).
        // UBR(3) -> DRB. (+1).
        // DRB(7) -> DFR. (-1).
        // DFR(4) -> URF. (+1).
        // 0:2, 3:1, 7:2, 4:1.
        co: [2, 0, 0, 1, 1, 0, 0, 2],

        // Edges: UR(0), BR(11), DR(4), FR(8).
        // U->B.
        // UR(0) -> BR(11).
        // BR(11) -> DR(4).
        // DR(4) -> FR(8).
        // FR(8) -> UR(0).
        // P[0]=11, P[4]=8, P[8]=0, P[11]=4.
        ep: [11, 1, 2, 3, 8, 5, 6, 7, 0, 9, 10, 4],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    F: {
        // F (CW)
        // Corners: URF(0), UFL(1), DLF(5), DFR(4).
        // F moves U to R.
        // URF(0) -> DFR(4). (Wait. URF is Top-Right. F turns Top to Right. So URF -> DFR (Bottom-Right)).
        // UFL(1) -> URF(0).
        // DLF(5) -> UFL(1).
        // DFR(4) -> DLF(5).
        // Cycle: 0->4, 4->5, 5->1, 1->0.
        // P[0]=4, P[1]=0, P[4]=5, P[5]=1.
        cp: [4, 0, 2, 3, 5, 1, 6, 7],
        // Twist:
        // UFL(1) -> URF. (+1).
        // URF(0) -> DFR. (-1).
        // DFR(4) -> DLF. (+1).
        // DLF(5) -> UFL. (-1).
        // 0:2, 1:1, 4:1, 5:2.
        co: [2, 1, 0, 0, 1, 2, 0, 0],

        // Edges: UF(1), FR(8), DF(5), FL(9).
        // U->R.
        // UF(1) -> FR(8).
        // FR(8) -> DF(5).
        // DF(5) -> FL(9).
        // FL(9) -> UF(1).
        // P[1]=8, P[5]=9, P[8]=5, P[9]=1.
        ep: [0, 8, 2, 3, 4, 9, 6, 7, 5, 1, 10, 11],
        // FLIP: F and B moves flip edges.
        // 1 -> 1, 5 -> 1, 8 -> 1, 9 -> 1.
        eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0]
    },
    B: {
        // B (CW)
        // Corners: UBR(3), ULB(2), DBL(6), DRB(7).
        // B moves U to L.
        // UBR(3) -> ULB(2).
        // ULB(2) -> DBL(6).
        // DBL(6) -> DRB(7).
        // DRB(7) -> UBR(3).
        // Cycle: 3->2, 2->6, 6->7, 7->3.
        // P[2]=6, P[3]=2, P[6]=7, P[7]=3.
        cp: [0, 1, 6, 2, 4, 5, 7, 3],
        // Twist:
        // UBR(3) -> ULB. (-1).
        // ULB(2) -> DBL. (+1).
        // DBL(6) -> DRB. (-1).
        // DRB(7) -> UBR. (+1).
        // 2:1, 3:2, 6:2, 7:1.
        co: [0, 0, 1, 2, 0, 0, 2, 1],

        // Edges: UB(3), BL(10), DB(7), BR(11).
        // U->L.
        // UB(3) -> BL(10).
        // BL(10) -> DB(7).
        // DB(7) -> BR(11).
        // BR(11) -> UB(3).
        // P[3]=10, P[7]=11, P[10]=7, P[11]=3.
        ep: [0, 1, 2, 10, 4, 5, 6, 11, 8, 9, 7, 3],
        // FLIP
        eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1]
    }
}

export class DeepCube {
    constructor() {
        this.reset()
    }

    reset() {
        // Identity State
        this.cp = [0, 1, 2, 3, 4, 5, 6, 7]
        this.co = [0, 0, 0, 0, 0, 0, 0, 0]
        this.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        this.eo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }

    move(moveStr) {
        const base = moveStr[0]
        const def = MOVES[base]
        if (!def) return

        let count = 1
        if (moveStr.endsWith('2')) count = 2
        if (moveStr.endsWith("'")) count = 3 // 3 CW = 1 CCW

        for (let k = 0; k < count; k++) {
            this.applyPrimitive(def)
        }
    }

    applyPrimitive(def) {
        // Permutation: p[i] moves to def.p[i].
        // New[def.p[i]] = Old[p[i]].
        // We want to track where the pieces ARE.

        // Correct application:
        // next_cp[i] = cp[def.cp[i]] ?
        // No. def.cp[i] says "Position i comes from position P[i]" ? No.
        // I defined def.cp[i] as "Piece at i goes to def.cp[i]".

        // Let's verify:
        // U: 0->1.
        // Standard Math: (P * S)[x] = P[S[x]]. (S applied first??)
        // Here we are applying Move P to State S.
        // New State S' = P * S.
        // This usually implies: Piece at pos i in new state is...
        // Let's trace one piece.
        // Piece X is at pos 0.
        // Move U: 0->1.
        // New state: Piece X should be at pos 1.
        // So new_cp[1] = Piece X.
        // new_cp[def.cp[i]] = cp[i].

        const new_cp = [...this.cp]
        const new_co = [...this.co]
        const new_ep = [...this.ep]
        const new_eo = [...this.eo]

        // Update Corners
        for (let i = 0; i < 8; i++) {
            const dest = def.cp[i]
            new_cp[dest] = this.cp[i]
            // Orientation follows the piece
            // Twist adds to existing twist
            new_co[dest] = (this.co[i] + def.co[i]) % 3
        }

        // Update Edges
        for (let i = 0; i < 12; i++) {
            const dest = def.ep[i]
            new_ep[dest] = this.ep[i]
            // Orientation
            new_eo[dest] = (this.eo[i] + def.eo[i]) % 2
        }

        this.cp = new_cp
        this.co = new_co
        this.ep = new_ep
        this.eo = new_eo
    }

    validate() {
        const errors = [];

        // Check exact set of pieces (Permutation Validity)
        const cSet = new Set(this.cp);
        if (cSet.size !== 8) errors.push('Invalid Corner Permutation (duplicates/missing)');
        const eSet = new Set(this.ep);
        if (eSet.size !== 12) errors.push('Invalid Edge Permutation (duplicates/missing)');

        // Sum of Twists (Corners) % 3 == 0
        const twistSum = this.co.reduce((a, b) => a + b, 0);
        if (twistSum % 3 !== 0) errors.push(`Twist Sum Error: ${twistSum}`);

        // Sum of Flips (Edges) % 2 == 0
        const flipSum = this.eo.reduce((a, b) => a + b, 0);
        if (flipSum % 2 !== 0) errors.push(`Flip Sum Error: ${flipSum}`);

        // Parity Check (Corner Parity must equal Edge Parity)
        const cParity = this.getPermutationParity(this.cp);
        const eParity = this.getPermutationParity(this.ep);
        if (cParity !== eParity) errors.push(`Parity Mismatch: Corner=${cParity}, Edge=${eParity}`);

        return { valid: errors.length === 0, errors };
    }

    getPermutationParity(p) {
        const n = p.length;
        const visited = new Array(n).fill(false);
        let swaps = 0;
        for (let i = 0; i < n; i++) {
            if (!visited[i]) {
                let curr = i;
                let cycleLen = 0;
                while (!visited[curr]) {
                    visited[curr] = true;
                    curr = p[curr];
                    cycleLen++;
                }
                swaps += (cycleLen - 1);
            }
        }
        return swaps % 2;
    }


    /**
     * Converts abstract state to physical cubies for rendering.
     * Maps Slot Positions (Where it is) -> Piece Colors (What it is) with Orientation.
     */
    toCubies() {
        // Definitions must align with indexes
        // Corners: 0:URF, 1:UFL, 2:ULB, 3:UBR, 4:DFR, 5:DLF, 6:DBL, 7:DRB
        const cornerSlots = [
            { x: 1, y: 1, z: 1 },   // 0 URF
            { x: -1, y: 1, z: 1 },  // 1 UFL
            { x: -1, y: 1, z: -1 }, // 2 ULB
            { x: 1, y: 1, z: -1 },  // 3 UBR
            { x: 1, y: -1, z: 1 },  // 4 DFR
            { x: -1, y: -1, z: 1 }, // 5 DLF
            { x: -1, y: -1, z: -1 },// 6 DBL
            { x: 1, y: -1, z: -1 }  // 7 DRB
        ];

        // Edges: 0:UR, 1:UF, 2:UL, 3:UB, 4:DR, 5:DF, 6:DL, 7:DB, 8:FR, 9:FL, 10:BL, 11:BR
        const edgeSlots = [
            { x: 1, y: 1, z: 0 },   // 0 UR
            { x: 0, y: 1, z: 1 },   // 1 UF
            { x: -1, y: 1, z: 0 },  // 2 UL
            { x: 0, y: 1, z: -1 },  // 3 UB
            { x: 1, y: -1, z: 0 },  // 4 DR
            { x: 0, y: -1, z: 1 },  // 5 DF
            { x: -1, y: -1, z: 0 }, // 6 DL
            { x: 0, y: -1, z: -1 }, // 7 DB
            { x: 1, y: 0, z: 1 },   // 8 FR
            { x: -1, y: 0, z: 1 },  // 9 FL
            { x: -1, y: 0, z: -1 }, // 10 BL
            { x: 1, y: 0, z: -1 }   // 11 BR
        ];

        // Centers (Fixed)
        const centers = [
            { id: 'c0', x: 0, y: 1, z: 0, faces: { up: 'white' } },
            { id: 'c1', x: 0, y: -1, z: 0, faces: { down: 'yellow' } },
            { id: 'c2', x: 0, y: 0, z: 1, faces: { front: 'green' } },
            { id: 'c3', x: 0, y: 0, z: -1, faces: { back: 'blue' } },
            { id: 'c4', x: -1, y: 0, z: 0, faces: { left: 'orange' } },
            { id: 'c5', x: 1, y: 0, z: 0, faces: { right: 'red' } },
            { id: 'core', x: 0, y: 0, z: 0, faces: {} }
        ];

        const cubies = [...centers];

        // Piece Definition (Solved State Colors)
        const getCornerColors = (id) => {
            const map = [
                { up: 'white', right: 'red', front: 'green' }, // 0
                { up: 'white', front: 'green', left: 'orange' }, // 1
                { up: 'white', left: 'orange', back: 'blue' }, // 2
                { up: 'white', back: 'blue', right: 'red' }, // 3
                { down: 'yellow', right: 'red', front: 'green' }, // 4
                { down: 'yellow', front: 'green', left: 'orange' }, // 5
                { down: 'yellow', left: 'orange', back: 'blue' }, // 6
                { down: 'yellow', back: 'blue', right: 'red' } // 7
            ];
            return map[id];
        };

        const getEdgeColors = (id) => {
            const map = [
                { up: 'white', right: 'red' }, // 0
                { up: 'white', front: 'green' }, // 1
                { up: 'white', left: 'orange' }, // 2
                { up: 'white', back: 'blue' }, // 3
                { down: 'yellow', right: 'red' }, // 4
                { down: 'yellow', front: 'green' }, // 5
                { down: 'yellow', left: 'orange' }, // 6
                { down: 'yellow', back: 'blue' }, // 7
                { front: 'green', right: 'red' }, // 8
                { front: 'green', left: 'orange' }, // 9
                { back: 'blue', left: 'orange' }, // 10
                { back: 'blue', right: 'red' } // 11
            ];
            return map[id];
        };

        // CORNERS
        const pKeys = [
            ['up', 'right', 'front'], // 0
            ['up', 'front', 'left'],  // 1
            ['up', 'left', 'back'],   // 2
            ['up', 'back', 'right'],  // 3
            ['down', 'right', 'front'], // 4
            ['down', 'front', 'left'],  // 5
            ['down', 'left', 'back'],   // 6
            ['down', 'back', 'right']   // 7
        ];

        for (let i = 0; i < 8; i++) {
            const pieceId = this.cp[i]; // Which physical piece is here
            const orientation = this.co[i]; // Twist: 0, 1 (CW), 2 (CCW)
            const slot = cornerSlots[i];

            const baseColors = getCornerColors(pieceId);
            const slotKeys = pKeys[i]; // Keys of the SLOT
            // Primary colors of the PIECE
            const pieceKeys = pKeys[pieceId]; // Keys of the PIECE
            const colors = [baseColors[pieceKeys[0]], baseColors[pieceKeys[1]], baseColors[pieceKeys[2]]];

            const faces = {};
            // Apply twist
            // Shift 0: S[0]=C[0], S[1]=C[1], S[2]=C[2]
            // Shift 1: S[0]=C[2], S[1]=C[0], S[2]=C[1] (CW Twist: Colors rotate CW relative to keys)
            // Shift 2: S[0]=C[1], S[1]=C[2], S[2]=C[0]

            // Formula: index k gets color (k - o + 3) % 3
            faces[slotKeys[0]] = colors[(0 - orientation + 3) % 3];
            faces[slotKeys[1]] = colors[(1 - orientation + 3) % 3];
            faces[slotKeys[2]] = colors[(2 - orientation + 3) % 3];

            cubies.push({ id: `corn${pieceId}`, x: slot.x, y: slot.y, z: slot.z, faces });
        }

        // EDGES
        const eKeys = [
            ['up', 'right'], // 0 UR
            ['up', 'front'], // 1 UF
            ['up', 'left'],  // 2 UL
            ['up', 'back'],  // 3 UB
            ['down', 'right'], // 4 DR
            ['down', 'front'], // 5 DF
            ['down', 'left'],  // 6 DL
            ['down', 'back'],  // 7 DB
            ['front', 'right'], // 8 FR
            ['front', 'left'],  // 9 FL
            ['back', 'left'],   // 10 BL
            ['back', 'right']   // 11 BR
        ];

        for (let i = 0; i < 12; i++) {
            const pieceId = this.ep[i];
            const flip = this.eo[i];
            const slot = edgeSlots[i];
            const baseColors = getEdgeColors(pieceId);

            const pieceKeys = eKeys[pieceId];
            const colors = [baseColors[pieceKeys[0]], baseColors[pieceKeys[1]]];

            const slotKeys = eKeys[i];

            const faces = {};
            if (flip === 0) {
                faces[slotKeys[0]] = colors[0];
                faces[slotKeys[1]] = colors[1];
            } else {
                faces[slotKeys[0]] = colors[1];
                faces[slotKeys[1]] = colors[0];
            }
            cubies.push({ id: `edge${pieceId}`, x: slot.x, y: slot.y, z: slot.z, faces });
        }

        return cubies;
    }

    rotateLayer(axis, index, dir) {
        // axis: 'x', 'y', 'z'
        // index: -1, 0, 1
        // dir: 1 (Visual CCW / Logic U'), -1 (Visual CW / Logic U)

        let move = '';

        if (axis === 'y') {
            if (index === 1) { // Up Layer
                move = dir === 1 ? "U'" : "U";
            } else if (index === -1) { // Down Layer
                // D move is Bottom CW (+Y rotation) -> Visual CCW (dir=1).
                move = dir === 1 ? "D" : "D'";
            }
        }
        else if (axis === 'x') {
            if (index === 1) { // Right Layer
                // R is -X rotation -> Visual CW (dir=-1).
                move = dir === 1 ? "R'" : "R";
            } else if (index === -1) { // Left Layer
                // L is +X rotation -> Visual CCW (dir=1).
                move = dir === 1 ? "L" : "L'";
            }
        }
        else if (axis === 'z') {
            if (index === 1) { // Front Layer
                // F is -Z rotation -> Visual CW (dir=-1).
                move = dir === 1 ? "F'" : "F";
            } else if (index === -1) { // Back Layer
                // B is +Z rotation -> Visual CCW (dir=1).
                move = dir === 1 ? "B" : "B'";
            }
        }

        if (move) {
            this.move(move);
        }
    }
}
