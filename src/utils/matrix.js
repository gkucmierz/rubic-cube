// 4x4 matrix operations for 3D transformations (column-major, CSS/WebGL convention)

export const identityMatrix = () => [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

export const rotateXMatrix = (deg) => {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ];
};

export const rotateYMatrix = (deg) => {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ];
};

export const rotateZMatrix = (deg) => {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

export const multiplyMatrices = (a, b) => {
    const result = new Array(16).fill(0);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            for (let k = 0; k < 4; k++) {
                result[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
            }
        }
    }
    return result;
};

// --- Quaternion helpers for distortion-free rotation interpolation (SLERP) ---

export const matToQuat = (m) => {
    const trace = m[0] + m[5] + m[10];
    let w, x, y, z;
    if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        w = 0.25 / s;
        x = (m[6] - m[9]) * s;
        y = (m[8] - m[2]) * s;
        z = (m[1] - m[4]) * s;
    } else if (m[0] > m[5] && m[0] > m[10]) {
        const s = 2 * Math.sqrt(1 + m[0] - m[5] - m[10]);
        w = (m[6] - m[9]) / s;
        x = 0.25 * s;
        y = (m[4] + m[1]) / s;
        z = (m[8] + m[2]) / s;
    } else if (m[5] > m[10]) {
        const s = 2 * Math.sqrt(1 + m[5] - m[0] - m[10]);
        w = (m[8] - m[2]) / s;
        x = (m[4] + m[1]) / s;
        y = 0.25 * s;
        z = (m[6] + m[9]) / s;
    } else {
        const s = 2 * Math.sqrt(1 + m[10] - m[0] - m[5]);
        w = (m[1] - m[4]) / s;
        x = (m[8] + m[2]) / s;
        y = (m[6] + m[9]) / s;
        z = 0.25 * s;
    }
    return { w, x, y, z };
};

export const slerp = (q1, q2, t) => {
    let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
    let q2n = q2;
    if (dot < 0) {
        q2n = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
        dot = -dot;
    }
    if (dot > 0.9995) {
        const len = Math.sqrt(
            (q1.w + t * (q2n.w - q1.w)) ** 2 + (q1.x + t * (q2n.x - q1.x)) ** 2 +
            (q1.y + t * (q2n.y - q1.y)) ** 2 + (q1.z + t * (q2n.z - q1.z)) ** 2
        );
        return {
            w: (q1.w + t * (q2n.w - q1.w)) / len,
            x: (q1.x + t * (q2n.x - q1.x)) / len,
            y: (q1.y + t * (q2n.y - q1.y)) / len,
            z: (q1.z + t * (q2n.z - q1.z)) / len,
        };
    }
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const a = Math.sin((1 - t) * theta) / sinTheta;
    const b = Math.sin(t * theta) / sinTheta;
    return {
        w: a * q1.w + b * q2n.w,
        x: a * q1.x + b * q2n.x,
        y: a * q1.y + b * q2n.y,
        z: a * q1.z + b * q2n.z,
    };
};

export const quatToMat = (q) => {
    const { w, x, y, z } = q;
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z;
    const wx = w * x, wy = w * y, wz = w * z;
    return [
        1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
        2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
        2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
        0, 0, 0, 1,
    ];
};
