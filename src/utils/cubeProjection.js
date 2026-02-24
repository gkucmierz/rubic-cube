// 3D geometry helpers for cube face/axis operations and screen projection

export const getFaceNormal = (face, FACES) => {
    const map = {
        [FACES.FRONT]: { x: 0, y: 0, z: 1 },
        [FACES.BACK]: { x: 0, y: 0, z: -1 },
        [FACES.RIGHT]: { x: 1, y: 0, z: 0 },
        [FACES.LEFT]: { x: -1, y: 0, z: 0 },
        [FACES.UP]: { x: 0, y: 1, z: 0 },
        [FACES.DOWN]: { x: 0, y: -1, z: 0 },
    };
    return map[face] || { x: 0, y: 0, z: 1 };
};

// Which axes can this face physically rotate along?
export const getAllowedAxes = (face, FACES) => {
    switch (face) {
        case FACES.FRONT:
        case FACES.BACK:
            return ["x", "y"];
        case FACES.RIGHT:
        case FACES.LEFT:
            return ["z", "y"];
        case FACES.UP:
        case FACES.DOWN:
            return ["x", "z"];
    }
    return [];
};

export const getAxisVector = (axis) => {
    if (axis === "x") return { x: 1, y: 0, z: 0 };
    if (axis === "y") return { x: 0, y: 1, z: 0 };
    if (axis === "z") return { x: 0, y: 0, z: 1 };
    return { x: 0, y: 0, z: 0 };
};

// Cross product: a × b
export const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
});

// Project 3D vector to 2D screen space using a viewMatrix (column-major 4x4).
// Input v is in Right-Handed Math Coordinates (Y up).
// viewMatrix operates in CSS Coordinates (Y down).
// Applies T⁻¹ * M * T to maintain correct projection chirality.
export const project = (v, viewMatrix) => {
    const m = viewMatrix;
    const cssY = -v.y;

    const x = v.x * m[0] + cssY * m[4] + v.z * m[8];
    const projY = v.x * m[1] + cssY * m[5] + v.z * m[9];
    const mathY = -projY;

    return { x, y: mathY };
};
