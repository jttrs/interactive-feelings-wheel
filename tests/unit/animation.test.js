import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeelingsWheelGenerator, FEELINGS_DATA, createTestWheel } from '../helpers/wheel.js';

const { Easing } = FeelingsWheelGenerator;

describe('Easing functions', () => {
    it('linear is the identity function', () => {
        expect(Easing.linear(0.5)).toBe(0.5);
    });

    it('easeOut hits its boundaries and midpoint golden value', () => {
        expect(Easing.easeOut(0)).toBe(0);
        expect(Easing.easeOut(1)).toBe(1);
        expect(Easing.easeOut(0.5)).toBe(0.875);
    });

    it('easeInOut hits its boundaries and midpoint golden value', () => {
        expect(Easing.easeInOut(0)).toBe(0);
        expect(Easing.easeInOut(1)).toBe(1);
        expect(Easing.easeInOut(0.5)).toBe(0.5);
    });

    it('bounce starts at 0 and ends at 1', () => {
        expect(Easing.bounce(0)).toBeCloseTo(0, 6);
        expect(Easing.bounce(1)).toBeCloseTo(1, 6);
    });
});

describe('getShortestRotationPath', () => {
    let gen;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    it('takes the short way across the 0/360 boundary (forward)', () => {
        expect(gen.getShortestRotationPath(350, 10)).toBe(20);
    });

    it('takes the short way across the 0/360 boundary (backward)', () => {
        expect(gen.getShortestRotationPath(10, 350)).toBe(-20);
    });

    it('picks +180 at the exact half-turn boundary', () => {
        expect(gen.getShortestRotationPath(0, 180)).toBe(180);
    });

    it('flips to -179 just past the half-turn boundary', () => {
        expect(gen.getShortestRotationPath(0, 181)).toBe(-179);
    });

    it('flips to +179 just past the half-turn boundary the other way', () => {
        expect(gen.getShortestRotationPath(0, -181)).toBe(179);
    });

    it('normalizes angles outside 0-360 before computing the delta', () => {
        expect(gen.getShortestRotationPath(720, 90)).toBe(90);
    });
});

describe('animation lifecycle', () => {
    let gen;

    afterEach(() => {
        // Avoid leaking a real requestAnimationFrame loop across tests.
        if (gen) gen.clearAllAnimations();
    });

    it('addAnimation registers a running animation, removeAnimation tears it down', () => {
        ({ gen } = createTestWheel());

        const id = gen.addAnimation({
            duration: 100,
            from: 0,
            to: 10,
            onUpdate() {},
            onComplete() {},
        });

        expect(typeof id).toBe('string');
        expect(gen.animations.size).toBe(1);
        expect(gen.isAnimating).toBe(true);

        gen.removeAnimation(id);

        expect(gen.animations.size).toBe(0);
        expect(gen.isAnimating).toBe(false);
    });
});

describe('scroll momentum (anti-flicker)', () => {
    let gen;
    const { SENSITIVITY, MAX_VELOCITY } = FeelingsWheelGenerator.ScrollPhysics;

    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    afterEach(() => {
        gen.stopMomentum();
    });

    it('accumulates velocity scaled by scroll MAGNITUDE, not just its sign', () => {
        // Use a delta that lands well under MAX_VELOCITY so we test the scaling, not the
        // clamp (derived from the constants so it survives retuning either one).
        const subCapDelta = MAX_VELOCITY / SENSITIVITY / 2; // -> velocity = MAX_VELOCITY/2
        gen.applyScrollInput(subCapDelta);
        expect(gen.scrollVelocity).toBeCloseTo(subCapDelta * SENSITIVITY, 6);
        // A tiny nudge adds a tiny amount — NOT a full-size step like the old code.
        gen.scrollVelocity = 0;
        gen.applyScrollInput(1.2);
        expect(gen.scrollVelocity).toBeCloseTo(1.2 * SENSITIVITY, 6);
        expect(Math.abs(gen.scrollVelocity)).toBeLessThan(1);
    });

    it('clamps velocity so a hard flick cannot spin unbounded', () => {
        gen.applyScrollInput(100000);
        expect(gen.scrollVelocity).toBe(MAX_VELOCITY);
        gen.applyScrollInput(-100000);
        expect(gen.scrollVelocity).toBe(-MAX_VELOCITY);
    });

    it('nets the correct direction from a jittery, sign-alternating slow scroll (regression)', () => {
        // Reproduces the reported bug: a slow trackpad emits tiny deltas whose sign
        // flips around zero. The OLD code (sign * 5deg) ping-ponged +5/0/+5/0.
        // Velocity accumulation must instead net the true intent without reversal.
        const jittery = [1.2, -0.4, 0.8, -0.2, 1.0, -0.6, 0.5, -0.3, 0.9, -0.1];
        const net = jittery.reduce((a, b) => a + b, 0); // +2.8 (positive intent)
        jittery.forEach((dy) => gen.applyScrollInput(dy));
        // Final velocity has the same sign as the net scroll and never got clamped.
        expect(Math.sign(gen.scrollVelocity)).toBe(Math.sign(net));
        expect(gen.scrollVelocity).toBeCloseTo(net * SENSITIVITY, 6);
    });

    it('stopMomentum halts the loop and zeroes velocity', () => {
        gen.applyScrollInput(100);
        expect(gen.scrollVelocity).not.toBe(0);
        gen.stopMomentum();
        expect(gen.scrollVelocity).toBe(0);
        expect(gen.momentumRafId).toBeNull();
    });
});

describe('held-arrow rotation (continuous spin)', () => {
    const { KEY_IMPULSE, MAX_VELOCITY } = FeelingsWheelGenerator.ScrollPhysics;
    let gen, rafQueue, origRaf, origCancel;

    // Drive the momentum rAF loop deterministically: capture each scheduled callback and
    // flush frames manually so the held-key acceleration is testable without wall-clock.
    beforeEach(() => {
        gen = createTestWheel().gen; // real SVG groups so updateRotation() works
        rafQueue = [];
        origRaf = globalThis.requestAnimationFrame;
        origCancel = globalThis.cancelAnimationFrame;
        globalThis.requestAnimationFrame = (cb) => rafQueue.push(cb);
        globalThis.cancelAnimationFrame = () => {};
    });
    afterEach(() => {
        globalThis.requestAnimationFrame = origRaf;
        globalThis.cancelAnimationFrame = origCancel;
        gen.heldRotationDir = 0;
        gen.scrollVelocity = 0;
    });

    const frame = () => {
        const cb = rafQueue.shift();
        if (cb) cb();
    };

    it('a single press adds one KEY_IMPULSE (correct sign) and starts the loop', () => {
        gen.startHeldRotation(1);
        expect(gen.heldRotationDir).toBe(1);
        expect(gen.scrollVelocity).toBeCloseTo(KEY_IMPULSE, 6);
        expect(gen.momentumRafId).not.toBeNull();

        // Opposite direction reverses the held state and applies a negative impulse.
        gen.stopHeldRotation(1);
        gen.scrollVelocity = 0;
        gen.startHeldRotation(-1);
        expect(gen.heldRotationDir).toBe(-1);
        expect(gen.scrollVelocity).toBeCloseTo(-KEY_IMPULSE, 6);
    });

    it('holding accelerates each frame and rides up to (never past) MAX_VELOCITY', () => {
        gen.startHeldRotation(1);
        const startRotation = gen.currentRotation;
        for (let i = 0; i < 60; i++) frame();
        // Sustained spin: velocity climbed well past the single-tap impulse toward the cap.
        expect(gen.scrollVelocity).toBeGreaterThan(KEY_IMPULSE);
        expect(gen.scrollVelocity).toBeLessThanOrEqual(MAX_VELOCITY + 1e-9);
        // And it actually rotated the wheel.
        expect(gen.currentRotation).toBeGreaterThan(startRotation);
    });

    it('releasing clears the held direction and the wheel decays to rest', () => {
        gen.startHeldRotation(1);
        for (let i = 0; i < 20; i++) frame(); // spin up
        gen.stopHeldRotation(1);
        expect(gen.heldRotationDir).toBe(0);
        // With nothing held, friction decays velocity below MIN_VELOCITY and the loop settles.
        for (let i = 0; i < 300 && gen.momentumRafId !== null; i++) frame();
        expect(gen.scrollVelocity).toBe(0);
        expect(gen.momentumRafId).toBeNull();
    });

    it('is a no-op while a programmatic animation owns the wheel (reset-safety)', () => {
        gen.isAnimating = true;
        gen.startHeldRotation(1);
        expect(gen.heldRotationDir).toBe(0);
        expect(gen.scrollVelocity).toBe(0);
        gen.isAnimating = false;
    });
});
