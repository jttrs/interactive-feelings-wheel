import { describe, it, expect } from 'vitest';
import {
    createTestWheel,
    getWedge,
    countWedges,
    FULL_WEDGE_COUNT,
    SIMPLIFIED_WEDGE_COUNT,
    CORE,
} from '../helpers/wheel.js';

describe('full mode DOM', () => {
    it('renders exactly FULL_WEDGE_COUNT wedges and matching text nodes', () => {
        const { container } = createTestWheel();
        expect(countWedges(container)).toBe(FULL_WEDGE_COUNT);
        expect(container.querySelectorAll('text')).toHaveLength(FULL_WEDGE_COUNT);
    });
});

describe('simplified mode DOM', () => {
    it('renders exactly SIMPLIFIED_WEDGE_COUNT wedges with no tertiary ring', () => {
        const { container } = createTestWheel({ simplified: true });
        expect(countWedges(container)).toBe(SIMPLIFIED_WEDGE_COUNT);
        expect(container.querySelectorAll('.tertiary-wedge')).toHaveLength(0);
        expect(container.querySelectorAll('.core-wedge')).toHaveLength(CORE);
    });
});

describe('selection', () => {
    it('selectWedge marks the wedge selected, moves it to topGroup, and adds a shadow', () => {
        const { container, gen } = createTestWheel();
        const wedge = getWedge(container, 'Angry');
        const id = wedge.getAttribute('data-wedge-id');

        gen.selectWedge(id, wedge, 'Angry');

        expect(wedge.classList.contains('selected')).toBe(true);
        expect(wedge.getAttribute('aria-pressed')).toBe('true');
        expect(wedge.parentNode).toBe(gen.topGroup);
        expect(gen.shadowGroup.querySelector(`[data-shadow-id="${id}"]`)).not.toBeNull();
        expect(gen.selectedWedges.has(id)).toBe(true);
    });

    it('deselectWedge reverses selection, moving the wedge back to baseGroup and removing the shadow', () => {
        const { container, gen } = createTestWheel();
        const wedge = getWedge(container, 'Angry');
        const id = wedge.getAttribute('data-wedge-id');

        gen.selectWedge(id, wedge, 'Angry');
        gen.deselectWedge(id, wedge, 'Angry');

        expect(wedge.getAttribute('aria-pressed')).toBe('false');
        expect(wedge.parentNode).toBe(gen.baseGroup);
        expect(gen.shadowGroup.querySelector(`[data-shadow-id="${id}"]`)).toBeNull();
        expect(gen.selectedWedges.has(id)).toBe(false);
    });
});

describe('reset', () => {
    it('clears all selections and rotation', () => {
        const { container, gen } = createTestWheel();

        const sad = getWedge(container, 'Sad');
        const sadId = sad.getAttribute('data-wedge-id');
        gen.selectWedge(sadId, sad, 'Sad');

        const bad = getWedge(container, 'Bad');
        const badId = bad.getAttribute('data-wedge-id');
        gen.selectWedge(badId, bad, 'Bad');

        gen.currentRotation = 45;
        gen.reset();

        expect(gen.selectedWedges.size).toBe(0);
        expect(gen.currentRotation).toBe(0);
    });
});

describe('roving tabindex', () => {
    it('makes exactly one wedge part of the tab order after generation', () => {
        const { container } = createTestWheel();
        expect(container.querySelectorAll('.wedge[tabindex="0"]')).toHaveLength(1);
    });
});

describe('mode-state preservation', () => {
    it('restores the full-mode selection after switching to simplified and back', () => {
        const { container, gen } = createTestWheel();

        const happy = getWedge(container, 'Happy');
        const happyId = happy.getAttribute('data-wedge-id');
        gen.selectWedge(happyId, happy, 'Happy');

        gen.setSimplifiedMode(true);
        // Full-mode state should have been snapshotted before the switch.
        expect(gen.fullModeState.selectedWedges.has(happyId)).toBe(true);

        gen.setSimplifiedMode(false);
        expect(gen.selectedWedges.has(happyId)).toBe(true);
    });
});
