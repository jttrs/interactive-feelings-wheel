import { describe, it, expect, beforeEach } from 'vitest';
import { FeelingsWheelGenerator, FEELINGS_DATA } from '../helpers/wheel.js';

// Behavior-pinning tests for the pure geometry helpers on the wheel engine.
// These need no DOM: we construct the generator with a stub container and
// call the geometry/rotation methods directly with golden values captured
// from the running code.

describe('createWedgePath', () => {
    let gen;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    it('builds the exact path for a small (60deg) span', () => {
        expect(gen.createWedgePath(300, 300, 0, 100, -30, 30)).toBe(
            'M 300 300 L 386.6025403784439 250 A 100 100 0 0 1 386.6025403784439 350 L 300 300 A 0 0 0 0 0 300 300'
        );
    });

    it('builds the exact path for a large (200deg) span', () => {
        expect(gen.createWedgePath(300, 300, 0, 100, 0, 200)).toBe(
            'M 300 300 L 400 300 A 100 100 0 1 1 206.03073792140916 265.7979856674331 L 300 300 A 0 0 0 1 0 300 300'
        );
    });

    it('uses the small arc flag (0) when the span is <= 180deg', () => {
        const path = gen.createWedgePath(300, 300, 0, 100, -30, 30);
        expect(path).toContain('A 100 100 0 0 1');
    });

    it('uses the large arc flag (1) when the span is > 180deg', () => {
        const path = gen.createWedgePath(300, 300, 0, 100, 0, 200);
        expect(path).toContain('A 100 100 0 1 1');
    });
});

describe('positionText', () => {
    let gen;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    it('places text at the midpoint angle of the wedge span', () => {
        expect(gen.positionText(300, 300, 100, 0, 90)).toEqual({
            x: 370.71067811865476,
            y: 370.71067811865476,
            baseAngle: 45,
        });
    });
});

describe('calculateTextRotation', () => {
    let gen;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    // Text runs radially along baseAngle, but gets flipped +180 whenever the
    // normalized angle (baseAngle + currentRotation, wrapped to 0-360) falls
    // strictly between 90 and 270 -- i.e. whenever it would otherwise render
    // upside-down from the reader's perspective (currentRotation is 0 here).
    it('does not flip at 0deg (right side, upright)', () => {
        expect(gen.calculateTextRotation(0)).toBe(0);
    });

    it('does not flip at 45deg (still within the upright half)', () => {
        expect(gen.calculateTextRotation(45)).toBe(45);
    });

    it('flips +360 (180 + 180) at 180deg (left side, would be upside-down)', () => {
        expect(gen.calculateTextRotation(180)).toBe(360);
    });

    it('does not flip at 270deg (boundary is exclusive)', () => {
        expect(gen.calculateTextRotation(270)).toBe(270);
    });

    // The flip decision uses flipAngle (2nd arg), not baseAngle, so both labels in a
    // dyad — which share their secondary parent's flipAngle — flip together even when
    // the pair straddles the 90/270 boundary. Each label still rotates along its OWN
    // baseAngle (so it stays centered in its half-slice).
    it('flips both dyad labels together when their shared flipAngle is upside-down', () => {
        // Two half-slices at 88deg and 92deg straddle the 90 boundary; without a shared
        // flipAngle they would disagree. Shared parent midangle = 90.0001 (just past).
        const flip = 90.0001;
        const a = gen.calculateTextRotation(88, flip);
        const b = gen.calculateTextRotation(92, flip);
        expect(a).toBe(88 + 180); // both flipped
        expect(b).toBe(92 + 180);
    });

    it('keeps both dyad labels unflipped when their shared flipAngle is upright', () => {
        const flip = 45; // upright half
        expect(gen.calculateTextRotation(43, flip)).toBe(43);
        expect(gen.calculateTextRotation(47, flip)).toBe(47);
    });

    it('defaults flipAngle to baseAngle when omitted (core/secondary labels)', () => {
        expect(gen.calculateTextRotation(200)).toBe(200 + 180);
    });
});

describe('calculateCoreAngles', () => {
    let gen;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    it('produces one entry per core emotion', () => {
        expect(gen.calculateCoreAngles()).toHaveLength(7);
    });

    it('sums the wedge sizes to a full circle', () => {
        const angles = gen.calculateCoreAngles();
        const sum = angles.reduce((total, a) => total + a.size, 0);
        expect(sum).toBeCloseTo(360, 3);
    });

    it('centers Angry on 0 degrees', () => {
        const angry = gen.calculateCoreAngles().find((a) => a.name === 'Angry');
        expect(angry).toBeDefined();
        expect(angry.start).toBeCloseTo(-35.122, 3);
        expect(angry.size).toBeCloseTo(70.2439, 3);
        expect(angry.start + angry.size / 2).toBeCloseTo(0, 6);
    });

    it('sizes wedges proportionally to their secondary emotion counts', () => {
        const angles = gen.calculateCoreAngles();
        const angry = angles.find((a) => a.name === 'Angry'); // 8 secondaries
        const disgusted = angles.find((a) => a.name === 'Disgusted'); // 4 secondaries
        expect(disgusted.size).toBeCloseTo(35.122, 3);
        // Angry has exactly twice as many secondaries as Disgusted, so its
        // wedge should be exactly twice as wide.
        expect(angry.size).toBeCloseTo(disgusted.size * 2, 3);
    });
});
