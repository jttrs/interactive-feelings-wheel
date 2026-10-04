import { describe, it, expect } from 'vitest';
import { createTestWheel, getWedge, FULL_WEDGE_COUNT, CORE } from '../helpers/wheel.ts';
import { GUIDED_REST_ATTR } from '../../src/wheel/guided.ts';

const reachable = (c: Element) =>
    c.querySelectorAll(`.wedge:not(.shadow-wedge):not([${GUIDED_REST_ATTR}])`).length;

describe('guided view', () => {
    it('is off by default and leaves the full wheel untouched', () => {
        const { container, gen: wheel } = createTestWheel();
        expect(wheel.isGuidedMode).toBe(false);
        expect(reachable(container)).toBe(FULL_WEDGE_COUNT);
    });

    it('starts with only the cores, then opens one ring per choice', () => {
        const { container, gen: wheel } = createTestWheel();
        wheel.setGuidedMode(true);
        expect(reachable(container)).toBe(CORE);

        const happy = getWedge(container, 'Happy') as SVGElement;
        wheel.selectWedge(happy.getAttribute('data-wedge-id')!, happy);
        const happySecondaries = container.querySelectorAll(
            '.secondary-wedge[data-parent="Happy"]'
        ).length;
        expect(reachable(container)).toBe(CORE + happySecondaries);

        // Rested wedges and labels are inert and hidden from assistive tech.
        const lonely = getWedge(container, 'Lonely')!;
        expect(lonely.hasAttribute(GUIDED_REST_ATTR)).toBe(true);
        expect(lonely.getAttribute('aria-hidden')).toBe('true');
        expect(lonely.getAttribute('tabindex')).toBe('-1');
    });

    it('turning it off restores every wedge and keeps selection', () => {
        const { container, gen: wheel } = createTestWheel();
        wheel.setGuidedMode(true);
        const happy = getWedge(container, 'Happy') as SVGElement;
        wheel.selectWedge(happy.getAttribute('data-wedge-id')!, happy);
        wheel.setGuidedMode(false);
        expect(reachable(container)).toBe(FULL_WEDGE_COUNT);
        expect(container.querySelectorAll('[aria-hidden="true"].wedge')).toHaveLength(0);
        expect(wheel.selectedWedges.size).toBe(1);
    });

    it('survives a regenerate (resize / mode switch)', () => {
        const { container, gen: wheel } = createTestWheel();
        wheel.setGuidedMode(true);
        wheel.regenerateWheel();
        expect(reachable(container)).toBe(CORE);
    });
});
