// Reduces consecutive same-face moves into their net rotation.
// Agnostic to move names — works with any single-letter move notation.

const EMPTY = 'E';
const MODS = [EMPTY, '', '2', "'"];

const reduceGroup = (group) => {
    const sum = group.reduce((acc, curr) => acc + MODS.indexOf(curr.mod), 0);
    const mod = MODS[sum % 4];
    return mod === EMPTY ? '' : `${group[0].name}${mod}`;
};

export const parseToken = (token) => {
    const match = token.match(/^(\w)(.?)$/);
    if (!match) return null;
    return { token, name: match[1], mod: match[2] };
};

export const tokenReducer = (tokens) => {
    const parsed = tokens.map(parseToken).filter(Boolean);
    const desc = [];
    const res = [];
    let lastPos = 0;

    for (let i = 0; i <= parsed.length; i++) {
        if (i === parsed.length || (i > lastPos && parsed[i].name !== parsed[lastPos].name)) {
            const group = parsed.slice(lastPos, i);
            const reduced = reduceGroup(group);
            desc.push({ reduced, group });
            if (reduced !== '') res.push(reduced);
            lastPos = i;
        }
    }

    return { desc, tokens: res };
};
