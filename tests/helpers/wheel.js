// Shared test fixtures/helpers for the unit suite.
//
// The wheel engine bails out of generate() when the container reports a 0x0 size,
// which is exactly what jsdom does (it has no layout engine). createTestWheel stubs
// getBoundingClientRect to a real size so generate() runs to completion, giving us a
// fully-built wheel to assert against — no browser required.
import { FeelingsWheelGenerator } from '../../feelings-wheel-engine.js';
import { FEELINGS_DATA } from '../../feelings-data.js';

export { FeelingsWheelGenerator, FEELINGS_DATA };

// Single source of truth for structural counts (asserted by data-integrity + dom tests).
export const CORE = FEELINGS_DATA.core.length; // 7
export const SECONDARY_TOTAL = Object.values(FEELINGS_DATA.secondary).reduce(
    (sum, list) => sum + list.length,
    0
); // 41
export const TERTIARY_KEYS = Object.keys(FEELINGS_DATA.tertiary).length; // 41
// Full wheel = core + secondary + tertiary wedges. Each tertiary key has 2 entries.
export const TERTIARY_TOTAL = Object.values(FEELINGS_DATA.tertiary).reduce(
    (sum, list) => sum + list.length,
    0
); // 82
export const FULL_WEDGE_COUNT = CORE + SECONDARY_TOTAL + TERTIARY_TOTAL; // 130
export const SIMPLIFIED_WEDGE_COUNT = CORE + SECONDARY_TOTAL; // 48

// Build a fully-generated wheel in jsdom. Returns { container, gen }.
export function createTestWheel({ size = 600, simplified = false } = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    stubSize(container, size);

    const gen = new FeelingsWheelGenerator(container, FEELINGS_DATA);
    if (simplified) {
        gen.isSimplifiedMode = true;
        gen.updateRadii();
    }
    gen.generate();
    return { container, gen };
}

// Give an element a deterministic box so layout-dependent code has real numbers.
export function stubSize(el, size) {
    el.getBoundingClientRect = () => ({
        width: size,
        height: size,
        top: 0,
        left: 0,
        right: size,
        bottom: size,
        x: 0,
        y: 0,
        toJSON() {},
    });
}

// Query helpers (exclude shadow copies, which carry no wedge class).
export function countWedges(container) {
    return container.querySelectorAll('.wedge:not(.shadow-wedge)').length;
}

export function getWedge(container, emotion) {
    return container.querySelector(`.wedge[data-emotion="${emotion}"]:not(.shadow-wedge)`);
}

export function getWedgeById(container, wedgeId) {
    return container.querySelector(`.wedge[data-wedge-id="${wedgeId}"]:not(.shadow-wedge)`);
}
