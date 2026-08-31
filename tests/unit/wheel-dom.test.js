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

    it('wedges are fill-only; the separator layer owns all boundaries', () => {
        const { container } = createTestWheel();
        // No wedge carries a stroke — separators (lines + rings) draw every edge once.
        container.querySelectorAll('.wedge:not(.shadow-wedge)').forEach((w) => {
            const s = w.getAttribute('stroke');
            expect(s === null || s === 'none').toBe(true);
        });
        // Separator layer present: 3 rings + 7 primary + 34 secondary + 41 dyad lines.
        expect(container.querySelectorAll('.wheel-ring')).toHaveLength(3);
        expect(container.querySelectorAll('.primary-division-line')).toHaveLength(7);
        expect(container.querySelectorAll('.secondary-division-line')).toHaveLength(34);
        expect(container.querySelectorAll('.dyad-division-line')).toHaveLength(41);
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

    it('updateTextRotations only writes transforms when the rotation actually changes (review #6)', () => {
        const { gen } = createTestWheel();
        const label = gen.textElements[0].element;
        let writes = 0;
        const orig = label.setAttribute.bind(label);
        label.setAttribute = (name, ...rest) => {
            if (name === 'transform') writes++;
            return orig(name, ...rest);
        };

        // First call at the current rotation: value differs from the stored last -> writes.
        gen.updateTextRotations();
        const afterFirst = writes;
        expect(afterFirst).toBeGreaterThanOrEqual(0); // may already match from generate()

        // A repeated call at the SAME currentRotation must write nothing (no-op frame).
        writes = 0;
        gen.updateTextRotations();
        expect(writes).toBe(0);

        // A large rotation that flips this label's orientation must write again.
        writes = 0;
        gen.currentRotation = 180;
        gen.updateTextRotations();
        expect(writes).toBeGreaterThan(0);
    });

    it('a tertiary selection does NOT orphan in the live set while simplified (review #5)', () => {
        // Review flagged a possible orphaned tertiary in selectedWedges across a mode
        // round-trip. Verified as by-design: restoreState swaps in the per-mode set, so
        // the tertiary is absent from the LIVE set while simplified (no orphan), and
        // returns from the full-mode snapshot on switch-back (intended per-mode memory).
        const { container, gen } = createTestWheel();
        const cheeky = getWedge(container, 'Cheeky'); // tertiary under Playful
        const id = cheeky.getAttribute('data-wedge-id');
        gen.selectWedge(id, cheeky, 'Cheeky');
        expect(gen.parseUniqueWedgeId(id).level).toBe('tertiary');

        gen.setSimplifiedMode(true);
        // No tertiary lingers in the live selection while simplified.
        const tertiaryLive = [...gen.selectedWedges].filter(
            (w) => gen.parseUniqueWedgeId(w).level === 'tertiary'
        );
        expect(tertiaryLive).toHaveLength(0);

        gen.setSimplifiedMode(false);
        // Returns exactly once from the full-mode snapshot.
        expect(gen.selectedWedges.has(id)).toBe(true);
    });
});
