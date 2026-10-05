import { describe, it, expect } from 'vitest';
import { createTestWheel, getWedge } from '../helpers/wheel.ts';
import {
    createFocusedHint,
    focusedHintStep,
    FOCUSED_HINT_COPY,
} from '../../src/ui/focused-hint.ts';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('focusedHintStep', () => {
    const base = { enabled: true, hasCore: false, hasDeeper: false, nextDone: false };

    it('is silent when focused view is off', () => {
        expect(focusedHintStep({ ...base, enabled: false })).toBeNull();
    });
    it('starts with the core ring', () => {
        expect(focusedHintStep(base)).toBe('start');
    });
    it('points to the next ring after a core, once', () => {
        expect(focusedHintStep({ ...base, hasCore: true })).toBe('next');
        expect(focusedHintStep({ ...base, hasCore: true, nextDone: true })).toBeNull();
    });
    it('steps aside once a closer word is chosen', () => {
        expect(focusedHintStep({ ...base, hasCore: true, hasDeeper: true })).toBeNull();
    });
});

describe('focused hint controller', () => {
    function setup() {
        const { container, gen } = createTestWheel();
        const hint = document.createElement('p');
        hint.hidden = true;
        document.body.appendChild(hint);
        const ctrl = createFocusedHint(hint, container);
        const select = (emotion: string) => {
            const w = getWedge(container, emotion) as SVGElement;
            gen.selectWedge(w.getAttribute('data-wedge-id')!, w);
        };
        return { container, gen, hint, ctrl, select };
    }

    it('walks start -> next -> hidden, and returns after a reset', async () => {
        const { gen, hint, ctrl, select } = setup();
        expect(hint.hidden).toBe(true);

        gen.setFocusedMode(true);
        ctrl.setEnabled(true);
        expect(hint.hidden).toBe(false);
        expect(hint.textContent).toBe(FOCUSED_HINT_COPY.start);

        select('Happy');
        await flush();
        expect(hint.textContent).toBe(FOCUSED_HINT_COPY.next);

        select('Playful');
        await flush();
        expect(hint.hidden).toBe(true);

        gen.clearSelections();
        await flush();
        expect(hint.hidden).toBe(false);
        expect(hint.textContent).toBe(FOCUSED_HINT_COPY.start);
        ctrl.destroy();
    });

    it('hides when focused view is turned off', async () => {
        const { hint, ctrl } = setup();
        ctrl.setEnabled(true);
        expect(hint.hidden).toBe(false);
        ctrl.setEnabled(false);
        expect(hint.hidden).toBe(true);
        ctrl.destroy();
    });
});
