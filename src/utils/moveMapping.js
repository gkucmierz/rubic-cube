// Move notation mapping between UI labels, internal logic axes, and solver output.
// The UI coordinate system is rotated 90° around Y from internal coordinates.

// UI button key → internal base + modifier
export const MOVE_MAP = {
    U: { base: "U", modifier: "" },
    "U-prime": { base: "U", modifier: "'" },
    U2: { base: "U", modifier: "2" },

    D: { base: "D", modifier: "" },
    "D-prime": { base: "D", modifier: "'" },
    D2: { base: "D", modifier: "2" },

    L: { base: "B", modifier: "" },
    "L-prime": { base: "B", modifier: "'" },
    L2: { base: "B", modifier: "2" },

    R: { base: "F", modifier: "" },
    "R-prime": { base: "F", modifier: "'" },
    R2: { base: "F", modifier: "2" },

    F: { base: "L", modifier: "" },
    "F-prime": { base: "L", modifier: "'" },
    F2: { base: "L", modifier: "2" },

    B: { base: "R", modifier: "" },
    "B-prime": { base: "R", modifier: "'" },
    B2: { base: "R", modifier: "2" },
};

// Internal face name → UI face name
export const INTERNAL_TO_UI = {
    'F': 'R', 'B': 'L', 'R': 'B', 'L': 'F',
    'U': 'U', 'D': 'D',
    'M': 'M', 'E': 'E', 'S': 'S',
};

// Internal base → axis and layer index
export const getAxisIndexForBase = (base) => {
    if (base === "U") return { axis: "y", index: 1 };
    if (base === "D") return { axis: "y", index: -1 };
    if (base === "L") return { axis: "x", index: -1 };
    if (base === "R") return { axis: "x", index: 1 };
    if (base === "F") return { axis: "z", index: 1 };
    if (base === "B") return { axis: "z", index: -1 };
    return { axis: "y", index: 0 };
};

// Mathematical positive rotation direction (Right-Hand Rule)
export const getMathDirectionForBase = (base) => {
    if (['R', 'U', 'F', 'S'].includes(base)) return -1;
    if (['L', 'D', 'B', 'M', 'E'].includes(base)) return 1;
    return 1;
};

// Convert axis/index/direction to a standard Rubik's notation label (UI-facing)
export const getDragMoveLabel = (axis, index, direction, count) => {
    const OUTER_MAP = {
        'y_1': { base: 'U', dir: -1 },
        'y_-1': { base: 'D', dir: 1 },
        'x_1': { base: 'R', dir: -1 },
        'x_-1': { base: 'L', dir: 1 },
        'z_1': { base: 'F', dir: -1 },
        'z_-1': { base: 'B', dir: 1 },
    };
    const SLICE_MAP = {
        'x_0': { base: 'M', dir: 1 },
        'y_0': { base: 'E', dir: 1 },
        'z_0': { base: 'S', dir: -1 },
    };

    const key = `${axis}_${index}`;
    const mapping = OUTER_MAP[key] || SLICE_MAP[key];
    if (!mapping) return null;

    const effective = direction * mapping.dir;
    const stepsMod = ((count % 4) + 4) % 4;
    if (stepsMod === 0) return null;

    let modifier = '';
    if (stepsMod === 2) {
        modifier = '2';
    } else if ((effective > 0 && stepsMod === 1) || (effective < 0 && stepsMod === 3)) {
        modifier = '';
    } else {
        modifier = "'";
    }

    const uiBase = INTERNAL_TO_UI[mapping.base] || mapping.base;
    return uiBase + modifier;
};

// Coerce rotation step count to match a desired sign direction
export const coerceStepsToSign = (steps, sign) => {
    if (steps === 0) return 0;
    const mod = ((steps % 4) + 4) % 4;
    if (sign < 0) {
        if (mod === 1) return -3;
        if (mod === 2) return -2;
        return -1;
    }
    if (mod === 1) return 1;
    if (mod === 2) return 2;
    return 3;
};

// Format a move label from a display base and step count
export const formatMoveLabel = (displayBase, steps) => {
    const stepsMod = ((steps % 4) + 4) % 4;
    if (stepsMod === 0) return displayBase;
    let modifier = "";
    if (stepsMod === 1) modifier = "'";
    else if (stepsMod === 2) modifier = "2";
    else if (stepsMod === 3) modifier = "";
    return displayBase + (modifier === "'" ? "'" : modifier === "2" ? "2" : "");
};
