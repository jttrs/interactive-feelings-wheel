import { describe, it, expect } from 'vitest';
import { svgEl, line, circle, wedgePath, text, readWheelTokens } from '../../src/wheel/svg.ts';
import { createTestWheel } from '../helpers/wheel.ts';

// The guarded SVG primitive factory: valid inputs produce correct elements;
// invalid numeric inputs are rejected (null) instead of injecting broken nodes.

describe('svgEl', () => {
    it('creates an SVG element and skips null/undefined/empty attrs', () => {
        const el = svgEl('rect', { width: 10, height: null, fill: '', 'data-x': 'y' });
        expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(el.getAttribute('width')).toBe('10');
        expect(el.hasAttribute('height')).toBe(false);
        expect(el.hasAttribute('fill')).toBe(false);
        expect(el.getAttribute('data-x')).toBe('y');
    });
});

describe('line', () => {
    it('builds a stroked line with dash + class', () => {
        const el = line({
            x1: 0,
            y1: 0,
            x2: 10,
            y2: 5,
            stroke: '#123',
            width: 2,
            dash: '4 4',
            className: 'd',
        })!;
        expect(el.tagName.toLowerCase()).toBe('line');
        expect(el.getAttribute('x2')).toBe('10');
        expect(el.getAttribute('stroke')).toBe('#123');
        expect(el.getAttribute('stroke-width')).toBe('2');
        expect(el.getAttribute('stroke-dasharray')).toBe('4 4');
        expect(el.getAttribute('class')).toBe('d');
    });

    it('returns null when any endpoint is non-finite (guard)', () => {
        expect(line({ x1: 0, y1: 0, x2: NaN, y2: 5 })).toBeNull();
        expect(line({ x1: undefined, y1: 0, x2: 1, y2: 1 })).toBeNull();
    });
});

describe('circle', () => {
    it('builds a stroke-only ring by default (fill none)', () => {
        const el = circle({
            cx: 50,
            cy: 50,
            r: 20,
            stroke: '#333',
            width: 1,
            className: 'wheel-ring',
        })!;
        expect(el.tagName.toLowerCase()).toBe('circle');
        expect(el.getAttribute('r')).toBe('20');
        expect(el.getAttribute('fill')).toBe('none');
        expect(el.getAttribute('class')).toBe('wheel-ring');
    });

    it('returns null for non-positive or non-finite radius (guard)', () => {
        expect(circle({ cx: 0, cy: 0, r: 0 })).toBeNull();
        expect(circle({ cx: 0, cy: 0, r: -5 })).toBeNull();
        expect(circle({ cx: 0, cy: 0, r: NaN })).toBeNull();
    });
});

describe('wedgePath', () => {
    it('is fill-only (no stroke) and carries dataset', () => {
        const el = wedgePath({
            d: 'M 0 0 L 1 1',
            fill: '#abc',
            className: 'wedge core-wedge',
            dataset: { emotion: 'Angry', level: 'core', 'wedge-id': 'core-Angry' },
        })!;
        expect(el.tagName.toLowerCase()).toBe('path');
        expect(el.getAttribute('fill')).toBe('#abc');
        expect(el.hasAttribute('stroke')).toBe(false);
        expect(el.getAttribute('data-emotion')).toBe('Angry');
        expect(el.getAttribute('data-wedge-id')).toBe('core-Angry');
    });

    it('returns null without a path string (guard)', () => {
        expect(wedgePath({ fill: '#abc' })).toBeNull();
    });
});

describe('text', () => {
    it('builds a centered label with font size and dataset', () => {
        const el = text({
            x: 5,
            y: 6,
            content: 'Happy',
            fontSize: 12,
            dataset: { level: 'core' },
        })!;
        expect(el.getAttribute('font-size')).toBe('12px');
        expect(el.getAttribute('text-anchor')).toBe('middle');
        expect(el.textContent).toBe('Happy');
        expect(el.getAttribute('data-level')).toBe('core');
    });

    it('returns null for non-finite position (guard)', () => {
        expect(text({ x: NaN, y: 0, content: 'x' })).toBeNull();
    });
});

describe('readWheelTokens', () => {
    it('falls back to constants when tokens are unset (bare jsdom)', () => {
        const t = readWheelTokens();
        expect(t.lineColor).toBe('#4a453d');
        expect(t.ringColor).toBe('#4a453d');
        expect(t.primaryRatio).toBeCloseTo(0.0028, 10);
        expect(t.secondaryRatio).toBeCloseTo(0.0012, 10);
        expect(t.dyadRatio).toBeCloseTo(0.0008, 10);
        expect(t.ringRatio).toBeCloseTo(0.0022, 10);
    });

    it('reads an inline-set custom property over the fallback', () => {
        document.documentElement.style.setProperty('--wheel-line', '#010203');
        try {
            expect(readWheelTokens().lineColor).toBe('#010203');
        } finally {
            document.documentElement.style.removeProperty('--wheel-line');
        }
    });
});

describe('ring circles (separator layer owns the arcs)', () => {
    it('renders concentric rings and NO wedge strokes in full mode', () => {
        const { container } = createTestWheel({ size: 600 });
        // 3 rings in full mode: core, middle, outer.
        expect(container.querySelectorAll('.wheel-ring')).toHaveLength(3);
        // Wedges are fill-only — none carry a stroke attribute.
        const stroked = [...container.querySelectorAll('.wedge:not(.shadow-wedge)')].filter(
            (w) => w.getAttribute('stroke') && w.getAttribute('stroke') !== 'none'
        );
        expect(stroked).toHaveLength(0);
        // Rings are stroke-only.
        const ring = container.querySelector('.wheel-ring')!;
        expect(ring.getAttribute('fill')).toBe('none');
        expect(ring.getAttribute('stroke')).toBeTruthy();
    });

    it('renders 2 rings and no dyad lines in simplified mode', () => {
        const { container } = createTestWheel({ size: 600, simplified: true });
        expect(container.querySelectorAll('.wheel-ring')).toHaveLength(2);
        expect(container.querySelectorAll('.dyad-division-line')).toHaveLength(0);
    });
});
