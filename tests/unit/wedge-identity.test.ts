import { describe, it, expect, beforeEach } from 'vitest';
import { FeelingsWheelGenerator } from '../../feelings-wheel-engine.ts';
import { FEELINGS_DATA } from '../../feelings-data.ts';

// Unit tests for the structured wedge-identity registry and rotation math.
// These need no DOM: we construct the generator with a stub container and call
// the pure id/registry methods directly.

// Bare-container stub: these tests never touch the DOM, so a minimal object
// standing in for Element is enough for the constructor to run.
const STUB_CONTAINER = { innerHTML: '' } as unknown as Element;

describe('wedge identity registry', () => {
    let gen: FeelingsWheelGenerator;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator(STUB_CONTAINER, FEELINGS_DATA);
    });

    it('registers and round-trips a core wedge', () => {
        const id = gen.createUniqueWedgeId('core', 'Angry', null);
        expect(id).toBe('core-Angry');
        expect(gen.parseUniqueWedgeId(id)).toEqual({
            level: 'core',
            emotion: 'Angry',
            parent: null,
            coreFamily: 'Angry',
        });
    });

    it('registers and round-trips a secondary wedge', () => {
        const id = gen.createUniqueWedgeId('secondary', 'Frustrated', 'Angry');
        expect(id).toBe('secondary-Angry-Frustrated');
        expect(gen.parseUniqueWedgeId(id)).toEqual({
            level: 'secondary',
            emotion: 'Frustrated',
            parent: 'Angry',
            coreFamily: 'Angry',
        });
    });

    it('resolves the core family for a tertiary wedge via its secondary parent', () => {
        const id = gen.createUniqueWedgeId('tertiary', 'Infuriated', 'Frustrated');
        expect(id).toBe('tertiary-Angry-Frustrated-Infuriated');
        expect(gen.parseUniqueWedgeId(id)).toEqual({
            level: 'tertiary',
            emotion: 'Infuriated',
            parent: 'Frustrated',
            coreFamily: 'Angry',
        });
    });

    it('round-trips a multi-word emotion that contains spaces', () => {
        // "Out of Control" is a real tertiary under "Stressed" (Bad family).
        const id = gen.createUniqueWedgeId('tertiary', 'Out of Control', 'Stressed');
        const meta = gen.parseUniqueWedgeId(id);
        expect(meta.emotion).toBe('Out of Control');
        expect(meta.parent).toBe('Stressed');
        expect(meta.coreFamily).toBe('Bad');
    });

    it('falls back to string parsing for ids not in the registry', () => {
        // Never registered — exercises the defensive fallback path.
        const meta = gen.parseUniqueWedgeId('secondary-Happy-Playful');
        expect(meta).toEqual({
            level: 'secondary',
            emotion: 'Playful',
            parent: 'Happy',
            coreFamily: 'Happy',
        });
    });
});

describe('color resolution', () => {
    it('maps a family name to its core accent color', () => {
        const angry = FEELINGS_DATA.core.find((c) => c.name === 'Angry');
        expect(FEELINGS_DATA.getCoreEmotionColor('Angry')).toBe(angry!.color);
    });

    it('falls back to a default for an unknown family', () => {
        expect(FEELINGS_DATA.getCoreEmotionColor('Nonexistent')).toBe('#4a90e2');
    });
});

describe('rotation math', () => {
    let gen: FeelingsWheelGenerator;
    beforeEach(() => {
        gen = new FeelingsWheelGenerator(STUB_CONTAINER, FEELINGS_DATA);
    });

    it('takes the shortest path across the 0/360 boundary', () => {
        expect(gen.getShortestRotationPath(350, 10)).toBe(20);
        expect(gen.getShortestRotationPath(10, 350)).toBe(-20);
        expect(gen.getShortestRotationPath(0, 180)).toBe(180);
    });
});
