
import { State } from 'rubiks-js/src/state/index.js';

console.log('State imported successfully');
const state = new State(true);
console.log('State instantiated');

state.applyTurn('R');
console.log('Applied turn R');

const encoded = state.encode();
console.log('Encoded state:', encoded);
