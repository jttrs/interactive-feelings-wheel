import { describe, it, expect } from 'vitest';
import { FEELINGS_DATA, CORE, SECONDARY_TOTAL, TERTIARY_KEYS } from '../helpers/wheel.js';

// Structural sanity checks on the emotion data itself (no engine involved).
// These pin the shape of FEELINGS_DATA so future edits to feelings-data.js
// can't silently orphan an emotion or break a core/secondary/tertiary link.

describe('core emotions', () => {
    it('has exactly CORE entries, each with a name and a 6-digit hex color', () => {
        expect(FEELINGS_DATA.core).toHaveLength(CORE);
        FEELINGS_DATA.core.forEach((core) => {
            expect(core).toHaveProperty('name');
            expect(core).toHaveProperty('color');
            expect(core.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });
});

describe('secondary emotions', () => {
    it('has exactly SECONDARY_TOTAL entries across all core families', () => {
        const flattened = Object.values(FEELINGS_DATA.secondary).flat();
        expect(flattened).toHaveLength(SECONDARY_TOTAL);
    });

    it('assigns every secondary emotion to exactly one core family', () => {
        const seen = new Map(); // secondary name -> owning core family
        Object.entries(FEELINGS_DATA.secondary).forEach(([coreName, list]) => {
            list.forEach((secondary) => {
                const owner = seen.get(secondary);
                expect(
                    owner,
                    `"${secondary}" appears under both "${owner}" and "${coreName}"`
                ).toBeUndefined();
                seen.set(secondary, coreName);
            });
        });
        // Uniqueness implies the flattened list has no duplicates.
        expect(seen.size).toBe(SECONDARY_TOTAL);
    });
});

describe('tertiary emotions', () => {
    const secondaryNames = new Set(Object.values(FEELINGS_DATA.secondary).flat());

    it('has exactly TERTIARY_KEYS secondary parents with tertiary emotions', () => {
        expect(Object.keys(FEELINGS_DATA.tertiary)).toHaveLength(TERTIARY_KEYS);
    });

    it('keys every tertiary entry off a real secondary emotion', () => {
        Object.keys(FEELINGS_DATA.tertiary).forEach((key) => {
            expect(
                secondaryNames.has(key),
                `tertiary key "${key}" is not a known secondary emotion`
            ).toBe(true);
        });
    });

    it('gives every secondary parent exactly 2 tertiary emotions', () => {
        Object.entries(FEELINGS_DATA.tertiary).forEach(([key, list]) => {
            expect(list, `tertiary["${key}"] should have exactly 2 entries`).toHaveLength(2);
        });
    });
});

describe('definitions', () => {
    it('has a non-empty standard and simplified definition for every core emotion', () => {
        FEELINGS_DATA.core.forEach((core) => {
            const def = FEELINGS_DATA.definitions[core.name];
            expect(def, `missing definition for core emotion "${core.name}"`).toBeDefined();
            expect(def.standard).toBeTruthy();
            expect(def.simplified).toBeTruthy();
        });
    });

    it('has a non-empty standard and simplified definition for every secondary emotion', () => {
        const secondaryNames = Object.values(FEELINGS_DATA.secondary).flat();
        secondaryNames.forEach((secondary) => {
            const def = FEELINGS_DATA.definitions[secondary];
            expect(def, `missing definition for secondary emotion "${secondary}"`).toBeDefined();
            expect(def.standard).toBeTruthy();
            expect(def.simplified).toBeTruthy();
        });
    });

    // Tertiary definitions are intentionally partial (not every tertiary emotion
    // has one yet), so we do not assert coverage for the tertiary level.
});
