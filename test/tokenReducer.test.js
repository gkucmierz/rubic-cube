import { describe, it, expect } from 'vitest';
import { tokenReducer, parseToken } from '../src/utils/tokenReducer.js';

describe('parseToken', () => {
    it('parses simple move', () => {
        expect(parseToken('D')).toEqual({ token: 'D', name: 'D', mod: '' });
    });

    it('parses prime move', () => {
        expect(parseToken("U'")).toEqual({ token: "U'", name: 'U', mod: "'" });
    });

    it('parses double move', () => {
        expect(parseToken('R2')).toEqual({ token: 'R2', name: 'R', mod: '2' });
    });
});

describe('tokenReducer', () => {
    it('user example: mixed faces', () => {
        const result = tokenReducer(['D', 'U2', 'U2', 'B2', "B'", 'B2', "U'", 'U2']);
        expect(result.tokens).toEqual(['D', "B'", 'U']);
    });

    it('cancellation: same move 4 times = identity', () => {
        expect(tokenReducer(['R', 'R', 'R', 'R']).tokens).toEqual([]);
    });

    it('cancellation: move + inverse = identity', () => {
        expect(tokenReducer(["F'", 'F']).tokens).toEqual([]);
    });

    it('cancellation: double move twice = identity', () => {
        expect(tokenReducer(['D2', 'D2']).tokens).toEqual([]);
    });

    it('merge: move + move = double', () => {
        expect(tokenReducer(['U', 'U']).tokens).toEqual(['U2']);
    });

    it('merge: double + move = prime', () => {
        expect(tokenReducer(['R2', 'R']).tokens).toEqual(["R'"]);
    });

    it('D2 D2 D\' D cancels to empty', () => {
        expect(tokenReducer(['D2', 'D2', "D'", 'D']).tokens).toEqual([]);
    });

    it('preserves non-adjacent different faces', () => {
        expect(tokenReducer(['R', 'U', 'R']).tokens).toEqual(['R', 'U', 'R']);
    });

    it('reduces only consecutive same-face groups', () => {
        expect(tokenReducer(['F', 'F', 'U', "U'"]).tokens).toEqual(['F2']);
    });

    it('handles single move unchanged', () => {
        expect(tokenReducer(['B']).tokens).toEqual(['B']);
    });

    it('handles empty input', () => {
        expect(tokenReducer([]).tokens).toEqual([]);
    });

    it('desc contains group info', () => {
        const result = tokenReducer(['R', 'R']);
        expect(result.desc).toHaveLength(1);
        expect(result.desc[0].reduced).toBe('R2');
        expect(result.desc[0].group).toHaveLength(2);
    });
});
