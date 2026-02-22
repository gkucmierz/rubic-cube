import { RubiksJSModel } from '../utils/RubiksJSModel.js';

const cube = new RubiksJSModel();

// Helper to send state update
const sendUpdate = () => {
  try {
    const cubies = cube.toCubies();
    // console.log('[Worker] Sending update with cubies:', cubies.length);
    postMessage({
      type: 'STATE_UPDATE',
      payload: {
        cubies
      }
    });
  } catch (e) {
    console.error('[Worker] Error generating cubies:', e);
    postMessage({ type: 'ERROR', payload: e.message });
  }
};

self.onmessage = (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
    case 'RESET':
      cube.reset();
      sendUpdate();
      break;

    case 'ROTATE_LAYER':
      const { axis, index, direction } = payload;
      cube.rotateLayer(axis, index, direction);
      sendUpdate();
      break;

    case 'VALIDATE':
      const validation = cube.validate();
      postMessage({
        type: 'VALIDATION_RESULT',
        payload: { valid: validation.valid, errors: validation.errors }
      });
      break;
  }
};
