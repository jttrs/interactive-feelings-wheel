import { describe, it, expect } from 'vitest';
import { FeelingsWheelGenerator, FEELINGS_DATA, createTestWheel } from '../helpers/wheel.js';

// Behavior-pinning tests for the responsive scaling and font-sizing math.
// jsdom's default window.innerWidth (1024) puts calculateResponsiveScaling
// on the desktop branch, matching the golden values below.

describe('calculateResponsiveScaling', () => {
    it('returns the exact desktop scaling profile at size 600', () => {
        const gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
        const scaling = gen.calculateResponsiveScaling(600);
        // Division strokes are deliberately light: primary 0.28%, secondary 0.18%,
        // dyad/tertiary 0.08% of wheel size.
        expect(scaling.primaryDivisionStroke).toBeCloseTo(1.68, 10); // 600 * 0.0028
        expect(scaling.secondaryDivisionStroke).toBeCloseTo(1.08, 10); // 600 * 0.0018
        expect(scaling.tertiaryDivisionStroke).toBeCloseTo(0.48, 10); // 600 * 0.0008
        expect(scaling.wedgeStroke).toBe(0.9);
        expect(scaling.fontScale).toBe(0.0075);
        expect(scaling.touchTargetScale).toBe(1.5);
        expect(scaling.generalScale).toBe(1.5);
    });

    it('floors stroke widths at a tiny wheel size instead of going to zero', () => {
        const gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
        const scaling = gen.calculateResponsiveScaling(50);
        // 50 * 0.0028 = 0.14, below the 0.3 floor, so the floor wins.
        expect(scaling.primaryDivisionStroke).toBe(Math.max(0.3, 50 * 0.0028));
        expect(scaling.primaryDivisionStroke).toBe(0.3);
    });
});

describe('radii', () => {
    it('computes the exact full-mode ring radii at size 600', () => {
        const { gen } = createTestWheel({ size: 600 });
        expect(gen.coreRadius).toBeCloseTo(103.95, 5);
        expect(gen.middleRadius).toBeCloseTo(207.9, 5);
        expect(gen.outerRadius).toBe(297);
        expect(gen.containerSize).toBe(600);
    });

    it('collapses the middle ring to the full available radius in simplified mode', () => {
        const { gen } = createTestWheel({ size: 600, simplified: true });
        const maxRadius = 297; // 600 * 0.495
        expect(gen.middleRadius).toBe(maxRadius);
        expect(gen.coreRadius).toBe(maxRadius * 0.5);
    });
});

describe('calculateOptimalTextSize', () => {
    it('matches the golden value for a representative ring/text size', () => {
        const { gen } = createTestWheel({ size: 600 });
        expect(gen.calculateOptimalTextSize(100, 30, 8)).toBe(18.75);
    });
});

describe('calculateFontSize ordering', () => {
    // Exact font sizes are an implementation detail that may retune; what
    // matters is the ring hierarchy (core is largest, tertiary smallest)
    // and that every level produces a usable, finite, positive size.
    it('orders core >= secondary >= tertiary and stays finite and positive', () => {
        const { gen } = createTestWheel({ size: 600 });
        const core = gen.calculateFontSize('core');
        const secondary = gen.calculateFontSize('secondary');
        const tertiary = gen.calculateFontSize('tertiary');

        [core, secondary, tertiary].forEach((size) => {
            expect(Number.isFinite(size)).toBe(true);
            expect(size).toBeGreaterThan(0);
        });

        expect(core).toBeGreaterThanOrEqual(secondary);
        expect(secondary).toBeGreaterThanOrEqual(tertiary);
    });
});
