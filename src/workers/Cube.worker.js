import { RubiksJSModel } from "../utils/CubeLogicAdapter.js";

const cube = new RubiksJSModel();



// Helper to send state update
const sendUpdate = () => {
  try {
    const cubies = cube.toCubies();
    const { cp, co, ep, eo } = cube.state;
    postMessage({
      type: "STATE_UPDATE",
      payload: {
        cubies,
        deepCubeState: {
          cp: [...cp],
          co: [...co],
          ep: [...ep],
          eo: [...eo],
        },
      },
    });
  } catch (e) {
    console.error("[Worker] Error generating cubies:", e);
    postMessage({ type: "ERROR", payload: e.message });
  }
};

self.onmessage = (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case "INIT":
    case "RESET":
      cube.reset();
      sendUpdate();
      break;

    case "ROTATE_LAYER": {
      const { axis, index, direction, steps = 1 } = payload;
      cube.rotateLayer(axis, index, direction, steps);
      sendUpdate();
      break;
    }

    case "ROTATE_SLICE": {
      const { axis, direction, steps = 1 } = payload;
      cube.rotateSlice(axis, direction, steps);
      sendUpdate();
      break;
    }

    case "TURN": {
      const { move } = payload;
      cube.applyTurn(move);
      sendUpdate();
      break;
    }

    case "VALIDATE":
      const validation = cube.validate();
      postMessage({
        type: "VALIDATION_RESULT",
        payload: { valid: validation.valid, errors: validation.errors },
      });
      break;


  }
};
