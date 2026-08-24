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
