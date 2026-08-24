import { describe, it, expect, beforeEach } from 'vitest';
import { FeelingsWheelGenerator, FEELINGS_DATA } from '../helpers/wheel.js';

// Behavior-pinning tests for the color helpers: lightening math and the
// core-family color lookup.

describe('lightenColor', () => {
    let gen;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator({ innerHTML: '' }, FEELINGS_DATA);
    });

    it('returns the original (lowercased) color at 0%', () => {
        expect(gen.lightenColor('#FFB3B3', 0)).toBe('#ffb3b3');
    });

    it('returns pure white at 100%', () => {
        expect(gen.lightenColor('#FFB3B3', 100)).toBe('#ffffff');
    });

    it('blends partway toward white at 40%', () => {
        expect(gen.lightenColor('#FFB3B3', 40)).toBe('#ffd1d1');
    });

    it('blends partway toward white at 70%', () => {
        expect(gen.lightenColor('#FFB3B3', 70)).toBe('#ffe8e8');
    });

    it('lightens black to mid-gray at 50%', () => {
        expect(gen.lightenColor('#000000', 50)).toBe('#808080');
    });

    it('round-trip note: 0% is a no-op and 100% always reaches white', () => {
        // Any starting color at 0% should be unchanged (modulo lowercasing),
        // and any starting color at 100% should converge on white.
        expect(gen.lightenColor('#123456', 0)).toBe('#123456');
        expect(gen.lightenColor('#123456', 100)).toBe('#ffffff');
    });
});

describe('getCoreEmotionColor', () => {
    it('resolves a known core family to its wheel color', () => {
        const angry = FEELINGS_DATA.core.find((c) => c.name === 'Angry');
        expect(FEELINGS_DATA.getCoreEmotionColor('Angry')).toBe(angry.color);
    });

    it('falls back to the default blue for an unknown family', () => {
        expect(FEELINGS_DATA.getCoreEmotionColor('Nonexistent')).toBe('#4a90e2');
    });
});
