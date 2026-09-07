import { describe, it, expect } from 'vitest';
import {
    createTestWheel,
    getWedge,
    countWedges,
    FULL_WEDGE_COUNT,
    SIMPLIFIED_WEDGE_COUNT,
    CORE,
} from '../helpers/wheel.ts';
import { SELECTION_EFFECTS } from '../../src/wheel/interaction.ts';

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
        const wedge = getWedge(container, 'Angry') as SVGElement;
        const id = wedge.getAttribute('data-wedge-id')!;

        gen.selectWedge(id, wedge, 'Angry');

        expect(wedge.classList.contains('selected')).toBe(true);
        expect(wedge.getAttribute('aria-pressed')).toBe('true');
        expect(wedge.parentNode).toBe(gen.topGroup);
        expect(gen.shadowGroup.querySelector(`[data-shadow-id="${id}"]`)).not.toBeNull();
        expect(gen.selectedWedges.has(id)).toBe(true);
    });

    it('deselectWedge reverses selection, moving the wedge back to baseGroup and removing the shadow', () => {
        const { container, gen } = createTestWheel();
        const wedge = getWedge(container, 'Angry') as SVGElement;
        const id = wedge.getAttribute('data-wedge-id')!;

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

        const sad = getWedge(container, 'Sad') as SVGElement;
        const sadId = sad.getAttribute('data-wedge-id')!;
        gen.selectWedge(sadId, sad, 'Sad');

        const bad = getWedge(container, 'Bad') as SVGElement;
        const badId = bad.getAttribute('data-wedge-id')!;
        gen.selectWedge(badId, bad, 'Bad');

        gen.currentRotation = 45;
        gen.reset();

        expect(gen.selectedWedges.size).toBe(0);
        expect(gen.currentRotation).toBe(0);
    });
});

// The single source of truth for selection visuals. These guards make it structurally
// impossible for a reset to miss a dimension: every effect must round-trip (apply then
// clear leaves the DOM identical), and after a reset NO wedge/label may retain any
// selection residue. A new effect added to SELECTION_EFFECTS is exercised automatically;
// a selection visual applied OUTSIDE the registry is caught by the clean-slate scan.
describe('selection-effect registry (reset guard)', () => {
    it('every registered effect has a name and callable apply + clear', () => {
        expect(SELECTION_EFFECTS.length).toBeGreaterThan(0);
        for (const fx of SELECTION_EFFECTS) {
            expect(typeof fx.name).toBe('string');
            expect(fx.name.length).toBeGreaterThan(0);
            expect(typeof fx.apply).toBe('function');
            expect(typeof fx.clear).toBe('function');
        }
        // Names are unique (a dupe would silently shadow a dimension).
        const names = SELECTION_EFFECTS.map((f) => f.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('apply → clear round-trips a wedge + its label back to identical DOM', () => {
        const { container, gen } = createTestWheel();
        const wedge = getWedge(container, 'Angry') as SVGElement;
        const id = wedge.getAttribute('data-wedge-id')!;
        const label = container.querySelector(`text[data-wedge-id="${id}"]`)!;

        // Snapshot the dimensions any effect could touch, BEFORE selection. A className is
        // normalized to its token set (order-independent, and an empty class="" reads the
        // same as no attribute — classList.toggle leaves "" behind, which is equivalent).
        const cls = (el: Element) => (el.getAttribute('class') || '').trim().split(/\s+/).sort();
        const snap = () => ({
            wedgeClass: cls(wedge),
            aria: wedge.getAttribute('aria-pressed'),
            wedgeParent: wedge.parentNode,
            style: (wedge.getAttribute('style') || '').trim(),
            labelClass: cls(label),
            labelParent: label.parentNode,
            shadows: gen.shadowGroup.querySelectorAll(`[data-shadow-id="${id}"]`).length,
        });
        const before = JSON.stringify(snap());

        const ctx = gen.effectCtx(id, wedge)!;
        expect(ctx).not.toBeNull();
        gen.applySelectionEffects(ctx);
        // Something actually changed (guards against a no-op registry).
        expect(JSON.stringify(snap())).not.toBe(before);

        // effectCtx re-resolves the wedge after the layer move; clear from a fresh ctx.
        gen.clearSelectionEffects(gen.effectCtx(id, wedge)!);
        expect(JSON.stringify(snap())).toBe(before);
    });

    it('after reset, NO wedge or label retains any selection residue (clean slate)', () => {
        const { container, gen } = createTestWheel();
        for (const name of ['Happy', 'Sad', 'Bad']) {
            const w = getWedge(container, name) as SVGElement;
            gen.selectWedge(w.getAttribute('data-wedge-id')!, w, name);
        }
        // Precondition: effects really applied (bold labels present).
        expect(container.querySelectorAll('.label-selected').length).toBeGreaterThan(0);

        gen.currentRotation = 30;
        gen.reset();

        expect(gen.selectedWedges.size).toBe(0);
        expect(container.querySelectorAll('.wedge.selected')).toHaveLength(0);
        expect(container.querySelectorAll('.label-selected')).toHaveLength(0); // the bug
        expect(container.querySelectorAll('.wedge[aria-pressed="true"]')).toHaveLength(0);
        expect(gen.shadowGroup.children.length).toBe(0);
        // Every wedge + label is back under the base layer.
        expect(gen.topGroup.querySelectorAll('.wedge, text')).toHaveLength(0);
    });

    it('clearSelections() (animated-reset path) also clears the bold label', () => {
        // Regression lock for the exact reported bug: the animated reset routes through
        // clearSelections(), which used to leave .label-selected behind.
        const { container, gen } = createTestWheel();
        const w = getWedge(container, 'Happy') as SVGElement;
        gen.selectWedge(w.getAttribute('data-wedge-id')!, w, 'Happy');
        expect(container.querySelectorAll('.label-selected').length).toBe(1);

        gen.clearSelections();

        expect(container.querySelectorAll('.label-selected')).toHaveLength(0);
        expect(container.querySelectorAll('.wedge.selected')).toHaveLength(0);
        expect(gen.selectedWedges.size).toBe(0);
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

        const happy = getWedge(container, 'Happy') as SVGElement;
        const happyId = happy.getAttribute('data-wedge-id')!;
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
        label.setAttribute = (name: string, ...rest: [string]) => {
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
        const cheeky = getWedge(container, 'Cheeky') as SVGElement; // tertiary under Playful
        const id = cheeky.getAttribute('data-wedge-id')!;
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
