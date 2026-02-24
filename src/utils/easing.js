// Animation easing functions and their derivatives

export const easeInOutCubic = (t) => {
    if (t < 0.5) return 4 * t * t * t;
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// Derivative of standard easeInOutCubic for instantaneous velocity calculations
export const easeInOutCubicDerivative = (t) => {
    if (t < 0.5) return 12 * t * t;
    return 3 * Math.pow(-2 * t + 2, 2);
};

// Custom easing function that preserves initial velocity v₀
// The polynomial is P(t) = (v₀ - 2)t³ + (3 - 2v₀)t² + v₀t
export const cubicEaseWithInitialVelocity = (t, v0) => {
    return (v0 - 2) * t * t * t + (3 - 2 * v0) * t * t + v0 * t;
};

// Derivative of the custom easing function
export const cubicEaseWithInitialVelocityDerivative = (t, v0) => {
    return 3 * (v0 - 2) * t * t + 2 * (3 - 2 * v0) * t + v0;
};
